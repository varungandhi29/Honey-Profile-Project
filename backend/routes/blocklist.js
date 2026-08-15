import express from 'express'
import mongoose from 'mongoose'
import BlockedIP from '../models/BlockedIP.js'
import BlockedFingerprint from '../models/BlockedFingerprint.js'
import Session from '../models/Session.js'
import Attack from '../models/Attack.js'
import { cache } from '../services/cacheService.js'
import { broadcast } from '../services/broadcastService.js'
import logger from '../middleware/logger.js'

const router = express.Router()

// GET /api/blocklist — get all blocked IPs
router.get('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const blocked = await BlockedIP.find().sort({ blockedAt: -1 })
      return res.json(blocked)
    }
    res.json([])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/blocklist — block an IP
router.post('/', async (req, res) => {
  try {
    const { ip, blockedBy, reason, permanent, expiresAt } = req.body
    if (!ip) return res.status(400).json({ error: 'IP required' })

    let blocked = { ip, blockedBy: blockedBy || 'admin', reason: reason || 'Manual block by admin', blockedAt: new Date() }
    let terminatedCount = 0

    if (mongoose.connection.readyState === 1) {
      try {
        const attackCount = await Attack.countDocuments({ sourceIP: ip })
        const session = await Session.findOne({ ip })

        blocked = await BlockedIP.findOneAndUpdate(
          { ip },
          {
            ip, blockedBy: blockedBy || 'admin',
            reason: reason || 'Manual block by admin',
            attackCount, permanent: permanent !== false,
            expiresAt: expiresAt || null,
            country: session?.country || 'Unknown',
            city: session?.city || 'Unknown',
            blockedAt: new Date()
          },
          { upsert: true, new: true }
        )

        const sessions = await Session.updateMany(
          { ip, role: { $ne: 'ADMIN' }, username: { $ne: 'admin' }, isActive: true },
          { isActive: false, isBlocked: true, logoutTime: new Date() }
        )
        terminatedCount = sessions.modifiedCount
      } catch (e) {
        logger.warn(`[BLOCK DB WARNING] ${e.message}`)
      }
    }

    // ALWAYS Cache blocked IP for fast lookup
    await cache.set(`blocked:${ip}`, { blocked: true, reason: blocked.reason || reason || 'Manual block by admin', blockedAt: new Date() }, 86400 * 365)

    // Broadcast to admin
    broadcast('ip_blocked', {
      ip, blockedBy: blocked.blockedBy || 'admin', reason: blocked.reason || 'Manual block',
      sessionsTerminated: terminatedCount,
      timestamp: new Date().toISOString()
    })

    logger.info(`[BLOCK] IP ${ip} blocked by ${blockedBy} — reason: ${reason}`)
    res.json({ success: true, blocked, sessionsTerminated: terminatedCount })
  } catch (err) {
    logger.error(`Block IP error: ${err.message}`)
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/blocklist/:ip — unblock IP
router.delete('/:ip', async (req, res) => {
  try {
    const ip = decodeURIComponent(req.params.ip)
    await BlockedIP.deleteOne({ ip })
    await cache.del(`blocked:${ip}`)
    broadcast('ip_unblocked', { ip, timestamp: new Date().toISOString() })
    logger.info(`[UNBLOCK] IP ${ip} unblocked`)
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/blocklist/check/:ip — check if IP is blocked
router.get('/check/:ip', async (req, res) => {
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
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/blocklist/fingerprint — block a fingerprint
router.post('/fingerprint', async (req, res) => {
  try {
    const { fingerprint, blockedBy, reason, associatedIPs } = req.body
    if (!fingerprint) return res.status(400).json({ error: 'Fingerprint required' })

    let blocked = { fingerprint, blockedBy: blockedBy || 'admin', reason: reason || 'Manual block', associatedIPs: associatedIPs || [], blockedAt: new Date() }
    if (mongoose.connection.readyState === 1) {
      try {
        blocked = await BlockedFingerprint.findOneAndUpdate(
          { fingerprint },
          { fingerprint, blockedBy: blockedBy || 'admin', reason: reason || 'Manual block', associatedIPs: associatedIPs || [], blockedAt: new Date() },
          { upsert: true, new: true }
        )
      } catch (e) {
        logger.warn(`[BLOCK FP DB WARNING] ${e.message}`)
      }
    }

    // ALWAYS Cache fingerprint block
    await cache.set(`blocked:fp:${fingerprint}`, { blocked: true, reason: blocked.reason || reason || 'Manual block' }, 86400 * 365)

    broadcast('fingerprint_blocked', {
      fingerprint: fingerprint.substr(0, 8) + '...',
      associatedIPs, blockedBy,
      timestamp: new Date().toISOString()
    })

    logger.info(`[BLOCK] Fingerprint ${fingerprint.substr(0,8)}... blocked by ${blockedBy}`)
    res.json({ success: true, blocked })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/blocklist/fingerprints — list all blocked fingerprints
router.get('/fingerprints', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      return res.json(await BlockedFingerprint.find().sort({ blockedAt: -1 }))
    }
    res.json([])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE /api/blocklist/fingerprint/:fp — unblock fingerprint
router.delete('/fingerprint/:fp', async (req, res) => {
  try {
    const fp = decodeURIComponent(req.params.fp)
    await BlockedFingerprint.deleteOne({ fingerprint: fp })
    await cache.del(`blocked:fp:${fp}`)
    broadcast('fingerprint_unblocked', { fingerprint: fp, timestamp: new Date().toISOString() })
    logger.info(`[UNBLOCK] Fingerprint ${fp.substr(0,8)}... unblocked`)
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

export default router
