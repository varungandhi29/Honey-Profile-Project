import express from 'express'
import mongoose from 'mongoose'
import Alert from '../models/Alert.js'
import { cache } from '../services/cacheService.js'
const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const { severity, status, limit = 100 } = req.query
    const filter = {}
    if (severity) filter.severity = severity
    if (status) filter.status = status
    if (mongoose.connection.readyState === 1) {
      return res.json(await Alert.find(filter).sort({ timestamp: -1 }).limit(parseInt(limit)))
    }
    res.json([])
  } catch (err) { res.status(500).json({ error: err.message }) }
})
router.patch('/:alertId/acknowledge', async (req, res) => {
  try {
    const alert = await Alert.findOneAndUpdate(
      { alertId: req.params.alertId },
      { status: 'Acknowledged', acknowledgedBy: req.body.username || 'admin', acknowledgedAt: new Date() },
      { new: true }
    )
    res.json(alert)
  } catch (err) { res.status(500).json({ error: err.message }) }
})
router.patch('/:alertId/dismiss', async (req, res) => {
  try { await Alert.findOneAndUpdate({ alertId: req.params.alertId }, { status: 'Dismissed' }); res.json({ success: true }) }
  catch (err) { res.status(500).json({ error: err.message }) }
})
router.post('/clear-unread', async (req, res) => { await cache.del('unread_alerts'); res.json({ success: true }) })
export default router
