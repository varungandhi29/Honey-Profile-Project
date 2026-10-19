import express from 'express'
import cors from 'cors'
import Redis from 'ioredis'
import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

const HONEYSHIELD_BACKEND = process.env.HONEYSHIELD_BACKEND || 'http://localhost:3001'
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
const PORT = process.env.PORT || 3500

// Thresholds
const SUSPICIOUS_AFTER = 2
const REDIRECT_AFTER = 3
const BLOCK_AFTER = 5
const WINDOW_SECONDS = 300 // 5 minute window

// Resilient Storage Layer: Redis with In-Memory fallback
let isRedisConnected = false
const memStore = new Map()
const memExpirations = new Map()

const redis = new Redis(REDIS_URL, {
  retryStrategy: (times) => {
    if (times > 3) {
      return null // Stop retrying aggressively; fallback to memory
    }
    return Math.min(times * 500, 2000)
  },
  maxRetriesPerRequest: 1,
  lazyConnect: true
})

redis.connect().then(() => {
  isRedisConnected = true
  console.log(`[BRIDGE] Connected to Redis at ${REDIS_URL}`)
}).catch((err) => {
  console.warn(`[BRIDGE] Redis unavailable (${err.message}) — using in-memory storage store`)
})

redis.on('connect', () => {
  isRedisConnected = true
  console.log('[BRIDGE] Redis connected')
})

redis.on('error', (err) => {
  if (isRedisConnected) {
    console.warn(`[BRIDGE] Redis connection dropped: ${err.message}`)
  }
  isRedisConnected = false
})

// Unified Key-Value Store abstraction
const store = {
  get: async (key) => {
    if (isRedisConnected) {
      try { return await redis.get(key) } catch {}
    }
    const exp = memExpirations.get(key)
    if (exp && exp < Date.now()) {
      memStore.delete(key)
      memExpirations.delete(key)
      return null
    }
    return memStore.get(key) || null
  },
  set: async (key, value) => {
    if (isRedisConnected) {
      try { return await redis.set(key, value) } catch {}
    }
    memStore.set(key, value)
    memExpirations.delete(key)
    return 'OK'
  },
  setex: async (key, seconds, value) => {
    if (isRedisConnected) {
      try { return await redis.setex(key, seconds, value) } catch {}
    }
    memStore.set(key, value)
    memExpirations.set(key, Date.now() + seconds * 1000)
    return 'OK'
  },
  del: async (key) => {
    if (isRedisConnected) {
      try { return await redis.del(key) } catch {}
    }
    memStore.delete(key)
    memExpirations.delete(key)
    return 1
  },
  keys: async (pattern) => {
    if (isRedisConnected) {
      try { return await redis.keys(pattern) } catch {}
    }
    const prefix = pattern.replace('*', '')
    const now = Date.now()
    const result = []
    for (const [k, v] of memStore.entries()) {
      const exp = memExpirations.get(k)
      if (exp && exp < now) {
        memStore.delete(k)
        memExpirations.delete(k)
        continue
      }
      if (k.startsWith(prefix)) {
        result.push(k)
      }
    }
    return result
  }
}

// POST /api/bridge/check — check if IP should be redirected or blocked
app.post('/api/bridge/check', async (req, res) => {
  const { ip, username, fingerprint } = req.body

  // Check permanent IP block
  const permBlock = await store.get(`fp_block:${ip}`)
  if (permBlock) {
    return res.json({ action: 'BLOCK', reason: 'PERMANENTLY_BLOCKED' })
  }

  // Check fingerprint block
  if (fingerprint) {
    const fpBlock = await store.get(`fp_block:fp:${fingerprint}`)
    if (fpBlock) {
      return res.json({ action: 'BLOCK', reason: 'FINGERPRINT_BLOCKED' })
    }
  }

  // Get current attempt count
  const key = `bridge:attempts:${ip}:${username?.toLowerCase()}`
  const data = await store.get(key)
  const attempts = data ? JSON.parse(data) : { count: 0 }

  if (attempts.count >= REDIRECT_AFTER) {
    return res.json({
      action: 'REDIRECT_TO_HONEYPOT',
      currentAttempts: attempts.count
    })
  }

  res.json({
    action: 'ALLOW',
    currentAttempts: attempts.count
  })
})

// POST /api/bridge/failed-attempt — track a failed login
app.post('/api/bridge/failed-attempt', async (req, res) => {
  const { ip, username, fingerprint, reason, country, city, attemptNumber } = req.body
  const uname = username ? username.toLowerCase() : 'unknown'
  const key = `bridge:attempts:${ip}:${uname}`
  const existing = await store.get(key)
  const data = existing ? JSON.parse(existing) : { count: 0, firstAttempt: Date.now(), usernames: [] }

  const newData = {
    ...data,
    count: data.count + 1,
    lastAttempt: Date.now(),
    usernames: [...new Set([...(data.usernames || []), uname])],
    ip,
    country: country || 'Unknown',
    city: city || 'Unknown',
    fingerprint
  }

  await store.setex(key, WINDOW_SECONDS, JSON.stringify(newData))
  console.log(`[BRIDGE] ${ip} → ${uname}: attempt ${newData.count}`)

  // Notify HoneyShield admin about failed attempts
  await axios.post(`${HONEYSHIELD_BACKEND}/api/bridge/event`, {
    type: 'FAILED_LOGIN',
    ip,
    username: uname,
    country: country || 'Unknown',
    city: city || 'Unknown',
    attemptNumber: newData.count,
    source: 'FINANCE_PORTAL',
    message: `Failed login attempt ${newData.count} for user '${uname}' from ${ip}`,
    timestamp: new Date().toISOString()
  }, { timeout: 3000 }).catch(() => {})

  // Check permanent auto-block (>= 5 attempts)
  if (newData.count >= BLOCK_AFTER) {
    await store.set(`fp_block:${ip}`, JSON.stringify({ blocked: true, reason: 'Brute force attack' }))
    if (fingerprint) {
      await store.set(`fp_block:fp:${fingerprint}`, JSON.stringify({ blocked: true, reason: 'Brute force fingerprint' }))
    }

    await axios.post(`${HONEYSHIELD_BACKEND}/api/blocklist/sync`, {
      ip,
      reason: `Bridge auto-block: ${newData.count} failed attempts on Finance Portal`,
      source: 'BRIDGE_LAYER',
      fingerprint
    }, { timeout: 3000 }).catch(() => {})

    console.log(`[BRIDGE] ${ip} permanently blocked after ${newData.count} attempts`)
    return res.json({ action: 'BLOCK', count: newData.count })
  }

  // Check redirect threshold (>= 3 attempts)
  if (newData.count >= REDIRECT_AFTER) {
    await axios.post(`${HONEYSHIELD_BACKEND}/api/bridge/event`, {
      type: 'ATTACKER_REDIRECTED',
      ip,
      username: uname,
      country: country || 'Unknown',
      city: city || 'Unknown',
      attemptNumber: newData.count,
      source: 'FINANCE_PORTAL',
      message: `Attacker redirected to honeypot after ${newData.count} attempts on '${uname}'`,
      playSiren: true,
      timestamp: new Date().toISOString()
    }, { timeout: 3000 }).catch(() => {})

    console.log(`[BRIDGE] ${ip} redirected to honeypot after ${newData.count} attempts`)
    return res.json({ action: 'REDIRECT_TO_HONEYPOT', count: newData.count })
  }

  // Check suspicious activity threshold (>= 2 attempts)
  if (newData.count >= SUSPICIOUS_AFTER) {
    await axios.post(`${HONEYSHIELD_BACKEND}/api/bridge/event`, {
      type: 'SUSPICIOUS_ACTIVITY',
      ip,
      username: uname,
      country: country || 'Unknown',
      city: city || 'Unknown',
      attemptNumber: newData.count,
      source: 'FINANCE_PORTAL',
      message: `${newData.count} failed attempts on '${uname}' — monitoring suspicious IP`,
      timestamp: new Date().toISOString()
    }, { timeout: 3000 }).catch(() => {})
  }

  res.json({ action: 'DENY', count: newData.count })
})

// POST /api/bridge/successful-login — clear attempts on successful employee login
app.post('/api/bridge/successful-login', async (req, res) => {
  const { ip, username } = req.body
  const uname = username ? username.toLowerCase() : 'unknown'
  const key = `bridge:attempts:${ip}:${uname}`
  await store.del(key)
  console.log(`[BRIDGE] ${ip} → ${uname}: successful login — attempts cleared`)
  res.json({ success: true })
})

// GET /api/bridge/stats — bridge statistics for admin
app.get('/api/bridge/stats', async (req, res) => {
  try {
    const keys = await store.keys('bridge:attempts:*')
    const stats = []
    for (const key of keys) {
      const data = await store.get(key)
      if (data) stats.push(JSON.parse(data))
    }

    const blockedKeys = await store.keys('fp_block:*')

    res.json({
      activeTracking: stats.length,
      totalAttempts: stats.reduce((s, d) => s + (d.count || 0), 0),
      redirected: stats.filter(d => (d.count || 0) >= REDIRECT_AFTER).length,
      blocked: blockedKeys.length + stats.filter(d => (d.count || 0) >= BLOCK_AFTER).length,
      details: stats
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Health check
app.get('/health', (req, res) => res.json({ status: 'healthy', timestamp: new Date().toISOString() }))
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', service: 'BridgeLayer Service', port: PORT, redis: isRedisConnected })
})

app.listen(PORT, () => console.log(`[BRIDGE] Bridge layer running on port ${PORT}`))
