import express from 'express'
import BlockedIP from '../models/BlockedIP.js'
import Session from '../models/Session.js'
import Attack from '../models/Attack.js'
import { cache } from '../services/cacheService.js'
import { broadcast } from '../services/broadcastService.js'
import logger from '../middleware/logger.js'

const router = express.Router()

// GET /api/blocklist — get all blocked IPs
router.get('/', async (req, res) => {
  try {
    const blocked = await BlockedIP.find().sort({ blockedAt: -1 })
    res.json(blocked)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/blocklist — block an IP
router.post('/', async (req, res) => {
  try {
    const { ip, blockedBy, reason, permanent, expiresAt } = req.body
    if (!ip) return res.status(400).json({ error: 'IP required' })

    // Get attack history for this IP
    const attackCount = await Attack.countDocuments({ sourceIP: ip })
    const session = await Session.findOne({ ip })

    const blocked = await BlockedIP.findOneAndUpdate(
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

    // Cache blocked IP for fast lookup
    await cache.set(`blocked:${ip}`, { blocked: true, reason: blocked.reason, blockedAt: blocked.blockedAt }, 86400 * 365)

    // Terminate active sessions from this IP
    const sessions = await Session.updateMany(
      { ip, isActive: true },
      { isActive: false, isBlocked: true, logoutTime: new Date() }
    )

    // Broadcast to admin
    broadcast('ip_blocked', {
      ip, blockedBy: blocked.blockedBy, reason: blocked.reason,
      country: blocked.country, city: blocked.city,
      sessionsTerminated: sessions.modifiedCount,
      timestamp: new Date().toISOString()
    })

    logger.info(`[BLOCK] IP ${ip} blocked by ${blockedBy} — reason: ${reason}`)
    res.json({ success: true, blocked, sessionsTerminated: sessions.modifiedCount })
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

export default router
