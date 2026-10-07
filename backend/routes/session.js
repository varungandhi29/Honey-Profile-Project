import express from 'express'
import mongoose from 'mongoose'
import Session from '../models/Session.js'
import Attack from '../models/Attack.js'
import HoneyLog from '../models/HoneyLog.js'
import Alert from '../models/Alert.js'
import BlockedIP from '../models/BlockedIP.js'
import BlockedFingerprint from '../models/BlockedFingerprint.js'
import { detectLocation, resolveIPLocation } from '../middleware/geoip.js'
import { cache } from '../services/cacheService.js'
import { calculateRisk, getState, getAIPrediction } from '../services/riskEngine.js'
import { checkIPReputation } from '../services/ipReputationService.js'
import { createAlert } from '../services/alertService.js'
import { isAdminAuthenticated } from '../middleware/auth.js'
import { broadcastAttack, broadcastHoney, broadcastSessionUpdate, broadcast } from '../services/broadcastService.js'
import logger from '../middleware/logger.js'
import { encrypt } from '../services/dataVaultService.js'
import { checkBlockStatus } from '../middleware/blockCheck.js'

const router = express.Router()

// Apply to EVERY route — first line after router declaration
router.use(checkBlockStatus)

// GET /api/session/init — detect real IP + geo + device
router.get('/init', async (req, res) => {
  try {
    const location = detectLocation(req)
    logger.info(`[INIT] ${location.ip} → ${location.city}, ${location.country} | ${location.browser}`)
    res.json(location)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/session/geo/:ip — lookup accurate geolocation for any IP
router.get('/geo/:ip', async (req, res) => {
  try {
    const rawIP = req.params.ip
    const location = resolveIPLocation(rawIP)
    res.json(location)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/session/register — save real session to MongoDB + Redis with VPN Auto-Block
router.post('/register', async (req, res) => {
  try {
    const data = req.body

    // C3: Gate admin exemption on an authenticated admin session, not client-supplied role
    const adminAuth = await isAdminAuthenticated(req)
    if (!adminAuth) {
      let clientIP = req.clientIP || data.ip || 'Unknown'
      const isLocal = clientIP === '::1' || clientIP === '127.0.0.1' || clientIP.startsWith('127.') || clientIP === 'localhost' || clientIP === 'Unknown'
      if (isLocal) {
        const { getHostPublicIP } = await import('../middleware/geoip.js')
        clientIP = getHostPublicIP() || '49.36.77.174'
      }

      let isExempted = false
      try {
        const exemptCached = await cache.get(`exempt:vpn:${clientIP}`)
        if (exemptCached?.exempted) isExempted = true
      } catch {}
      if (!isExempted && mongoose.connection.readyState === 1) {
        try {
          const { default: ExemptedIP } = await import('../models/ExemptedIP.js')
          const ex = await ExemptedIP.findOne({ ip: clientIP, expiresAt: { $gt: new Date() } })
          if (ex) isExempted = true
        } catch {}
      }

      const reputation = checkIPReputation(clientIP)
      if (reputation.suspicious && !isExempted) {
        const geo = resolveIPLocation(clientIP)
        const vpnCountry = (data.country && data.country !== 'Unknown' && data.country !== 'Localhost') ? data.country : (geo?.country && geo.country !== 'Unknown' ? geo.country : 'External')
        const vpnCity = (data.city && data.city !== 'Unknown' && data.city !== 'Localhost') ? data.city : (geo?.city && geo.city !== 'Unknown' ? geo.city : vpnCountry)

        // Permanently block this IP
        if (mongoose.connection.readyState === 1) {
          try {
            await BlockedIP.findOneAndUpdate(
              { ip: clientIP },
              {
                ip: clientIP,
                blockedBy: 'SYSTEM_AUTO',
                reason: `Auto-blocked: ${reputation.label} — ${reputation.reason}`,
                permanent: true,
                country: vpnCountry,
                city: vpnCity,
                blockedAt: new Date(),
                attemptCount: 1
              },
              { upsert: true, new: true }
            )
          } catch (e) {
            logger.error(`[VPN AUTO-BLOCK DB ERROR] ${e.message}`)
          }
        }
        // Cache the block for 1 year
        try {
          await cache.set(`blocked:${clientIP}`, { blocked: true, reason: `Auto-blocked: ${reputation.label}` }, 86400 * 365)
        } catch {}

        // Broadcast to admin — trigger siren
        broadcast('vpn_detected', {
          ip: clientIP,
          username: data.username,
          label: reputation.label,
          autoBlocked: true,
          playSiren: true,
          country: vpnCountry,
          city: vpnCity,
          message: `VPN/Proxy auto-blocked: ${clientIP} detected as ${reputation.label}`,
          timestamp: new Date().toISOString()
        })
        broadcast('ip_blocked', {
          ip: clientIP,
          blockedBy: 'SYSTEM_AUTO',
          reason: `Auto-blocked: ${reputation.label}`,
          country: vpnCountry,
          city: vpnCity,
          sessionsTerminated: 0,
          autoBlock: true,
          timestamp: new Date().toISOString()
        })

        logger.warn(`[VPN AUTO-BLOCK] ${clientIP} blocked as ${reputation.label}`)
        return res.status(403).json({
          error: 'Access denied',
          blocked: true,
          reason: 'VPN_PROXY_DETECTED',
          label: reputation.label,
          ip: clientIP
        })
      }
    }

    let clientIP = req.clientIP || data.ip || 'Unknown'
    const isLocal = clientIP === '::1' || clientIP === '127.0.0.1' || clientIP.startsWith('127.') || clientIP === 'localhost' || clientIP === 'Unknown'
    if (isLocal) {
      const { getHostPublicIP } = await import('../middleware/geoip.js')
      clientIP = getHostPublicIP() || '49.36.77.174'
    }

    let resolvedGeo = null
    if (clientIP && clientIP !== 'Unknown') {
      resolvedGeo = resolveIPLocation(clientIP)
    }

    const country = (data.country && data.country !== 'Unknown' && data.country !== 'Localhost') ? data.country : (resolvedGeo?.country && resolvedGeo.country !== 'Unknown' ? resolvedGeo.country : (isLocal ? 'India' : 'External'))
    const city = (data.city && data.city !== 'Unknown' && data.city !== 'Localhost') ? data.city : (resolvedGeo?.city && resolvedGeo.city !== 'Unknown' ? resolvedGeo.city : (isLocal ? 'Vadodara' : (country || 'Remote')))
    const region = data.region || resolvedGeo?.region || (isLocal ? 'Gujarat' : '')
    const lat = (typeof data.lat === 'number' && data.lat !== 0) ? data.lat : (resolvedGeo?.lat && resolvedGeo.lat !== 0 ? resolvedGeo.lat : (isLocal ? 22.3072 : 0))
    const lng = (typeof data.lng === 'number' && data.lng !== 0) ? data.lng : (resolvedGeo?.lng && resolvedGeo.lng !== 0 ? resolvedGeo.lng : (isLocal ? 73.1812 : 0))
    const timezone = data.timezone || resolvedGeo?.timezone || (isLocal ? 'Asia/Kolkata' : 'UTC')

    const sessionId = data.sessionId || `SESSION-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
    let session = {
      ...data,
      ip: clientIP,
      country,
      city,
      region,
      lat,
      lng,
      timezone,
      sessionId,
      isActive: true,
      isBlocked: false,
      logoutTime: null
    }
    if (mongoose.connection.readyState === 1) {
      try {
        if (clientIP || data.fingerprint) {
          const clearQuery = []
          if (clientIP) clearQuery.push({ ip: clientIP })
          if (data.fingerprint && typeof data.fingerprint === 'string') {
            clearQuery.push({ fingerprintHash: data.fingerprint }, { 'fingerprint.hash': data.fingerprint })
          }
          await Session.updateMany(
            { $or: clearQuery, isBlocked: true },
            { isBlocked: false }
          )
        }

        session = await Session.findOneAndUpdate(
          { sessionId },
          {
            ...data,
            ip: clientIP,
            country,
            city,
            region,
            lat,
            lng,
            timezone,
            sessionId,
            fingerprintHash: typeof data.fingerprint === 'string' ? data.fingerprint : null,
            state: data.role === 'ATTACKER' ? 'ATTACKER' : 'NORMAL',
            riskScore: data.role === 'ATTACKER' ? 85 : 5,
            isActive: true,
            isBlocked: false,
            logoutTime: null,
            loginTime: new Date(),
            lastSeen: new Date(),
            fingerprint: {
              hash: typeof data.fingerprint === 'string' ? data.fingerprint : undefined,
              deviceId: (clientIP || '').replace(/\./g,'').substr(0,8),
              behaviorSignature: data.role === 'ATTACKER' ? 'Human manual attacker' : 'Authenticated user',
              requestPattern: 'Linear', toolHint: data.browser || 'Browser'
            }
          },
          { upsert: true, new: true }
        )
      } catch (err) {
        logger.warn(`[REGISTER DB SAVE ERROR] ${err.message}`)
      }
    }
    await cache.set(`session:${sessionId}`, {
      sessionId, username: data.username, role: data.role,
      ip: clientIP, country, city,
      lat, lng, state: session.state || 'NORMAL', riskScore: session.riskScore || 5
    })
    req.app.get('io').emit('session_registered', session)
    broadcastSessionUpdate(session)
    logger.info(`[REGISTER] ${data.username} (${data.role}) from ${clientIP} (${city}, ${country})`)
    res.json({ success: true, session })
  } catch (err) { logger.error(`Register error: ${err.message}`); res.status(500).json({ error: err.message }) }
})

// POST /api/session/attack — log attack with permanent block enforcement
router.post('/attack', async (req, res) => {
  try {
    let { sessionId, username, attackType, attackDef = {}, sourceIP, sourceCountry, sourceCity, sourceLat, sourceLng, fingerprint } = req.body

    // Check 1: Redis cache (fastest)
    if (sourceIP) {
      const cachedBlock = await cache.get(`blocked:${sourceIP}`)
      if (cachedBlock?.blocked) {
        if (mongoose.connection.readyState === 1) {
          try {
            await BlockedIP.findOneAndUpdate(
              { ip: sourceIP },
              { $inc: { attemptCount: 1 }, lastAttempt: new Date() }
            )
          } catch {}
        }
        broadcast('blocked_attempt', {
          ip: sourceIP, method: 'CACHED_BLOCK',
          message: `Blocked IP ${sourceIP} attempted attack`,
          timestamp: new Date().toISOString()
        })
        return res.status(403).json({ error: 'Blocked', blocked: true, reason: 'IP_BLOCKED' })
      }

      // Check 2: MongoDB (source of truth)
      if (mongoose.connection.readyState === 1) {
        try {
          const dbBlock = await BlockedIP.findOne({ ip: sourceIP })
          if (dbBlock && (!dbBlock.expiresAt || new Date() < dbBlock.expiresAt)) {
            await cache.set(`blocked:${sourceIP}`, { blocked: true, reason: dbBlock.reason }, 86400 * 365)
            await BlockedIP.findOneAndUpdate(
              { ip: sourceIP },
              { $inc: { attemptCount: 1 }, lastAttempt: new Date() }
            )
            broadcast('blocked_attempt', {
              ip: sourceIP, method: 'DB_BLOCK',
              message: `Blocked IP ${sourceIP} attempted attack (re-cached)`,
              timestamp: new Date().toISOString()
            })
            return res.status(403).json({ error: 'Blocked', blocked: true, reason: 'IP_BLOCKED' })
          }
        } catch {}
      }
    }

    // Check 3: Fingerprint block
    if (fingerprint) {
      let fpBlock = await cache.get(`blocked:fp:${fingerprint}`)
      if (fpBlock?.blocked === undefined && mongoose.connection.readyState === 1) {
        try {
          const dbFp = await BlockedFingerprint.findOne({ fingerprint })
          if (dbFp) {
            fpBlock = { blocked: true, reason: dbFp.reason }
            await cache.set(`blocked:fp:${fingerprint}`, fpBlock, 86400 * 365)
          }
        } catch {}
      }
      if (fpBlock?.blocked) {
        if (mongoose.connection.readyState === 1) {
          try {
            await BlockedFingerprint.findOneAndUpdate(
              { fingerprint },
              { $inc: { attemptCount: 1 }, lastAttempt: new Date(), $addToSet: { associatedIPs: sourceIP } }
            )
          } catch {}
        }
        broadcast('blocked_attempt', {
          ip: sourceIP, fingerprint: fingerprint.substr(0, 8) + '...',
          method: 'FINGERPRINT_BLOCK',
          message: `Blocked fingerprint attempted from new IP ${sourceIP}`,
          timestamp: new Date().toISOString()
        })
        return res.status(403).json({ error: 'Blocked', blocked: true, reason: 'FINGERPRINT_BLOCKED' })
      }
    }

    // Check 4: Real-time IP reputation on EVERY attack (mid-session auto block if VPN/proxy)
    const reputation = await checkIPReputation(sourceIP)
    if (reputation.suspicious) {
      logger.warn(`[VPN ATTACK] ${sourceIP} is ${reputation.label} — auto-blocking mid-session`)
      if (mongoose.connection.readyState === 1) {
        try {
          await BlockedIP.findOneAndUpdate(
            { ip: sourceIP },
            {
              ip: sourceIP, blockedBy: 'SYSTEM_AUTO',
              reason: `Auto-blocked during attack: ${reputation.label}`,
              permanent: true, blockedAt: new Date()
            },
            { upsert: true, new: true }
          )
        } catch {}
      }
      await cache.set(`blocked:${sourceIP}`, { blocked: true }, 86400 * 365)
      broadcast('vpn_detected', {
        ip: sourceIP, label: reputation.label,
        autoBlocked: true, timestamp: new Date().toISOString()
      })
      return res.status(403).json({ error: 'Blocked', blocked: true, reason: 'VPN_PROXY_DETECTED' })
    }

    // Auto-resolve live location from sourceIP
    const isLocalAtk = !sourceIP || sourceIP === 'Unknown' || sourceIP === '127.0.0.1' || sourceIP === '::1' || sourceIP.startsWith('127.') || sourceIP === 'localhost'
    if (isLocalAtk) {
      const { getHostPublicIP } = await import('../middleware/geoip.js')
      sourceIP = getHostPublicIP() || '49.36.77.174'
    }

    const geo = resolveIPLocation(sourceIP)
    if (geo) {
      if (!sourceCountry || sourceCountry === 'Unknown' || sourceCountry === 'Localhost') {
        sourceCountry = (geo.country && geo.country !== 'Unknown') ? geo.country : (isLocalAtk ? 'India' : 'External')
      }
      if (!sourceCity || sourceCity === 'Unknown' || sourceCity === 'Localhost') {
        sourceCity = (geo.city && geo.city !== 'Unknown') ? geo.city : (isLocalAtk ? 'Vadodara' : (sourceCountry || 'Remote'))
      }
      if (!sourceLat || sourceLat === 0) {
        sourceLat = geo.lat !== 0 ? geo.lat : (isLocalAtk ? 22.3072 : 0)
      }
      if (!sourceLng || sourceLng === 0) {
        sourceLng = geo.lng !== 0 ? geo.lng : (isLocalAtk ? 73.1812 : 0)
      }
    }

    const adversaryName = username || `Adversary (${sourceIP || 'Remote'})`
    let session = { sessionId, username: adversaryName, role: 'ATTACKER', ip: sourceIP || 'Unknown', country: sourceCountry || 'Unknown', city: sourceCity || 'Unknown', lat: sourceLat || 0, lng: sourceLng || 0, riskScore: 85, state: 'ATTACKER' }
    let attack = { attackId: `ATK-${Date.now()}`, type: attackDef.label || attackType || 'Attack', severity: attackDef.severity || 'MEDIUM', sourceIP, sourceCountry, sourceCity, sourceLat, sourceLng, targetArea: attackDef.target || '/system', timestamp: new Date().toISOString() }

    if (mongoose.connection.readyState === 1) {
      try {
        let dbSession = await Session.findOne({ sessionId })
        if (!dbSession) {
          dbSession = await Session.create({
            sessionId, username: adversaryName, role: 'ATTACKER',
            ip: sourceIP || 'Unknown', country: sourceCountry || 'Unknown',
            city: sourceCity || 'Unknown', lat: sourceLat || 0, lng: sourceLng || 0,
            state: 'ATTACKER', riskScore: 85, isActive: true,
            fingerprintHash: fingerprint || null,
            ipReputation: reputation,
            loginTime: new Date(),
            lastSeen: new Date()
          })
        }
        const newScore = Math.min(100, (dbSession.riskScore || 0) + (attackDef.riskDelta || 10))
        const newState = getState(newScore)
        attack = await Attack.create({
          attackId: `ATK-${Date.now()}-${Math.random().toString(36).substr(2,4)}`,
          type: attackDef.label || attackType || 'Attack', severity: attackDef.severity || 'MEDIUM',
          sourceIP: sourceIP || dbSession.ip, sourceCountry: sourceCountry || dbSession.country,
          sourceCity: sourceCity || dbSession.city,
          sourceLat: sourceLat || dbSession.lat || 0,
          sourceLng: sourceLng || dbSession.lng || 0,
          targetArea: attackDef.target || '/system',
          riskDelta: attackDef.riskDelta || 10, sessionId, correlationId: `CAMP-${sessionId}`,
          timestamp: new Date()
        })
        session = await Session.findOneAndUpdate(
          { sessionId },
          {
            riskScore: newScore, state: newState,
            country: sourceCountry || dbSession.country,
            city: sourceCity || dbSession.city,
            lat: sourceLat || dbSession.lat,
            lng: sourceLng || dbSession.lng,
            fingerprintHash: fingerprint || dbSession.fingerprintHash || null,
            ipReputation: reputation,
            $addToSet: { attackTypes: attackDef.label || attackType || 'Attack' },
            $inc: { attackCount: 1 },
            $push: { timeline: { timestamp: new Date(), action: 'ATTACK', detail: `${attackDef.label || attackType} from ${sourceIP || dbSession.ip} (${sourceCity || dbSession.city}, ${sourceCountry || dbSession.country}) → ${attackDef.target || '/system'}`, severity: attackDef.severity || 'MEDIUM' } },
            lastSeen: new Date()
          },
          { new: true }
        )
      } catch (e) {
        logger.warn(`[ATTACK DB WARNING] ${e.message}`)
      }
    }

    await cache.set(`session:${sessionId}`, {
      sessionId, username: session.username, role: session.role,
      ip: session.ip, country: session.country, city: session.city,
      state: session.state || 'ATTACKER', riskScore: session.riskScore || 85,
      fingerprintHash: fingerprint || session.fingerprintHash, ipReputation: reputation
    })

    const alertData = {
      alertId: `ALERT-${Date.now()}-${Math.random().toString(36).substr(2,4)}`,
      severity: attackDef.severity || 'HIGH',
      title: `${attackDef.label || attackType} Attack Detected`,
      description: `Security Threat: ${attackDef.label || attackType} from ${sourceIP} targeting ${attackDef.target || '/system'}.`,
      sessionId, sourceIP, timestamp: new Date().toISOString(), status: 'New'
    }

    if (mongoose.connection.readyState === 1) {
      try {
        await Alert.create(alertData)
      } catch (e) {
        logger.warn(`[ALERT DB WARNING] ${e.message}`)
      }
    }

    broadcastAttack(attack, session, null)
    broadcastSessionUpdate(session)
    broadcast('new_alert', alertData)
    logger.info(`[ATTACK] ${attackDef.label || attackType} | ${sourceIP} | ${sourceCountry} | Risk: ${session.riskScore || 85}`)
    res.json({ success: true, attack, session, alert: alertData, ipReputation: reputation })
  } catch (err) { logger.error(`Attack error: ${err.message}`); res.status(500).json({ error: err.message }) }
})

// POST /api/session/honey — log honey interaction, broadcast
router.post('/honey', async (req, res) => {
  try {
    const { sessionId, attackerIP, attackerCountry, action, fakeTarget, fakeCredential } = req.body
    let log = {
      logId: `HONEY-${Date.now()}-${Math.random().toString(36).substr(2,4)}`,
      sessionId, attackerIP: attackerIP || 'Unknown',
      attackerCountry: attackerCountry || 'Unknown',
      action: action || 'READ', fakeTarget: fakeTarget || '/unknown',
      fakeCredential: fakeCredential ? encrypt(fakeCredential) : null, responseSimulated: '200 OK',
      responseTime: Math.floor(Math.random() * 200 + 50)
    }
    let session = null
    if (mongoose.connection.readyState === 1) {
      try {
        log = await HoneyLog.create(log)
        session = await Session.findOneAndUpdate(
          { sessionId },
          { inHoney: true, $inc: { honeyDuration: 1, honeyInteractions: 1 }, lastSeen: new Date() },
          { new: true }
        )
      } catch (e) {
        logger.warn(`[HONEY DB WARNING] ${e.message}`)
      }
    }
    const honeyCount = session?.honeyInteractions || 1
    if (honeyCount >= 10 && mongoose.connection.readyState === 1) {
      try { await HoneyLog.findOneAndUpdate({ logId: log.logId }, { deepTrap: true }) } catch {}
    }
    broadcastHoney(log, session, honeyCount)
    res.json({ success: true, log, deepTrap: honeyCount >= 10 })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/session/active
router.get('/active', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      return res.json(await Session.find({ isActive: true }).sort({ lastSeen: -1 }).limit(50))
    }
    res.json([])
  }
  catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/session/live-feed — returns last 100 events across all sessions
router.get('/live-feed', async (req, res) => {
  try {
    let attacks = []
    let sessions = []
    if (mongoose.connection.readyState === 1) {
      attacks = await Attack.find().sort({ timestamp: -1 }).limit(50)
      sessions = await Session.find({ isActive: true }).sort({ lastSeen: -1 })
    }
    res.json({ attacks, sessions, timestamp: new Date().toISOString() })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/session/heartbeat — called every 10s from frontend for live tracking
router.post('/heartbeat', async (req, res) => {
  try {
    const { sessionId, currentPage, mouseActivity, clickCount, timeOnPage, scrollDepth } = req.body

    let session = null
    if (mongoose.connection.readyState === 1) {
      session = await Session.findOneAndUpdate(
        { sessionId },
        {
          lastSeen: new Date(),
          $push: {
            timeline: {
              timestamp: new Date(),
              action: 'HEARTBEAT',
              detail: `Active on: ${currentPage} | Clicks: ${clickCount} | Scroll: ${scrollDepth}%`
            }
          }
        },
        { new: true }
      )
    }

    if (session) {
      broadcast('session_heartbeat', {
        sessionId, currentPage, mouseActivity,
        clickCount, timeOnPage, scrollDepth,
        ip: session.ip, username: session.username,
        country: session.country, city: session.city,
        lat: session.lat, lng: session.lng,
        state: session.state, riskScore: session.riskScore,
        timestamp: new Date().toISOString()
      })
    }

    const adminAuth = await isAdminAuthenticated(req)
    const isBlocked = !adminAuth && (session?.isBlocked || false)
    res.json({ success: true, blocked: isBlocked })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/session/:sessionId — individual session
router.get('/:sessionId', async (req, res) => {
  try {
    const cached = await cache.get(`session:${req.params.sessionId}`)
    if (cached) return res.json(cached)
    if (mongoose.connection.readyState === 1) {
      const session = await Session.findOne({ sessionId: req.params.sessionId })
      if (session) return res.json(session)
    }
    res.status(404).json({ error: 'Session not found' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PATCH /api/session/:sessionId/block
router.patch('/:sessionId/block', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      await Session.findOneAndUpdate({ sessionId: req.params.sessionId }, { isActive: false, isBlocked: true, logoutTime: new Date() })
    }
    await cache.del(`session:${req.params.sessionId}`)
    req.app.get('io').emit('session_blocked', { sessionId: req.params.sessionId })
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE /api/session/:sessionId — logout
router.delete('/:sessionId', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      await Session.findOneAndUpdate({ sessionId: req.params.sessionId }, { isActive: false, logoutTime: new Date() })
    }
    await cache.del(`session:${req.params.sessionId}`)
    req.app.get('io').emit('session_removed', { sessionId: req.params.sessionId })
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/session/clear-inactive — mark sessions older than 2 hours as inactive
router.post('/clear-inactive', async (req, res) => {
  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
    let modifiedCount = 0
    if (mongoose.connection.readyState === 1) {
      const result = await Session.updateMany(
        { lastSeen: { $lt: twoHoursAgo }, isActive: true },
        { isActive: false, logoutTime: new Date() }
      )
      modifiedCount = result.modifiedCount
    }
    logger.info(`[CLEAR] Marked ${modifiedCount} old sessions inactive`)
    res.json({ success: true, cleared: modifiedCount })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/session/clear-all — wipe all sessions, attacks, alerts, honey logs
router.post('/clear-all', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      await Session.deleteMany({})
      await Attack.deleteMany({})
      await Alert.deleteMany({})
      await HoneyLog.deleteMany({})
    }
    await cache.flush()
    req.app.get('io').emit('clear_all', { timestamp: new Date().toISOString() })
    res.json({ success: true, message: 'All sessions, attacks, and logs cleared' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

export default router
