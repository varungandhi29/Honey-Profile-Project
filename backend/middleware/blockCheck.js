import BlockedIP from '../models/BlockedIP.js'
import BlockedFingerprint from '../models/BlockedFingerprint.js'
import { broadcast } from '../services/broadcastService.js'
import logger from './logger.js'

export const checkBlockStatus = async (req, res, next) => {
  try {
    const ip = req.body?.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.connection?.remoteAddress || 'Unknown'
    const fingerprint = req.body?.fingerprint || req.headers['x-fingerprint']
    req.clientIP = ip
    req.clientFingerprint = fingerprint

    const privateRanges = ['127.','::1','localhost','0.0.0.0','192.168.','10.','172.16.','172.17.']
    if (privateRanges.some(p => ip.startsWith(p) || ip === p)) return next()

    let cache = null
    try {
      const cacheService = await import('../services/cacheService.js')
      cache = cacheService.cache
      const cached = await cache.get(`blocked:${ip}`)
      if (cached?.blocked) {
        await BlockedIP.findOneAndUpdate({ ip }, { $inc: { attemptCount: 1 }, lastAttempt: new Date() }).catch(() => {})
        broadcast('blocked_attempt', { ip, method: 'REDIS_CACHE', message: `Blocked IP ${ip} tried to access`, timestamp: new Date().toISOString() })
        logger.warn(`[BLOCKED] ${ip} — Redis hit`)
        return res.status(403).json({ error: 'Access denied', blocked: true, reason: 'IP_BLOCKED' })
      }
    } catch {}

    const dbBlock = await BlockedIP.findOne({ ip })
    if (dbBlock) {
      try { if (cache) await cache.set(`blocked:${ip}`, { blocked: true, reason: dbBlock.reason }, 86400 * 365) } catch {}
      await BlockedIP.findOneAndUpdate({ ip }, { $inc: { attemptCount: 1 }, lastAttempt: new Date() }).catch(() => {})
      broadcast('blocked_attempt', { ip, method: 'DB_BLOCK', message: `Blocked IP ${ip} tried to access (re-cached)`, timestamp: new Date().toISOString() })
      logger.warn(`[BLOCKED] ${ip} — MongoDB hit, re-cached`)
      return res.status(403).json({ error: 'Access denied', blocked: true, reason: 'IP_BLOCKED' })
    }

    if (fingerprint) {
      try {
        if (cache) {
          const fpCached = await cache.get(`blocked:fp:${fingerprint}`)
          if (fpCached?.blocked) {
            broadcast('blocked_attempt', { ip, fingerprint: fingerprint.substr(0,8)+'...', method: 'FINGERPRINT_BLOCK', message: `Blocked fingerprint from new IP ${ip}`, timestamp: new Date().toISOString() })
            return res.status(403).json({ error: 'Access denied', blocked: true, reason: 'FINGERPRINT_BLOCKED' })
          }
        }
        const dbFpBlock = await BlockedFingerprint.findOne({ fingerprint })
        if (dbFpBlock) {
          try { if (cache) await cache.set(`blocked:fp:${fingerprint}`, { blocked: true }, 86400 * 365) } catch {}
          broadcast('blocked_attempt', { ip, method: 'FINGERPRINT_BLOCK', message: `Blocked fingerprint from DB tried from ${ip}`, timestamp: new Date().toISOString() })
          return res.status(403).json({ error: 'Access denied', blocked: true, reason: 'FINGERPRINT_BLOCKED' })
        }
      } catch {}
    }

    next()
  } catch (err) {
    logger.error(`[BLOCK CHECK ERROR] ${err.message}`)
    next()
  }
}

/**
 * Normalizes an IPv6 address and extracts its 64-bit network prefix.
 */
export function getIPv6Prefix(ip) {
  if (!ip || typeof ip !== 'string' || !ip.includes(':')) return null
  const clean = ip.replace('::ffff:', '').trim().toLowerCase()
  if (!clean.includes(':')) return null

  try {
    const parts = clean.split('::')
    const left = parts[0] ? parts[0].split(':').filter(Boolean) : []
    const right = parts[1] ? parts[1].split(':').filter(Boolean) : []
    const middleCount = 8 - (left.length + right.length)
    const middle = middleCount > 0 ? new Array(middleCount).fill('0') : []
    const full = [...left, ...middle, ...right].map(seg => seg.padStart(4, '0'))

    if (full.length >= 4) {
      return full.slice(0, 4).join(':')
    }
  } catch {}
  return null
}

/**
 * Centralized block state verification helper
 */
export async function verifyBlockState({ candidateIPs = [], fingerprint = null, hardwareFingerprint = null }) {
  const cleanIPs = candidateIPs.map(ip => ip ? ip.replace('::ffff:', '').trim() : '').filter(Boolean)
  const prefixes = cleanIPs.map(getIPv6Prefix).filter(Boolean)

  let cache = null
  try {
    const cacheService = await import('../services/cacheService.js')
    cache = cacheService.cache
  } catch {}

  for (const ip of cleanIPs) {
    try {
      const cached = await cache?.get(`blocked:${ip}`)
      if (cached?.blocked) {
        return { blocked: true, reason: 'IP_BLOCKED', matchedTarget: ip, method: 'REDIS_IP' }
      }
    } catch {}
  }

  for (const prefix of prefixes) {
    try {
      const cachedSubnet = await cache?.get(`blocked:subnet:${prefix}`)
      if (cachedSubnet?.blocked) {
        return { blocked: true, reason: 'SUBNET_BLOCKED', matchedTarget: prefix, method: 'REDIS_SUBNET' }
      }
    } catch {}
  }

  if (hardwareFingerprint) {
    try {
      const cachedHw = await cache?.get(`blocked:hw:${hardwareFingerprint}`)
      if (cachedHw?.blocked) {
        return { blocked: true, reason: 'PERMANENT_DEVICE_BAN', matchedTarget: hardwareFingerprint, method: 'REDIS_HW' }
      }
    } catch {}
  }

  if (fingerprint) {
    try {
      const cachedFp = await cache?.get(`blocked:fp:${fingerprint}`)
      if (cachedFp?.blocked) {
        return { blocked: true, reason: 'FINGERPRINT_BLOCKED', matchedTarget: fingerprint, method: 'REDIS_FP' }
      }
    } catch {}
  }

  const ipQueries = [{ ip: { $in: cleanIPs } }]
  if (prefixes.length > 0) {
    ipQueries.push({ subnetPrefix: { $in: prefixes } })
  }
  ipQueries.push({ associatedIPs: { $in: cleanIPs } })

  const dbBlock = await BlockedIP.findOne({ $or: ipQueries })
  if (dbBlock) {
    return { blocked: true, reason: dbBlock.reason || 'IP_BLOCKED', matchedTarget: dbBlock.ip, method: 'MONGODB_IP' }
  }

  if (fingerprint || hardwareFingerprint) {
    const fpQueries = []
    if (fingerprint) fpQueries.push({ fingerprint })
    if (hardwareFingerprint) fpQueries.push({ hardwareFingerprint })
    const dbFpBlock = await BlockedFingerprint.findOne({ $or: fpQueries })
    if (dbFpBlock) {
      return { blocked: true, reason: dbFpBlock.reason || 'FINGERPRINT_BLOCKED', matchedTarget: dbFpBlock.fingerprint, method: 'MONGODB_FP' }
    }
  }

  return { blocked: false }
}
