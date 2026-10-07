import BlockedIP from '../models/BlockedIP.js'
import BlockedFingerprint from '../models/BlockedFingerprint.js'
import { broadcast } from '../services/broadcastService.js'
import logger from '../middleware/logger.js'
import { getHostPublicIP } from './geoip.js'

export const checkBlockStatus = async (req, res, next) => {
  try {
    let rawIP = req.body?.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['x-real-ip'] || req.ip || req.connection?.remoteAddress || 'Unknown'
    rawIP = rawIP.replace('::ffff:', '').trim()
    const fingerprint = req.body?.fingerprint || req.headers['x-fingerprint']

    const isLocal = rawIP === '::1' || rawIP === '127.0.0.1' || rawIP.startsWith('127.') || rawIP === 'localhost' || rawIP === 'Unknown'
    const hostPublicIP = getHostPublicIP()

    // Determine the list of candidate IPs to verify against block lists
    const candidateIPs = [rawIP]
    if (isLocal && hostPublicIP && !candidateIPs.includes(hostPublicIP)) {
      candidateIPs.push(hostPublicIP)
    }

    const { cache } = await import('../services/cacheService.js')

    // CHECK 1 — Redis (fastest, microseconds)
    for (const ip of candidateIPs) {
      let cached = null
      try {
        cached = await cache.get(`blocked:${ip}`)
      } catch {}

      if (cached?.blocked) {
        try {
          await BlockedIP.findOneAndUpdate({ ip }, { $inc: { attemptCount: 1 }, lastAttempt: new Date() })
        } catch {}
        broadcast('blocked_attempt', { ip, method: 'REDIS_CACHE', message: `Blocked IP ${ip} tried to access`, timestamp: new Date().toISOString() })
        logger.warn(`[BLOCKED] ${ip} — Redis cache hit`)
        return res.status(403).json({ error: 'Access denied', blocked: true, reason: 'IP_BLOCKED', ip })
      }
    }

    // CHECK 2 — MongoDB (source of truth, survives server restart)
    const dbBlock = await BlockedIP.findOne({ ip: { $in: candidateIPs } })
    if (dbBlock) {
      // Re-cache so next check is instant
      try {
        await cache.set(`blocked:${dbBlock.ip}`, { blocked: true, reason: dbBlock.reason }, 86400 * 365)
      } catch {}
      await BlockedIP.findOneAndUpdate({ ip: dbBlock.ip }, { $inc: { attemptCount: 1 }, lastAttempt: new Date() })
      broadcast('blocked_attempt', { ip: dbBlock.ip, method: 'DB_BLOCK', message: `Blocked IP ${dbBlock.ip} tried to access (re-cached)`, timestamp: new Date().toISOString() })
      logger.warn(`[BLOCKED] ${dbBlock.ip} — MongoDB hit, re-cached`)
      return res.status(403).json({ error: 'Access denied', blocked: true, reason: 'IP_BLOCKED', ip: dbBlock.ip })
    }

    // CHECK 3 — Fingerprint block (survives IP change)
    if (fingerprint) {
      let fpCached = null
      try {
        fpCached = await cache.get(`blocked:fp:${fingerprint}`)
      } catch {}

      if (fpCached?.blocked) {
        broadcast('blocked_attempt', { ip: candidateIPs[0], fingerprint: fingerprint.substr(0,8)+'...', method: 'FINGERPRINT_BLOCK', message: `Blocked fingerprint tried from new IP ${candidateIPs[0]}`, timestamp: new Date().toISOString() })
        return res.status(403).json({ error: 'Access denied', blocked: true, reason: 'FINGERPRINT_BLOCKED' })
      }

      const dbFpBlock = await BlockedFingerprint.findOne({ fingerprint })
      if (dbFpBlock) {
        try {
          await cache.set(`blocked:fp:${fingerprint}`, { blocked: true }, 86400 * 365)
        } catch {}
        broadcast('blocked_attempt', { ip: candidateIPs[0], method: 'FINGERPRINT_BLOCK', message: `Blocked fingerprint from DB tried from ${candidateIPs[0]}`, timestamp: new Date().toISOString() })
        return res.status(403).json({ error: 'Access denied', blocked: true, reason: 'FINGERPRINT_BLOCKED' })
      }
    }

    // Not blocked — proceed. If local, assign host public IP so real IP is preserved everywhere
    req.clientIP = (isLocal && hostPublicIP) ? hostPublicIP : rawIP
    req.clientFingerprint = fingerprint
    next()
  } catch (err) {
    logger.error(`[BLOCK CHECK ERROR] ${err.message}`)
    next() // Never block on error — fail open
  }
}
