import express from 'express'
import axios from 'axios'
import Session from '../models/Session.js'
const router = express.Router()
router.get('/health', async (req, res) => {
  try { const r = await axios.get(`${process.env.AI_SERVICE_URL}/health`, { timeout: 2000 }); res.json({ online: true, ...r.data }) }
  catch { res.json({ online: false }) }
})
router.post('/predict/:sessionId', async (req, res) => {
  try {
    const session = await Session.findOne({ sessionId: req.params.sessionId })
    if (!session) return res.status(404).json({ error: 'Session not found' })
    const r = await axios.post(`${process.env.AI_SERVICE_URL}/predict`, {
      sessionId: req.params.sessionId,
      features: {
        riskScore: session.riskScore, attackCount: session.attackCount,
        honeyInteractions: session.honeyInteractions,
        sessionDuration: Math.floor((Date.now() - session.loginTime) / 1000),
        requestsPerMin: 5, uniqueAttackTypes: session.attackTypes.length,
        inHoney: session.inHoney, failedLogins: 0
      }
    }, { timeout: 3000 })
    await Session.findOneAndUpdate({ sessionId: req.params.sessionId }, { aiLabel: r.data.prediction?.label, aiConfidence: r.data.prediction?.confidence })
    res.json(r.data)
  } catch (err) { res.status(503).json({ error: 'AI unavailable', detail: err.message }) }
})
router.get('/insights', async (req, res) => {
  try {
    const sessions = await Session.find({ isActive: true })
    const predictions = await Promise.all(sessions.map(async (s) => {
      try {
        const r = await axios.post(`${process.env.AI_SERVICE_URL}/predict`, {
          sessionId: s.sessionId,
          features: { riskScore: s.riskScore, attackCount: s.attackCount, honeyInteractions: s.honeyInteractions, sessionDuration: Math.floor((Date.now() - s.loginTime) / 1000), requestsPerMin: 5, uniqueAttackTypes: s.attackTypes.length, inHoney: s.inHoney, failedLogins: 0 }
        }, { timeout: 2000 })
        return { sessionId: s.sessionId, username: s.username, ...r.data }
      } catch { return { sessionId: s.sessionId, username: s.username, error: 'timeout' } }
    }))
    res.json({ insights: predictions, count: predictions.length })
  } catch (err) { res.status(500).json({ error: err.message }) }
})
export default router
