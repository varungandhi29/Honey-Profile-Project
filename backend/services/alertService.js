import Alert from '../models/Alert.js'
import { cache } from './cacheService.js'
import { broadcastAlert } from './broadcastService.js'
import logger from '../middleware/logger.js'
const AUTO_RULES = {
  ZERO_DAY_EXPLOIT: 'BLOCK', COMMAND_INJECTION: 'BLOCK', DDOS: 'BLOCK',
  DATA_EXFILTRATION: 'REDIRECT_HONEY', INSIDER_THREAT: 'FLAG_REVIEW',
  SQL_INJECTION: 'RATE_LIMIT', BRUTE_FORCE: 'RATE_LIMIT'
}
export const createAlert = async (data, io) => {
  try {
    const alert = await Alert.create({
      alertId: `ALERT-${Date.now()}-${Math.random().toString(36).substr(2,4)}`,
      severity: data.severity, title: data.title, description: data.description,
      sessionId: data.sessionId, sourceIP: data.sourceIP || 'Unknown',
      attackType: data.attackType || null, status: 'New'
    })
    broadcastAlert(alert)
    await cache.increment('unread_alerts', 86400)
    const autoAction = AUTO_RULES[data.attackType]
    if (autoAction && io) {
      io.emit('auto_response', { sessionId: data.sessionId, action: autoAction, reason: data.attackType, timestamp: new Date().toISOString() })
      logger.info(`[AUTO] ${autoAction} triggered for ${data.attackType}`)
    }
    return alert
  } catch (err) { logger.error(`Alert creation failed: ${err.message}`); return null }
}
