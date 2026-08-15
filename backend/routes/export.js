import express from 'express'
import mongoose from 'mongoose'
import Attack from '../models/Attack.js'
import Session from '../models/Session.js'
import HoneyLog from '../models/HoneyLog.js'
import Alert from '../models/Alert.js'

const router = express.Router()

const toCSV = (data, fields) => {
  const header = fields.join(',')
  const rows = data.map(d => fields.map(f => `"${(d[f] !== undefined ? d[f] : '').toString().replace(/"/g,'""')}"`).join(','))
  return [header, ...rows].join('\n')
}

const sendFormatted = (req, res, filename, data, fields) => {
  if (req.headers.accept?.includes('application/json')) {
    return res.json(data)
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(toCSV(data.map(d => d.toObject ? d.toObject() : d), fields))
}

router.get('/attacks', async (req, res) => {
  try {
    let attacks = []
    if (mongoose.connection.readyState === 1) {
      attacks = await Attack.find().sort({ timestamp: -1 }).limit(10000)
    }
    sendFormatted(req, res, `attacks_${Date.now()}.csv`, attacks,
      ['attackId','type','severity','sourceIP','sourceCountry','sourceCity','targetArea','riskDelta','sessionId','aiPrediction','timestamp'])
  } catch (e) { res.json([]) }
})

router.get('/sessions', async (req, res) => {
  try {
    let sessions = []
    if (mongoose.connection.readyState === 1) {
      sessions = await Session.find().sort({ loginTime: -1 })
    }
    sendFormatted(req, res, `sessions_${Date.now()}.csv`, sessions,
      ['sessionId','username','role','ip','country','city','lat','lng','state','riskScore','aiLabel','attackCount','loginTime','logoutTime'])
  } catch (e) { res.json([]) }
})

router.get('/honey', async (req, res) => {
  try {
    let logs = []
    if (mongoose.connection.readyState === 1) {
      logs = await HoneyLog.find().sort({ timestamp: -1 }).limit(10000)
    }
    sendFormatted(req, res, `honey_${Date.now()}.csv`, logs,
      ['logId','sessionId','attackerIP','attackerCountry','action','fakeTarget','responseSimulated','deepTrap','timestamp'])
  } catch (e) { res.json([]) }
})

router.get('/alerts', async (req, res) => {
  try {
    let alerts = []
    if (mongoose.connection.readyState === 1) {
      alerts = await Alert.find().sort({ timestamp: -1 })
    }
    sendFormatted(req, res, `alerts_${Date.now()}.csv`, alerts,
      ['alertId','severity','title','description','sessionId','sourceIP','status','acknowledgedBy','timestamp'])
  } catch (e) { res.json([]) }
})

export default router
