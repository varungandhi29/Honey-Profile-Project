import { useState, useRef, useEffect, useCallback } from 'react'
import LiveDataEngine from './engine/LiveDataEngine'
import { ATTACK_TYPES, HONEY_TARGET_MAP } from './engine/constants'
import { useSocket } from './hooks/useSocket'
import { useNotifications } from './hooks/useNotifications'
import { generateFingerprint } from './utils/fingerprint'
import LoginPage from './pages/LoginPage'
import AdminDashboard from './pages/AdminDashboard'
import DeceptionDashboard from './pages/DeceptionDashboard'
import BlockedScreen from './components/BlockedScreen'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

export default function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [appBlocked, setAppBlocked] = useState(false)
  const [appBlockedReason, setAppBlockedReason] = useState(null)
  const [vpnBlocked, setVpnBlocked] = useState(false)
  const [vpnIP, setVpnIP] = useState('127.0.0.1')
  const [vpnLabel, setVpnLabel] = useState('VPN / Proxy IP')
  const engineRef = useRef(null)
  const sessionIdRef = useRef(null)
  const [data, setData] = useState({ sessions:[], attackLog:[], honeyLog:[], alertLog:[], autoResponseLog:[] })
  const [backendOnline, setBackendOnline] = useState(false)
  const [aiOnline, setAiOnline] = useState(false)
  const { addToast, ToastContainer, requestPermission, unreadCount } = useNotifications()

  // Init engine
  useEffect(() => {
    engineRef.current = new LiveDataEngine(newState => setData({ ...newState }))
    return () => engineRef.current?.destroy()
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

  // Socket.io — always connected
  const { connected: socketConnected, latency } = useSocket({
    onAttack: (data) => {
      if (data.attack) engineRef.current?.injectAttackEvent(data.attack)
      if (data.session) engineRef.current?.updateSession(data.session)
      if (data.attack?.severity === 'CRITICAL') addToast(`🚨 CRITICAL: ${data.attack.type} from ${data.attack.sourceIP} (${data.attack.sourceCountry})`, 'critical')
      else if (data.attack?.severity === 'HIGH') addToast(`⚠️ HIGH: ${data.attack.type} from ${data.attack.sourceCountry}`, 'warning')
    },
    onAlert: (data) => {
      if (data.alertId || data.id) engineRef.current?.injectAlert({ id: data.alertId || data.id, severity: data.severity, title: data.title, description: data.description, sessionId: data.sessionId, sourceIP: data.sourceIP, timestamp: data.timestamp, status: data.status || 'New' })
      addToast(`🔔 ${data.severity}: ${data.title}`, data.severity === 'CRITICAL' ? 'critical' : 'warning')
    },
    onSessionUpdate: (data) => { if (data.sessionId || data.id) engineRef.current?.updateSession(data) },
    onHoney: (data) => {
      if (data.log) engineRef.current?.injectHoneyEvent(data.log)
      if (data.deepTrap) addToast(`🍯 Deep Trap! ${data.session?.ip} has ${data.honeyCount} honey interactions`, 'warning')
    },
    onAutoResponse: (data) => addToast(`🤖 Auto-response: ${data.action} for ${data.reason}`, 'info'),
    onSessionRemoved: (data) => engineRef.current?.removeSessionById(data.sessionId),
    onSessionBlocked: (data) => {
      engineRef.current?.removeSessionById(data.sessionId);
      if (currentUserRef.current?.role === 'ATTACKER' || currentUserRef.current?.username === 'testuser') {
        setAppBlockedReason('IP_BLOCKED')
        setAppBlocked(true)
      } else {
        addToast(`🚫 Session blocked: ${data.sessionId}`, 'info')
      }
    },
    onBlockedAttempt: (data) => {
      if (currentUserRef.current?.role === 'ATTACKER' || currentUserRef.current?.username === 'testuser') {
        setAppBlockedReason('FINGERPRINT_BLOCKED')
        setAppBlocked(true)
      }
    },
    onIPBlocked: (data) => {
      engineRef.current?.blockIP(data.ip, data.blockedBy, data.reason);
      if (currentUserRef.current?.role === 'ATTACKER' || currentUserRef.current?.username === 'testuser') {
        setAppBlockedReason('IP_BLOCKED')
        setAppBlocked(true)
      } else {
        addToast(`🚫 IP ${data.ip} blocked`, 'warning')
      }
    },
    onFingerprintBlocked: (data) => {
      if (currentUserRef.current?.role === 'ATTACKER' || currentUserRef.current?.username === 'testuser') {
        setAppBlockedReason('FINGERPRINT_BLOCKED')
        setAppBlocked(true)
      } else {
        addToast(`🚫 Fingerprint ${data.fingerprint} blocked`, 'warning')
      }
    },
    onIPUnblocked: (data) => { engineRef.current?.unblockIP(data.ip); addToast(`✅ IP ${data.ip} unblocked`, 'success') },
    onVPNDetected: (data) => { addToast(`🚨 VPN Detected: ${data.ip} flagged as ${data.label} — session rejected`, 'critical') }
  })

  // Get real IP and location
  const getRealLocation = useCallback(async () => {
    let locData = { ip:'Unknown', country:'Unknown', city:'Unknown', region:'', lat:0, lng:0, timezone:'Unknown', isp:'Unknown', browser:'Browser', os:navigator.platform, device:'Desktop' }
    
    // Get IP and base location via ipapi.co
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

    // Refine location using HTML5 GPS/Wi-Fi positioning if available
    if (navigator.geolocation) {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 6000, enableHighAccuracy: true });
        });
        if (position?.coords) {
          const { latitude, longitude } = position.coords;
          locData.lat = latitude;
          locData.lng = longitude;

          // Call reverse geocoding to get the exact city name
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

  const handleLogin = useCallback(async (user) => {
    requestPermission()
    engineRef.current?.syncFromBackend(BACKEND)

    // HARD RULE 1: Generate fingerprint BEFORE login completes
    const fingerprint = await generateFingerprint()

    const sessionId = `SESSION-${user.username}-${Date.now()}`
    sessionIdRef.current = sessionId

    const sessionData = {
      sessionId,
      fingerprint,
      ip: '127.0.0.1',
      country: user.role === 'ADMIN' ? 'India' : 'Local',
      city: user.role === 'ADMIN' ? 'Vadodara (Local SOC)' : 'Localhost',
      region: 'Gujarat',
      lat: user.role === 'ADMIN' ? 22.3 : 0,
      lng: user.role === 'ADMIN' ? 73.1 : 0,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      isp: 'Localhost',
      browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Browser',
      os: navigator.platform.includes('Win') ? 'Windows' : 'OS',
      device: 'Desktop',
      username: user.username,
      role: user.role
    }

    // ADMIN users are always exempt from IP blocks
    if (user.role === 'ADMIN' || user.username === 'admin') {
      setCurrentUser(user)
      addToast(`Welcome ${user.username}!`, 'success')
      engineRef.current?.registerRealSession(sessionData)
      if (backendOnline) {
        fetch(`${BACKEND}/api/session/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sessionData)
        }).catch(() => {})
      }
      return
    }

    if (backendOnline) {
      try {
        const regRes = await fetch(`${BACKEND}/api/session/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sessionData)
        })
        const regData = await regRes.json()
        if (regRes.status === 403 || regData.blocked) {
          if (regData.reason === 'VPN_PROXY_DETECTED') {
            setVpnBlocked(true)
            setVpnIP(regData.ip || sessionData.ip || '127.0.0.1')
            setVpnLabel(regData.label || 'VPN / Datacenter IP')
            setCurrentUser(null)
            return
          }
          addToast(`🚫 ACCESS DENIED: ${regData.error || 'Device or IP is blocked'}`, 'critical')
          setAppBlockedReason(regData.reason || 'FINGERPRINT_BLOCKED')
          setAppBlocked(true)
          setCurrentUser(user)
          sessionIdRef.current = null
          return
        }
      } catch (e) { console.warn('[LOGIN] Backend registration check error:', e.message) }
    }

    setCurrentUser(user)
    addToast(`Welcome ${user.username}!`, 'success')
    engineRef.current?.registerRealSession(sessionData)

    // Enhance location in background if available
    getRealLocation().then(async (location) => {
      if (location && location.ip && location.ip !== 'Unknown') {
        const updated = { ...sessionData, ...location }

        // Check if real IP is blocked
        if (backendOnline) {
          try {
            const checkRes = await fetch(`${BACKEND}/api/blocklist/check/${encodeURIComponent(location.ip)}`)
            const checkData = await checkRes.json()
            if (checkData.blocked) {
              addToast(`🚫 ACCESS DENIED: Your IP (${location.ip}) is permanently blocked by administration.`, 'critical')
              engineRef.current?.blockIP(location.ip, 'admin', checkData.reason || 'Blocked IP')
              setCurrentUser(null)
              sessionIdRef.current = null
              return
            }
          } catch {}

          fetch(`${BACKEND}/api/session/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated)
          }).catch(() => {})
        }
        engineRef.current?.registerRealSession(updated)
      }
    })
  }, [backendOnline, getRealLocation, addToast, requestPermission])

  const handleLogout = useCallback(async () => {
    if (backendOnline && sessionIdRef.current) {
      fetch(`${BACKEND}/api/session/${sessionIdRef.current}`, { method:'DELETE' }).catch(() => {})
    }
    engineRef.current?.removeSession(currentUser?.username)
    setCurrentUser(null)
    sessionIdRef.current = null
  }, [backendOnline, currentUser])

  // Block IP handler — called from admin dashboard
  const handleBlockIP = useCallback(async (ip, reason = 'Manual block by admin') => {
    engineRef.current?.blockIP(ip, currentUser?.username, reason)

    if (backendOnline) {
      try {
        const res = await fetch(`${BACKEND}/api/blocklist`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ip, blockedBy: currentUser?.username || 'admin',
            reason, permanent: true
          })
        })
        const data = await res.json()
        if (data.success) {
          addToast(`🚫 IP ${ip} permanently blocked — ${data.sessionsTerminated} session(s) terminated`, 'warning')
        }
      } catch (e) {
        addToast(`🚫 IP ${ip} blocked locally`, 'warning')
      }
    } else {
      addToast(`🚫 IP ${ip} blocked`, 'warning')
    }
  }, [backendOnline, currentUser, addToast])

  // Unblock IP handler
  const handleUnblockIP = useCallback(async (ip) => {
    engineRef.current?.unblockIP(ip)
    if (backendOnline) {
      try {
        await fetch(`${BACKEND}/api/blocklist/${encodeURIComponent(ip)}`, { method: 'DELETE' })
        addToast(`✅ IP ${ip} unblocked`, 'success')
      } catch { addToast(`✅ IP ${ip} unblocked locally`, 'success') }
    }
  }, [backendOnline, addToast])

  // Block Fingerprint handler
  const handleBlockFingerprint = useCallback(async (fingerprint, reason = 'Manual block by admin') => {
    if (!fingerprint) return
    if (backendOnline) {
      try {
        const res = await fetch(`${BACKEND}/api/blocklist/fingerprint`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
  }, [backendOnline, currentUser, addToast])

  // Unblock Fingerprint handler
  const handleUnblockFingerprint = useCallback(async (fingerprint) => {
    if (!fingerprint) return
    if (backendOnline) {
      try {
        await fetch(`${BACKEND}/api/blocklist/fingerprint/${encodeURIComponent(fingerprint)}`, { method: 'DELETE' })
        addToast(`✅ Fingerprint ${fingerprint.substr(0,8)}... unblocked`, 'success')
      } catch { addToast(`✅ Fingerprint unblocked locally`, 'success') }
    }
  }, [backendOnline, addToast])

  // Heartbeat tracking
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

  if (vpnBlocked) return (
    <div style={{ position: 'fixed', inset: 0, background: '#0D0000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ fontSize: '64px', marginBottom: '24px' }}>🛡️</div>
      <h1 style={{ color: '#FF4444', fontSize: '28px', fontWeight: 800, marginBottom: '16px', fontFamily: 'monospace' }}>VPN / PROXY DETECTED</h1>
      <p style={{ color: '#FF8888', fontSize: '15px', maxWidth: '480px', textAlign: 'center', lineHeight: 1.7 }}>
        Your connection has been identified as originating from a VPN, proxy, or datacenter IP address. Access to this system requires a direct connection. This attempt has been logged.
      </p>
      <div style={{ marginTop: '24px', padding: '14px 24px', background: '#1A0000', border: '1px solid #FF4444', borderRadius: '8px', color: '#FF4444', fontSize: '12px', fontFamily: 'monospace' }}>
        IP: {vpnIP} — Flagged as: {vpnLabel}
      </div>
    </div>
  )

  if (appBlocked) return <BlockedScreen reason={appBlockedReason} />
  if (!currentUser) return (<><ToastContainer /><LoginPage onLogin={handleLogin} /></>)
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
      />
    </>
  )
}
