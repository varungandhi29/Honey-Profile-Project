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
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use('/api/', apiLimiter)
app.use((req, res, next) => { logger.info(`${req.method} ${req.path} — ${req.ip}`); next() })

app.use('/api/session', sessionRoutes)
app.use('/api/alerts', alertRoutes)
app.use('/api/export', exportRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/blocklist', blocklistRoutes)

app.get('/api/health', async (req, res) => {
  res.json({ status: 'ok', version: '2.0.0', mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected', uptime: process.uptime(), timestamp: new Date().toISOString() })
})

let mongoServer
let mongoUri = process.env.MONGODB_URI

mongoose.set('bufferCommands', false)

const connectDB = async () => {
  if (!mongoUri || mongoUri === 'mock') {
    try {
      logger.info('[DB] Starting In-Memory MongoDB Server...')
      mongoServer = await MongoMemoryServer.create()
      mongoUri = mongoServer.getUri()
      logger.info(`[DB] In-Memory MongoDB Server running at ${mongoUri}`)
    } catch (err) {
      logger.error(`[DB] Failed to start In-Memory MongoDB: ${err.message}`)
    }
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000
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

connectDB()

mongoose.connection.on('disconnected', () => logger.warn('[DB] MongoDB disconnected'))
mongoose.connection.on('reconnected', () => logger.info('[DB] MongoDB reconnected'))

cron.schedule('0 * * * *', async () => {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const result = await Session.updateMany({ lastSeen: { $lt: cutoff }, isActive: true }, { isActive: false, logoutTime: new Date() })
  if (result.modifiedCount > 0) logger.info(`[CRON] Cleaned ${result.modifiedCount} stale sessions`)
})

app.use((err, req, res, next) => { logger.error(`Unhandled: ${err.message}`); res.status(500).json({ error: 'Internal server error' }) })

httpServer.listen(process.env.PORT || 3001, () => logger.info(`[SERVER] Running on http://localhost:${process.env.PORT || 3001}`))
