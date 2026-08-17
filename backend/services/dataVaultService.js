import crypto from 'crypto'
import mongoose from 'mongoose'
import Attack from '../models/Attack.js'
import Session from '../models/Session.js'
import HoneyLog from '../models/HoneyLog.js'
import Alert from '../models/Alert.js'
import logger from '../middleware/logger.js'

const ENCRYPTION_KEY = process.env.VAULT_ENCRYPTION_KEY ||
  crypto.randomBytes(32).toString('hex')
const ALGORITHM = 'aes-256-gcm'

export const encrypt = (text) => {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY.slice(0, 32)),
    iv
  )
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

export const decrypt = (encryptedText) => {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY.slice(0, 32)),
    iv
  )
  decipher.setAuthTag(authTag)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

export const getSecureVaultData = async (adminOnly = true) => {
  try {
    let attacks = []
    let sessions = []
    let honeyLogs = []
    let alerts = []

    if (mongoose.connection.readyState === 1) {
      [attacks, sessions, honeyLogs, alerts] = await Promise.all([
        Attack.find().sort({ timestamp: -1 }).limit(100),
        Session.find().sort({ loginTime: -1 }).limit(50),
        HoneyLog.find().sort({ timestamp: -1 }).limit(100),
        Alert.find().sort({ timestamp: -1 }).limit(100),
      ])
    }

    return {
      attacks: (attacks || []).map(a => ({
        id: a.attackId || a._id,
        type: a.type,
        severity: a.severity,
        sourceIP: a.sourceIP,
        sourceCountry: a.sourceCountry,
        targetArea: a.targetArea,
        riskDelta: a.riskDelta,
        timestamp: a.timestamp,
        sessionId: a.sessionId,
      })),
      sessions: (sessions || []).map(s => ({
        id: s.sessionId || s._id,
        username: s.username,
        role: s.role,
        ip: s.ip,
        country: s.country,
        city: s.city,
        state: s.state,
        riskScore: s.riskScore,
        attackCount: s.attackCount,
        loginTime: s.loginTime,
        logoutTime: s.logoutTime,
      })),
      honeyLogs: (honeyLogs || []).map(h => ({
        id: h.logId || h._id,
        attackerIP: h.attackerIP,
        action: h.action,
        fakeTarget: h.fakeTarget,
        timestamp: h.timestamp,
        deepTrap: h.deepTrap,
      })),
      alerts: (alerts || []).map(a => ({
        id: a.alertId || a._id,
        severity: a.severity,
        title: a.title,
        sessionId: a.sessionId,
        status: a.status,
        timestamp: a.timestamp,
      })),
      exportedAt: new Date().toISOString(),
      totalRecords: (attacks?.length || 0) + (sessions?.length || 0) + (honeyLogs?.length || 0) + (alerts?.length || 0),
    }
  } catch (err) {
    logger.error(`Vault data fetch error: ${err.message}`)
    return {
      attacks: [],
      sessions: [],
      honeyLogs: [],
      alerts: [],
      exportedAt: new Date().toISOString(),
      totalRecords: 0
    }
  }
}
