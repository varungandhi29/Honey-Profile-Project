import express from 'express'
import Session from '../models/Session.js'
import Attack from '../models/Attack.js'
import HoneyLog from '../models/HoneyLog.js'
import Alert from '../models/Alert.js'
import dayjs from 'dayjs'
const router = express.Router()

router.get('/overview', async (req, res) => {
  try {
    const [totalSessions, activeSessions, attackerSessions, totalAttacks, criticalAttacks, honeyInteractions, unreadAlerts, topAttackTypes, topCountries] = await Promise.all([
      Session.countDocuments(), Session.countDocuments({ isActive: true }),
      Session.countDocuments({ state: 'ATTACKER', isActive: true }),
      Attack.countDocuments(), Attack.countDocuments({ severity: 'CRITICAL' }),
      HoneyLog.countDocuments(), Alert.countDocuments({ status: 'New' }),
      Attack.aggregate([{ $group: { _id: '$type', count: { $sum: 1 }, avgRiskDelta: { $avg: '$riskDelta' } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
      Attack.aggregate([{ $group: { _id: '$sourceCountry', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }])
    ])
    res.json({ totalSessions, activeSessions, attackerSessions, totalAttacks, criticalAttacks, honeyInteractions, unreadAlerts, topAttackTypes, topCountries, timestamp: new Date().toISOString() })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/timeline', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours || '24')
    const since = dayjs().subtract(hours, 'hour').toDate()
    const attacks = await Attack.aggregate([
      { $match: { timestamp: { $gte: since } } },
      { $group: { _id: { hour: { $hour: '$timestamp' }, severity: '$severity' }, count: { $sum: 1 } } },
      { $sort: { '_id.hour': 1 } }
    ])
    res.json({ attacks, since, hours })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/heatmap', async (req, res) => {
  try {
    const since = dayjs().subtract(7, 'day').toDate()
    const data = await Attack.aggregate([
      { $match: { timestamp: { $gte: since } } },
      { $group: { _id: { hour: { $hour: '$timestamp' }, day: { $dayOfWeek: '$timestamp' }, type: '$type', target: '$targetArea' }, count: { $sum: 1 } } }
    ])
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/fpfn', async (req, res) => {
  try {
    const sessions = await Session.find({ isActive: true })
    const ST = 36, AT = 70
    const TP = sessions.filter(s => s.state === 'ATTACKER' && s.riskScore >= AT).length
    const TN = sessions.filter(s => s.state === 'NORMAL' && s.riskScore < ST).length
    const FP = sessions.filter(s => s.state === 'NORMAL' && s.riskScore >= ST).length
    const FN = sessions.filter(s => s.state === 'ATTACKER' && s.riskScore < AT && s.fnStartTime && Date.now() - new Date(s.fnStartTime).getTime() > 60000).length
    const total = Math.max(sessions.length, 1)
    const accuracy = (((TP + TN) / total) * 100).toFixed(1)
    const precision = ((TP / Math.max(TP + FP, 1)) * 100).toFixed(1)
    const recall = ((TP / Math.max(TP + FN, 1)) * 100).toFixed(1)
    const f1 = ((2 * parseFloat(precision) * parseFloat(recall)) / Math.max(parseFloat(precision) + parseFloat(recall), 0.01)).toFixed(1)
    res.json({ TP, TN, FP, FN, accuracy, precision, recall, f1, total })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

export default router
