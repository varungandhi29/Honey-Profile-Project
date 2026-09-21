import './config.js'
import express from 'express'
import { createServer } from 'http'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import dotenv from 'dotenv'
import fs from 'fs'
import mongoose from 'mongoose'
import cron from 'node-cron'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { initSocket } from './socket.js'
import { initBroadcast } from './services/broadcastService.js'
import sessionRoutes from './routes/session.js'
import alertRoutes from './routes/alerts.js'
import exportRoutes from './routes/export.js'
import analyticsRoutes from './routes/analytics.js'
import aiRoutes from './routes/ai.js'
import blocklistRoutes from './routes/blocklist.js'
import vaultRoutes from './routes/vault.js'
import honeypotRoutes from './routes/honeypot.js'
import authRoutes from './routes/auth.js'
import { seedEmployees } from './services/employeeService.js'
import { permanentlyBlockAttacker } from './services/attackDetectionService.js'
import { broadcast } from './services/broadcastService.js'
import rateLimit from 'express-rate-limit'
import { apiLimiter } from './middleware/rateLimit.js'
import logger from './middleware/logger.js'
import Session from './models/Session.js'
import { initCache } from './services/cacheService.js'

dotenv.config()
const app = express()

// Trust single-hop reverse proxy (Railway edge proxy / Cloudflare)
// Ensures req.ip resolves to the true client IP while preventing X-Forwarded-For spoofing
app.set('trust proxy', 1)

const httpServer = createServer(app)
const io = initSocket(httpServer, process.env.FRONTEND_URL)
app.set('io', io)
initBroadcast(io)

app.use(helmet({ contentSecurityPolicy: false }))
app.use(compression())
const allowedOrigins = [process.env.FRONTEND_URL, 'http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173'].filter(Boolean)
app.use(cors({
  origin: (origin, callback) => {
    callback(null, true)
  },
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))
app.use('/api/', apiLimiter)
app.use((req, res, next) => { logger.info(`${req.method} ${req.path} — ${req.ip}`); next() })

// Strict rate limiting on login endpoint
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 10, // max 10 requests per minute per IP
  message: { error: 'Too many requests', blocked: true, reason: 'RATE_LIMITED' },
  handler: async (req, res, next, options) => {
    const ip = req.ip || req.connection?.remoteAddress || 'Unknown'
    // Auto-block after rate limit
    await permanentlyBlockAttacker(ip, 'Rate limit exceeded — brute force', null, 'unknown')
    broadcast('attacker_auto_blocked', {
      ip,
      reason: 'Rate limit exceeded',
      autoBlock: true,
      playSiren: true,
      timestamp: new Date().toISOString()
    })
    res.status(429).json(options.message)
  },
  standardHeaders: true,
  legacyHeaders: false,
})

import { requireAdmin } from './middleware/auth.js'

if (!process.env.ADMIN_PASSWORD_HASH) {
  console.error('[FATAL] ADMIN_PASSWORD_HASH is unset in environment. Server refusing to start.')
  process.exit(1)
}

if (!process.env.VAULT_ENCRYPTION_KEY || !/^[0-9a-fA-F]{64}$/.test(process.env.VAULT_ENCRYPTION_KEY)) {
  console.error('[FATAL] VAULT_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). Refusing to start.')
  process.exit(1)
}

app.use('/api/honeypot/login', loginLimiter)
app.use('/api/honeypot', honeypotRoutes)
app.use('/api/session', sessionRoutes)
app.use('/api/alerts', requireAdmin, alertRoutes)
app.use('/api/export', requireAdmin, exportRoutes)
app.use('/api/analytics', requireAdmin, analyticsRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/blocklist', blocklistRoutes)
app.use('/api/vault', requireAdmin, vaultRoutes)
app.use('/api/auth', authRoutes)

import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const frontendDist = path.join(__dirname, '../frontend/dist')

app.use(express.static(frontendDist))

app.get('/api/health', async (req, res) => {
  res.json({
    status: 'ok',
    version: '2.0.0',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    mongoUri: mongoUri || (mongoServer ? mongoServer.getUri() : null),
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  })
})

mongoose.set('bufferCommands', false)

let mongoServer
let mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL

const connectDB = async () => {
  if (mongoUri && mongoUri.startsWith('mongodb') && mongoUri !== 'mock') {
    try {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000
      })
      logger.info('[DB] Persistent MongoDB connected successfully')
      return
    } catch (err) {
      if (process.env.NODE_ENV === 'production') {
        logger.error(`[FATAL] Persistent MongoDB connection failed in production: ${err.message}. Refusing to start with ephemeral database.`)
        process.exit(1)
      }
      logger.warn(`[DB] Persistent MongoDB connection failed: ${err.message}`)
    }
  } else if (process.env.NODE_ENV === 'production') {
    logger.error('[FATAL] Neither MONGODB_URI nor MONGO_URL is configured in production. Refusing to start without persistent database.')
    process.exit(1)
  }

  // Development-only fallback:
  try {
    logger.warn('[DB WARNING] Starting In-Memory MongoDB Server for development only. Data will NOT persist across restarts!')
    if (mongoServer) {
      try { await mongoServer.stop() } catch {}
    }
    const instanceOpts = { dbName: `honeypot_${Date.now()}` }
    try {
      if (fs.existsSync('D:\\')) {
        const dDir = path.join('D:\\mongo-tmp', `hp_${Date.now()}`)
        fs.mkdirSync(dDir, { recursive: true })
        instanceOpts.dbPath = dDir
      }
    } catch {}
    mongoServer = await MongoMemoryServer.create({
      binary: { version: '8.2.1' },
      instance: instanceOpts
    })
    mongoUri = mongoServer.getUri()
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 })
    logger.info(`[DB] In-Memory MongoDB Server running at ${mongoUri}`)
  } catch (err) {
    logger.warn(`[DB] In-Memory MongoDB skipped: ${err.message}`)
  }
}

await initCache()
await connectDB()

const onDBConnected = async () => {
  logger.info('[DB] MongoDB connected and initialized')
  await seedEmployees()
  // Clear stale sessions from previous runs
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
  try {
    const cleared = await Session.updateMany(
      { lastSeen: { $lt: twoHoursAgo }, isActive: true },
      { isActive: false, logoutTime: new Date() }
    )
    if (cleared.modifiedCount > 0) {
      logger.info(`[STARTUP] Auto-cleared ${cleared.modifiedCount} stale sessions`)
    }
  } catch (e) {
    logger.warn(`[STARTUP] Error auto-clearing stale sessions: ${e.message}`)
  }
}

if (mongoose.connection.readyState === 1) {
  await onDBConnected()
} else {
  mongoose.connection.once('open', onDBConnected)
}

mongoose.connection.on('disconnected', () => logger.warn('[DB] MongoDB disconnected'))
mongoose.connection.on('reconnected', () => logger.info('[DB] MongoDB reconnected'))

cron.schedule('0 * * * *', async () => {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const result = await Session.updateMany({ lastSeen: { $lt: cutoff }, isActive: true }, { isActive: false, logoutTime: new Date() })
  if (result.modifiedCount > 0) logger.info(`[CRON] Cleaned ${result.modifiedCount} stale sessions`)
})

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return next()
  }
  const indexPath = path.join(frontendDist, 'index.html')
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.json({ message: 'HoneyShield Backend Active', status: 'ok', timestamp: new Date().toISOString() })
    }
  })
})

app.use((err, req, res, next) => { logger.error(`Unhandled: ${err.message}`); res.status(500).json({ error: 'Internal server error' }) })

httpServer.listen(process.env.PORT || 3001, () => logger.info(`[SERVER] Running on http://localhost:${process.env.PORT || 3001}`))
