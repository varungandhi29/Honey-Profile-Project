import crypto from 'crypto'
import mongoose from 'mongoose'
import Attack from '../models/Attack.js'
import Session from '../models/Session.js'
import HoneyLog from '../models/HoneyLog.js'
import Alert from '../models/Alert.js'
import logger from '../middleware/logger.js'

const ENCRYPTION_KEY = process.env.VAULT_ENCRYPTION_KEY

if (!ENCRYPTION_KEY || !/^[0-9a-fA-F]{64}$/.test(ENCRYPTION_KEY)) {
  logger.error('[FATAL] VAULT_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). Refusing to start.')
  process.exit(1)
}

const KEY_BUFFER = Buffer.from(ENCRYPTION_KEY, 'hex')
const ALGORITHM = 'aes-256-gcm'

/**
 * Encrypt plaintext using AES-256-GCM.
 * Generates a fresh 12-byte (96-bit) IV for each call.
 * Returns: iv:authTag:ciphertext (all hex-encoded, colon-separated).
 */
export const encrypt = (text) => {
  if (text === null || text === undefined) return null
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, KEY_BUFFER, iv)
  let ciphertext = cipher.update(String(text), 'utf8', 'hex')
  ciphertext += cipher.final('hex')
  const authTag = cipher.getAuthTag().toString('hex')
  return `${iv.toString('hex')}:${authTag}:${ciphertext}`
}

/**
 * Decrypt stored credential using AES-256-GCM.
 * Detects legacy plaintext vs iv:authTag:ciphertext.
 * Verifies auth tag and throws loudly on tampering.
 */
export const decrypt = (storedValue) => {
  if (storedValue === null || storedValue === undefined) return null
  if (typeof storedValue !== 'string') return storedValue

  const parts = storedValue.split(':')
  // Check if string matches 3-part hex format: iv (24 hex), authTag (32 hex), ciphertext (hex)
  const isEncryptedFormat = parts.length === 3 &&
    parts[0].length === 24 &&
    /^[0-9a-fA-F]{24}$/.test(parts[0]) &&
    parts[1].length === 32 &&
    /^[0-9a-fA-F]{32}$/.test(parts[1]) &&
    /^[0-9a-fA-F]*$/.test(parts[2])

  if (!isEncryptedFormat) {
    // Legacy plaintext data — return as-is
    return storedValue
  }

  const [ivHex, authTagHex, ciphertextHex] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY_BUFFER, iv)
  decipher.setAuthTag(authTag)
  let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8')
  decrypted += decipher.final('utf8') // Throws if authTag verification fails
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
        fakeCredential: h.fakeCredential ? decrypt(h.fakeCredential) : null,
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
