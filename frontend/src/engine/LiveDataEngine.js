import { ATTACK_TYPES, HONEY_TARGET_MAP } from './constants'

class LiveDataEngine {
  constructor(updateCallback) {
    this.sessions = []
    this.attackLog = []
    this.honeyLog = []
    this.alertLog = []
    this.autoResponseLog = []
    this.updateCallback = updateCallback
    this.intervals = []
    this.attackerTimers = []
    this.blockedIPs = new Set()
    this.blockLog = []
  }

  blockIP(ip, blockedBy = 'admin', reason = 'Manual block') {
    this.blockedIPs.add(ip)
    this.blockLog.unshift({
      id: `BLOCK-${Date.now()}`,
      ip, blockedBy, reason,
      blockedAt: new Date().toISOString(),
      permanent: true
    })
    // Remove all sessions from this IP
    const removed = this.sessions.filter(s => s.ip === ip)
    this.sessions = this.sessions.filter(s => s.ip !== ip)
    // Add auto-response log entry
    this.autoResponseLog.unshift({
      id: `AR-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'BLOCK_IP',
      sessionId: removed[0]?.id || 'unknown',
      result: `IP ${ip} permanently blocked — ${removed.length} session(s) terminated`
    })
    this.pushUpdate()
  }

  unblockIP(ip) {
    this.blockedIPs.delete(ip)
    this.blockLog = this.blockLog.filter(b => b.ip !== ip)
    this.pushUpdate()
  }

  isIPBlocked(ip) {
    return this.blockedIPs.has(ip)
  }

  getBlockLog() {
    return [...this.blockLog]
  }

  getState() {
    return {
      sessions: [...this.sessions],
      attackLog: [...this.attackLog],
      honeyLog: [...this.honeyLog],
      alertLog: [...this.alertLog],
      autoResponseLog: [...this.autoResponseLog],
      blockLog: [...this.blockLog],
      blockedIPs: [...this.blockedIPs]
    }
  }

  pushUpdate() { this.updateCallback(this.getState()) }

  registerRealSession(data) {
    this.sessions = this.sessions.filter(s => s.username !== data.username)
    const isAttacker = data.role === 'ATTACKER'
    const session = {
      id: data.sessionId || `SESSION-${data.username}-${Date.now()}`,
      ip: data.ip || 'Unknown',
      country: data.country || 'Unknown',
      city: data.city || 'Unknown',
      region: data.region || '',
      lat: data.lat !== undefined ? data.lat : 0,
      lng: data.lng !== undefined ? data.lng : 0,
      timezone: data.timezone || 'Unknown',
      isp: data.isp || 'Unknown',
      browser: data.browser || 'Browser',
      os: data.os || 'Unknown',
      device: data.device || 'Desktop',
      username: data.username,
      role: data.role,
      startTime: new Date(),
      duration: 0,
      state: isAttacker ? 'ATTACKER' : 'NORMAL',
      riskScore: isAttacker ? 85 : 5,
      riskHistory: [{ time: new Date().toLocaleTimeString(), score: isAttacker ? 85 : 5 }],
      attackTypes: [],
      attackCount: 0,
      fingerprint: {
        deviceId: (data.ip || '').replace(/\./g,'').substr(0,8) || 'unknown',
        behaviorSignature: isAttacker ? 'Human manual attacker' : 'Authenticated user',
        requestPattern: 'Linear',
        toolHint: data.browser || 'Browser'
      },
      timeline: [{
        timestamp: new Date().toISOString(),
        action: 'LOGIN',
        detail: `${data.username} logged in from ${data.ip || 'Unknown'} (${data.city || 'Unknown'}, ${data.country || 'Unknown'})`
      }],
      inHoney: isAttacker,
      honeyDuration: 0,
      honeyInteractions: 0,
      isRealUser: true
    }
    this.sessions.push(session)
    if (isAttacker) this.startAttackerAutoTriggers(session)
    const durationInterval = setInterval(() => {
      const idx = this.sessions.findIndex(x => x.id === session.id)
      if (idx >= 0) {
        const s = { ...this.sessions[idx] }
        s.duration = Math.floor((Date.now() - s.startTime.getTime()) / 1000)
        if (s.inHoney) s.honeyDuration = s.duration
        s.riskHistory = [...s.riskHistory, { time: new Date().toLocaleTimeString(), score: s.riskScore }]
        if (s.riskHistory.length > 20) s.riskHistory.shift()
        this.sessions[idx] = s
        this.pushUpdate()
      }
    }, 5000)
    this.intervals.push(durationInterval)
    this.pushUpdate()
  }

  startAttackerAutoTriggers(session) {
    const timers = [
      setInterval(() => { if (this.sessions.find(s => s.id === session.id)) this.registerAttackerAction('RECONNAISSANCE') }, 30000),
      setTimeout(() => { if (this.sessions.find(s => s.id === session.id)) this.registerAttackerAction('SESSION_HIJACKING') }, 120000),
      setTimeout(() => { if (this.sessions.find(s => s.id === session.id)) this.registerAttackerAction('MAN_IN_THE_MIDDLE') }, 180000),
      setTimeout(() => { if (this.sessions.find(s => s.id === session.id)) this.registerAttackerAction('INSIDER_THREAT') }, 300000),
      setInterval(() => { if (this.sessions.find(s => s.id === session.id) && Math.random() < 0.1) this.registerAttackerAction('ZERO_DAY_EXPLOIT') }, 60000)
    ]
    this.attackerTimers.push(...timers)
  }

  registerAttackerAction(actionType) {
    const attackDef = ATTACK_TYPES[actionType]
    if (!attackDef) return
    let sessionIdx = this.sessions.findIndex(s => s.role === 'ATTACKER')
    let session
    if (sessionIdx === -1) {
      session = {
        id: `ATTACKER-${Date.now()}`, ip: '185.220.101.42', country: 'Germany', city: 'Frankfurt',
        lat: 50.1, lng: 8.6, browser: 'Chrome', os: 'Windows', device: 'Desktop',
        username: 'testuser', role: 'ATTACKER', state: 'ATTACKER', riskScore: 85,
        riskHistory: [], attackTypes: [], attackCount: 0,
        fingerprint: { deviceId: 'auto-001', behaviorSignature: 'Human manual attacker', requestPattern: 'Manual', toolHint: 'Browser' },
        timeline: [], inHoney: true, honeyDuration: 0, honeyInteractions: 0, startTime: new Date(), duration: 0, isRealUser: true
      }
      this.sessions.push(session)
      sessionIdx = this.sessions.length - 1
    } else {
      session = { ...this.sessions[sessionIdx] }
    }
    const event = {
      id: `ATK-${Date.now()}-${Math.random().toString(36).substr(2,4)}`,
      type: attackDef.label, severity: attackDef.severity,
      timestamp: new Date().toISOString(),
      sourceIP: session.ip, sourceCountry: session.country, sourceCity: session.city,
      targetArea: attackDef.target, riskDelta: attackDef.riskDelta,
      sessionId: session.id, correlationId: `CAMP-testuser`
    }
    this.attackLog.unshift(event)
    if (this.attackLog.length > 500) this.attackLog.pop()
    session.riskScore = Math.min(100, session.riskScore + attackDef.riskDelta)
    session.state = 'ATTACKER'
    session.attackTypes = [...new Set([...session.attackTypes, attackDef.label])]
    session.attackCount = (session.attackCount || 0) + 1
    session.timeline = [...session.timeline, { timestamp: event.timestamp, action: 'ATTACK', detail: `${attackDef.label} → ${attackDef.target}` }]
    const honeyEvent = {
      id: `HONEY-${Date.now()}`, sessionId: session.id, attackerIP: session.ip, attackerCountry: session.country,
      timestamp: event.timestamp,
      action: actionType.includes('EXFIL') || actionType.includes('DATA') ? 'DOWNLOAD' : actionType.includes('COMMAND') || actionType.includes('INJECT') ? 'EXEC' : actionType.includes('TRAVERSAL') ? 'READ' : actionType.includes('CREDENTIAL') ? 'LOGIN_ATTEMPT' : 'READ',
      fakeTarget: HONEY_TARGET_MAP[actionType] || '/system/unknown',
      responseSimulated: '200 OK'
    }
    this.honeyLog.unshift(honeyEvent)
    if (this.honeyLog.length > 500) this.honeyLog.pop()
    session.honeyInteractions = (session.honeyInteractions || 0) + 1
    if (['HIGH','CRITICAL'].includes(attackDef.severity)) {
      this.alertLog.unshift({
        id: `ALERT-${Date.now()}`, severity: attackDef.severity,
        title: `${attackDef.label} Detected`,
        description: `${attackDef.label} from ${session.ip} (${session.country}) targeting ${attackDef.target}`,
        sessionId: session.id, sourceIP: session.ip, timestamp: event.timestamp, status: 'New'
      })
      if (this.alertLog.length > 200) this.alertLog.pop()
    }
    this.sessions[sessionIdx] = session
    this.pushUpdate()
  }

  // Inject from Socket.io real-time events
  injectAttackEvent(attack) {
    this.attackLog.unshift({ id: attack.id || `ATK-${Date.now()}`, type: attack.type, severity: attack.severity, timestamp: attack.timestamp || new Date().toISOString(), sourceIP: attack.sourceIP, sourceCountry: attack.sourceCountry, sourceCity: attack.sourceCity, targetArea: attack.targetArea, riskDelta: attack.riskDelta, sessionId: attack.sessionId })
    if (this.attackLog.length > 500) this.attackLog.pop()
    this.pushUpdate()
  }

  injectHoneyEvent(log) {
    this.honeyLog.unshift({ id: log.id || `HONEY-${Date.now()}`, sessionId: log.sessionId, attackerIP: log.attackerIP, attackerCountry: log.attackerCountry, action: log.action, fakeTarget: log.fakeTarget, responseSimulated: log.responseSimulated || '200 OK', timestamp: log.timestamp || new Date().toISOString() })
    if (this.honeyLog.length > 500) this.honeyLog.pop()
    this.pushUpdate()
  }

  injectAlert(alert) {
    if (!this.alertLog.find(a => a.id === alert.id)) {
      this.alertLog.unshift({ id: alert.id || `ALERT-${Date.now()}`, severity: alert.severity, title: alert.title, description: alert.description, sessionId: alert.sessionId, sourceIP: alert.sourceIP, timestamp: alert.timestamp || new Date().toISOString(), status: 'New' })
      if (this.alertLog.length > 200) this.alertLog.pop()
      this.pushUpdate()
    }
  }

  updateSession(sessionData) {
    const idx = this.sessions.findIndex(s => s.id === sessionData.sessionId || s.username === sessionData.username)
    if (idx >= 0) {
      this.sessions[idx] = {
        ...this.sessions[idx],
        state: sessionData.state || this.sessions[idx].state,
        riskScore: sessionData.riskScore !== undefined ? sessionData.riskScore : this.sessions[idx].riskScore,
        attackCount: sessionData.attackCount !== undefined ? sessionData.attackCount : this.sessions[idx].attackCount,
        attackTypes: sessionData.attackTypes || this.sessions[idx].attackTypes,
        inHoney: sessionData.inHoney !== undefined ? sessionData.inHoney : this.sessions[idx].inHoney,
        lastSeen: sessionData.lastSeen || new Date().toISOString(),
        lat: sessionData.lat !== undefined ? sessionData.lat : this.sessions[idx].lat,
        lng: sessionData.lng !== undefined ? sessionData.lng : this.sessions[idx].lng,
        country: sessionData.country || this.sessions[idx].country,
        city: sessionData.city || this.sessions[idx].city,
        ip: sessionData.ip || this.sessions[idx].ip
      }
    } else if (sessionData.sessionId) {
      this.sessions.push({
        id: sessionData.sessionId, username: sessionData.username || 'unknown',
        ip: sessionData.ip || 'Unknown', country: sessionData.country || 'Unknown',
        city: sessionData.city || 'Unknown', lat: sessionData.lat || 0, lng: sessionData.lng || 0,
        state: sessionData.state || 'NORMAL', riskScore: sessionData.riskScore || 0,
        role: sessionData.role || 'USER', browser: sessionData.browser || 'Unknown', os: sessionData.os || 'Unknown',
        attackTypes: sessionData.attackTypes || [], attackCount: sessionData.attackCount || 0,
        inHoney: sessionData.inHoney || false, honeyDuration: 0, honeyInteractions: 0,
        startTime: new Date(), duration: 0, riskHistory: [],
        fingerprint: { behaviorSignature: 'Authenticated user', toolHint: 'Browser' },
        timeline: [], isRealUser: true
      })
    }
    this.pushUpdate()
  }

  removeSession(username) {
    this.sessions = this.sessions.filter(s => s.username !== username)
    this.attackerTimers.forEach(t => { clearInterval(t); clearTimeout(t) })
    this.attackerTimers = []
    this.pushUpdate()
  }

  removeSessionById(sessionId) {
    this.sessions = this.sessions.filter(s => s.id !== sessionId)
    this.pushUpdate()
  }

  boostSessionRisk(sessionId, targetScore, durationMs) {
    const idx = this.sessions.findIndex(x => x.id === sessionId)
    if (idx === -1) return
    const orig = { score: this.sessions[idx].riskScore, state: this.sessions[idx].state }
    const s = { ...this.sessions[idx] }
    s.riskScore = targetScore; s.state = 'ATTACKER'
    s.timeline = [...s.timeline, { timestamp: new Date().toISOString(), action: 'FP_SIMULATION', detail: 'Risk score boosted for FP demonstration' }]
    this.sessions[idx] = s
    this.pushUpdate()
    setTimeout(() => {
      const idx2 = this.sessions.findIndex(x => x.id === sessionId)
      if (idx2 >= 0) {
        const ss = { ...this.sessions[idx2] }
        ss.riskScore = orig.score; ss.state = orig.state
        this.sessions[idx2] = ss
        this.pushUpdate()
      }
    }, durationMs)
  }

  createStealthSession() {
    const s = {
      id: `STEALTH-${Date.now()}`, ip: '172.16.0.99', country: 'Unknown', city: 'Unknown',
      lat: 0, lng: 0, browser: 'Unknown', os: 'Unknown', device: 'Desktop',
      username: 'stealth-attacker', role: 'ATTACKER', state: 'ATTACKER', riskScore: 45,
      riskHistory: [], attackTypes: ['Reconnaissance'], attackCount: 1,
      fingerprint: { deviceId: 'stealth', behaviorSignature: 'Slow-and-low scanner', requestPattern: 'Stealthy', toolHint: 'Nmap' },
      timeline: [{ timestamp: new Date().toISOString(), action: 'FN_DEMO', detail: 'Stealth session — below detection threshold' }],
      inHoney: false, honeyDuration: 0, honeyInteractions: 0, startTime: new Date(), duration: 0, fnStartTime: Date.now(), isSimulated: true
    }
    this.sessions.push(s)
    setTimeout(() => {
      const idx = this.sessions.findIndex(x => x.id === s.id)
      if (idx >= 0) {
        const found = { ...this.sessions[idx] }
        found.riskScore = 88; found.state = 'ATTACKER'
        found.timeline = [...found.timeline, { timestamp: new Date().toISOString(), action: 'FN_REVEALED', detail: 'Stealth attacker revealed after 30s manual review' }]
        this.alertLog.unshift({ id: `ALERT-${Date.now()}`, severity: 'CRITICAL', title: 'False Negative Revealed', description: 'Stealth attacker was below threshold for 30s', sessionId: s.id, timestamp: new Date().toISOString(), status: 'New' })
        this.sessions[idx] = found
        this.pushUpdate()
      }
    }, 30000)
    this.pushUpdate()
  }

  acknowledgeAlert(alertId) {
    const alert = this.alertLog.find(a => a.id === alertId)
    if (alert) { alert.status = 'Acknowledged'; this.pushUpdate() }
  }

  dismissAlert(alertId) {
    this.alertLog = this.alertLog.filter(a => a.id !== alertId)
    this.pushUpdate()
  }

  blockSession(sessionId) {
    this.sessions = this.sessions.filter(s => s.id !== sessionId)
    this.autoResponseLog.unshift({ id: `AR-${Date.now()}`, timestamp: new Date().toISOString(), action: 'BLOCK', sessionId, result: 'Session blocked' })
    this.pushUpdate()
  }

  destroy() {
    this.intervals.forEach(i => clearInterval(i))
    this.attackerTimers.forEach(t => { clearInterval(t); clearTimeout(t) })
  }
}

export default LiveDataEngine
