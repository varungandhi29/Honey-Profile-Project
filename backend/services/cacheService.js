import { createClient } from 'redis'
import logger from '../middleware/logger.js'

let client = null
let isConnected = false
const memCache = new Map()

let redisAttempted = false

export const initCache = async () => {
  const isProd = process.env.NODE_ENV === 'production'
  const redisUrl = process.env.REDIS_URL

  if (!redisUrl || redisUrl === 'mock') {
    if (isProd) {
      logger.error('[FATAL] REDIS_URL is unset or unconfigured in production. Refusing to start without persistent Redis cache.')
      process.exit(1)
    }
    logger.warn('[CACHE WARNING] REDIS_URL is unset or mock. Using in-memory fallback for development only.')
    return null
  }

  if (redisAttempted && client) return client
  redisAttempted = true

  try {
    client = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: false
      }
    })
    client.on('error', err => logger.error(`Redis: ${err.message}`))
    client.on('connect', () => { isConnected = true; logger.info('[REDIS] Connected successfully') })
    client.on('disconnect', () => { isConnected = false })

    await client.connect()
    isConnected = true
    return client
  } catch (err) {
    if (isProd) {
      logger.error(`[FATAL] Persistent Redis connection failed in production: ${err.message}. Refusing to start with ephemeral in-memory cache.`)
      process.exit(1)
    }
    logger.warn(`Redis connect failed: ${err.message}. Using in-memory fallback for development only.`)
    client = null
    return null
  }
}

const getClient = async () => {
  if (client && isConnected) return client
  if (!redisAttempted) {
    return await initCache()
  }
  return client
}

export const cache = {
  async set(key, value, ttl = 3600) {
    try {
      const c = await getClient()
      if (c) {
        await c.setEx(key, ttl, JSON.stringify(value))
      } else {
        memCache.set(key, JSON.stringify(value))
      }
    } catch {
      memCache.set(key, JSON.stringify(value))
    }
  },
  async get(key) {
    try {
      const c = await getClient()
      const v = c ? await c.get(key) : memCache.get(key)
      return v ? JSON.parse(v) : null
    } catch {
      const v = memCache.get(key)
      return v ? JSON.parse(v) : null
    }
  },
  async del(key) {
    try {
      const c = await getClient()
      if (c) {
        await c.del(key)
      } else {
        memCache.delete(key)
      }
    } catch {
      memCache.delete(key)
    }
  },
  async increment(key, ttl = 86400) {
    try {
      const c = await getClient()
      if (c) {
        const v = await c.incr(key)
        if (v === 1) await c.expire(key, ttl)
        return v
      }
    } catch {}
    
    // In-memory increment fallback
    try {
      const currentVal = memCache.get(key)
      const parsedVal = currentVal ? JSON.parse(currentVal) : 0
      const newVal = Number(parsedVal) + 1
      memCache.set(key, JSON.stringify(newVal))
      return newVal
    } catch {
      return 0
    }
  },
  async flush() {
    try {
      const c = await getClient()
      if (c) await c.flushAll()
    } catch {}
    memCache.clear()
  },
  isConnected: () => isConnected || !process.env.REDIS_URL || process.env.REDIS_URL === 'mock'
}

