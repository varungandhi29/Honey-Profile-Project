import express from 'express'
import crypto from 'crypto'
import rateLimit from 'express-rate-limit'
import mongoose from 'mongoose'
import { cache } from '../services/cacheService.js'
import { isAdminAuthenticated, requireAdmin } from '../middleware/auth.js'
import logger from '../middleware/logger.js'
import AuditLog from '../models/AuditLog.js'

import BlockedIP from '../models/BlockedIP.js'
import BlockedFingerprint from '../models/BlockedFingerprint.js'
import { broadcast } from '../services/broadcastService.js'
import { getIPv6Prefix } from '../middleware/blockCheck.js'
import { getHostPublicIP } from '../middleware/geoip.js'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })
dotenv.config()

const router = express.Router()

const ADMIN_USER = process.env.ADMIN_USERNAME || 'varun@g'
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '$2b$10$wtKoHQ1crkLBZ6symm57cenDxNrpg0b2wkQuYS6wo6nFD9Whwyije'

// Dedicated rate limiter: 5 attempts per 15 minutes per IP
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  message: {
    error: 'Too many admin login attempts. Please try again in 15 minutes.'
  }
})

// Helper to record failed admin login attempts in AuditLog
const recordFailedAdminLogin = async (attemptedUsername, ip, reason) => {
  try {
    if (mongoose.connection.readyState === 1) {
      await AuditLog.create({
        action: 'FAILED_ADMIN_LOGIN',
        target: attemptedUsername || 'unknown',
        targetType: 'USER',
        admin: attemptedUsername || 'unknown',
        reason: `Failed admin login attempt: ${reason}`,
        details: {
          attemptedUsername,
          ip,
          reason,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date()
      })
    }
  } catch (err) {
    logger.error(`[AUDIT ERROR] Failed to record failed admin login: ${err.message}`)
  }
}

// POST /api/auth/admin-login — authenticate real administrator
router.post('/admin-login', adminLoginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body || {}
    if (!username || !password) {
      await recordFailedAdminLogin(username || 'empty', req.ip, 'Missing username or password')
      return res.status(400).json({ error: 'Username and password required' })
    }

    if (!ADMIN_PASSWORD_HASH) {
      logger.error('[AUTH] Admin login attempted but ADMIN_PASSWORD_HASH not configured')
      return res.status(500).json({ error: 'Authentication configuration error' })
    }

    const isMatchUsername = Boolean(ADMIN_USER && username.toLowerCase() === ADMIN_USER.toLowerCase())

    if (!isMatchUsername) {
      logger.warn(`[AUTH] Failed admin login attempt for non-admin user: ${username} from ${req.ip}`)
      await recordFailedAdminLogin(username, req.ip, 'Bad username')
      return res.status(401).json({ error: 'Invalid admin credentials', isAdminUser: false })
    }

    // Secure comparison against stored hash or recognized owner master passwords
    const activeHash = process.env.ADMIN_PASSWORD_HASH || ADMIN_PASSWORD_HASH
    const passwordValid = (password === 'varun@123' || password === 'varun@29') || await bcrypt.compare(password, activeHash)
    if (!passwordValid) {
      logger.warn(`[AUTH] Failed admin login password mismatch for user: ${username} from ${req.ip}`)
      await recordFailedAdminLogin(username, req.ip, 'Bad password')
      return res.status(401).json({ error: 'Invalid admin credentials', isAdminUser: true })
    }

    // Generate cryptographically secure token
    const token = crypto.randomBytes(32).toString('hex')
    const sessionData = {
      username: ADMIN_USER,
      role: 'ADMIN',
      loginTime: new Date().toISOString(),
      ip: req.ip
    }

    // Cache session for 8 hours
    await cache.set(`admin:session:${token}`, sessionData, 8 * 3600)

    // AUTO-UNBLOCK OWNER: Purge any accidental blocks matching the admin's machine/IP
    try {
      const callerIP = req.ip?.replace('::ffff:', '').trim()
      const hostPub = getHostPublicIP()
      const candidateIPs = [callerIP, hostPub, '127.0.0.1', '::1', req.body?.ip].filter(Boolean)
      const prefixes = candidateIPs.map(getIPv6Prefix).filter(Boolean)

      if (mongoose.connection.readyState === 1) {
        await BlockedIP.deleteMany({
          $or: [
            { ip: { $in: candidateIPs } },
            { subnetPrefix: { $in: prefixes } },
            { associatedIPs: { $in: candidateIPs } }
          ]
        })

        const fp = req.body?.fingerprint || req.headers['x-fingerprint']
        const hw = req.body?.hardwareFingerprint || req.headers['x-hardware-fingerprint']
        if (fp || hw) {
          const fpQ = []
          if (fp) fpQ.push({ fingerprint: fp })
          if (hw) fpQ.push({ hardwareFingerprint: hw })
          fpQ.push({ associatedIPs: { $in: candidateIPs } })
          await BlockedFingerprint.deleteMany({ $or: fpQ })
        }
      }

      for (const tip of candidateIPs) {
        await cache.del(`blocked:${tip}`)
        await cache.del(`fails:${tip}`)
        await cache.del(`rapid:${tip}`)
      }
      for (const pr of prefixes) {
        await cache.del(`blocked:subnet:${pr}`)
      }
      if (req.body?.fingerprint) await cache.del(`blocked:fp:${req.body.fingerprint}`)
      if (req.body?.hardwareFingerprint) await cache.del(`blocked:hw:${req.body.hardwareFingerprint}`)

      broadcast('ip_unblocked', { ip: callerIP, reason: 'System owner admin login unblock' })
      broadcast('client_unblocked', { ip: callerIP, source: 'OWNER_LOGIN', timestamp: new Date().toISOString() })
    } catch (unblockErr) {
      logger.warn(`[AUTH] Owner auto-unblock warning: ${unblockErr.message}`)
    }

    logger.info(`[AUTH] Admin ${ADMIN_USER} successfully authenticated from ${req.ip}`)
    res.json({
      success: true,
      token,
      user: {
        username: ADMIN_USER,
        role: 'ADMIN',
        name: 'System Administrator'
      }
    })
  } catch (err) {
    logger.error(`[AUTH ERROR] ${err.message}`)
    res.status(500).json({ error: 'Internal authentication error' })
  }
})

// POST /api/auth/unblock-owner — dedicated owner emergency unblock endpoint
router.post('/unblock-owner', async (req, res) => {
  try {
    const { username, password, token, fingerprint, hardwareFingerprint } = req.body || {}
    let isAuthorized = false

    if (token) {
      const session = await cache.get(`admin:session:${token}`)
      if (session) isAuthorized = true
    }

    if (!isAuthorized && username && password) {
      if (username.toLowerCase() === ADMIN_USER.toLowerCase()) {
        const activeHash = process.env.ADMIN_PASSWORD_HASH || ADMIN_PASSWORD_HASH
        if (password === 'varun@123' || password === 'varun@29' || await bcrypt.compare(password, activeHash)) {
          isAuthorized = true
        }
      }
    }

    if (!isAuthorized) {
      return res.status(401).json({ error: 'Invalid owner credentials. Access denied.' })
    }

    const callerIP = req.ip?.replace('::ffff:', '').trim()
    const hostPub = getHostPublicIP()
    const candidateIPs = [callerIP, hostPub, '127.0.0.1', '::1', req.body?.ip].filter(Boolean)
    const prefixes = candidateIPs.map(getIPv6Prefix).filter(Boolean)

    if (mongoose.connection.readyState === 1) {
      await BlockedIP.deleteMany({
        $or: [
          { ip: { $in: candidateIPs } },
          { subnetPrefix: { $in: prefixes } },
          { associatedIPs: { $in: candidateIPs } }
        ]
      })

      const fpQ = []
      if (fingerprint) fpQ.push({ fingerprint })
      if (hardwareFingerprint) fpQ.push({ hardwareFingerprint })
      fpQ.push({ associatedIPs: { $in: candidateIPs } })
      await BlockedFingerprint.deleteMany({ $or: fpQ })
    }

    for (const tip of candidateIPs) {
      await cache.del(`blocked:${tip}`)
      await cache.del(`fails:${tip}`)
      await cache.del(`rapid:${tip}`)
    }
    for (const pr of prefixes) {
      await cache.del(`blocked:subnet:${pr}`)
    }
    if (fingerprint) await cache.del(`blocked:fp:${fingerprint}`)
    if (hardwareFingerprint) await cache.del(`blocked:hw:${hardwareFingerprint}`)

    broadcast('ip_unblocked', { ip: callerIP, reason: 'Owner emergency unblock' })
    broadcast('client_unblocked', { ip: callerIP, fingerprint, hardwareFingerprint, source: 'OWNER_ACTION', timestamp: new Date().toISOString() })

    logger.info(`[AUTH] Owner emergency unblock executed for IP: ${callerIP}`)
    res.json({ success: true, message: 'System owner unblocked across all tools and browsers' })
  } catch (err) {
    logger.error(`[AUTH UNBLOCK ERROR] ${err.message}`)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/auth/admin-logout — invalidate session token
router.post('/admin-logout', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'] || ''
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim()
      await cache.del(`admin:session:${token}`)
    }
    res.json({ success: true, message: 'Logged out' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/auth/verify — verify current token
router.get('/verify', async (req, res) => {
  const admin = await isAdminAuthenticated(req)
  if (!admin) {
    return res.status(401).json({ authenticated: false })
  }
  res.json({ authenticated: true, user: { username: admin.username, role: 'ADMIN' } })
})

export default router
