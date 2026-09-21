import express from 'express'
import { broadcast } from '../services/broadcastService.js'
import BlockedIP from '../models/BlockedIP.js'
import { cache } from '../services/cacheService.js'
import logger from '../middleware/logger.js'

const router = express.Router()

// POST /api/bridge/event — receive events from bridge layer
router.post('/event', async (req, res) => {
  const { type, ip, username, country, city, attemptNumber, message, playSiren, source } = req.body
  logger.info(`[BRIDGE EVENT] ${type}: ${ip} → ${username} (attempt ${attemptNumber})`)

  // Broadcast to admin dashboard in real time
  broadcast('bridge_event', {
    type,
    ip,
    username,
    country: country || 'Unknown',
    city: city || 'Unknown',
    attemptNumber,
    message,
    playSiren,
    source: source || 'FINANCE_PORTAL',
    timestamp: new Date().toISOString()
  })

  // For redirect events — play siren and emit attacker_redirected_to_honeypot
  if (type === 'ATTACKER_REDIRECTED') {
    broadcast('attacker_redirected_to_honeypot', {
      ip,
      username,
      country: country || 'Unknown',
      city: city || 'Unknown',
      attemptNumber,
      message: message || `Attacker redirected from Finance Portal to HoneyShield`,
      playSiren: true,
      sirenType: 'CRITICAL',
      timestamp: new Date().toISOString()
    })
  }

  res.json({ success: true })
})

// POST /api/blocklist/sync — sync block from bridge layer
router.post('/blocklist/sync', async (req, res) => {
  const { ip, reason, source, fingerprint } = req.body
  try {
    await BlockedIP.findOneAndUpdate(
      { ip },
      { ip, blockedBy: source || 'BRIDGE_LAYER', reason, permanent: true, blockedAt: new Date() },
      { upsert: true, new: true }
    )
    await cache.set(`blocked:${ip}`, { blocked: true, reason }, 86400 * 365)
    logger.warn(`[BRIDGE SYNC] ${ip} blocked via bridge: ${reason}`)

    broadcast('ip_blocked', {
      ip,
      reason,
      blockedBy: source || 'BRIDGE_LAYER',
      source: 'BRIDGE_LAYER',
      timestamp: new Date().toISOString()
    })

    res.json({ success: true })
  } catch (err) {
    logger.error(`[BRIDGE SYNC ERROR] ${err.message}`)
    res.status(500).json({ error: err.message })
  }
})

export default router
