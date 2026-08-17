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

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

export default function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [appBlocked, setAppBlocked] = useState(false)
  const [appBlockedReason, setAppBlockedReason] = useState(null)
  const [vpnBlocked, setVpnBlocked] = useState(false)
  const [vpnInfo, setVpnInfo] = useState({ ip: '127.0.0.1', label: 'VPN / Datacenter IP' })
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
        setAppBlockedReason('IP_BLOCKED')
        setAppBlocked(true)
      } else {
        addToast(`🚫 Session blocked: ${data.sessionId}`, 'info')
      }
    },
    onBlockedAttempt: (data) => {
      alertEngine.playBlocked()
      if (currentUserRef.current?.role === 'ATTACKER' || currentUserRef.current?.username === 'testuser') {
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
        setAppBlockedReason('FINGERPRINT_BLOCKED')
        setAppBlocked(true)
      } else {
        addToast(`🚫 Fingerprint ${data.fingerprint} blocked`, 'warning')
      }
    },
    onIPUnblocked: (data) => { engineRef.current?.unblockIP(data.ip); addToast(`✅ IP ${data.ip} unblocked`, 'success') },
    onVPNDetected: (data) => {
      alertEngine.playVPNDetected()
      addToast(`🚨 VPN AUTO-BLOCKED: ${data.ip} detected as ${data.label}`, 'critical')
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

  const handleLogin = useCallback(async (user) => {
    requestPermission()
    setCurrentUser(user)
    const location = await getRealLocation()
    console.log('[LOGIN] Location detected:', location)
    console.log('[LOGIN] Coordinates:', location?.lat, location?.lng)

    const sessionId = `SESSION-${user.username}-${Date.now()}`
    sessionIdRef.current = sessionId

    const sessionData = {
      sessionId,
      ip: location.ip || '127.0.0.1',
      country: location.country || (user.role === 'ADMIN' ? 'India' : 'Local'),
      city: location.city || (user.role === 'ADMIN' ? 'Vadodara (Local SOC)' : 'Localhost'),
      region: location.region || '',
      lat: parseFloat(location.lat) || (user.role === 'ADMIN' ? 22.3 : 0),   // ensure number not string
      lng: parseFloat(location.lng) || (user.role === 'ADMIN' ? 73.1 : 0),   // ensure number not string
      timezone: location.timezone || 'Unknown',
      isp: location.isp || 'Unknown',
      browser: location.browser || 'Browser',
      os: location.os || 'Unknown',
      device: location.device || 'Desktop',
      username: user.username,
      role: user.role,
      fingerprint: await generateFingerprint()
    }

    console.log('[LOGIN] SessionData lat/lng:', sessionData.lat, sessionData.lng)

    if (backendOnline) {
      try {
        const res = await fetch(`${BACKEND}/api/session/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sessionData)
        })
        const data = await res.json()

        // Handle ALL block types at login
        if (res.status === 403 || data.blocked) {
          setCurrentUser(null)
          sessionIdRef.current = null
          engineRef.current?.removeSession(user.username)

          if (data.reason === 'VPN_PROXY_DETECTED') {
            setVpnInfo({ ip: sessionData.ip, label: data.label || 'VPN/Proxy' })
            setVpnBlocked(true)
            alertEngine.playVPNDetected()
          } else if (data.reason === 'IP_BLOCKED' || data.reason === 'FINGERPRINT_BLOCKED') {
            setVpnInfo({ ip: sessionData.ip, label: 'Previously Blocked — Access Denied' })
            setVpnBlocked(true)
            alertEngine.playCritical()
          } else {
            setAppBlockedReason(data.reason || 'IP_BLOCKED')
            setAppBlocked(true)
          }
          return
        }

        // Success — register in engine
        engineRef.current?.registerRealSession(sessionData)
        addToast(`Welcome ${user.username}!`, 'success')
      } catch (e) {
        console.warn('[LOGIN] Backend registration failed:', e.message)
        engineRef.current?.registerRealSession(sessionData)
        addToast(`Welcome ${user.username}!`, 'success')
      }
    } else {
      engineRef.current?.registerRealSession(sessionData)
      addToast(`Welcome ${user.username}!`, 'success')
    }
  }, [backendOnline, getRealLocation, addToast, requestPermission])

  const handleLogout = useCallback(async () => {
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
          addToast(`🚫 IP ${ip} permanently blocked — alert cleared (${data.sessionsTerminated} session(s) terminated)`, 'warning')
        }
      } catch (e) {
        addToast(`🚫 IP ${ip} blocked locally — alert cleared`, 'warning')
      }
    } else {
      addToast(`🚫 IP ${ip} blocked — alert cleared`, 'warning')
    }
  }, [backendOnline, currentUser, addToast])

  const handleUnblockIP = useCallback(async (ip) => {
    engineRef.current?.unblockIP(ip)
    if (backendOnline) {
      try {
        await fetch(`${BACKEND}/api/blocklist/${encodeURIComponent(ip)}`, { method: 'DELETE' })
        addToast(`✅ IP ${ip} unblocked`, 'success')
      } catch { addToast(`✅ IP ${ip} unblocked locally`, 'success') }
    }
  }, [backendOnline, addToast])

  const handleBlockFingerprint = useCallback(async (fingerprint, reason = 'Manual block by admin') => {
    if (!fingerprint) return
    alertEngine.playBlocked()
    alertEngine.stopContinuousAlert()
    setForceUpdate(p => p + 1)
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

  const handleUnblockFingerprint = useCallback(async (fingerprint) => {
    if (!fingerprint) return
    if (backendOnline) {
      try {
        await fetch(`${BACKEND}/api/blocklist/fingerprint/${encodeURIComponent(fingerprint)}`, { method: 'DELETE' })
        addToast(`✅ Fingerprint ${fingerprint.substr(0,8)}... unblocked`, 'success')
      } catch { addToast(`✅ Fingerprint unblocked locally`, 'success') }
    }
  }, [backendOnline, addToast])

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
    <div style={{ position:'fixed', inset:0, background:'#050008', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
      <div style={{ fontSize:'72px', marginBottom:'24px', animation:'pulse 1s infinite' }}>🛡️</div>
      <h1 style={{ color:'#FF4444', fontSize:'32px', fontWeight:900, marginBottom:'16px', fontFamily:'monospace', textAlign:'center' }}>
        CONNECTION BLOCKED
      </h1>
      <div style={{ padding:'8px 20px', background:'rgba(255,68,68,0.15)', border:'1px solid #FF4444', borderRadius:'6px', marginBottom:'20px' }}>
        <span style={{ color:'#FF4444', fontSize:'14px', fontWeight:700 }}>{vpnInfo.label || 'VPN/Proxy'} DETECTED</span>
      </div>
      <p style={{ color:'#FF8888', fontSize:'15px', maxWidth:'480px', textAlign:'center', lineHeight:1.8, marginBottom:'24px' }}>
        Your connection has been identified as a VPN, proxy, or datacenter IP.
        Access is automatically denied and your IP has been permanently blocked.
        This attempt has been logged with timestamp and reported to the administrator.
      </p>
      <div style={{ padding:'16px 24px', background:'rgba(255,68,68,0.08)', border:'1px solid rgba(255,68,68,0.3)', borderRadius:'8px', fontFamily:'monospace', fontSize:'13px', color:'#FF6666', textAlign:'center' }}>
        <div>IP Address: {vpnInfo.ip}</div>
        <div>Flagged As: {vpnInfo.label}</div>
        <div>Time: {new Date().toLocaleString()}</div>
        <div style={{ marginTop:'8px', color:'#FF4444', fontWeight:700 }}>This incident has been permanently logged</div>
      </div>
      <style>{`@keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }`}</style>
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
