import { cache } from './cacheService.js'
import logger from '../middleware/logger.js'

const WINDOW_SECONDS = 300

export const THRESHOLDS = {
  SILENT_FLAG: 2,
  SUSPICIOUS: 3,
  HIGH_RISK: 4,
  TRAP: 5,
}

export const trackAttempt = async (ip, username) => {
  const key = `threshold:${ip}:${username}`
  const existing = await cache.get(key).catch(() => null) || { count: 0, firstAttempt: Date.now() }
  const newCount = existing.count + 1
  await cache.set(key, { ...existing, count: newCount, lastAttempt: Date.now(), ip, username }, WINDOW_SECONDS).catch(() => {})
  logger.info(`[THRESHOLD] ${ip} → ${username}: attempt ${newCount}`)
  return newCount
}

export const getAttemptCount = async (ip, username) => {
  const key = `threshold:${ip}:${username}`
  const data = await cache.get(key).catch(() => null)
  return data?.count || 0
}

export const isIPTrapped = async (ip) => {
  return !!(await cache.get(`trapped:${ip}`).catch(() => null))
}

export const markIPAsTrapped = async (ip, username) => {
  await cache.set(`trapped:${ip}`, { ip, username, trappedAt: Date.now() }, WINDOW_SECONDS * 2).catch(() => {})
  logger.warn(`[TRAP] ${ip} marked as trapped`)
}

export const clearAttempts = async (ip, username) => {
  await cache.del(`threshold:${ip}:${username}`).catch(() => {})
  await cache.del(`trapped:${ip}`).catch(() => {})
}

export const getThresholdStatus = (count) => {
  if (count >= THRESHOLDS.TRAP)        return { level: 'TRAP',       severity: 'CRITICAL', message: `Confirmed attacker — trapping now` }
  if (count >= THRESHOLDS.HIGH_RISK)   return { level: 'HIGH_RISK',  severity: 'HIGH',     message: `${count} failed attempts — high risk` }
  if (count >= THRESHOLDS.SUSPICIOUS)  return { level: 'SUSPICIOUS', severity: 'MEDIUM',   message: `${count} failed attempts — suspicious` }
  if (count >= THRESHOLDS.SILENT_FLAG) return { level: 'FLAGGED',    severity: 'LOW',      message: `${count} failed attempts — monitoring` }
  return { level: 'NORMAL', severity: null, message: null }
}
