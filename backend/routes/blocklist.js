import express from 'express'
import mongoose from 'mongoose'
import rateLimit from 'express-rate-limit'
import BlockedIP from '../models/BlockedIP.js'
import BlockedFingerprint from '../models/BlockedFingerprint.js'
import ExemptedIP from '../models/ExemptedIP.js'
import AuditLog from '../models/AuditLog.js'
import Session from '../models/Session.js'
import Attack from '../models/Attack.js'
import { cache } from '../services/cacheService.js'
import { broadcast } from '../services/broadcastService.js'
import { checkIPReputation } from '../services/ipReputationService.js'
import { detectLocation, resolveIPLocation } from '../middleware/geoip.js'
import { requireAdmin, isAdminAuthenticated } from '../middleware/auth.js'
import logger from '../middleware/logger.js'
import { getIPv6Prefix, verifyBlockState } from '../middleware/blockCheck.js'

const router = express.Router()

// Rate limiter for check-status per C2: max 40 requests per minute per IP
const checkStatusLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests', retryAfter: 10 }
})

// GET /api/blocklist — get all blocked IPs (Admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const blocked = await BlockedIP.find().sort({ blockedAt: -1 })
      return res.json(blocked)
    }
    res.json([])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/blocklist — block an IP (Admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { ip, reason, permanent, expiresAt, fingerprint, hardwareFingerprint, associatedIPs } = req.body
    const adminUsername = req.admin?.username || 'admin'
    if (!ip) return res.status(400).json({ error: 'IP required' })

    // SAFETY CHECK: Prevent administrator from blocking their own current connection IP
    const callerIP = req.ip?.replace('::ffff:', '').trim()
    if (callerIP && (callerIP === ip || (ip === '127.0.0.1' && callerIP === '::1'))) {
      logger.warn(`[BLOCK REJECTED] Admin ${adminUsername} attempted to block own connection IP: ${ip}`)
      return res.status(400).json({ error: 'Cannot block administrator current connection IP. Action rejected for safety.' })
    }

    const subnetPrefix = getIPv6Prefix(ip)
    let blocked = { ip, blockedBy: adminUsername, reason: reason || 'Manual block by admin', blockedAt: new Date() }
    let terminatedCount = 0
    let session = null

    if (mongoose.connection.readyState === 1) {
      try {
        const attackCount = await Attack.countDocuments({ sourceIP: ip })
        session = await Session.findOne({ ip, isActive: true })

        const allAssociatedIPs = [...new Set([
          ip,
          ...(session?.associatedIPs || []),
          ...(Array.isArray(associatedIPs) ? associatedIPs : [])
        ].filter(Boolean))]

        const geo = resolveIPLocation(ip)
        blocked = await BlockedIP.findOneAndUpdate(
          { ip },
          {
            ip,
            blockedBy: adminUsername,
            reason: reason || 'Manual block by admin',
            attackCount,
            permanent: permanent !== false,
            expiresAt: expiresAt || null,
            country: session?.country || geo?.country || 'Unknown',
            city: session?.city || geo?.city || 'Unknown',
            subnetPrefix,
            associatedIPs: allAssociatedIPs,
            hardwareHash: hardwareFingerprint || null,
            fingerprint: fingerprint || session?.fingerprintHash || null,
            blockedAt: new Date()
          },
          { upsert: true, new: true }
        )

        const sessions = await Session.updateMany(
          { ip, role: { $ne: 'ADMIN' }, username: { $ne: 'admin' }, isActive: true },
          { isActive: false, isBlocked: true, logoutTime: new Date() }
        )
        terminatedCount = sessions.modifiedCount

        // Record AuditLog
        await AuditLog.create({
          action: 'BLOCK_IP',
          target: ip,
          targetType: 'IP',
          admin: adminUsername,
          reason: reason || 'Manual block by admin',
          details: { permanent: permanent !== false, subnetPrefix, sessionsTerminated: terminatedCount }
        })
      } catch (e) {
        logger.warn(`[BLOCK DB WARNING] ${e.message}`)
      }
    }

    // Cache blocked IP and Subnet in Redis
    await cache.set(`blocked:${ip}`, { blocked: true, reason: blocked.reason || reason || 'Manual block by admin', blockedAt: new Date() }, 86400 * 365)
    if (subnetPrefix) {
      await cache.set(`blocked:subnet:${subnetPrefix}`, { blocked: true, reason: blocked.reason || reason }, 86400 * 365)
    }

    // Cache hardware fingerprint and browser fingerprint
    if (hardwareFingerprint) {
      await cache.set(`blocked:hw:${hardwareFingerprint}`, { blocked: true, reason: blocked.reason || reason }, 86400 * 365)
      if (mongoose.connection.readyState === 1) {
        await BlockedFingerprint.findOneAndUpdate(
          { hardwareFingerprint },
          {
            fingerprint: fingerprint || hardwareFingerprint,
            hardwareFingerprint,
            blockedBy: adminUsername,
            reason: reason || 'Manual block by admin',
            associatedIPs: [ip],
            blockedAt: new Date()
          },
          { upsert: true, new: true }
        )
      }
    }
    if (fingerprint) {
      await cache.set(`blocked:fp:${fingerprint}`, { blocked: true, reason: blocked.reason || reason }, 86400 * 365)
    }

    // After saving block, broadcast session_blocked immediately to enforce real-time block
    const sessionToNotify = session || await Session.findOne({ ip, isActive: true }).catch(() => null)
    broadcast('session_blocked', {
      sessionId: sessionToNotify?.sessionId,
      ip,
      subnetPrefix,
      hardwareFingerprint,
      username: sessionToNotify?.username,
      reason: req.body.reason || 'Blocked by admin',
      timestamp: new Date().toISOString()
    })
    broadcast('ip_blocked', {
      ip,
      subnetPrefix,
      hardwareFingerprint,
      blockedBy: adminUsername,
      reason: blocked.reason || 'Manual block',
      sessionsTerminated: session ? 1 : terminatedCount,
      timestamp: new Date().toISOString()
    })

    logger.info(`[BLOCK] IP ${ip} (Subnet: ${subnetPrefix || 'N/A'}) blocked by ${adminUsername} — reason: ${reason}`)
    res.json({ success: true, blocked, sessionsTerminated: terminatedCount })
  } catch (err) {
    logger.error(`Block IP error: ${err.message}`)
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/blocklist/:ip — unblock IP completely
router.delete('/:ip', async (req, res) => {
  try {
    const ip = decodeURIComponent(req.params.ip)
    const reason = req.body?.reason || 'Admin manually unblocked'

    logger.info(`[UNBLOCK] Attempting to unblock: ${ip}`)

    // Step 1 — Remove from MongoDB completely
    const deleteResult = await BlockedIP.deleteOne({ ip })
    logger.info(`[UNBLOCK] MongoDB delete: ${deleteResult.deletedCount} documents removed`)

    // Step 2 — Remove from Redis cache
    try {
      await cache.del(`blocked:${ip}`)
      await cache.del(`fails:${ip}`)
      await cache.del(`rapid:${ip}`)
      logger.info(`[UNBLOCK] Redis cache cleared for ${ip}`)
    } catch (redisErr) {
      logger.warn(`[UNBLOCK] Redis clear failed (continuing): ${redisErr.message}`)
    }

    // Step 3 — Find and remove all fingerprints associated with this IP
    const relatedFingerprints = await BlockedFingerprint.find({ associatedIPs: ip })
    for (const fp of relatedFingerprints) {
      try { await cache.del(`blocked:fp:${fp.fingerprint}`) } catch {}
      logger.info(`[UNBLOCK] Cleared fingerprint: ${fp.fingerprint.substr(0,8)}...`)
    }
    await BlockedFingerprint.deleteMany({ associatedIPs: ip })

    // Step 4 — Also check if any fingerprints were blocked with this IP as primary
    const primaryFpBlocks = await BlockedFingerprint.find({ 'associatedIPs.0': ip })
    for (const fp of primaryFpBlocks) {
      try { await cache.del(`blocked:fp:${fp.fingerprint}`) } catch {}
    }

    // Step 5 — Also unblock active sessions in MongoDB if any
    try {
      await Session.updateMany(
        { ip },
        { isBlocked: false, unblockedAt: new Date() }
      )
    } catch {}

    // Step 6 — Broadcast unblock event to admin dashboard
    try {
      const io = req.app.get('io')
      if (io) {
        io.to(`ip:${ip}`).emit('client_unblocked', {
          type: 'IP',
          target: ip,
          timestamp: new Date().toISOString()
        })
      }
    } catch {}

    broadcast('ip_unblocked', {
      ip,
      reason,
      unblocked: true,
      fingerprintsCleared: relatedFingerprints.length,
      timestamp: new Date().toISOString()
    })

    logger.info(`[UNBLOCK] SUCCESS: ${ip} fully unblocked — ${reason}`)
    res.json({
      success: true,
      unblocked: ip,
      reason,
      mongoDeleted: deleteResult.deletedCount,
      fingerprintsCleared: relatedFingerprints.length
    })
  } catch (err) {
    logger.error(`[UNBLOCK ERROR] ${err.message}`)
    res.status(500).json({ error: err.message, success: false })
  }
})


// POST /api/blocklist/fingerprint — block a fingerprint (Admin only)
router.post('/fingerprint', requireAdmin, async (req, res) => {
  try {
    const { fingerprint, reason, associatedIPs } = req.body
    const adminUsername = req.admin.username
    if (!fingerprint) return res.status(400).json({ error: 'Fingerprint required' })

    let blocked = { fingerprint, blockedBy: adminUsername, reason: reason || 'Manual block', associatedIPs: associatedIPs || [], blockedAt: new Date() }
    if (mongoose.connection.readyState === 1) {
      try {
        blocked = await BlockedFingerprint.findOneAndUpdate(
          { fingerprint },
          { fingerprint, blockedBy: adminUsername, reason: reason || 'Manual block', associatedIPs: associatedIPs || [], blockedAt: new Date() },
          { upsert: true, new: true }
        )

        // Record AuditLog
        await AuditLog.create({
          action: 'BLOCK_FP',
          target: fingerprint,
          targetType: 'FINGERPRINT',
          admin: adminUsername,
          reason: reason || 'Manual block by admin',
          details: { associatedIPs: associatedIPs || [] }
        })
      } catch (e) {
        logger.warn(`[BLOCK FP DB WARNING] ${e.message}`)
      }
    }

    await cache.set(`blocked:fp:${fingerprint}`, { blocked: true, reason: blocked.reason || reason || 'Manual block' }, 86400 * 365)

    broadcast('fingerprint_blocked', {
      fingerprint: fingerprint.substr(0, 8) + '...',
      associatedIPs,
      blockedBy: adminUsername,
      timestamp: new Date().toISOString()
    })

    logger.info(`[BLOCK] Fingerprint ${fingerprint.substr(0,8)}... blocked by ${adminUsername}`)
    res.json({ success: true, blocked })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/blocklist/fingerprints — list all blocked fingerprints (Admin only)
router.get('/fingerprints', requireAdmin, async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      return res.json(await BlockedFingerprint.find().sort({ blockedAt: -1 }))
    }
    res.json([])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/blocklist/fingerprint/:fp — unblock fingerprint only (Admin only)
router.delete('/fingerprint/:fp', requireAdmin, async (req, res) => {
  const fp = decodeURIComponent(req.params.fp)
  const adminUsername = req.admin.username
  const cleared = {
    fingerprint: false,
    redisFP: false
  }
  const errors = []

  let existingFP = null
  if (mongoose.connection.readyState === 1) {
    try {
      existingFP = await BlockedFingerprint.findOne({ fingerprint: fp })
      const delResult = await BlockedFingerprint.deleteOne({ fingerprint: fp })
      cleared.fingerprint = delResult.deletedCount > 0
    } catch (e) {
      errors.push(`MongoDB BlockedFingerprint delete failed: ${e.message}`)
    }
  }

  try {
    await cache.del(`blocked:fp:${fp}`)
    cleared.redisFP = true
  } catch (e) {
    errors.push(`Redis blocked:fp:${fp} del failed: ${e.message}`)
  }

  if (mongoose.connection.readyState === 1) {
    try {
      await AuditLog.create({
        action: 'UNBLOCK_FP',
        target: fp,
        targetType: 'FINGERPRINT',
        admin: adminUsername,
        reason: req.body?.reason || 'Unblocked device by admin',
        details: { cleared, errors }
      })
    } catch (e) {
      errors.push(`AuditLog write failed: ${e.message}`)
    }
  }

  try {
    const io = req.app.get('io')
    if (io) {
      io.to(`fp:${fp}`).emit('client_unblocked', {
        type: 'FINGERPRINT',
        target: fp,
        timestamp: new Date().toISOString()
      })
    }
    broadcast('fingerprint_unblocked', { fingerprint: fp, admin: adminUsername, timestamp: new Date().toISOString() })
  } catch (e) {
    errors.push(`Socket emit failed: ${e.message}`)
  }

  const success = errors.length === 0
  const notice = (!existingFP && !cleared.fingerprint) ? 'Fingerprint was not blocked in database (idempotent no-op)' : undefined

  logger.info(`[UNBLOCK_FP] Fingerprint ${fp.substr(0,8)}... unblocked by ${adminUsername} (success: ${success})`)
  res.status(success ? 200 : 207).json({
    success,
    notice,
    cleared,
    errors
  })
})

// POST /api/blocklist/unblock-self — strictly disabled to prevent attackers from bypassing containment
router.post('/unblock-self', async (req, res) => {
  logger.warn(`[UNBLOCK_SELF REJECTED] Adversary attempted self-unblock from IP: ${req.ip}`)
  return res.status(403).json({
    error: 'Access denied: Self-unblocking is permanently prohibited. Containment is enforced across all tools and software.',
    blocked: true
  })
})

// POST /api/blocklist/unblock-client — unblock both IP and Fingerprint for this client (Admin only)
router.post('/unblock-client', requireAdmin, async (req, res) => {
  const { ip, fingerprint, hardwareFingerprint, reason } = req.body || {}
  const adminUsername = req.admin.username
  if (!ip && !fingerprint && !hardwareFingerprint) {
    return res.status(400).json({ error: 'At least IP, fingerprint, or hardwareFingerprint is required' })
  }

  const cleared = {
    ip: false,
    fingerprint: false,
    hardwareFingerprint: false,
    redisBlocked: false,
    redisFails: false,
    redisRapid: false,
    redisFP: false,
    redisHW: false,
    sessionsUpdated: 0,
    vpnExempted: false
  }
  const errors = []

  // 1. Clear IP if provided
  if (ip) {
    const subnetPrefix = getIPv6Prefix(ip)
    if (mongoose.connection.readyState === 1) {
      try {
        const ipQ = [{ ip }]
        if (subnetPrefix) ipQ.push({ subnetPrefix })
        const delRes = await BlockedIP.deleteMany({ $or: ipQ })
        cleared.ip = delRes.deletedCount > 0
      } catch (e) {
        errors.push(`MongoDB BlockedIP delete failed: ${e.message}`)
      }
    }
    try { await cache.del(`blocked:${ip}`); cleared.redisBlocked = true } catch (e) { errors.push(`Redis blocked:${ip} del failed: ${e.message}`) }
    if (subnetPrefix) {
      try { await cache.del(`blocked:subnet:${subnetPrefix}`) } catch {}
    }
    try { await cache.del(`fails:${ip}`); cleared.redisFails = true } catch (e) { errors.push(`Redis fails:${ip} del failed: ${e.message}`) }
    try { await cache.del(`rapid:${ip}`); cleared.redisRapid = true } catch (e) { errors.push(`Redis rapid:${ip} del failed: ${e.message}`) }

    // Conditional VPN Exemption per C1
    try {
      const rawRep = await checkIPReputation(ip, { bypassExemption: true })
      if (rawRep.suspicious) {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
        if (mongoose.connection.readyState === 1) {
          await ExemptedIP.findOneAndUpdate(
            { ip },
            {
              ip,
              exemptedBy: adminUsername,
              reason: reason || 'Full client unblock by admin',
              originalReason: rawRep.label || 'Datacenter/VPN IP',
              exemptedAt: new Date(),
              expiresAt
            },
            { upsert: true, new: true }
          )
        }
        await cache.set(`exempt:vpn:${ip}`, { exempted: true, exemptedBy: adminUsername }, 86400)
        cleared.vpnExempted = true
      }
    } catch (e) {
      errors.push(`VPN exemption failed: ${e.message}`)
    }

    if (mongoose.connection.readyState === 1) {
      try {
        const sessRes = await Session.updateMany(
          { ip, isBlocked: true },
          { isBlocked: false, unblockedAt: new Date() }
        )
        cleared.sessionsUpdated = sessRes.modifiedCount
      } catch (e) {
        errors.push(`Session update failed: ${e.message}`)
      }
    }
  }

  // 2. Clear Fingerprint / Hardware Fingerprint if provided
  if (fingerprint || hardwareFingerprint) {
    if (mongoose.connection.readyState === 1) {
      try {
        const fpQ = []
        if (fingerprint) fpQ.push({ fingerprint })
        if (hardwareFingerprint) fpQ.push({ hardwareFingerprint })
        const fpDel = await BlockedFingerprint.deleteMany({ $or: fpQ })
        cleared.fingerprint = fpDel.deletedCount > 0
      } catch (e) {
        errors.push(`MongoDB BlockedFingerprint delete failed: ${e.message}`)
      }
      try {
        const fpSessRes = await Session.updateMany(
          {
            $or: [
              ...(fingerprint ? [{ fingerprintHash: fingerprint }, { 'fingerprint.hash': fingerprint }] : []),
              ...(hardwareFingerprint ? [{ hardwareFingerprint }] : [])
            ],
            isBlocked: true
          },
          { isBlocked: false, unblockedAt: new Date() }
        )
        cleared.sessionsUpdated = (cleared.sessionsUpdated || 0) + fpSessRes.modifiedCount
      } catch (e) {}
    }
    if (fingerprint) {
      try {
        await cache.del(`blocked:fp:${fingerprint}`)
        cleared.redisFP = true
      } catch (e) {
        errors.push(`Redis blocked:fp:${fingerprint} del failed: ${e.message}`)
      }
    }
    if (hardwareFingerprint) {
      try {
        await cache.del(`blocked:hw:${hardwareFingerprint}`)
        cleared.redisHW = true
      } catch (e) {}
    }
  }

  // 3. Single AuditLog entry with action UNBLOCK_CLIENT
  if (mongoose.connection.readyState === 1) {
    try {
      await AuditLog.create({
        action: 'UNBLOCK_CLIENT',
        target: `${ip || 'N/A'} / ${(fingerprint ? fingerprint.substr(0,16) + '...' : 'N/A')}`,
        targetType: 'CLIENT',
        admin: adminUsername,
        reason: reason || 'Full client unblock by admin',
        details: { ip, fingerprint, hardwareFingerprint, cleared, errors }
      })
    } catch (e) {
      errors.push(`AuditLog write failed: ${e.message}`)
    }
  }

  // 4. Targeted socket emission to rooms
  try {
    const io = req.app.get('io')
    if (io) {
      if (ip) io.to(`ip:${ip}`).emit('client_unblocked', { type: 'CLIENT', ip, fingerprint, hardwareFingerprint, timestamp: new Date().toISOString() })
      if (fingerprint) io.to(`fp:${fingerprint}`).emit('client_unblocked', { type: 'CLIENT', ip, fingerprint, hardwareFingerprint, timestamp: new Date().toISOString() })
    }
    if (ip) broadcast('ip_unblocked', { ip, admin: adminUsername, timestamp: new Date().toISOString() })
    if (fingerprint) broadcast('fingerprint_unblocked', { fingerprint, admin: adminUsername, timestamp: new Date().toISOString() })
  } catch (e) {
    errors.push(`Socket emit failed: ${e.message}`)
  }

  const success = errors.length === 0
  logger.info(`[UNBLOCK_CLIENT] IP ${ip || 'N/A'}, FP ${fingerprint ? fingerprint.substr(0,8)+'...' : 'N/A'} unblocked by ${adminUsername}`)
  res.status(success ? 200 : 207).json({
    success,
    cleared,
    errors
  })
})

// GET /api/blocklist/exemptions — list all active 24h VPN exemptions (Admin only)
router.get('/exemptions', requireAdmin, async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const exemptions = await ExemptedIP.find({ expiresAt: { $gt: new Date() } }).sort({ exemptedAt: -1 })
      return res.json(exemptions)
    }
    res.json([])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/blocklist/exemptions/:ip — revoke a 24h VPN exemption (Admin only)
router.delete('/exemptions/:ip', requireAdmin, async (req, res) => {
  try {
    const ip = decodeURIComponent(req.params.ip)
    if (mongoose.connection.readyState === 1) {
      await ExemptedIP.deleteOne({ ip })
    }
    await cache.del(`exempt:vpn:${ip}`)
    logger.info(`[EXEMPTION REVOKED] IP ${ip} by ${req.admin?.username}`)
    res.json({ success: true, message: `Exemption for ${ip} revoked` })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/blocklist/audit-logs — list recent audit records (Admin only)
router.get('/audit-logs', requireAdmin, async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(100)
      return res.json(logs)
    }
    res.json([])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Dev/test cache helpers — strictly excluded in production
if (process.env.NODE_ENV !== 'production') {
  // POST /api/blocklist/test-cache-del — dev/test cache deletion helper (Admin only)
  router.post('/test-cache-del', requireAdmin, async (req, res) => {
    const { key } = req.body || {}
    if (key) await cache.del(key)
    res.json({ success: true, key })
  })

  // POST /api/blocklist/test-cache-set — dev/test cache set helper (Admin only)
  router.post('/test-cache-set', requireAdmin, async (req, res) => {
    const { key, value, ttl } = req.body || {}
    if (key) await cache.set(key, value, ttl || 3600)
    res.json({ success: true, key })
  })
}

// GET /api/blocklist/check-status — secure, caller-only block check per C4 & C2
// NEVER accepts arbitrary IP parameter. Returns ONLY { blocked: true } or { blocked: false }.
router.get('/check-status', checkStatusLimiter, async (req, res) => {
  try {
    // 0. Check admin exemption first
    const isAdmin = await isAdminAuthenticated(req)
    if (isAdmin) {
      return res.json({ blocked: false, adminExempt: true })
    }

    const location = detectLocation(req)
    const clientIP = location.ip || req.ip || req.connection?.remoteAddress || '127.0.0.1'
    const candidateIPs = [clientIP]
    const rawReqIP = req.ip?.replace('::ffff:', '').trim()
    if (rawReqIP && !candidateIPs.includes(rawReqIP)) candidateIPs.push(rawReqIP)

    const submittedFP = req.query.fingerprint
    const submittedHW = req.query.hardwareFingerprint

    const result = await verifyBlockState({
      candidateIPs,
      fingerprint: submittedFP,
      hardwareFingerprint: submittedHW
    })

    if (result.blocked) {
      return res.json({
        blocked: true,
        reason: result.reason || 'PERMANENT_DEVICE_BAN'
      })
    }

    return res.json({ blocked: false })
  } catch (err) {
    logger.error(`[CHECK-STATUS ERROR] ${err.message}`)
    res.status(500).json({ blocked: false })
  }
})

// GET /api/blocklist/check/:ip — legacy admin check
router.get('/check/:ip', requireAdmin, async (req, res) => {
  try {
    const ip = decodeURIComponent(req.params.ip)
    const cached = await cache.get(`blocked:${ip}`)
    if (cached) return res.json({ blocked: true, ...cached })
    const blocked = await BlockedIP.findOne({ ip })
    if (blocked) {
      if (blocked.expiresAt && new Date() > blocked.expiresAt) {
        await BlockedIP.deleteOne({ ip })
        await cache.del(`blocked:${ip}`)
        return res.json({ blocked: false })
      }
      return res.json({ blocked: true, reason: blocked.reason, blockedAt: blocked.blockedAt })
    }
    res.json({ blocked: false })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
