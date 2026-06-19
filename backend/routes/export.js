import express from 'express'
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
const sendCSV = (res, filename, data, fields) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(toCSV(data.map(d => d.toObject ? d.toObject() : d), fields))
}
router.get('/attacks', async (req, res) => {
  sendCSV(res, `attacks_${Date.now()}.csv`, await Attack.find().sort({ timestamp: -1 }).limit(10000),
    ['attackId','type','severity','sourceIP','sourceCountry','sourceCity','targetArea','riskDelta','sessionId','aiPrediction','timestamp'])
})
router.get('/sessions', async (req, res) => {
  sendCSV(res, `sessions_${Date.now()}.csv`, await Session.find().sort({ loginTime: -1 }),
    ['sessionId','username','role','ip','country','city','lat','lng','state','riskScore','aiLabel','attackCount','loginTime','logoutTime'])
})
router.get('/honey', async (req, res) => {
  sendCSV(res, `honey_${Date.now()}.csv`, await HoneyLog.find().sort({ timestamp: -1 }).limit(10000),
    ['logId','sessionId','attackerIP','attackerCountry','action','fakeTarget','responseSimulated','deepTrap','timestamp'])
})
router.get('/alerts', async (req, res) => {
  sendCSV(res, `alerts_${Date.now()}.csv`, await Alert.find().sort({ timestamp: -1 }),
    ['alertId','severity','title','description','sessionId','sourceIP','status','acknowledgedBy','timestamp'])
})
export default router
