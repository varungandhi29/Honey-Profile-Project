import { useState, useRef, useEffect, useCallback } from 'react'
import LiveDataEngine from './engine/LiveDataEngine'
import { ATTACK_TYPES, HONEY_TARGET_MAP } from './engine/constants'
import { useSocket } from './hooks/useSocket'
import { useNotifications } from './hooks/useNotifications'
import { generateFingerprint } from './utils/fingerprint'
import { alertEngine } from './audio/alertEngine'
import LoginPage from './pages/LoginPage'
import AdminDashboard from './pages/AdminDashboard'
import DeceptionDashboard from './pages/DeceptionDashboard'
import BlockedScreen from './components/BlockedScreen'
import UnblockedScreen from './components/UnblockedScreen'
import { BACKEND } from './utils/backendUrl'

export default function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [unblockedData, setUnblockedData] = useState(null)
  const [appBlocked, setAppBlocked] = useState(() => {
    try {
      const saved = localStorage.getItem('honeyshield_blocked')
      return saved ? JSON.parse(saved).blocked === true : false
    } catch { return false }
  })
  const [appBlockedReason, setAppBlockedReason] = useState(() => {
    try {
      const saved = localStorage.getItem('honeyshield_blocked')
      return saved ? JSON.parse(saved).reason : null
    } catch { return null }
  })
  const [vpnBlocked, setVpnBlocked] = useState(false)
  const [vpnInfo, setVpnInfo] = useState({ ip: '127.0.0.1', label: 'VPN / Datacenter IP' })
  const [loginError, setLoginError] = useState('')
  const [forceUpdate, setForceUpdate] = useState(0)
  const engineRef = useRef(null)
  const sessionIdRef = useRef(null)
  const [data, setData] = useState({ sessions:[], attackLog:[], honeyLog:[], alertLog:[], autoResponseLog:[] })
  const [backendOnline, setBackendOnline] = useState(false)
  const [aiOnline, setAiOnline] = useState(false)
  const { addToast, ToastContainer, requestPermission, unreadCount } = useNotifications()

  // Initialize audio on first click
  useEffect(() => {
    const initAudio = () => { alertEngine.init(); document.removeEventListener('click', initAudio) }
    document.addEventListener('click', initAudio)
    return () => document.removeEventListener('click', initAudio)
  }, [])

  // Init engine
  useEffect(() => {
    engineRef.current = new LiveDataEngine(newState => setData({ ...newState }))
    return () => engineRef.current?.destroy()
  }, [])

  // Check persistent block status on mount — verify with backend check-status as source of truth
  useEffect(() => {
    const checkPersistentBlock = async () => {
      try {
        const saved = localStorage.getItem('honeyshield_blocked')
        let isLocallyBlocked = false
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed.blocked) {
            isLocallyBlocked = true
            setAppBlocked(true)
            setAppBlockedReason(parsed.reason || 'IP_BLOCKED')
          }
        }

        // Verify with backend check-status as authoritative source of truth
        const res = await fetch(`${BACKEND}/api/blocklist/check-status`, { signal: AbortSignal.timeout(3000) })
        if (res.ok) {
          const status = await res.json()
          if (status.blocked === false) {
            localStorage.removeItem('honeyshield_blocked')
            localStorage.removeItem('honeyshield_blocked_ips')
            setAppBlocked(false)
            setAppBlockedReason(null)
            if (isLocallyBlocked) {
              setUnblockedData({
                ip: 'Your IP',
                timestamp: new Date().toISOString()
              })
            }
          } else if (status.blocked === true) {
            setAppBlocked(true)
            setAppBlockedReason('IP_BLOCKED')
          }
        }
      } catch {}
    }
    checkPersistentBlock()
  }, [])

  // Verify admin session on mount
  useEffect(() => {
    const verifyAdmin = async () => {
      const token = sessionStorage.getItem('honeyshield_admin_token')
      if (token) {
        try {
          const r = await fetch(`${BACKEND}/api/auth/verify`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          const d = await r.json()
          if (d.authenticated && d.user) {
            setCurrentUser({ ...d.user, isAdmin: true })
            sessionIdRef.current = `ADMIN-${Date.now()}`
          } else {
            sessionStorage.removeItem('honeyshield_admin_token')
          }
        } catch {}
      }
    }
    verifyAdmin()
  }, [])

  // Health checks & data sync
  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch(`${BACKEND}/api/health`, { signal: AbortSignal.timeout(3000) });
        const d = await r.json();
        const online = d.status === 'ok'
        setBackendOnline(online)
        if (online) {
          engineRef.current?.syncFromBackend(BACKEND)
        }
      } catch { setBackendOnline(false) }
      try { const r = await fetch(`${BACKEND}/api/ai/health`, { signal: AbortSignal.timeout(3000) }); const d = await r.json(); setAiOnline(d.model_loaded === true) } catch { setAiOnline(false) }
    }
    check()
    const i = setInterval(check, 10000)
    return () => clearInterval(i)
  }, [])

  const currentUserRef = useRef(currentUser)
  useEffect(() => {
    currentUserRef.current = currentUser
  }, [currentUser])

  // Handle client unblock event
  const handleClientUnblocked = useCallback((info) => {
    const wasBlocked = appBlocked || vpnBlocked || !!localStorage.getItem('honeyshield_blocked')
    try {
      localStorage.removeItem('honeyshield_blocked')
      localStorage.removeItem('honeyshield_blocked_ips')
    } catch {}
    setAppBlocked(false)
    setAppBlockedReason(null)
    setVpnBlocked(false)

    // C6: Only show UnblockedScreen if client was previously in a blocked state
    if (wasBlocked) {
      setUnblockedData({
        ip: info?.ip || 'Your IP',
        timestamp: info?.timestamp || new Date().toISOString()
      })
    }
  }, [appBlocked, vpnBlocked])

  // Socket.io — always connected
  const { connected: socketConnected, latency } = useSocket({
    onAttack: (data) => {
      if (data.attack) engineRef.current?.injectAttackEvent(data.attack)
      if (data.session) engineRef.current?.updateSession(data.session)
      if (data.attack?.severity === 'CRITICAL') {
        alertEngine.stopContinuousAlert()
        alertEngine.startContinuousAlert('CRITICAL', 6000)
        setForceUpdate(p => p + 1)
        addToast(`🚨 CRITICAL: ${data.attack.type} from ${data.attack.sourceIP || 'attacker'} (${data.attack.sourceCountry || 'Unknown'})`, 'critical')
      } else {
        alertEngine.playBySeverity(data.attack?.severity)
        if (data.attack?.severity === 'HIGH') addToast(`⚠️ HIGH: ${data.attack.type} from ${data.attack.sourceCountry || 'Unknown'}`, 'warning')
      }
    },
    onAlert: (data) => {
      if (data.alertId || data.id) engineRef.current?.injectAlert({ id: data.alertId || data.id, severity: data.severity, title: data.title, description: data.description, sessionId: data.sessionId, sourceIP: data.sourceIP, timestamp: data.timestamp, status: data.status || 'New' })
      alertEngine.playBySeverity(data.severity)
      addToast(`🔔 ${data.severity}: ${data.title}`, data.severity === 'CRITICAL' ? 'critical' : 'warning')
    },
    onSessionUpdate: (data) => {
      if (data.sessionId || data.id) engineRef.current?.updateSession(data)
      // Start continuous alert when first ATTACKER session appears
      if ((data.state === 'ATTACKER' || data.role === 'ATTACKER') && !alertEngine.isAlertActive()) {
        alertEngine.startContinuousAlert('HIGH', 10000)
        setForceUpdate(p => p + 1)
        addToast('🚨 ATTACKER IN SYSTEM — Continuous alert active', 'critical')
      }
    },
    onHoney: (data) => {
      if (data.log) engineRef.current?.injectHoneyEvent(data.log)
      alertEngine.playHoneyTrap()
      if (data.deepTrap) addToast(`🍯 Deep Trap! ${data.session?.ip || 'Attacker'} has ${data.honeyCount} honey interactions`, 'warning')
    },
    onAutoResponse: (data) => addToast(`🤖 Auto-response: ${data.action} for ${data.reason}`, 'info'),
    onSessionRemoved: (data) => engineRef.current?.removeSessionById(data.sessionId),
    onSessionBlocked: (data) => {
      engineRef.current?.removeSessionById(data.sessionId);
      alertEngine.playBlocked()
      alertEngine.stopContinuousAlert()
      setForceUpdate(p => p + 1)
      if (currentUserRef.current?.role === 'ATTACKER' || currentUserRef.current?.username === 'testuser') {
        try { localStorage.setItem('honeyshield_blocked', JSON.stringify({ blocked: true, reason: 'IP_BLOCKED', sessionId: data.sessionId })) } catch {}
        setAppBlockedReason('IP_BLOCKED')
        setAppBlocked(true)
      } else {
        addToast(`🚫 Session blocked: ${data.sessionId}`, 'info')
      }
    },
    onBlockedAttempt: (data) => {
      alertEngine.playBlocked()
      if (currentUserRef.current?.role === 'ATTACKER' || currentUserRef.current?.username === 'testuser') {
        try { localStorage.setItem('honeyshield_blocked', JSON.stringify({ blocked: true, reason: 'FINGERPRINT_BLOCKED' })) } catch {}
        setAppBlockedReason('FINGERPRINT_BLOCKED')
        setAppBlocked(true)
      } else {
        addToast(`⚠️ Blocked IP ${data.ip} tried to connect again`, 'warning')
      }
    },
    onIPBlocked: (data) => {
      engineRef.current?.blockIP(data.ip, data.blockedBy, data.reason);
      alertEngine.playBlocked()
      alertEngine.stopContinuousAlert()
      setForceUpdate(p => p + 1)
      if (currentUserRef.current?.role === 'ATTACKER' || currentUserRef.current?.username === 'testuser') {
        try { localStorage.setItem('honeyshield_blocked', JSON.stringify({ blocked: true, reason: 'IP_BLOCKED', ip: data.ip })) } catch {}
        setAppBlockedReason('IP_BLOCKED')
        setAppBlocked(true)
      } else {
        addToast(`🚫 IP ${data.ip} blocked`, 'warning')
      }
    },
    onFingerprintBlocked: (data) => {
      alertEngine.playBlocked()
      alertEngine.stopContinuousAlert()
      setForceUpdate(p => p + 1)
      if (currentUserRef.current?.role === 'ATTACKER' || currentUserRef.current?.username === 'testuser') {
        try { localStorage.setItem('honeyshield_blocked', JSON.stringify({ blocked: true, reason: 'FINGERPRINT_BLOCKED', fingerprint: data.fingerprint })) } catch {}
        setAppBlockedReason('FINGERPRINT_BLOCKED')
        setAppBlocked(true)
      } else {
        addToast(`🚫 Fingerprint ${data.fingerprint} blocked`, 'warning')
      }
    },
    onIPUnblocked: (data) => {
      engineRef.current?.unblockIP(data.ip);
      handleClientUnblocked(data);
      addToast(`✅ IP ${data.ip} unblocked`, 'success');
    },
    onClientUnblocked: (data) => {
      engineRef.current?.unblockIP(data.ip);
      handleClientUnblocked(data);
      addToast(`✅ Client ${data.ip || ''} completely unblocked`, 'success');
    },
    onFingerprintUnblocked: (data) => {
      handleClientUnblocked(data);
      addToast(`✅ Fingerprint unblocked`, 'success');
    },
    onVPNDetected: (data) => {
      alertEngine.playVPNDetected()
      addToast(`🚨 VPN AUTO-BLOCKED: ${data.ip} detected as ${data.label}`, 'critical')
      setVpnInfo({ ip: data.ip, label: data.label })
      setAppBlockedReason('VPN_PROXY_DETECTED')
      setAppBlocked(true)
    },
    onHoneyTrap: (data) => {
      console.log('[Socket] HONEY TRAP TRIGGERED:', data)
      alertEngine.playPoliceSiren(5)
      addToast(`🍯 HONEY TRAP: Attacker logged in as ${data.employee?.name || data.username} (${data.employee?.role || 'Decoy'}) from ${data.ip}`, 'critical')
      engineRef.current?.injectHoneyTrapEvent(data)
    },
    onSuspiciousLogin: (data) => {
      console.log('[Socket] Suspicious login:', data)
      alertEngine.playHigh()
      addToast(`⚠️ Suspicious login: ${data.vectors?.join(', ')} from ${data.ip}`, 'warning')
    },
    onAttackerAutoBlocked: (data) => {
      console.log('[Socket] Attacker auto-blocked:', data)
      if (data.playSiren) alertEngine.playCritical()
      alertEngine.stopContinuousAlert()
      addToast(`🚫 AUTO-BLOCKED: ${data.ip} — ${data.reason}`, 'critical')
    },
    onEmployeesRegenerated: (data) => {
      console.log('[Socket] Employees regenerated:', data)
      addToast(`🔄 Regenerated ${data.count} decoy employee accounts`, 'info')
    }
  })

  // Get real IP and location
  const getRealLocation = useCallback(async () => {
    let locData = { ip:'127.0.0.1', country:'Unknown', city:'Unknown', region:'', lat:0, lng:0, timezone:'Unknown', isp:'Unknown', browser:'Browser', os:navigator.platform, device:'Desktop' }
    
    try {
      const r = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
      const d = await r.json();
      if (d.ip) {
        locData = { 
          ...locData, 
          ip: d.ip, 
          country: d.country_name, 
          city: d.city, 
          region: d.region, 
          lat: d.latitude, 
          lng: d.longitude, 
          timezone: d.timezone, 
          isp: d.org 
        }
      }
    } catch {
      try {
        const r = await fetch('http://ip-api.com/json/', { signal: AbortSignal.timeout(5000) });
        const d = await r.json();
        if (d.query) {
          locData = { 
            ...locData, 
            ip: d.query, 
            country: d.country, 
            city: d.city, 
            region: d.regionName, 
            lat: d.lat, 
            lng: d.lon, 
            timezone: d.timezone, 
            isp: d.isp 
          }
        }
      } catch {}
    }

    if (navigator.geolocation) {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 6000, enableHighAccuracy: true });
        });
        if (position?.coords) {
          const { latitude, longitude } = position.coords;
          locData.lat = latitude;
          locData.lng = longitude;

          try {
            const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`, {
              headers: { 'Accept-Language': 'en', 'User-Agent': 'HoneyShield/2.0' },
              signal: AbortSignal.timeout(4000)
            });
            const geo = await r.json();
            const city = geo.address?.city || geo.address?.town || geo.address?.village || geo.address?.suburb || geo.address?.county;
            if (city) locData.city = city;
            if (geo.address?.state) locData.region = geo.address.state;
          } catch (e) {
            console.warn('[GEOLOCATION] Reverse geocoding failed:', e.message);
          }
        }
      } catch (e) {
        console.warn('[GEOLOCATION] Browser geolocation failed/denied:', e.message);
      }
    }
    return locData;
  }, [])

  const getAdminAuthHeaders = useCallback(() => {
    const token = sessionStorage.getItem('honeyshield_admin_token')
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  }, [])

  const handleLogin = useCallback(async (credentials) => {
    setLoginError('')
    requestPermission()
    const location = await getRealLocation()
    const fingerprint = await generateFingerprint()
    const browser = location.browser || 'Browser'
    const os = location.os || navigator.platform || 'Desktop'

    // Admin direct authentication via /api/auth/admin-login
    try {
      const res = await fetch(`${BACKEND}/api/auth/admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: credentials.username, password: credentials.password })
      })
      const data = await res.json()
      if (res.ok && data.success && data.token) {
        sessionStorage.setItem('honeyshield_admin_token', data.token)
        const adminUser = { ...data.user, role: 'ADMIN', isAdmin: true }
        setCurrentUser(adminUser)
        sessionIdRef.current = `ADMIN-${Date.now()}`
        addToast('Welcome Admin!', 'success')
        return
      } else if (res.status === 401 && data.isAdminUser) {
        // Admin credentials incorrect
        setLoginError('Invalid admin credentials')
        return
      } else if (!res.ok && res.status !== 401) {
        setLoginError(data.error || 'Authentication error')
        return
      }
    } catch (err) {
      console.error('[ADMIN LOGIN] Error:', err.message)
      setLoginError('Unable to connect to authentication server')
      return
    }

    const loginData = {
      username: credentials.username,
      password: credentials.password,
      fingerprint,
      ip: location.ip || '127.0.0.1',
      lat: parseFloat(location.lat) || 0,
      lng: parseFloat(location.lng) || 0,
      country: location.country || 'Unknown',
      city: location.city || 'Unknown',
      browser,
      os,
    }

    try {
      const res = await fetch(`${BACKEND}/api/honeypot/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      })
      const data = await res.json()

      if (res.status === 403 || data.blocked) {
        // Blocked — show containment screen with active polling
        setVpnInfo({ ip: location.ip || '127.0.0.1', label: data.reason || 'Attack Detected' })
        setAppBlockedReason(data.reason || 'IP_BLOCKED')
        setAppBlocked(true)
        alertEngine.playCritical()
        return
      }

      if (res.status === 401) {
        // Wrong credentials — show error on login form
        setLoginError('Invalid username or password')
        return
      }

      if (data.success) {
        // Attacker trapped in fake employee portal — NEVER admin
        const trappedUser = {
          ...data.user,
          sessionId: data.sessionId,
          role: 'ATTACKER',
          isTrapped: true
        }
        setCurrentUser(trappedUser)
        sessionIdRef.current = data.sessionId
        // Register session with engine
        engineRef.current?.registerRealSession({
          sessionId: data.sessionId,
          username: data.user.username,
          role: 'ATTACKER',
          ...location,
          fingerprint,
          isHoneypotTrap: true,
          trappedEmployee: data.user.name,
          trappedRole: data.user.role,
          trappedDept: data.user.dept
        })
        addToast(`Logged in as ${data.user.name}`, 'info')
      }
    } catch (err) {
      console.error('[LOGIN] Error:', err)
      setLoginError('Connection error — try again')
    }
  }, [getRealLocation, requestPermission, addToast])

  const handleLogout = useCallback(async () => {
    const adminToken = sessionStorage.getItem('honeyshield_admin_token')
    if (adminToken && backendOnline) {
      fetch(`${BACKEND}/api/auth/admin-logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      }).catch(() => {})
      sessionStorage.removeItem('honeyshield_admin_token')
    }
    if (backendOnline && sessionIdRef.current) {
      fetch(`${BACKEND}/api/session/${sessionIdRef.current}`, { method:'DELETE' }).catch(() => {})
    }
    engineRef.current?.removeSession(currentUser?.username)
    setCurrentUser(null)
    sessionIdRef.current = null
    alertEngine.stopContinuousAlert()
    setForceUpdate(p => p + 1)
  }, [backendOnline, currentUser])

  const handleBlockIP = useCallback(async (ip, reason = 'Manual block by admin') => {
    engineRef.current?.blockIP(ip, currentUser?.username, reason)
    alertEngine.playBlocked()
    alertEngine.stopContinuousAlert()
    setForceUpdate(p => p + 1)

    try {
      const blockedIPs = JSON.parse(localStorage.getItem('honeyshield_blocked_ips') || '[]')
      if (!blockedIPs.includes(ip)) {
        localStorage.setItem('honeyshield_blocked_ips', JSON.stringify([...blockedIPs, ip]))
      }
    } catch {}

    if (backendOnline) {
      try {
        const res = await fetch(`${BACKEND}/api/blocklist`, {
          method: 'POST',
          headers: getAdminAuthHeaders(),
          body: JSON.stringify({
            ip, blockedBy: currentUser?.username || 'admin',
            reason, permanent: true
          })
        })
        const data = await res.json()
        if (data.success) {
          addToast(`🚫 IP ${ip} permanently blocked — alert cleared (${data.sessionsTerminated} session(s) terminated)`, 'warning')
        }
      } catch (e) {
        addToast(`🚫 IP ${ip} blocked locally — alert cleared`, 'warning')
      }
    } else {
      addToast(`🚫 IP ${ip} blocked — alert cleared`, 'warning')
    }
  }, [backendOnline, currentUser, addToast, getAdminAuthHeaders])

  const handleUnblockIP = useCallback(async (ip) => {
    engineRef.current?.unblockIP(ip)
    try {
      localStorage.removeItem('honeyshield_blocked')
      const blockedIPs = JSON.parse(localStorage.getItem('honeyshield_blocked_ips') || '[]')
      localStorage.setItem('honeyshield_blocked_ips', JSON.stringify(blockedIPs.filter(x => x !== ip)))
    } catch {}
    setAppBlocked(false)
    setAppBlockedReason(null)

    if (backendOnline) {
      try {
        await fetch(`${BACKEND}/api/blocklist/${encodeURIComponent(ip)}`, {
          method: 'DELETE',
          headers: getAdminAuthHeaders()
        })
        addToast(`✅ IP ${ip} unblocked`, 'success')
      } catch { addToast(`✅ IP ${ip} unblocked locally`, 'success') }
    }
  }, [backendOnline, addToast, getAdminAuthHeaders])

  const handleBlockFingerprint = useCallback(async (fingerprint, reason = 'Manual block by admin') => {
    if (!fingerprint) return
    alertEngine.playBlocked()
    alertEngine.stopContinuousAlert()
    setForceUpdate(p => p + 1)
    if (backendOnline) {
      try {
        const res = await fetch(`${BACKEND}/api/blocklist/fingerprint`, {
          method: 'POST',
          headers: getAdminAuthHeaders(),
          body: JSON.stringify({
            fingerprint, blockedBy: currentUser?.username || 'admin',
            reason
          })
        })
        const data = await res.json()
        if (data.success) {
          addToast(`🚫 Fingerprint ${fingerprint.substr(0,8)}... permanently blocked`, 'warning')
        }
      } catch (e) {
        addToast(`🚫 Fingerprint blocked locally`, 'warning')
      }
    } else {
      addToast(`🚫 Fingerprint blocked`, 'warning')
    }
  }, [backendOnline, currentUser, addToast, getAdminAuthHeaders])

  const handleUnblockFingerprint = useCallback(async (fingerprint) => {
    if (!fingerprint) return
    if (backendOnline) {
      try {
        await fetch(`${BACKEND}/api/blocklist/fingerprint/${encodeURIComponent(fingerprint)}`, {
          method: 'DELETE',
          headers: getAdminAuthHeaders()
        })
        addToast(`✅ Fingerprint ${fingerprint.substr(0,8)}... unblocked`, 'success')
      } catch { addToast(`✅ Fingerprint unblocked locally`, 'success') }
    }
  }, [backendOnline, addToast, getAdminAuthHeaders])

  // Full client unblock (IP + Fingerprint + Conditional VPN Exemption)
  const handleUnblockClient = useCallback(async ({ ip, fingerprint, reason }) => {
    if (backendOnline) {
      try {
        const res = await fetch(`${BACKEND}/api/blocklist/unblock-client`, {
          method: 'POST',
          headers: getAdminAuthHeaders(),
          body: JSON.stringify({ ip, fingerprint, reason })
        })
        const data = await res.json()
        if (data.success) {
          addToast(`✅ Client ${ip || ''} completely unblocked`, 'success')
        } else {
          addToast(`⚠️ Client unblock partially completed`, 'warning')
        }
      } catch (e) {
        addToast(`Failed to unblock client: ${e.message}`, 'critical')
      }
    }
    if (ip) engineRef.current?.unblockIP(ip)
  }, [backendOnline, addToast, getAdminAuthHeaders])

  useEffect(() => {
    if (!currentUser || !backendOnline) return
    const sendHeartbeat = async () => {
      if (!sessionIdRef.current) return
      try {
        const res = await fetch(`${BACKEND}/api/session/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            currentPage: currentUser.role === 'ATTACKER' ? 'Deception Dashboard' : 'Admin Dashboard',
            mouseActivity: 'Active',
            clickCount: Math.floor(Math.random() * 5),
            timeOnPage: 10,
            scrollDepth: Math.floor(Math.random() * 50 + 20)
          })
        })
        const data = await res.json()
        if (data.blocked) {
          addToast('🚫 Your session has been terminated by administration (IP Blocked)', 'critical')
          setAppBlockedReason(data.reason || 'IP_BLOCKED')
          setAppBlocked(true)
        }
      } catch (e) {
        console.warn('[HEARTBEAT] Failed:', e.message)
      }
    }
    sendHeartbeat()
    const interval = setInterval(sendHeartbeat, 10000)
    return () => clearInterval(interval)
  }, [currentUser, backendOnline, handleLogout, addToast])

  const handleAttackerAction = useCallback(async (actionType) => {
    const attackDef = ATTACK_TYPES[actionType]
    if (!attackDef) return null
    const session = engineRef.current?.sessions?.find(s => s.username === currentUser?.username || s.role === 'ATTACKER' || s.username !== 'admin')
    const sid = session?.id || sessionIdRef.current || `SESSION-${currentUser?.username || 'testuser'}`
    const attackerIp = session?.ip || '127.0.0.1'

    const fingerprint = await generateFingerprint()

    engineRef.current?.registerAttackerAction(actionType, sid)

    if (backendOnline) {
      try {
        const attackRes = await fetch(`${BACKEND}/api/session/attack`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sid, username: session?.username || currentUser?.username || 'testuser', attackType: actionType,
            attackDef: { label: attackDef.label, severity: attackDef.severity, target: attackDef.target, riskDelta: attackDef.riskDelta },
            sourceIP: attackerIp, sourceCountry: session?.country || 'Unknown', sourceCity: session?.city || 'Unknown',
            sourceLat: session?.lat || 0, sourceLng: session?.lng || 0,
            fingerprint
          })
        })
        const attackData = await attackRes.json()
        if (attackRes.status === 403 || attackData.blocked) {
          setAppBlockedReason(attackData.reason || 'FINGERPRINT_BLOCKED')
          setAppBlocked(true)
          return attackData
        }
        const safeActionType = typeof actionType === 'string' ? actionType : 'RECONNAISSANCE'
        await fetch(`${BACKEND}/api/session/honey`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sid, attackerIP: attackerIp, attackerCountry: session?.country || 'Unknown',
            attackerCity: session?.city || 'Unknown', attackerLat: session?.lat || 0, attackerLng: session?.lng || 0,
            action: safeActionType.includes('EXFIL')||safeActionType.includes('DATA')?'DOWNLOAD':safeActionType.includes('COMMAND')||safeActionType.includes('INJECT')?'EXEC':safeActionType.includes('TRAVERSAL')?'READ':safeActionType.includes('CREDENTIAL')?'LOGIN_ATTEMPT':'READ',
            fakeTarget: HONEY_TARGET_MAP[safeActionType] || '/system/unknown'
          })
        })
        return attackData
      } catch (e) { console.warn('[ATTACK] Backend failed:', e.message) }
    }
    return null
  }, [backendOnline, currentUser, handleLogout, addToast])

  const currentAttackerSession = data.sessions?.find(s => s.sessionId === sessionIdRef.current) || {
    ip: vpnInfo.ip || '127.0.0.1',
    username: currentUser?.username,
    role: currentUser?.role
  }

  // Gating UnblockedScreen per C6 (shows only if previously blocked)
  if (unblockedData) {
    return (
      <UnblockedScreen
        info={unblockedData}
        onContinue={() => setUnblockedData(null)}
      />
    )
  }

  // Blocked Screen with 4000ms polling, visibility pause, 429 backoff per C2
  if (appBlocked || vpnBlocked) {
    return (
      <BlockedScreen
        reason={appBlockedReason || (vpnBlocked ? 'VPN_PROXY_DETECTED' : 'IP_BLOCKED')}
        session={currentAttackerSession}
        onUnblocked={handleClientUnblocked}
      />
    )
  }

  if (!currentUser) return (<><ToastContainer /><LoginPage onLogin={handleLogin} loginError={loginError} /></>)
  if (currentUser.role === 'ATTACKER') return (<><ToastContainer /><DeceptionDashboard currentUser={currentUser} onLogout={handleLogout} onAttackerAction={handleAttackerAction} /></>)
  return (
    <>
      <ToastContainer />
      <AdminDashboard
        currentUser={currentUser}
        onLogout={handleLogout}
        data={data}
        engineRef={engineRef}
        backendOnline={backendOnline}
        aiOnline={aiOnline}
        socketConnected={socketConnected}
        latency={latency}
        unreadCount={unreadCount}
        onBlockIP={handleBlockIP}
        onUnblockIP={handleUnblockIP}
        onBlockFingerprint={handleBlockFingerprint}
        onUnblockFingerprint={handleUnblockFingerprint}
        onUnblockClient={handleUnblockClient}
      />
    </>
  )
}
