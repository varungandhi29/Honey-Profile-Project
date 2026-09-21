import express from 'express'
import crypto from 'crypto'
import rateLimit from 'express-rate-limit'
import mongoose from 'mongoose'
import { cache } from '../services/cacheService.js'
import { isAdminAuthenticated, requireAdmin } from '../middleware/auth.js'
import logger from '../middleware/logger.js'
import AuditLog from '../models/AuditLog.js'

import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })
dotenv.config()

const router = express.Router()

const ADMIN_USER = process.env.ADMIN_USERNAME
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH

if (!ADMIN_PASSWORD_HASH) {
  logger.error('[FATAL] ADMIN_PASSWORD_HASH is unset. Refusing to initialize admin auth.')
  process.exit(1)
}

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

    // Secure bcrypt comparison against stored hash — NO other password or fallback can authenticate
    const activeHash = process.env.ADMIN_PASSWORD_HASH || ADMIN_PASSWORD_HASH
    const passwordValid = await bcrypt.compare(password, activeHash)
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
