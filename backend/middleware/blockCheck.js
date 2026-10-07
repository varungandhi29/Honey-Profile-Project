import BlockedIP from '../models/BlockedIP.js'
import BlockedFingerprint from '../models/BlockedFingerprint.js'
import { broadcast } from '../services/broadcastService.js'
import logger from '../middleware/logger.js'
import { getHostPublicIP } from './geoip.js'
import { cache } from '../services/cacheService.js'
import { isAdminAuthenticated } from './auth.js'

/**
 * Normalizes an IPv6 address and extracts its 64-bit network prefix.
 * e.g., '2405:201:201a:d8ca:f5f2:c43a:e2cb:6699' -> '2405:0201:201a:d8ca'
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
 * Centralized, authoritative block state verification across all stacks and devices.
 * Checks:
 * 1. Exact IPs (IPv4 & IPv6)
 * 2. IPv6 /64 Subnet Prefixes (cross-browser / cross-tool containment)
 * 3. Associated IPs linked to the session/device
 * 4. Browser Fingerprint
 * 5. Hardware Fingerprint (invariant across Chrome, Edge, Brave, Incognito on the same machine)
 */
export async function verifyBlockState({ candidateIPs = [], fingerprint = null, hardwareFingerprint = null }) {
  const cleanIPs = candidateIPs.map(ip => ip ? ip.replace('::ffff:', '').trim() : '').filter(Boolean)
  const prefixes = cleanIPs.map(getIPv6Prefix).filter(Boolean)

  // 1. FAST REDIS CHECKS
  // Check exact IPs
  for (const ip of cleanIPs) {
    try {
      const cached = await cache.get(`blocked:${ip}`)
      if (cached?.blocked) {
        return { blocked: true, reason: 'IP_BLOCKED', matchedTarget: ip, method: 'REDIS_IP' }
      }
    } catch {}
  }

  // Check IPv6 Subnet prefixes
  for (const prefix of prefixes) {
    try {
      const cachedSubnet = await cache.get(`blocked:subnet:${prefix}`)
      if (cachedSubnet?.blocked) {
        return { blocked: true, reason: 'SUBNET_BLOCKED', matchedTarget: prefix, method: 'REDIS_SUBNET' }
      }
    } catch {}
  }

  // Check hardware fingerprint (cross-browser / cross-tool on same device)
  if (hardwareFingerprint) {
    try {
      const cachedHw = await cache.get(`blocked:hw:${hardwareFingerprint}`)
      if (cachedHw?.blocked) {
        return { blocked: true, reason: 'PERMANENT_DEVICE_BAN', matchedTarget: hardwareFingerprint, method: 'REDIS_HW' }
      }
    } catch {}
  }

  // Check browser fingerprint
  if (fingerprint) {
    try {
      const cachedFp = await cache.get(`blocked:fp:${fingerprint}`)
      if (cachedFp?.blocked) {
        return { blocked: true, reason: 'FINGERPRINT_BLOCKED', matchedTarget: fingerprint, method: 'REDIS_FP' }
      }
    } catch {}
  }

  // 2. AUTHORITATIVE MONGODB CHECKS
  // Check BlockedIP by IP, Subnet Prefix, or Associated IPs
  const ipQueries = [{ ip: { $in: cleanIPs } }]
  if (prefixes.length > 0) {
    ipQueries.push({ subnetPrefix: { $in: prefixes } })
  }
  ipQueries.push({ associatedIPs: { $in: cleanIPs } })

  const dbBlock = await BlockedIP.findOne({ $or: ipQueries })
  if (dbBlock) {
    // Re-cache for future instant lookups
    try {
      await cache.set(`blocked:${dbBlock.ip}`, { blocked: true, reason: dbBlock.reason }, 86400 * 365)
      if (dbBlock.subnetPrefix) {
        await cache.set(`blocked:subnet:${dbBlock.subnetPrefix}`, { blocked: true, reason: dbBlock.reason }, 86400 * 365)
      }
    } catch {}

    return {
      blocked: true,
      reason: dbBlock.subnetPrefix && prefixes.includes(dbBlock.subnetPrefix) ? 'SUBNET_BLOCKED' : 'IP_BLOCKED',
      matchedTarget: dbBlock.ip,
      method: 'DB_IP'
    }
  }

  // Check BlockedFingerprint by fingerprint, hardwareFingerprint, or Associated IPs
  const fpQueries = []
  if (fingerprint) fpQueries.push({ fingerprint })
  if (hardwareFingerprint) fpQueries.push({ hardwareFingerprint })
  if (cleanIPs.length > 0) fpQueries.push({ associatedIPs: { $in: cleanIPs } })

  if (fpQueries.length > 0) {
    const dbFpBlock = await BlockedFingerprint.findOne({ $or: fpQueries })
    if (dbFpBlock) {
      try {
        if (dbFpBlock.fingerprint) await cache.set(`blocked:fp:${dbFpBlock.fingerprint}`, { blocked: true }, 86400 * 365)
        if (dbFpBlock.hardwareFingerprint) await cache.set(`blocked:hw:${dbFpBlock.hardwareFingerprint}`, { blocked: true }, 86400 * 365)
      } catch {}

      return {
        blocked: true,
        reason: 'PERMANENT_DEVICE_BAN',
        matchedTarget: dbFpBlock.hardwareFingerprint || dbFpBlock.fingerprint,
        method: 'DB_FP'
      }
    }
  }

  return { blocked: false }
}

export const checkBlockStatus = async (req, res, next) => {
  try {
    // 0. OWNER & ADMIN EXEMPTION GUARANTEE
    // Never block admin authentication or verify endpoints
    if (req.path.startsWith('/admin-login') || req.path.startsWith('/verify') || req.path.startsWith('/unblock-owner')) {
      return next()
    }

    // Check if request is authenticated as System Administrator (varun@g)
    const isAdmin = await isAdminAuthenticated(req)
    if (isAdmin) {
      // Authenticated admin is always allowed access
      return next()
    }

    let rawIP = req.body?.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['x-real-ip'] || req.ip || req.connection?.remoteAddress || 'Unknown'
    rawIP = rawIP.replace('::ffff:', '').trim()
    const fingerprint = req.body?.fingerprint || req.headers['x-fingerprint'] || req.query?.fingerprint
    const hardwareFingerprint = req.body?.hardwareFingerprint || req.headers['x-hardware-fingerprint'] || req.query?.hardwareFingerprint

    const isLocal = rawIP === '::1' || rawIP === '127.0.0.1' || rawIP.startsWith('127.') || rawIP === 'localhost' || rawIP === 'Unknown'
    const hostPublicIP = getHostPublicIP()

    const candidateIPs = [rawIP]
    if (isLocal && hostPublicIP && !candidateIPs.includes(hostPublicIP)) {
      candidateIPs.push(hostPublicIP)
    }

    // Include associated IPs sent in body if any
    if (Array.isArray(req.body?.associatedIPs)) {
      for (const aip of req.body.associatedIPs) {
        if (aip && !candidateIPs.includes(aip)) candidateIPs.push(aip)
      }
    }

    const result = await verifyBlockState({ candidateIPs, fingerprint, hardwareFingerprint })

    if (result.blocked) {
      broadcast('blocked_attempt', {
        ip: candidateIPs[0],
        matchedTarget: result.matchedTarget,
        method: result.method,
        reason: result.reason,
        hardwareFingerprint: hardwareFingerprint ? hardwareFingerprint.substr(0, 12) + '...' : null,
        message: `Blocked client tried to access (${result.reason})`,
        timestamp: new Date().toISOString()
      })
      logger.warn(`[BLOCKED] Request denied: ${result.reason} (matched: ${result.matchedTarget}, method: ${result.method})`)
      return res.status(403).json({
        error: 'Access denied: Permanently blocked across all software, applications, and tools.',
        blocked: true,
        reason: result.reason,
        ip: candidateIPs[0]
      })
    }

    // Not blocked — proceed
    req.clientIP = (isLocal && hostPublicIP) ? hostPublicIP : rawIP
    req.clientFingerprint = fingerprint
    req.hardwareFingerprint = hardwareFingerprint
    next()
  } catch (err) {
    logger.error(`[BLOCK CHECK ERROR] ${err.message}`)
    next() // Fail open on internal error to avoid accidental lockouts
  }
}
