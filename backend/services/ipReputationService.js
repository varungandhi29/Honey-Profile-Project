import mongoose from 'mongoose'
import logger from '../middleware/logger.js'
import { cache } from './cacheService.js'
import ExemptedIP from '../models/ExemptedIP.js'

// Known VPN/proxy/datacenter CIDR ranges
// These are public ranges — not private user ranges
const DATACENTER_RANGES = [
  // AWS
  '3.0.0.0/8', '13.0.0.0/8', '18.0.0.0/8', '34.0.0.0/8', '35.0.0.0/8', '52.0.0.0/8', '54.0.0.0/8',
  // Azure
  '13.64.0.0/11', '13.96.0.0/13', '20.0.0.0/8', '40.64.0.0/10',
  // GCP
  '34.64.0.0/10', '34.128.0.0/10', '35.184.0.0/13',
  // Tor exit nodes prefix (common ranges)
  '185.220.0.0/16', '185.107.0.0/16', '199.249.0.0/16',
]

// Known Tor exit node IPs (update regularly from https://check.torproject.org/torbulkexitlist)
const TOR_EXIT_NODES = new Set([
  '185.220.101.42', '185.220.101.43', '185.220.101.44',
  '199.249.230.87', '199.249.230.88',
])

const ipToNumber = (ip) => {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0
}

const isInCidr = (ip, cidr) => {
  const [range, bits] = cidr.split('/')
  const mask = ~((1 << (32 - parseInt(bits))) - 1) >>> 0
  return (ipToNumber(ip) & mask) === (ipToNumber(range) & mask)
}

/**
 * Check if an IP has an active 24h admin exemption.
 * Checks Redis cache first; falls back to MongoDB and re-caches remaining TTL.
 */
export const checkIPExemption = async (ip) => {
  if (!ip || ip === 'Unknown' || ip === '127.0.0.1') return false
  try {
    // 1. Redis cache first
    const cached = await cache.get(`exempt:vpn:${ip}`)
    if (cached) {
      return true
    }

    // 2. MongoDB fallback
    if (mongoose.connection.readyState === 1) {
      const dbExempt = await ExemptedIP.findOne({
        ip,
        expiresAt: { $gt: new Date() }
      })
      if (dbExempt) {
        const remainingSeconds = Math.max(1, Math.floor((new Date(dbExempt.expiresAt).getTime() - Date.now()) / 1000))
        await cache.set(`exempt:vpn:${ip}`, { exempted: true, exemptedBy: dbExempt.exemptedBy }, remainingSeconds)
        return true
      }
    }
  } catch (err) {
    logger.warn(`[EXEMPTION CHECK ERROR] ${err.message}`)
  }
  return false
}

/**
 * Returns raw reputation without exemption checking.
 */
export const getRawReputation = (ip) => {
  if (!ip || ip === 'Unknown' || ip === '8.8.8.8' || ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
    logger.info(`[REPUTATION] ${ip || 'Unknown'} → CLEAN`)
    return { suspicious: false, reason: null, riskBonus: 0 }
  }

  // Check Tor exit nodes
  if (TOR_EXIT_NODES.has(ip)) {
    logger.info(`[REPUTATION] ${ip} → TOR_EXIT_NODE +30 risk bonus`)
    return { suspicious: true, reason: 'TOR_EXIT_NODE', riskBonus: 30, label: 'Tor Exit Node' }
  }

  // Check datacenter/cloud ranges
  for (const range of DATACENTER_RANGES) {
    try {
      if (isInCidr(ip, range)) {
        logger.info(`[REPUTATION] ${ip} → DATACENTER_IP +20 risk bonus`)
        return { suspicious: true, reason: 'DATACENTER_IP', riskBonus: 20, label: 'Datacenter/VPN IP' }
      }
    } catch {}
  }

  logger.info(`[REPUTATION] ${ip} → CLEAN`)
  return { suspicious: false, reason: null, riskBonus: 0 }
}

/**
 * Check IP reputation. If exempt by admin, returns { suspicious: false, exempt: true }.
 * Pass { bypassExemption: true } to query raw reputation (used in unblock route for C1).
 */
export const checkIPReputation = async (ip, options = {}) => {
  if (options.bypassExemption || options.raw) {
    return getRawReputation(ip)
  }

  const isExempt = await checkIPExemption(ip)
  if (isExempt) {
    logger.info(`[REPUTATION] ${ip} → EXEMPT (Admin 24h VPN Exemption Active)`)
    return { suspicious: false, reason: null, riskBonus: 0, exempt: true }
  }

  return getRawReputation(ip)
}

export const isPrivateIP = (ip) => {
  const privateRanges = ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '127.0.0.0/8']
  return privateRanges.some(range => { try { return isInCidr(ip, range) } catch { return false } })
}
