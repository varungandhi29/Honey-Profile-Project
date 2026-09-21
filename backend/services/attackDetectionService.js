import { cache } from './cacheService.js'
import BlockedIP from '../models/BlockedIP.js'
import BlockedFingerprint from '../models/BlockedFingerprint.js'
import logger from '../middleware/logger.js'
import { broadcast } from './broadcastService.js'
import { checkIPReputation } from './ipReputationService.js'

// Track failed login attempts per IP
const BRUTE_FORCE_THRESHOLD = 5 // block after 5 failed attempts
const BRUTE_FORCE_WINDOW = 60 * 1000 // within 60 seconds
const CREDENTIAL_STUFFING_THRESHOLD = 3 // 3 different usernames from same IP

// Known breached passwords from common breach databases
const BREACHED_PASSWORDS = new Set([
  'password', 'password123', '123456', 'admin', 'admin123', 'letmein',
  'qwerty', 'welcome', 'monkey', 'dragon', '1234567890', 'password1',
  'iloveyou', 'sunshine', 'princess', 'football', 'baseball', 'master',
  'abc123', 'test123', 'root', 'root123', 'guest', 'guest123',
  'changeme', 'default', 'passw0rd', 'p@ssword', 'p@ssw0rd',
  'company123', 'acmecorp', 'acme123', 'corp2024', 'welcome1'
])

// Common attack ports that should never be accessed
const HONEYPOT_PORTS = [22, 23, 3389, 445, 135, 139, 21, 25, 110, 143]

export const detectAttackVector = async (req, loginData) => {
  const ip = req.ip || req.connection?.remoteAddress || 'Unknown'
  const { username, password, fingerprint } = loginData
  const detectedVectors = []
  let riskScore = 0
  let autoBlock = false
  let blockReason = ''

  // VECTOR 1 & 2 — BRUTE FORCE & CREDENTIAL STUFFING DETECTION
  const failKey = `fails:${ip}`
  const failData = (await cache.get(failKey)) || { count: 0, usernames: [], firstAttempt: Date.now() }
  const windowExpired = Date.now() - (failData.firstAttempt || Date.now()) > BRUTE_FORCE_WINDOW

  let currentCount = 0
  let currentUsernames = []

  if (windowExpired) {
    currentCount = 1
    currentUsernames = username ? [username] : []
    await cache.set(failKey, { count: 1, usernames: currentUsernames, firstAttempt: Date.now() }, 120)
  } else {
    currentCount = (failData.count || 0) + 1
    currentUsernames = [...new Set([...(failData.usernames || []), ...(username ? [username] : [])])]
    await cache.set(failKey, { count: currentCount, usernames: currentUsernames, firstAttempt: failData.firstAttempt }, 120)

    if (currentCount >= BRUTE_FORCE_THRESHOLD) {
      detectedVectors.push('BRUTE_FORCE')
      riskScore += 40
      autoBlock = true
      blockReason = `Brute force detected: ${currentCount} failed attempts in 60 seconds`
      logger.warn(`[BRUTE FORCE] ${ip} — ${currentCount} attempts in window`)
    }

    // VECTOR 2 — CREDENTIAL STUFFING (many usernames from same IP)
    if (currentUsernames.length >= CREDENTIAL_STUFFING_THRESHOLD) {
      detectedVectors.push('CREDENTIAL_STUFFING')
      riskScore += 35
      autoBlock = true
      blockReason = `Credential stuffing: ${currentUsernames.length} different usernames tried`
      logger.warn(`[CREDENTIAL STUFFING] ${ip} tried: ${currentUsernames.join(', ')}`)
    }
  }

  // VECTOR 3 — BREACHED PASSWORD USED
  if (password && BREACHED_PASSWORDS.has(password.toLowerCase())) {
    detectedVectors.push('BREACHED_PASSWORD')
    riskScore += 25
    logger.warn(`[BREACHED PASSWORD] ${ip} used known breached password`)
  }

  // VECTOR 4 — VPN/PROXY/TOR DETECTION
  const reputation = await checkIPReputation(ip)
  if (reputation.suspicious) {
    detectedVectors.push(`VPN_DETECTED:${reputation.label}`)
    riskScore += reputation.riskBonus || 30
    autoBlock = true
    blockReason = blockReason || `Auto-blocked: ${reputation.label}`
    logger.warn(`[VPN] ${ip} detected as ${reputation.label}`)
  }

  // VECTOR 5 — SOCIAL ENGINEERING DETECTION
  // Attacker guessing based on company info (email format, common names)
  const socialEngPatterns = [
    /^[a-z]\.[a-z]+\d*$/,                                           // firstname.lastname pattern
    /^(admin|root|test|guest|user|system|service|backup|monitor|operator)$/i,
    /acme|corp|company|office|staff/i
  ]
  if (username && socialEngPatterns.some(p => p.test(username))) {
    detectedVectors.push('SOCIAL_ENGINEERING')
    riskScore += 20
    logger.info(`[SOCIAL ENG] ${ip} tried social engineering pattern: ${username}`)
  }

  // VECTOR 6 — RAPID REQUEST DETECTION (port scanning / flood behavior)
  const rapidKey = `rapid:${ip}`
  const rapidData = (await cache.get(rapidKey)) || { count: 0, firstReq: Date.now() }
  const newRapid = { count: (rapidData.count || 0) + 1, firstReq: rapidData.firstReq || Date.now() }
  await cache.set(rapidKey, newRapid, 30)

  if (newRapid.count > 10 && (Date.now() - newRapid.firstReq) < 10000) {
    detectedVectors.push('RAPID_REQUESTS')
    riskScore += 30
    autoBlock = true
    blockReason = blockReason || `Rapid requests: ${newRapid.count} requests in 10 seconds`
    logger.warn(`[RAPID] ${ip} — ${newRapid.count} requests in 10s`)
  }

  // VECTOR 7 — USER AGENT ANOMALY
  const ua = req.headers['user-agent'] || ''
  const suspiciousUA = [
    /sqlmap/i,
    /nikto/i,
    /nmap/i,
    /masscan/i,
    /hydra/i,
    /burpsuite/i,
    /metasploit/i,
    /python-requests/i,
    /go-http-client/i,
    /curl\//i,
    /wget/i,
    /scanner/i,
    /exploit/i,
    /attack/i,
    /hack/i
  ]
  if (suspiciousUA.some(p => p.test(ua))) {
    detectedVectors.push('SUSPICIOUS_USER_AGENT')
    riskScore += 35
    autoBlock = true
    blockReason = blockReason || `Suspicious tool detected: ${ua.slice(0, 50)}`
    logger.warn(`[TOOL] ${ip} using attack tool: ${ua.slice(0, 80)}`)
  }

  // VECTOR 8 — FINGERPRINT ANOMALY
  if (!fingerprint || fingerprint === 'unknown') {
    detectedVectors.push('MISSING_FINGERPRINT')
    riskScore += 15
    logger.info(`[FINGERPRINT] ${ip} has no browser fingerprint — possible script/bot`)
  }

  return {
    ip,
    username,
    detectedVectors,
    riskScore: Math.min(riskScore, 100),
    autoBlock,
    blockReason,
    userAgent: ua,
    reputation,
    timestamp: new Date().toISOString()
  }
}

export const permanentlyBlockAttacker = async (ip, reason, fingerprint = null, username = null) => {
  try {
    // Block IP in MongoDB
    await BlockedIP.findOneAndUpdate(
      { ip },
      { ip, blockedBy: 'SYSTEM_AUTO', reason: reason || 'Auto-blocked by attack detection engine', permanent: true, blockedAt: new Date() },
      { upsert: true, new: true }
    )

    // Cache IP block for 1 year
    await cache.set(`blocked:${ip}`, { blocked: true, reason }, 86400 * 365)

    // Block fingerprint if available
    if (fingerprint && typeof fingerprint === 'string') {
      await BlockedFingerprint.findOneAndUpdate(
        { fingerprint },
        { fingerprint, blockedBy: 'SYSTEM_AUTO', reason: reason || 'Auto-blocked by attack detection engine', associatedIPs: [ip], blockedAt: new Date() },
        { upsert: true, new: true }
      )
      await cache.set(`blocked:fp:${fingerprint}`, { blocked: true, reason }, 86400 * 365)
    }

    // Broadcast to admin with siren trigger
    broadcast('attacker_auto_blocked', {
      ip,
      reason,
      fingerprint: fingerprint ? (typeof fingerprint === 'string' ? fingerprint.substr(0, 8) + '...' : 'Available') : null,
      username,
      autoBlock: true,
      permanent: true,
      playSiren: true,
      timestamp: new Date().toISOString()
    })

    logger.warn(`[AUTO-BLOCK] ${ip} permanently blocked — ${reason}`)
    return true
  } catch (err) {
    logger.error(`[AUTO-BLOCK] Failed to block ${ip}: ${err.message}`)
    return false
  }
}
