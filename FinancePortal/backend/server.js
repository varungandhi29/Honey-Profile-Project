import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import axios from 'axios'
import Employee from './models/Employee.js'
import { generateDashboardData, getReports, getInvoices, getClients } from './data/financeData.js'

const app = express()
app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

const BRIDGE_URL = process.env.BRIDGE_URL || 'http://localhost:3500'
const JWT_SECRET = process.env.JWT_SECRET || 'finance-portal-secret-2024'
const PORT = process.env.PORT || 4000
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/financeportal'
const HONEYPOT_URL = process.env.HONEYPOT_URL || 'https://honeyprofile.vercel.app'

// Real employee accounts — legitimate employees
const REAL_EMPLOYEES = [
  { username:'j.smith', password:'JSmith$ecure99!', name:'John Smith', title:'Chief Executive Officer', dept:'Executive', clearance:'EXECUTIVE' },
  { username:'s.johnson', password:'$arahJ@Finance24', name:'Sarah Johnson', title:'Chief Financial Officer', dept:'Finance', clearance:'EXECUTIVE' },
  { username:'m.williams', password:'MikeW!Tech2024', name:'Mike Williams', title:'Chief Technology Officer', dept:'Technology', clearance:'EXECUTIVE' },
  { username:'l.davis', password:'Li$aD@CISO2024', name:'Lisa Davis', title:'Chief Information Security Officer', dept:'Security', clearance:'EXECUTIVE' },
  { username:'a.wilson', password:'Al!ceW@Finance', name:'Alice Wilson', title:'Finance Manager', dept:'Finance', clearance:'FINANCE' },
  { username:'b.moore', password:'B0bM00re@Corp', name:'Bob Moore', title:'Senior Accountant', dept:'Finance', clearance:'FINANCE' },
  { username:'t.taylor', password:'T0mT@yl0r2024', name:'Tom Taylor', title:'Senior Engineer', dept:'Engineering', clearance:'STANDARD' },
  { username:'hr.manager', password:'HR@Manager2024!', name:'HR Manager', title:'Human Resources Director', dept:'HR', clearance:'HR' },
  { username:'it.admin', password:'ITAdm!n@Corp24', name:'IT Admin', title:'IT Administrator', dept:'IT', clearance:'IT' },
  { username:'analyst', password:'An@lyst2024Corp', name:'Data Analyst', title:'Financial Analyst', dept:'Finance', clearance:'FINANCE' },
]

// In-memory employee store fallback for standalone/local resilience
let memoryEmployees = []

const seedEmployees = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      const count = await Employee.countDocuments()
      if (count === 0) {
        for (const emp of REAL_EMPLOYEES) {
          const passwordHash = await bcrypt.hash(emp.password, 10)
          await Employee.create({ ...emp, passwordHash })
        }
        console.log(`[FINANCE] Seeded ${REAL_EMPLOYEES.length} real employee accounts in MongoDB`)
      }
    }
  } catch (err) {
    console.warn(`[FINANCE] MongoDB seeding skipped (${err.message}). Using in-memory fallback.`)
  }

  // Always initialize in-memory fallback
  if (memoryEmployees.length === 0) {
    memoryEmployees = await Promise.all(REAL_EMPLOYEES.map(async emp => ({
      ...emp,
      passwordHash: await bcrypt.hash(emp.password, 10)
    })))
    console.log(`[FINANCE] In-memory employee store initialized with ${memoryEmployees.length} records`)
  }
}

// Connect to MongoDB if available
mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 2000 })
  .then(() => {
    console.log('[FINANCE] Connected to MongoDB')
    seedEmployees()
  })
  .catch((err) => {
    console.warn(`[FINANCE] MongoDB not reachable (${err.message}) — running with resilient in-memory fallback`)
    seedEmployees()
  })

// Find employee helper (DB first, fallback to memory)
const findEmployee = async (username) => {
  const uname = username.toLowerCase()
  if (mongoose.connection.readyState === 1) {
    try {
      const emp = await Employee.findOne({ username: uname })
      if (emp) return emp
    } catch {}
  }
  return memoryEmployees.find(e => e.username.toLowerCase() === uname) || null
}

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { username, password, ip, fingerprint, lat, lng, country, city } = req.body
  const clientIP = ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1'

  try {
    // STEP 1 — Ask bridge if this IP should be redirected to honeypot or blocked
    const bridgeCheck = await axios.post(`${BRIDGE_URL}/api/bridge/check`, {
      ip: clientIP,
      username,
      fingerprint
    }, { timeout: 3000 }).then(r => r.data).catch(() => ({ action: 'ALLOW', currentAttempts: 0 }))

    if (bridgeCheck.action === 'REDIRECT_TO_HONEYPOT') {
      console.log(`[BRIDGE] Redirecting ${clientIP} to honeypot`)
      return res.json({
        redirect: true,
        honeypotUrl: HONEYPOT_URL,
        username,
        reason: 'THRESHOLD_EXCEEDED'
      })
    }

    if (bridgeCheck.action === 'BLOCK') {
      return res.status(403).json({ error: 'Access denied', blocked: true })
    }

    // STEP 2 — Validate real credentials
    const employee = await findEmployee(username)

    if (!employee) {
      // Report failed attempt to bridge
      const bridgeResponse = await axios.post(`${BRIDGE_URL}/api/bridge/failed-attempt`, {
        ip: clientIP,
        username,
        fingerprint,
        reason: 'USER_NOT_FOUND',
        country: country || 'Unknown',
        city: city || 'Unknown',
        attemptNumber: (bridgeCheck.currentAttempts || 0) + 1
      }, { timeout: 3000 }).then(r => r.data).catch(() => ({ action: 'DENY', count: 1 }))

      if (bridgeResponse.action === 'REDIRECT_TO_HONEYPOT') {
        return res.json({
          redirect: true,
          honeypotUrl: HONEYPOT_URL,
          username,
          reason: 'THRESHOLD_EXCEEDED'
        })
      }

      await new Promise(r => setTimeout(r, 600 + Math.random() * 400))
      return res.status(401).json({
        error: 'Invalid credentials',
        attemptCount: bridgeResponse.count || 1,
        warning: bridgeResponse.count >= 2 ? 'Multiple failed attempts detected' : null
      })
    }

    const validPassword = await bcrypt.compare(password, employee.passwordHash)

    if (!validPassword) {
      // Report failed attempt to bridge
      const bridgeResponse = await axios.post(`${BRIDGE_URL}/api/bridge/failed-attempt`, {
        ip: clientIP,
        username,
        fingerprint,
        reason: 'WRONG_PASSWORD',
        country: country || 'Unknown',
        city: city || 'Unknown',
        attemptNumber: (bridgeCheck.currentAttempts || 0) + 1
      }, { timeout: 3000 }).then(r => r.data).catch(() => ({ action: 'DENY', count: 1 }))

      // Check if bridge now instructs to redirect
      if (bridgeResponse.action === 'REDIRECT_TO_HONEYPOT') {
        return res.json({
          redirect: true,
          honeypotUrl: HONEYPOT_URL,
          username,
          reason: 'THRESHOLD_EXCEEDED'
        })
      }

      if (bridgeResponse.action === 'BLOCK') {
        return res.status(403).json({ error: 'Access denied. Account locked.', blocked: true })
      }

      await new Promise(r => setTimeout(r, 600 + Math.random() * 400))
      return res.status(401).json({
        error: 'Invalid credentials',
        attemptCount: bridgeResponse.count || 1,
        warning: bridgeResponse.count >= 2 ? 'Multiple failed attempts detected' : null
      })
    }

    // STEP 3 — Valid login — report success to bridge to reset failure counter
    await axios.post(`${BRIDGE_URL}/api/bridge/successful-login`, {
      ip: clientIP,
      username,
      fingerprint,
      country: country || 'Unknown',
      city: city || 'Unknown'
    }, { timeout: 3000 }).catch(() => {})

    // Generate JWT
    const token = jwt.sign(
      { username: employee.username, name: employee.name, dept: employee.dept, clearance: employee.clearance },
      JWT_SECRET,
      { expiresIn: '8h' }
    )

    console.log(`[FINANCE] Legitimate login: ${username} from ${clientIP}`)
    return res.json({
      success: true,
      token,
      user: {
        username: employee.username,
        name: employee.name,
        title: employee.title,
        dept: employee.dept,
        clearance: employee.clearance
      }
    })
  } catch (err) {
    console.error('[FINANCE] Login error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
})

// Auth middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

// GET /api/dashboard — employee dashboard data
app.get('/api/dashboard', authMiddleware, async (req, res) => {
  const dashboardData = await generateDashboardData(req.user)
  res.json(dashboardData)
})

// GET /api/reports — financial reports
app.get('/api/reports', authMiddleware, async (req, res) => {
  res.json(await getReports(req.user))
})

// GET /api/invoices — invoice list
app.get('/api/invoices', authMiddleware, async (req, res) => {
  res.json(await getInvoices(req.user))
})

// GET /api/clients — client data
app.get('/api/clients', authMiddleware, async (req, res) => {
  if (!['FINANCE', 'EXECUTIVE'].includes(req.user.clearance)) {
    return res.status(403).json({ error: 'Insufficient clearance' })
  }
  res.json(await getClients())
})

// Health check
app.get('/health', (req, res) => res.json({ status: 'healthy', timestamp: new Date().toISOString() }))
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', service: 'FinancePortal Backend', port: PORT })
})

app.listen(PORT, () => console.log(`[FINANCE] Backend running on port ${PORT}`))
