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
import { cache } from '../services/cacheService.js'
import logger from '../middleware/logger.js'
import { encrypt } from '../services/dataVaultService.js'

const router = express.Router()

// POST /api/honeypot/login — main honeypot login endpoint
router.post('/login', async (req, res) => {
  const ip = req.ip || req.connection?.remoteAddress || 'Unknown'
  const { username, password, fingerprint, lat, lng, country, city, browser, os } = req.body || {}

  logger.info(`[HONEYPOT LOGIN] Attempt: ${username || 'anonymous'} from ${ip}`)

  // STEP 1 — Check if already blocked
  const ipBlocked = await cache.get(`blocked:${ip}`)
  if (ipBlocked?.blocked) {
    broadcast('blocked_attempt', {
      ip,
      username,
      method: 'IP_BLOCK',
      message: `Previously blocked ${ip} tried to login as ${username}`,
      timestamp: new Date().toISOString()
    })
    return res.status(403).json({ error: 'Blocked', blocked: true, reason: 'IP_BLOCKED' })
  }

  // STEP 2 — Run attack detection
  const detection = await detectAttackVector(req, { username, password, fingerprint })

  // STEP 3 — Try to validate employee credentials
  const { valid, employee } = await validateEmployee(username, password)

  // STEP 4 — Determine response based on detection + credentials
  const isTrap = valid // They found a decoy account — this is a trap!

  if (detection.autoBlock) {
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
    sourceCountry: country || 'Unknown',
    sourceCity: city || 'Unknown',
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
