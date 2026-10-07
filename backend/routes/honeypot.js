import express from 'express'
import bcrypt from 'bcryptjs'
import { detectAttackVector, permanentlyBlockAttacker } from '../services/attackDetectionService.js'
import { validateEmployee, getEmployeeList } from '../services/employeeService.js'
import { generateRandomEmployees } from '../data/employees.js'
import { broadcast } from '../services/broadcastService.js'
import Session from '../models/Session.js'
import Attack from '../models/Attack.js'
import HoneyLog from '../models/HoneyLog.js'
import Alert from '../models/Alert.js'
import Employee from '../models/Employee.js'
import BlockedFingerprint from '../models/BlockedFingerprint.js'
import mongoose from 'mongoose'
import { cache } from '../services/cacheService.js'
import logger from '../middleware/logger.js'
import { encrypt } from '../services/dataVaultService.js'
import { resolveIPLocation } from '../middleware/geoip.js'

const router = express.Router()

// POST /api/honeypot/login — main honeypot login endpoint
router.post('/login', async (req, res) => {
  let ip = req.body?.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.connection?.remoteAddress || 'Unknown'
  ip = ip.replace('::ffff:', '').trim()
  let { username, password, fingerprint, lat, lng, country, city, browser, os } = req.body || {}

  const isLocal = ip === '::1' || ip === '127.0.0.1' || ip.startsWith('127.') || ip === 'localhost' || ip === 'Unknown'
  if (isLocal) {
    const { getHostPublicIP } = await import('../middleware/geoip.js')
    ip = getHostPublicIP() || '49.36.77.174'
  }

  const geo = resolveIPLocation(ip)
  if (geo) {
    if (!country || country === 'Unknown' || country === 'Localhost') {
      country = (geo.country && geo.country !== 'Unknown') ? geo.country : (isLocal ? 'India' : 'External')
    }
    if (!city || city === 'Unknown' || city === 'Localhost') {
      city = (geo.city && geo.city !== 'Unknown') ? geo.city : (isLocal ? 'Vadodara' : (country || 'Remote'))
    }
    if (!lat || lat === 0) lat = geo.lat !== 0 ? geo.lat : (isLocal ? 22.3072 : 0)
    if (!lng || lng === 0) lng = geo.lng !== 0 ? geo.lng : (isLocal ? 73.1812 : 0)
  }

  logger.info(`[HONEYPOT LOGIN] Attempt: ${username || 'anonymous'} from ${ip}`)

  // STEP 1 — Check if already blocked (IP or persistent hardware Fingerprint)
  const ipBlocked = await cache.get(`blocked:${ip}`)
  if (ipBlocked?.blocked) {
    broadcast('blocked_attempt', {
      ip,
      username,
      method: 'IP_BLOCK',
      message: `Previously blocked IP ${ip} tried to login as ${username}`,
      timestamp: new Date().toISOString()
    })
    return res.status(403).json({ error: 'Blocked', blocked: true, reason: 'IP_BLOCKED' })
  }

  if (fingerprint) {
    const fpBlocked = await cache.get(`blocked:fp:${fingerprint}`)
    let isFpBlocked = fpBlocked?.blocked
    if (!isFpBlocked && mongoose.connection.readyState === 1) {
      const dbFp = await BlockedFingerprint.findOne({ fingerprint })
      if (dbFp) isFpBlocked = true
    }
    if (isFpBlocked) {
      broadcast('blocked_attempt', {
        ip,
        fingerprint,
        username,
        method: 'FINGERPRINT_BLOCK',
        message: `Blocked hardware fingerprint tried to login as ${username} from ${ip}`,
        timestamp: new Date().toISOString()
      })
      return res.status(403).json({ error: 'Blocked', blocked: true, reason: 'FINGERPRINT_BLOCKED' })
    }
  }

  const cleanU = (username || '').trim().toLowerCase()
  const cleanP = (password || '').trim()

  // STEP 2A — Check Enterprise Users (dhruv@l, rudra@b)
  let isEnterpriseUser = false
  let enterpriseUser = null
  if (cleanU === 'dhruv@l' && cleanP === 'dhruv@123') {
    isEnterpriseUser = true
    enterpriseUser = { username: 'dhruv@l', name: 'Dhruv Lad', role: 'USER', dept: 'Engineering', email: 'dhruv.lad@company.com' }
  } else if (cleanU === 'rudra@b' && cleanP === 'rudra@123') {
    isEnterpriseUser = true
    enterpriseUser = { username: 'rudra@b', name: 'Rudra Barot', role: 'USER', dept: 'Finance & Accounts', email: 'rudra.barot@company.com' }
  }

  if (isEnterpriseUser) {
    const sessionId = `USER-${enterpriseUser.username}-${Date.now()}`
    if (mongoose.connection.readyState === 1) {
      try {
        await Session.create({
          sessionId,
          username: enterpriseUser.username,
          name: enterpriseUser.name,
          role: 'USER',
          dept: enterpriseUser.dept,
          ip,
          country: country || 'Unknown',
          city: city || 'Unknown',
          browser: browser || 'Unknown',
          os: os || 'Unknown',
          lat: parseFloat(lat) || 0,
          lng: parseFloat(lng) || 0,
          state: 'NORMAL',
          riskScore: 5,
          loginTime: new Date(),
          isActive: true,
          fingerprint: fingerprint || {},
          timeline: [{
            timestamp: new Date(),
            action: 'USER_LOGIN',
            detail: `${enterpriseUser.name} logged into Enterprise Workspace`
          }]
        })
      } catch {}
    }
    broadcast('session_joined', { session: { sessionId, username: enterpriseUser.username, role: 'USER', ip, country, city, lat, lng, state: 'NORMAL', riskScore: 5 } })
    return res.json({
      success: true,
      trapped: false,
      sessionId,
      user: enterpriseUser
    })
  }

  // STEP 2B — Check Attacker Account (darshan@p / darshan@123)
  const isAttackerDemo = (cleanU === 'darshan@p' && cleanP === 'darshan@123')

  // STEP 2C — Run attack detection
  const detection = await detectAttackVector(req, { username, password, fingerprint })

  // STEP 3 — Try to validate employee credentials or attacker persona
  let { valid, employee } = await validateEmployee(username, password)
  if (isAttackerDemo) {
    valid = true
    employee = {
      username: 'darshan@p',
      name: 'Darshan Patel',
      role: 'ATTACKER',
      dept: 'External Adversary',
      email: 'darshan@adversary.io'
    }
  }

  // STEP 4 — Determine response based on detection + credentials
  const isTrap = valid // They found a decoy account or used the attacker persona — this is a trap!

  if (detection.autoBlock && !isAttackerDemo) {
    // Auto-block immediately — brute force, VPN, attack tool, etc.
    await permanentlyBlockAttacker(ip, detection.blockReason, fingerprint, username)

    // Log the attack
    const attack = await Attack.create({
      attackId: `ATK-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: detection.detectedVectors[0] || 'UNKNOWN',
      severity: detection.riskScore >= 70 ? 'CRITICAL' : 'HIGH',
      sourceIP: ip,
      sourceCountry: country || 'Unknown',
      sourceCity: city || 'Unknown',
      targetArea: `/auth/login → ${username || 'unknown'}`,
      riskDelta: detection.riskScore,
      sessionId: `BLOCKED-${ip}`,
      detectedVectors: detection.detectedVectors,
      userAgent: detection.userAgent,
      fingerprint
    })

    // Create alert
    const alert = await Alert.create({
      alertId: `ALERT-${Date.now()}`,
      severity: 'CRITICAL',
      title: `${(detection.detectedVectors[0] || 'ATTACK').replace(/_/g, ' ')} — Auto-Blocked`,
      description: `${detection.blockReason} from ${ip} targeting account ${username || 'unknown'}`,
      sessionId: `BLOCKED-${ip}`,
      status: 'New'
    })

    if (password) {
      try {
        await HoneyLog.create({
          logId: `HONEY-${Date.now()}-block`,
          sessionId: `BLOCKED-${ip}`,
          attackerIP: ip,
          attackerCountry: country || 'Unknown',
          action: 'LOGIN_ATTEMPT',
          fakeTarget: `/auth/login → ${username || 'unknown'}`,
          fakeCredential: encrypt(password),
          responseSimulated: '403 Blocked',
          deepTrap: false,
          timestamp: new Date()
        })
      } catch (e) {
        logger.warn(`[HONEYLOG ERROR] ${e.message}`)
      }
    }

    broadcast('new_attack', { attack, alert, detection })
    broadcast('new_alert', alert)

    return res.status(403).json({
      error: 'Blocked',
      blocked: true,
      reason: detection.detectedVectors[0] || 'ATTACK_DETECTED',
      vectors: detection.detectedVectors
    })
  }

  if (isTrap) {
    // Attacker found a decoy account — let them in but trap everything
    const sessionId = `TRAP-${username}-${Date.now()}`

    // Create trap session
    const session = await Session.create({
      sessionId,
      username: employee.username,
      role: 'ATTACKER',
      ip,
      country: country || 'Unknown',
      city: city || 'Unknown',
      browser: browser || 'Unknown',
      os: os || 'Unknown',
      lat: parseFloat(lat) || 0,
      lng: parseFloat(lng) || 0,
      state: 'ATTACKER',
      riskScore: 50,
      isHoneypotTrap: true,
      trappedEmployee: employee.name,
      trappedRole: employee.role,
      loginTime: new Date(),
      isActive: true,
      fingerprint: fingerprint || {},
      timeline: [{
        timestamp: new Date(),
        action: 'TRAP_LOGIN',
        detail: `Logged in as ${employee.name} (${employee.role})`
      }]
    })

    // Log honey interaction
    await HoneyLog.create({
      logId: `HONEY-${Date.now()}`,
      sessionId,
      attackerIP: ip,
      attackerCountry: country || 'Unknown',
      action: 'CREDENTIAL_TRAP',
      fakeTarget: `Employee account: ${employee.name} (${employee.role})`,
      fakeCredential: password ? encrypt(password) : null,
      responseSimulated: 'Fake corporate portal access granted',
      deepTrap: true,
      timestamp: new Date()
    })

    // Create HIGH alert
    const alert = await Alert.create({
      alertId: `ALERT-${Date.now()}`,
      severity: 'CRITICAL',
      title: `🍯 HONEY TRAP TRIGGERED — ${employee.role} Account Compromised`,
      description: `Attacker from ${ip} logged in as ${employee.name} (${employee.role}, ${employee.dept}). Real credentials used on decoy account.`,
      sessionId,
      status: 'New'
    })

    // Broadcast to admin with siren
    broadcast('honey_trap_triggered', {
      sessionId,
      ip,
      username: employee.username,
      employee: {
        name: employee.name,
        role: employee.role,
        dept: employee.dept
      },
      country: country || 'Unknown',
      city: city || 'Unknown',
      browser,
      os,
      lat: parseFloat(lat) || 0,
      lng: parseFloat(lng) || 0,
      playSiren: true,
      sirenType: 'CRITICAL',
      message: `🍯 TRAP: Attacker logged in as ${employee.name} (${employee.role})`,
      timestamp: new Date().toISOString()
    })

    broadcast('new_alert', alert)
    broadcast('session_joined', { session })
    broadcast('session_update', session)
    logger.warn(`[HONEY TRAP] ${ip} logged in as decoy employee ${employee.name} (${employee.role})`)

    // Return success — give them the fake environment
    return res.json({
      success: true,
      trapped: true,
      sessionId,
      user: {
        username: employee.username,
        name: employee.name,
        role: employee.role,
        dept: employee.dept,
        email: employee.email
      }
    })
  }

  // Failed login — not a trap account, not auto-blocked yet
  // Log failed attempt
  await Attack.create({
    attackId: `ATK-${Date.now()}-fail`,
    type: 'FAILED_LOGIN',
    severity: detection.riskScore >= 50 ? 'HIGH' : 'MEDIUM',
    sourceIP: ip,
    sourceCountry: country || 'India',
    sourceCity: city || 'Vadodara',
    sourceLat: parseFloat(lat) || 22.3072,
    sourceLng: parseFloat(lng) || 73.1812,
    targetArea: `/auth/login → ${username || 'unknown'}`,
    riskDelta: 10,
    sessionId: `FAIL-${ip}`,
    detectedVectors: detection.detectedVectors,
    userAgent: detection.userAgent,
    fingerprint
  })

  // Also log honeypot credential attempt if password was submitted
  if (password) {
    try {
      await HoneyLog.create({
        logId: `HONEY-${Date.now()}-fail`,
        sessionId: `FAIL-${ip}`,
        attackerIP: ip,
        attackerCountry: country || 'Unknown',
        action: 'LOGIN_ATTEMPT',
        fakeTarget: `/auth/login → ${username || 'unknown'}`,
        fakeCredential: encrypt(password),
        responseSimulated: '401 Invalid credentials',
        deepTrap: false,
        timestamp: new Date()
      })
    } catch (e) {
      logger.warn(`[HONEYLOG ERROR] ${e.message}`)
    }
  }

  if (detection.detectedVectors.length > 0) {
    broadcast('suspicious_login', {
      ip,
      username,
      vectors: detection.detectedVectors,
      riskScore: detection.riskScore,
      message: `Suspicious login attempt: ${detection.detectedVectors.join(', ')}`,
      timestamp: new Date().toISOString()
    })
  }

  // Add artificial delay to slow brute force (1-3 seconds)
  const delay = 1000 + Math.random() * 2000
  await new Promise(resolve => setTimeout(resolve, delay))

  return res.status(401).json({ error: 'Invalid credentials' })
})

// GET /api/honeypot/employees — admin only: list all decoy accounts
router.get('/employees', async (req, res) => {
  try {
    const employees = await getEmployeeList()
    res.json({ employees, total: employees.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/honeypot/employees/regenerate — regenerate random employees
router.post('/employees/regenerate', async (req, res) => {
  try {
    await Employee.deleteMany({ isRandom: true })
    const newEmployees = generateRandomEmployees(20)
    for (const emp of newEmployees) {
      const passwordHash = await bcrypt.hash(emp.password, 10)
      await Employee.create({ ...emp, passwordHash })
    }
    broadcast('employees_regenerated', { count: newEmployees.length, timestamp: new Date().toISOString() })
    res.json({ success: true, generated: newEmployees.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
