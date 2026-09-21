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
    // Load persisted blocked IPs from localStorage
    let savedBlockedIPs = []
    let savedBlockLog = []
    try {
      savedBlockedIPs = JSON.parse(localStorage.getItem('honeyshield_blocked_ips') || '[]')
      savedBlockLog = JSON.parse(localStorage.getItem('honeyshield_block_log') || '[]')
    } catch {}

    this.blockedIPs = new Set(savedBlockedIPs)
    this.blockLog = savedBlockLog
  }

  blockIP(ip, blockedBy = 'admin', reason = 'Manual block') {
    if (!ip) return
    this.blockedIPs.add(ip)
    const newEntry = {
      id: `BLOCK-${Date.now()}`,
      ip, blockedBy, reason,
      blockedAt: new Date().toISOString(),
      permanent: true
    }
    this.blockLog = [newEntry, ...this.blockLog.filter(b => b.ip !== ip)]
    
    try {
      localStorage.setItem('honeyshield_blocked_ips', JSON.stringify([...this.blockedIPs]))
      localStorage.setItem('honeyshield_block_log', JSON.stringify(this.blockLog))
    } catch {}

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
    if (!ip) return
    this.blockedIPs.delete(ip)
    this.blockLog = this.blockLog.filter(b => b.ip !== ip)
    try {
      localStorage.setItem('honeyshield_blocked_ips', JSON.stringify([...this.blockedIPs]))
      localStorage.setItem('honeyshield_block_log', JSON.stringify(this.blockLog))
    } catch {}
    this.pushUpdate()
  }

  isIPBlocked(ip) {
    if (!ip) return false
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

  async syncFromBackend(backendUrl) {
    try {
      const feedRes = await fetch(`${backendUrl}/api/session/live-feed`)
      if (feedRes.ok) {
        const feed = await feedRes.json()
        if (feed.sessions && feed.sessions.length > 0) {
          feed.sessions.forEach(s => this.updateSession({
            sessionId: s.sessionId, username: s.username, ip: s.ip,
            country: s.country, city: s.city, lat: s.lat, lng: s.lng,
            state: s.state, riskScore: s.riskScore, role: s.role,
            browser: s.browser, os: s.os, attackTypes: s.attackTypes,
            attackCount: s.attackCount, inHoney: s.inHoney, lastSeen: s.lastSeen
          }))
        }
        if (feed.attacks && feed.attacks.length > 0) {
          feed.attacks.forEach(a => this.injectAttackEvent(a))
        }
      }

      const token = sessionStorage.getItem('adminToken')
      const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {}

      const honeyRes = await fetch(`${backendUrl}/api/export/honey`, { headers: { 'Accept': 'application/json', ...authHeaders } })
      if (honeyRes.ok) {
        const hLogs = await honeyRes.json()
        if (Array.isArray(hLogs) && hLogs.length > 0) {
          hLogs.forEach(l => this.injectHoneyEvent(l))
        }
      }

      const alertsRes = await fetch(`${backendUrl}/api/alerts`, { headers: authHeaders })
      if (alertsRes.ok) {
        const alerts = await alertsRes.json()
        if (Array.isArray(alerts) && alerts.length > 0) {
          alerts.forEach(a => this.injectAlert({
            id: a.alertId || a.id, severity: a.severity, title: a.title,
            description: a.description, sessionId: a.sessionId, sourceIP: a.sourceIP,
            timestamp: a.timestamp, status: a.status
          }))
        }
      }

      const blockRes = await fetch(`${backendUrl}/api/blocklist`, { headers: authHeaders })
      if (blockRes.ok) {
        const blocked = await blockRes.json()
        if (Array.isArray(blocked) && blocked.length > 0) {
          blocked.forEach(b => {
            this.blockedIPs.add(b.ip)
            if (!this.blockLog.find(x => x.ip === b.ip)) {
              this.blockLog.unshift({
                id: b._id || `BLOCK-${Date.now()}`,
                ip: b.ip, blockedBy: b.blockedBy || 'admin',
                reason: b.reason || 'Manual block',
                blockedAt: b.blockedAt || new Date().toISOString(),
                permanent: true
              })
            }
          })
        }
      }
      this.pushUpdate()
    } catch (e) {
      console.warn('[LiveDataEngine] Backend sync failed:', e.message)
    }
  }

  clearInactiveSessions() {
    // Keep only sessions that logged in within last 2 hours
    const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000)
    const before = this.sessions.length
    this.sessions = this.sessions.filter(s => {
      const loginTime = s.startTime ? new Date(s.startTime).getTime() : 0
      return loginTime > twoHoursAgo
    })
    console.log(`[Engine] Cleared ${before - this.sessions.length} old sessions`)
    this.pushUpdate()
  }

  registerRealSession(data) {
    this.sessions = this.sessions.filter(s => s.username !== data.username)
    const isAttacker = data.role === 'ATTACKER'

    // CRITICAL: If lat/lng are 0,0 or missing, use country centroid
    const COUNTRY_CENTROIDS = {
      'India': [20.5937, 78.9629],
      'United States': [37.0902, -95.7129],
      'Germany': [51.1657, 10.4515],
      'China': [35.8617, 104.1954],
      'Russia': [61.5240, 105.3188],
      'United Kingdom': [55.3781, -3.4360],
      'France': [46.2276, 2.2137],
      'Brazil': [-14.2350, -51.9253],
      'Unknown': [0, 0]
    }

    let lat = parseFloat(data.lat)
    let lng = parseFloat(data.lng)

    // If lat/lng are 0 or missing, use country centroid
    if (!lat || !lng || (lat === 0 && lng === 0) || isNaN(lat) || isNaN(lng)) {
      const centroid = COUNTRY_CENTROIDS[data.country] || (isAttacker ? [51.1657, 10.4515] : [20.5937, 78.9629])
      lat = centroid[0]
      lng = centroid[1]
      console.log(`[Engine] No coordinates for ${data.username} — using ${data.country} centroid [${lat}, ${lng}]`)
    }

    const session = {
      id: data.sessionId || `SESSION-${data.username}-${Date.now()}`,
      sessionId: data.sessionId || `SESSION-${data.username}`,
      ip: data.ip || 'Unknown',
      country: data.country || 'Unknown',
      city: data.city || 'Unknown',
      region: data.region || '',
      lat,
      lng,
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
      isHoneypotTrap: data.isHoneypotTrap || false,
      trappedEmployee: data.trappedEmployee || null,
      trappedRole: data.trappedRole || null,
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
    this.pushUpdate() // This triggers React re-render including GeoMap
  }

  startAttackerAutoTriggers(session) {
    // Background auto triggers disabled
  }

  registerAttackerAction(actionType, targetSessionId) {
    const attackDef = ATTACK_TYPES[actionType]
    if (!attackDef) return
    let sessionIdx = targetSessionId ? this.sessions.findIndex(s => s.id === targetSessionId || s.sessionId === targetSessionId) : -1
    if (sessionIdx === -1) {
      sessionIdx = this.sessions.findIndex(s => s.role === 'ATTACKER' || s.username === 'testuser' || s.username !== 'admin')
    }
    let session
    if (sessionIdx === -1) {
      session = {
        id: targetSessionId || `ATTACKER-${Date.now()}`, ip: '127.0.0.1', country: 'Localhost', city: 'Localhost',
        lat: 22.3, lng: 73.1, browser: 'Chrome', os: 'Windows', device: 'Desktop',
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
      sessionId: session.id, correlationId: `CAMP-${session.username}`
    }
    this.attackLog.unshift(event)
    if (this.attackLog.length > 500) this.attackLog.pop()
    session.riskScore = Math.min(100, (session.riskScore || 5) + attackDef.riskDelta)
    session.state = 'ATTACKER'
    session.role = 'ATTACKER'
    session.attackTypes = [...new Set([...(session.attackTypes || []), attackDef.label])]
    session.attackCount = (session.attackCount || 0) + 1
    session.timeline = [...(session.timeline || []), { timestamp: event.timestamp, action: 'ATTACK', detail: `${attackDef.label} → ${attackDef.target}` }]
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
    this.alertLog.unshift({
      id: `ALERT-${Date.now()}-${Math.random().toString(36).substr(2,4)}`, severity: attackDef.severity || 'HIGH',
      title: `${attackDef.label} Detected`,
      description: `${attackDef.label} attack executed by ${session.username} (${session.ip}) targeting ${attackDef.target}`,
      sessionId: session.id, sourceIP: session.ip, timestamp: event.timestamp, status: 'New'
    })
    if (this.alertLog.length > 200) this.alertLog.pop()
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
    const alertId = alert.id || alert.alertId || `ALERT-${Date.now()}`
    if (!this.alertLog.find(a => a.id === alertId || a.alertId === alertId)) {
      this.alertLog.unshift({
        id: alertId,
        alertId,
        severity: alert.severity || 'HIGH',
        title: alert.title || 'Threat Detected',
        description: alert.description || 'Security threat detected in honeypot environment',
        sessionId: alert.sessionId,
        sourceIP: alert.sourceIP,
        timestamp: alert.timestamp || new Date().toISOString(),
        status: alert.status || 'New'
      })
      if (this.alertLog.length > 200) this.alertLog.pop()
      this.pushUpdate()
    }
  }

  injectHoneyTrapEvent(data) {
    const sid = data.sessionId || `TRAP-${data.username || 'decoy'}-${Date.now()}`
    this.updateSession({
      sessionId: sid,
      id: sid,
      username: data.username,
      ip: data.ip,
      country: data.country || 'Unknown',
      city: data.city || 'Unknown',
      lat: parseFloat(data.lat) || 0,
      lng: parseFloat(data.lng) || 0,
      browser: data.browser || 'Browser',
      os: data.os || 'OS',
      state: 'ATTACKER',
      role: 'ATTACKER',
      riskScore: 85,
      inHoney: true,
      isHoneypotTrap: true,
      trappedEmployee: data.employee?.name || data.username,
      trappedRole: data.employee?.role || 'Decoy Account',
      trappedDept: data.employee?.dept || 'Corporate'
    })
    this.injectAlert({
      id: `ALERT-${Date.now()}`,
      severity: 'CRITICAL',
      title: `🍯 Honey Trap Triggered — ${data.employee?.role || 'Decoy'} Compromised`,
      description: `Attacker logged in as ${data.employee?.name || data.username} (${data.employee?.role || 'Decoy'}) from ${data.ip}`,
      sessionId: sid,
      sourceIP: data.ip,
      timestamp: data.timestamp || new Date().toISOString(),
      status: 'New'
    })
    this.injectHoneyEvent({
      id: `HONEY-${Date.now()}`,
      sessionId: sid,
      attackerIP: data.ip,
      attackerCountry: data.country || 'Unknown',
      action: 'CREDENTIAL_TRAP',
      fakeTarget: `Employee account: ${data.employee?.name || data.username}`,
      responseSimulated: 'Corporate portal granted',
      timestamp: data.timestamp || new Date().toISOString()
    })
  }

  updateSession(sessionData) {
    if (!sessionData) return
    const sid = sessionData.sessionId || sessionData.id
    const idx = this.sessions.findIndex(s => 
      (sid && (s.id === sid || s.sessionId === sid)) || 
      (sessionData.username && s.username === sessionData.username)
    )
    if (idx >= 0) {
      const existing = this.sessions[idx]
      const updatedScore = sessionData.riskScore !== undefined ? sessionData.riskScore : existing.riskScore
      const updatedState = sessionData.state || (updatedScore > 70 ? 'ATTACKER' : sessionData.role === 'ATTACKER' ? 'ATTACKER' : existing.state)
      const currentHistory = existing.riskHistory || []
      const newHistory = [...currentHistory, { time: new Date().toLocaleTimeString(), score: updatedScore }].slice(-20)

      this.sessions[idx] = {
        ...existing,
        ...sessionData,
        id: existing.id || sid,
        sessionId: sid || existing.sessionId,
        state: updatedState,
        riskScore: updatedScore,
        riskHistory: newHistory,
        attackCount: sessionData.attackCount !== undefined ? sessionData.attackCount : existing.attackCount,
        attackTypes: sessionData.attackTypes || existing.attackTypes,
        inHoney: sessionData.inHoney !== undefined ? sessionData.inHoney : existing.inHoney,
        lastSeen: sessionData.lastSeen || new Date().toISOString()
      }
    } else if (sid || sessionData.username) {
      const initScore = sessionData.riskScore !== undefined ? sessionData.riskScore : (sessionData.role === 'ATTACKER' ? 85 : 0)
      const initState = sessionData.state || (initScore > 70 ? 'ATTACKER' : sessionData.role === 'ATTACKER' ? 'ATTACKER' : 'NORMAL')
      this.sessions.push({
        id: sid || `SESSION-${sessionData.username}-${Date.now()}`,
        sessionId: sid || `SESSION-${sessionData.username}`,
        username: sessionData.username || 'unknown',
        ip: sessionData.ip || 'Unknown', country: sessionData.country || 'Unknown',
        city: sessionData.city || 'Unknown', lat: sessionData.lat || 0, lng: sessionData.lng || 0,
        state: initState, riskScore: initScore,
        role: sessionData.role || (initState === 'ATTACKER' ? 'ATTACKER' : 'USER'),
        browser: sessionData.browser || 'Unknown', os: sessionData.os || 'Unknown',
        attackTypes: sessionData.attackTypes || [], attackCount: sessionData.attackCount || 0,
        inHoney: sessionData.inHoney || false, honeyDuration: 0, honeyInteractions: 0,
        startTime: new Date(), duration: 0, riskHistory: [{ time: new Date().toLocaleTimeString(), score: initScore }],
        fingerprint: { behaviorSignature: 'Authenticated user', toolHint: sessionData.browser || 'Browser' },
        timeline: [], isRealUser: true
      })
    }
    this.pushUpdate()
  }

  removeSession(username) {
    this.sessions = this.sessions.filter(s => s.username !== username)
    this.attackerTimers?.forEach(t => { clearInterval(t); clearTimeout(t) })
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
    this.intervals?.forEach(i => clearInterval(i))
    this.attackerTimers?.forEach(t => { clearInterval(t); clearTimeout(t) })
  }
}

export default LiveDataEngine
