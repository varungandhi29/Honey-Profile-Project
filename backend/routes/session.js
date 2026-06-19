import express from 'express'
import Session from '../models/Session.js'
import Attack from '../models/Attack.js'
import HoneyLog from '../models/HoneyLog.js'
import Alert from '../models/Alert.js'
import BlockedIP from '../models/BlockedIP.js'
import { detectLocation } from '../middleware/geoip.js'
import { cache } from '../services/cacheService.js'
import { calculateRisk, getState, getAIPrediction } from '../services/riskEngine.js'
import { createAlert } from '../services/alertService.js'
import { broadcastAttack, broadcastHoney, broadcastSessionUpdate, broadcast } from '../services/broadcastService.js'
import logger from '../middleware/logger.js'
const router = express.Router()

// GET /api/session/init — detect real IP + geo + device
router.get('/init', async (req, res) => {
  try {
    const location = detectLocation(req)
    logger.info(`[INIT] ${location.ip} → ${location.city}, ${location.country} | ${location.browser}`)
    res.json(location)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/session/register — save real session to MongoDB + Redis
router.post('/register', async (req, res) => {
  try {
    const data = req.body
    const session = await Session.findOneAndUpdate(
      { sessionId: data.sessionId },
      {
        ...data,
        state: data.role === 'ATTACKER' ? 'ATTACKER' : 'NORMAL',
        riskScore: data.role === 'ATTACKER' ? 85 : 5,
        isActive: true, loginTime: new Date(), lastSeen: new Date(),
        fingerprint: {
          deviceId: (data.ip || '').replace(/\./g,'').substr(0,8),
          behaviorSignature: data.role === 'ATTACKER' ? 'Human manual attacker' : 'Authenticated user',
          requestPattern: 'Linear', toolHint: data.browser || 'Browser'
        }
      },
      { upsert: true, new: true }
    )
    await cache.set(`session:${data.sessionId}`, {
      sessionId: data.sessionId, username: data.username, role: data.role,
      ip: data.ip, country: data.country, city: data.city,
      lat: data.lat, lng: data.lng, state: session.state, riskScore: session.riskScore
    })
    req.app.get('io').emit('session_registered', session)
    logger.info(`[REGISTER] ${data.username} (${data.role}) from ${data.ip} (${data.city}, ${data.country})`)
    res.json({ success: true, session })
  } catch (err) { logger.error(`Register error: ${err.message}`); res.status(500).json({ error: err.message }) }
})

// POST /api/session/attack — log attack, update risk, AI prediction, broadcast
router.post('/attack', async (req, res) => {
  try {
    const { sessionId, username, attackType, attackDef, sourceIP, sourceCountry, sourceCity, sourceLat, sourceLng } = req.body
    const blockedCheck = await cache.get(`blocked:${sourceIP}`)
    if (blockedCheck?.blocked) {
      // Log the attempt but reject it
      await BlockedIP.findOneAndUpdate(
        { ip: sourceIP },
        { $inc: { attemptCount: 1 }, lastAttempt: new Date() }
      )
      broadcast('blocked_attempt', {
        ip: sourceIP, timestamp: new Date().toISOString(),
        message: `Blocked IP ${sourceIP} attempted to attack`
      })
      logger.warn(`[BLOCKED ATTEMPT] ${sourceIP} tried to attack but is blocked`)
      return res.status(403).json({ error: 'IP is blocked', blocked: true })
    }
    let session = await Session.findOne({ sessionId })
    if (!session) {
      session = await Session.create({
        sessionId, username: username || 'testuser', role: 'ATTACKER',
        ip: sourceIP || 'Unknown', country: sourceCountry || 'Unknown',
        city: sourceCity || 'Unknown', lat: sourceLat || 0, lng: sourceLng || 0,
        state: 'ATTACKER', riskScore: 85, isActive: true
      })
    }
    const newScore = Math.min(100, (session.riskScore || 0) + (attackDef.riskDelta || 10))
    const newState = getState(newScore)
    const attack = await Attack.create({
      attackId: `ATK-${Date.now()}-${Math.random().toString(36).substr(2,4)}`,
      type: attackDef.label, severity: attackDef.severity,
      sourceIP: sourceIP || session.ip, sourceCountry: sourceCountry || session.country,
      sourceCity: sourceCity || session.city, targetArea: attackDef.target,
      riskDelta: attackDef.riskDelta, sessionId, correlationId: `CAMP-${sessionId}`
    })
    const updatedSession = await Session.findOneAndUpdate(
      { sessionId },
      {
        riskScore: newScore, state: newState,
        $addToSet: { attackTypes: attackDef.label },
        $inc: { attackCount: 1 },
        $push: { timeline: { timestamp: new Date(), action: 'ATTACK', detail: `${attackDef.label} → ${attackDef.target}`, severity: attackDef.severity } },
        lastSeen: new Date()
      },
      { new: true }
    )
    await cache.set(`session:${sessionId}`, {
      sessionId, username: updatedSession.username, role: updatedSession.role,
      ip: updatedSession.ip, country: updatedSession.country, city: updatedSession.city,
      lat: updatedSession.lat, lng: updatedSession.lng, state: newState, riskScore: newScore
    })
    let aiResult = null
    try {
      aiResult = await getAIPrediction({
        sessionId, riskScore: newScore, attackCount: updatedSession.attackCount,
        honeyInteractions: updatedSession.honeyInteractions || 0,
        sessionDuration: Math.floor((Date.now() - updatedSession.loginTime) / 1000),
        requestsPerMin: updatedSession.attackCount / Math.max(1, Math.floor((Date.now() - updatedSession.loginTime) / 60000)),
        uniqueAttackTypes: updatedSession.attackTypes.length,
        inHoney: updatedSession.inHoney, failedLogins: 0
      })
      if (aiResult) {
        await Session.findOneAndUpdate({ sessionId }, { aiLabel: aiResult.prediction?.label, aiConfidence: aiResult.prediction?.confidence })
      }
    } catch {}
    if (['HIGH','CRITICAL'].includes(attackDef.severity)) {
      await createAlert({
        severity: attackDef.severity,
        title: `${attackDef.label} Detected`,
        description: `${attackDef.label} from ${sourceIP || session.ip} (${sourceCountry || session.country}, ${sourceCity || session.city}) targeting ${attackDef.target}`,
        sessionId, sourceIP: sourceIP || session.ip, attackType
      }, req.app.get('io'))
    }
    broadcastAttack(attack, updatedSession, aiResult)
    broadcastSessionUpdate(updatedSession)
    logger.info(`[ATTACK] ${attackDef.label} | ${sourceIP} | ${sourceCountry} | Risk: ${newScore} | AI: ${aiResult?.prediction?.label || 'N/A'}`)
    res.json({ success: true, attack, session: updatedSession, aiResult })
  } catch (err) { logger.error(`Attack error: ${err.message}`); res.status(500).json({ error: err.message }) }
})

// POST /api/session/honey — log honey interaction, broadcast
router.post('/honey', async (req, res) => {
  try {
    const { sessionId, attackerIP, attackerCountry, action, fakeTarget, fakeCredential } = req.body
    const log = await HoneyLog.create({
      logId: `HONEY-${Date.now()}-${Math.random().toString(36).substr(2,4)}`,
      sessionId, attackerIP: attackerIP || 'Unknown',
      attackerCountry: attackerCountry || 'Unknown',
      action: action || 'READ', fakeTarget: fakeTarget || '/unknown',
      fakeCredential: fakeCredential || null, responseSimulated: '200 OK',
      responseTime: Math.floor(Math.random() * 200 + 50)
    })
    const session = await Session.findOneAndUpdate(
      { sessionId },
      { inHoney: true, $inc: { honeyDuration: 1, honeyInteractions: 1 }, lastSeen: new Date() },
      { new: true }
    )
    const honeyCount = session?.honeyInteractions || 0
    if (honeyCount >= 10) await HoneyLog.findOneAndUpdate({ logId: log.logId }, { deepTrap: true })
    broadcastHoney(log, session, honeyCount)
    res.json({ success: true, log, deepTrap: honeyCount >= 10 })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/session/active
router.get('/active', async (req, res) => {
  try { res.json(await Session.find({ isActive: true }).sort({ lastSeen: -1 }).limit(50)) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/session/init is above, this is individual session
router.get('/:sessionId', async (req, res) => {
  try {
    const cached = await cache.get(`session:${req.params.sessionId}`)
    if (cached) return res.json(cached)
    const session = await Session.findOne({ sessionId: req.params.sessionId })
    if (!session) return res.status(404).json({ error: 'Not found' })
    res.json(session)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PATCH /api/session/:sessionId/block
router.patch('/:sessionId/block', async (req, res) => {
  try {
    await Session.findOneAndUpdate({ sessionId: req.params.sessionId }, { isActive: false, isBlocked: true, logoutTime: new Date() })
    await cache.del(`session:${req.params.sessionId}`)
    req.app.get('io').emit('session_blocked', { sessionId: req.params.sessionId })
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE /api/session/:sessionId — logout
router.delete('/:sessionId', async (req, res) => {
  try {
    await Session.findOneAndUpdate({ sessionId: req.params.sessionId }, { isActive: false, logoutTime: new Date() })
    await cache.del(`session:${req.params.sessionId}`)
    req.app.get('io').emit('session_removed', { sessionId: req.params.sessionId })
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/session/heartbeat — called every 10s from frontend for live tracking
router.post('/heartbeat', async (req, res) => {
  try {
    const { sessionId, currentPage, mouseActivity, clickCount, timeOnPage, scrollDepth } = req.body

    const session = await Session.findOneAndUpdate(
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

    res.json({ success: true, blocked: session?.isBlocked || false })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/session/live-feed — returns last 100 events across all sessions
router.get('/live-feed', async (req, res) => {
  try {
    const attacks = await Attack.find().sort({ timestamp: -1 }).limit(50)
    const sessions = await Session.find({ isActive: true }).sort({ lastSeen: -1 })
    res.json({ attacks, sessions, timestamp: new Date().toISOString() })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

export default router
