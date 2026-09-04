import express from 'express'
import { createServer } from 'http'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import dotenv from 'dotenv'
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
import { seedEmployees } from './services/employeeService.js'
import { permanentlyBlockAttacker } from './services/attackDetectionService.js'
import { broadcast } from './services/broadcastService.js'
import rateLimit from 'express-rate-limit'
import { apiLimiter } from './middleware/rateLimit.js'
import logger from './middleware/logger.js'
import Session from './models/Session.js'

dotenv.config()
const app = express()

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

app.use('/api/honeypot/login', loginLimiter)
app.use('/api/honeypot', honeypotRoutes)
app.use('/api/session', sessionRoutes)
app.use('/api/alerts', alertRoutes)
app.use('/api/export', exportRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/blocklist', blocklistRoutes)
app.use('/api/vault', vaultRoutes)

import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const frontendDist = path.join(__dirname, '../frontend/dist')

app.use(express.static(frontendDist))

app.get('/api/health', async (req, res) => {
  res.json({ status: 'ok', version: '2.0.0', mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected', uptime: process.uptime(), timestamp: new Date().toISOString() })
})

mongoose.set('bufferCommands', false)

let mongoServer
let mongoUri = process.env.MONGODB_URI

const connectDB = async () => {
  if (!mongoUri || mongoUri === 'mock') {
    try {
      logger.info('[DB] Starting In-Memory MongoDB Server...')
      if (mongoServer) {
        try { await mongoServer.stop() } catch {}
      }
      mongoServer = await MongoMemoryServer.create({
        instance: { dbName: `honeypot_${Date.now()}` }
      })
      mongoUri = mongoServer.getUri()
      logger.info(`[DB] In-Memory MongoDB Server running at ${mongoUri}`)
    } catch (err) {
      logger.error(`[DB] Failed to start In-Memory MongoDB: ${err.message}`)
    }
  }

  if (mongoUri && mongoUri.startsWith('mongodb')) {
    try {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 2000
      })
      logger.info('[DB] MongoDB connected successfully')
    } catch (err) {
      logger.error(`[DB] MongoDB error: ${err.message}`)
      if (!mongoServer && mongoUri !== 'mock') {
        logger.warn('[DB] Connection failed. Retrying with In-Memory MongoDB Server...')
        mongoUri = 'mock'
        await connectDB()
      }
    }
  }
}

connectDB()

mongoose.connection.once('open', async () => {
  logger.info('[DB] MongoDB connected')
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
})

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
