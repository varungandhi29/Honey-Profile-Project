import logger from '../middleware/logger.js'
let io = null
export const initBroadcast = (socketIO) => { io = socketIO; logger.info('[BROADCAST] Initialized') }
export const broadcast = (event, data) => {
  if (!io) return
  io.emit(event, { ...data, broadcastAt: new Date().toISOString() })
  logger.info(`[BROADCAST] ${event} → ${data.attack?.type || data.title || data.sessionId || ''}`)
}
export const broadcastAttack = (attack, session, aiResult) => {
  broadcast('new_attack', {
    attack: {
      id: attack.attackId, type: attack.type, severity: attack.severity,
      sourceIP: attack.sourceIP, sourceCountry: attack.sourceCountry, sourceCity: attack.sourceCity,
      targetArea: attack.targetArea, riskDelta: attack.riskDelta,
      sessionId: attack.sessionId, timestamp: attack.timestamp
    },
    session: {
      id: session?.sessionId, username: session?.username, ip: session?.ip,
      country: session?.country, city: session?.city,
      lat: session?.lat, lng: session?.lng,
      state: session?.state, riskScore: session?.riskScore,
      browser: session?.browser, os: session?.os
    },
    aiResult: aiResult || null
  })
}
export const broadcastHoney = (log, session, honeyCount) => {
  broadcast('honey_interaction', {
    log: {
      id: log.logId, attackerIP: log.attackerIP, attackerCountry: log.attackerCountry,
      action: log.action, fakeTarget: log.fakeTarget,
      responseSimulated: log.responseSimulated, timestamp: log.timestamp
    },
    session: { ip: session?.ip, country: session?.country, city: session?.city, lat: session?.lat, lng: session?.lng, username: session?.username },
    honeyCount, deepTrap: honeyCount >= 10
  })
}
export const broadcastSessionUpdate = (session) => {
  broadcast('session_updated', {
    sessionId: session.sessionId, username: session.username,
    ip: session.ip, country: session.country, city: session.city,
    lat: session.lat, lng: session.lng,
    state: session.state, riskScore: session.riskScore,
    attackCount: session.attackCount, attackTypes: session.attackTypes,
    inHoney: session.inHoney, lastSeen: session.lastSeen
  })
}
export const broadcastAlert = (alert) => {
  broadcast('new_alert', {
    alertId: alert.alertId, severity: alert.severity,
    title: alert.title, description: alert.description,
    sessionId: alert.sessionId, sourceIP: alert.sourceIP,
    attackType: alert.attackType, timestamp: alert.timestamp
  })
}
