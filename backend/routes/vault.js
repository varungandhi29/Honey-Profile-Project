import express from 'express'
import mongoose from 'mongoose'
import Session from '../models/Session.js'
import Attack from '../models/Attack.js'
import HoneyLog from '../models/HoneyLog.js'
import Alert from '../models/Alert.js'
import { getSecureVaultData } from '../services/dataVaultService.js'

const router = express.Router()

export const getSessionEvidence = async (sessionId) => {
  if (mongoose.connection.readyState !== 1) return null

  let session = await Session.findOne({ sessionId })
  if (!session) {
    session = await Session.findOne({ username: sessionId })
  }
  if (!session && mongoose.isValidObjectId(sessionId)) {
    session = await Session.findById(sessionId)
  }
  if (!session) return null

  const sid = session.sessionId

  const [attacks, honeyLogs, alerts] = await Promise.all([
    Attack.find({ $or: [{ sessionId: sid }, { sessionId }] }).sort({ timestamp: 1 }),
    HoneyLog.find({ $or: [{ sessionId: sid }, { sessionId }] }).sort({ timestamp: 1 }),
    Alert.find({ $or: [{ sessionId: sid }, { sessionId }] }).sort({ timestamp: 1 })
  ])

  const loginDate = session.loginTime ? new Date(session.loginTime) : new Date(session.createdAt || Date.now())
  const logoutDate = session.logoutTime ? new Date(session.logoutTime) : new Date()

  return {
    session: {
      sessionId: session.sessionId,
      username: session.username,
      role: session.role,
      ip: session.ip,
      country: session.country,
      city: session.city,
      browser: session.browser,
      os: session.os,
      state: session.state,
      riskScore: session.riskScore,
      attackCount: session.attackCount,
      attackTypes: session.attackTypes || [],
      inHoney: session.inHoney,
      honeyInteractions: session.honeyInteractions,
      loginTime: session.loginTime,
      logoutTime: session.logoutTime,
      timeline: session.timeline || [],
      isBlocked: session.isBlocked,
      fingerprint: session.fingerprint || {},
    },
    attacks: (attacks || []).map(a => ({
      attackId: a.attackId || a._id,
      type: a.type,
      severity: a.severity,
      targetArea: a.targetArea,
      riskDelta: a.riskDelta,
      timestamp: a.timestamp,
      aiPrediction: a.aiPrediction,
    })),
    honeyLogs: (honeyLogs || []).map(h => ({
      action: h.action,
      fakeTarget: h.fakeTarget,
      responseSimulated: h.responseSimulated,
      deepTrap: h.deepTrap,
      timestamp: h.timestamp,
    })),
    alerts: (alerts || []).map(a => ({
      severity: a.severity,
      title: a.title,
      description: a.description,
      status: a.status,
      timestamp: a.timestamp,
    })),
    summary: {
      totalAttacks: attacks?.length || 0,
      totalHoneyInteractions: honeyLogs?.length || 0,
      totalAlerts: alerts?.length || 0,
      criticalAttacks: (attacks || []).filter(a => a.severity === 'CRITICAL').length,
      highAttacks: (attacks || []).filter(a => a.severity === 'HIGH').length,
      deepTraps: (honeyLogs || []).filter(h => h.deepTrap).length,
      sessionDurationSeconds: session.logoutTime
        ? Math.max(0, Math.floor((new Date(session.logoutTime) - loginDate) / 1000))
        : Math.max(0, Math.floor((Date.now() - loginDate) / 1000)),
    }
  }
}

// GET /api/vault — returns all stored evidence data from MongoDB
router.get('/', async (req, res) => {
  try {
    const data = await getSecureVaultData()
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/vault/export — download full evidence as JSON file
router.get('/export', async (req, res) => {
  try {
    const data = await getSecureVaultData()
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="honeyshield_evidence_${Date.now()}.json"`)
    res.send(JSON.stringify(data, null, 2))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/vault/session/:sessionId — get evidence for a specific session
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params
    const data = await getSessionEvidence(sessionId)
    if (!data) return res.status(404).json({ error: 'Session not found' })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/vault/session/:sessionId/export — export single session evidence JSON
router.get('/session/:sessionId/export', async (req, res) => {
  try {
    const { sessionId } = req.params
    const data = await getSessionEvidence(sessionId)
    if (!data) return res.status(404).json({ error: 'Session not found' })
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="evidence_${sessionId}_${Date.now()}.json"`)
    res.send(JSON.stringify(data, null, 2))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
