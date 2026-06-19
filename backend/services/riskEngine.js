import axios from 'axios'
import { cache } from './cacheService.js'
import logger from '../middleware/logger.js'
const WEIGHTS = { CRITICAL: 1.5, HIGH: 1.2, MEDIUM: 1.0, LOW: 0.7 }
export const calculateRisk = (session, attack) => {
  let score = session.riskScore || 0
  if (attack) score += attack.riskDelta * (WEIGHTS[attack.severity] || 1.0)
  if (session.inHoney) score *= 1.2
  if (session.attackCount > 5) score *= 1.1
  return Math.min(100, Math.max(0, Math.round(score)))
}
export const getState = (score) => score >= 70 ? 'ATTACKER' : score >= 36 ? 'SUSPICIOUS' : 'NORMAL'
export const getAIPrediction = async (features) => {
  try {
    const cached = await cache.get(`ai:${features.sessionId}`)
    if (cached) return cached
    const res = await axios.post(`${process.env.AI_SERVICE_URL}/predict`, { sessionId: features.sessionId, features }, { timeout: 2000 })
    await cache.set(`ai:${features.sessionId}`, res.data, 30)
    return res.data
  } catch { return null }
}
