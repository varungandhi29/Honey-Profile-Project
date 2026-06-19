import { useState, useRef, useEffect, useCallback } from 'react'
import LiveDataEngine from './engine/LiveDataEngine'
import { ATTACK_TYPES, HONEY_TARGET_MAP } from './engine/constants'
import { useSocket } from './hooks/useSocket'
import { useNotifications } from './hooks/useNotifications'
import LoginPage from './pages/LoginPage'
import AdminDashboard from './pages/AdminDashboard'
import DeceptionDashboard from './pages/DeceptionDashboard'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

export default function App() {
  const [currentUser, setCurrentUser] = useState(null)
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

  // Health checks
  useEffect(() => {
    const check = async () => {
      try { const r = await fetch(`${BACKEND}/api/health`, { signal: AbortSignal.timeout(3000) }); const d = await r.json(); setBackendOnline(d.status === 'ok' && d.mongodb === 'connected') } catch { setBackendOnline(false) }
      try { const r = await fetch(`${BACKEND}/api/ai/health`, { signal: AbortSignal.timeout(3000) }); const d = await r.json(); setAiOnline(d.model_loaded === true) } catch { setAiOnline(false) }
    }
    check()
    const i = setInterval(check, 30000)
    return () => clearInterval(i)
  }, [])

  // Socket.io — always connected
  const { connected: socketConnected, latency } = useSocket({
    onAttack: (data) => {
      if (data.attack) engineRef.current?.injectAttackEvent(data.attack)
      if (data.session) engineRef.current?.updateSession(data.session)
      if (data.attack?.severity === 'CRITICAL') addToast(`🚨 CRITICAL: ${data.attack.type} from ${data.attack.sourceIP} (${data.attack.sourceCountry})`, 'critical')
      else if (data.attack?.severity === 'HIGH') addToast(`⚠️ HIGH: ${data.attack.type} from ${data.attack.sourceCountry}`, 'warning')
    },
    onAlert: (data) => {
      if (data.alertId) engineRef.current?.injectAlert({ id: data.alertId, severity: data.severity, title: data.title, description: data.description, sessionId: data.sessionId, sourceIP: data.sourceIP, timestamp: data.timestamp, status: 'New' })
      addToast(`🔔 ${data.severity}: ${data.title}`, data.severity === 'CRITICAL' ? 'critical' : 'warning')
    },
    onSessionUpdate: (data) => { if (data.sessionId) engineRef.current?.updateSession(data) },
    onHoney: (data) => {
      if (data.log) engineRef.current?.injectHoneyEvent(data.log)
      if (data.deepTrap) addToast(`🍯 Deep Trap! ${data.session?.ip} has ${data.honeyCount} honey interactions`, 'warning')
    },
    onAutoResponse: (data) => addToast(`🤖 Auto-response: ${data.action} for ${data.reason}`, 'info'),
    onSessionRemoved: (data) => engineRef.current?.removeSessionById(data.sessionId),
    onSessionBlocked: (data) => { engineRef.current?.removeSessionById(data.sessionId); addToast(`🚫 Session blocked: ${data.sessionId}`, 'info') },
    onBlockedAttempt: (data) => addToast(`🚫 Blocked IP ${data.ip} tried to attack again`, 'warning'),
    onIPBlocked: (data) => { engineRef.current?.blockIP(data.ip, data.blockedBy, data.reason); addToast(`🚫 IP ${data.ip} blocked`, 'warning') },
    onIPUnblocked: (data) => { engineRef.current?.unblockIP(data.ip); addToast(`✅ IP ${data.ip} unblocked`, 'success') }
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
    setCurrentUser(user)
    requestPermission()
    addToast(`Welcome ${user.username}!`, 'success')
    const location = await getRealLocation()
    console.log('[LOGIN] Real location:', location)
    const sessionId = `SESSION-${user.username}-${Date.now()}`
    sessionIdRef.current = sessionId
    const sessionData = { sessionId, ip:location.ip, country:location.country, city:location.city, region:location.region||'', lat:location.lat, lng:location.lng, timezone:location.timezone||'Unknown', isp:location.isp||'Unknown', browser:location.browser||'Browser', os:location.os||'Unknown', device:location.device||'Desktop', username:user.username, role:user.role }
    engineRef.current?.registerRealSession(sessionData)
    if (backendOnline) {
      try { await fetch(`${BACKEND}/api/session/register`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(sessionData) }) }
      catch (e) { console.warn('[LOGIN] Backend registration failed:', e.message) }
    }
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
    // 1. Block in frontend engine immediately
    engineRef.current?.blockIP(ip, currentUser?.username, reason)

    // 2. Block in backend (persists to MongoDB + Redis)
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
          addToast('🚫 Your session has been terminated by administration', 'critical')
          handleLogout()
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
    if (!attackDef) return
    const session = engineRef.current?.sessions?.find(s => s.role === 'ATTACKER')

    // CHECK: if IP is blocked, reject the action
    if (session && engineRef.current?.isIPBlocked(session.ip)) {
      console.log(`[BLOCKED] IP ${session.ip} is blocked — action rejected`)
      return
    }

    engineRef.current?.registerAttackerAction(actionType)

    if (backendOnline && session) {
      const sid = session.id || sessionIdRef.current
      try {
        const attackRes = await fetch(`${BACKEND}/api/session/attack`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sid, username: session.username, attackType,
            attackDef: { label: attackDef.label, severity: attackDef.severity, target: attackDef.target, riskDelta: attackDef.riskDelta },
            sourceIP: session.ip, sourceCountry: session.country, sourceCity: session.city,
            sourceLat: session.lat, sourceLng: session.lng
          })
        })
        const attackData = await attackRes.json()
        // If backend says IP is blocked, update frontend
        if (attackData.blocked) {
          engineRef.current?.blockIP(session.ip, 'system', 'Auto-blocked by backend')
          addToast(`🚫 Your IP ${session.ip} has been blocked by the system`, 'critical')
          return
        }
        await fetch(`${BACKEND}/api/session/honey`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sid, attackerIP: session.ip, attackerCountry: session.country,
            attackerCity: session.city, attackerLat: session.lat, attackerLng: session.lng,
            action: actionType.includes('EXFIL')||actionType.includes('DATA')?'DOWNLOAD':actionType.includes('COMMAND')||actionType.includes('INJECT')?'EXEC':actionType.includes('TRAVERSAL')?'READ':actionType.includes('CREDENTIAL')?'LOGIN_ATTEMPT':'READ',
            fakeTarget: HONEY_TARGET_MAP[actionType] || '/system/unknown'
          })
        })
      } catch (e) { console.warn('[ATTACK] Backend failed:', e.message) }
    }
  }, [backendOnline, addToast])

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
      />
    </>
  )
}
