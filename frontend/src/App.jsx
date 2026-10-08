import { useState, useRef, useEffect, useCallback } from 'react'
import LiveDataEngine from './engine/LiveDataEngine'
import { USERS, getUsers, ATTACK_TYPES, HONEY_TARGET_MAP } from './engine/constants'
import { useSocket } from './hooks/useSocket'
import { useNotifications } from './hooks/useNotifications'
import { generateFingerprint, generateHardwareFingerprint } from './utils/fingerprint'
import { alertEngine } from './audio/alertEngine'
import { honeyBus } from './utils/honeyBus'
import LoginPage from './pages/LoginPage'
import AdminDashboard from './pages/AdminDashboard'
import DeceptionDashboard from './pages/DeceptionDashboard'
import UserDashboard from './pages/UserDashboard'
import BlockedScreen from './components/BlockedScreen'
import UnblockedScreen from './components/UnblockedScreen'
import VerifyingScreen from './components/VerifyingScreen'
import { BACKEND } from './utils/backendUrl'

export default function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [isBlocked, setIsBlocked] = useState(false)
  const [blockedReason, setBlockedReason] = useState('IP_BLOCKED')
  const locationRef = useRef({
    ip: localStorage.getItem('honeyshield_real_public_ip') || '49.36.77.174',
    city: 'Vadodara', country: 'India',
    region: 'Gujarat', lat: 22.3072, lng: 73.1812,
    isp: 'Reliance Jio Infocomm Limited', timezone: 'Asia/Kolkata',
    browser: 'Browser', os: 'Unknown', device: 'Desktop'
  })

  const handleBlocked = useCallback((reason) => {
    console.log('[App] Blocked triggered:', reason)
    setIsBlocked(true)
    setBlockedReason(reason || 'IP_BLOCKED')
    setCurrentUser(null)
    sessionIdRef.current = null
  }, [])

  const [unblockedData, setUnblockedData] = useState(null)
  const [appBlocked, setAppBlocked] = useState(false)
  const [appBlockedReason, setAppBlockedReason] = useState(null)
  const [verificationState, setVerificationState] = useState('IDLE')
  const [verifyMessage, setVerifyMessage] = useState('')
  const retryTimeoutRef = useRef(null)
  const checkPersistentBlockRef = useRef(null)

  const [vpnBlocked, setVpnBlocked] = useState(false)
  const [vpnInfo, setVpnInfo] = useState({ ip: localStorage.getItem('honeyshield_real_public_ip') || '49.36.77.174', label: 'VPN / Datacenter IP' })
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

  // Init engine — ensure stale past test caches are purged on mount
  useEffect(() => {
    try {
      localStorage.removeItem('honeyshield_live_sessions')
      localStorage.removeItem('honeyshield_live_attacks')
      localStorage.removeItem('honeyshield_live_honeylogs')
      localStorage.removeItem('honeyshield_live_alerts')
    } catch {}

    // Instant owner unblock parameter: e.g. /?unblock=1 or /?reset=1
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('unblock') || urlParams.get('reset') || urlParams.get('clean')) {
        try {
          localStorage.removeItem('honeyshield_blocked')
          localStorage.removeItem('honeyshield_blocked_ips')
          sessionStorage.removeItem('honeyshield_blocked')
        } catch {}
        setIsBlocked(false)
        setAppBlocked(false)
        setAppBlockedReason(null)
        setVpnBlocked(false)
        setVerificationState('IDLE')
        setUnblockedData(null)
        try {
          window.history.replaceState({}, document.title, window.location.pathname)
        } catch {}
      }
    }

    engineRef.current = new LiveDataEngine(newState => setData({ ...newState }))
    return () => engineRef.current?.destroy()
  }, [])

  // Cross-tab real-time sync via HoneyBus (detects attacks launched in any tab/window)
  useEffect(() => {
    const unsub = honeyBus.subscribe((e) => {
      if (!e || !e.type) return
      if (e.type === 'ATTACK_EVENT') {
        const attack = e.payload?.attack
        const severity = attack?.severity || 'CRITICAL'
        alertEngine.stopContinuousAlert()
        alertEngine.startContinuousAlert(severity, 6000)
        setForceUpdate(p => p + 1)
        addToast(`🚨 CRITICAL: ${attack?.type || 'Attack'} from ${attack?.sourceIP || 'Adversary'}`, 'critical')
      } else if (e.type === 'SESSION_JOINED') {
        const s = e.payload?.session
        if (s?.role === 'ATTACKER') {
          alertEngine.stopContinuousAlert()
          alertEngine.startContinuousAlert('CRITICAL', 6000)
          setForceUpdate(p => p + 1)
          addToast(`🚨 ADVERSARY INFILTRATION: ${s.username} connected`, 'critical')
        }
      } else if (e.type === 'BLOCK_IP' || e.type === 'CLIENT_BLOCKED') {
        alertEngine.stopContinuousAlert()
        alertEngine.playBlocked()
        setForceUpdate(p => p + 1)
      }
    })
    return () => unsub()
  }, [addToast])

  // Only reconcile / verify clients who ALREADY have a local block flag from a prior session.
  // Universal Cross-Browser & Cross-Device Block Verification
  useEffect(() => {
    let isCancelled = false

    // 0. System Owner / Admin Exemption Check
    const token = sessionStorage.getItem('honeyshield_admin_token')
    if (token) {
      try {
        localStorage.removeItem('honeyshield_blocked')
        localStorage.removeItem('honeyshield_blocked_ips')
      } catch {}
      setVerificationState('IDLE')
      setAppBlocked(false)
      return
    }

    let wasLocallyFlagged = false
    try {
      const saved = localStorage.getItem('honeyshield_blocked')
      wasLocallyFlagged = saved ? JSON.parse(saved)?.blocked === true : false
    } catch {}

    const runBlockCheck = async (retryCount = 0) => {
      if (isCancelled) return
      if (wasLocallyFlagged) setVerificationState('CHECKING')

      try {
        const fp = await generateFingerprint()
        const hw = await generateHardwareFingerprint()
        if (isCancelled) return

        const params = new URLSearchParams()
        if (fp) params.set('fingerprint', fp)
        if (hw) params.set('hardwareFingerprint', hw)

        const res = await fetch(`${BACKEND}/api/blocklist/check-status?${params.toString()}`, {
          signal: AbortSignal.timeout(6000)
        })

        if (res.ok) {
          const contentType = res.headers.get('content-type') || ''
          if (contentType.includes('application/json')) {
            const data = await res.json()
            if (data && data.blocked === true) {
              if (isCancelled) return
              setVerificationState('CONFIRMED_BLOCKED')
              setAppBlocked(true)
              setIsBlocked(true)
              setAppBlockedReason(data.reason || 'PERMANENT_DEVICE_BAN')
              try {
                localStorage.setItem('honeyshield_blocked', JSON.stringify({
                  blocked: true,
                  reason: data.reason || 'PERMANENT_DEVICE_BAN',
                  fingerprint: fp,
                  hardwareFingerprint: hw
                }))
              } catch {}
              return
            } else if (data && data.blocked === false) {
              if (isCancelled) return
              try {
                localStorage.removeItem('honeyshield_blocked')
                localStorage.removeItem('honeyshield_blocked_ips')
              } catch {}
              setVerificationState('IDLE')
              setIsBlocked(false)
              setAppBlocked(false)
              setAppBlockedReason(null)
              setVpnBlocked(false)
              setUnblockedData(null)
              return
            }
          } else {
            // Non-JSON response (e.g. static host SPA fallback)
            setVerificationState('IDLE')
            setIsBlocked(false)
            setAppBlocked(false)
            return
          }
        }

        // Server returned error / 429
        if (wasLocallyFlagged && retryCount < 2) {
          const retryDelay = Math.min(3000 * Math.pow(1.5, retryCount), 10000)
          setVerificationState('UNKNOWN_RETRYING')
          setVerifyMessage(`Checking security status... retrying in ${Math.round(retryDelay / 1000)}s`)
          retryTimeoutRef.current = setTimeout(() => runBlockCheck(retryCount + 1), retryDelay)
        } else {
          setVerificationState('IDLE')
          setAppBlocked(false)
          setIsBlocked(false)
        }
      } catch (err) {
        if (isCancelled) return
        if (wasLocallyFlagged && retryCount < 2) {
          const retryDelay = Math.min(3000 * Math.pow(1.5, retryCount), 10000)
          setVerificationState('UNKNOWN_RETRYING')
          setVerifyMessage(`Checking security status... retrying in ${Math.round(retryDelay / 1000)}s`)
          retryTimeoutRef.current = setTimeout(() => runBlockCheck(retryCount + 1), retryDelay)
        } else {
          setVerificationState('IDLE')
          setAppBlocked(false)
          setIsBlocked(false)
        }
      }
    }

    checkPersistentBlockRef.current = runBlockCheck
    runBlockCheck()

    return () => {
      isCancelled = true
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current)
    }
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
    const wasBlocked = isBlocked || appBlocked || vpnBlocked || !!localStorage.getItem('honeyshield_blocked')
    try {
      localStorage.removeItem('honeyshield_blocked')
      localStorage.removeItem('honeyshield_blocked_ips')
    } catch {}
    setIsBlocked(false)
    setAppBlocked(false)
    setAppBlockedReason(null)
    setVpnBlocked(false)
    setVerificationState('CONFIRMED_UNBLOCKED')

    // C6: Only show UnblockedScreen if client was previously in a blocked state
    if (wasBlocked) {
      setUnblockedData({
        ip: info?.ip || 'Your IP',
        timestamp: info?.timestamp || new Date().toISOString()
      })
    }
  }, [isBlocked, appBlocked, vpnBlocked])

  // Socket.io — always connected
  const { connected: socketConnected, latency } = useSocket({
    sessionIdRef,
    locationRef,
    onBlocked: handleBlocked,
    addToast,
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
      const currentSessionId = sessionIdRef.current
      const currentIP = locationRef.current?.ip
      if (data.sessionId === currentSessionId || (currentIP && data.ip === currentIP) || currentUserRef.current?.role === 'ATTACKER' || currentUserRef.current?.username === 'testuser') {
        try { localStorage.setItem('honeyshield_blocked', JSON.stringify({ blocked: true, reason: data.reason || 'IP_BLOCKED', sessionId: data.sessionId })) } catch {}
        handleBlocked(data.reason || 'IP_BLOCKED')
      } else {
        addToast(`🚫 Session blocked: ${data.sessionId}`, 'info')
      }
    },
    onBlockedAttempt: (data) => {
      alertEngine.playBlocked()
      if (currentUserRef.current?.role === 'ATTACKER' || currentUserRef.current?.username === 'testuser') {
        try { localStorage.setItem('honeyshield_blocked', JSON.stringify({ blocked: true, reason: 'FINGERPRINT_BLOCKED' })) } catch {}
        handleBlocked('FINGERPRINT_BLOCKED')
      } else {
        addToast(`⚠️ Blocked IP ${data.ip} tried to connect again`, 'warning')
      }
    },
    onIPBlocked: (data) => {
      engineRef.current?.blockIP(data.ip, data.blockedBy, data.reason);
      alertEngine.playBlocked()
      alertEngine.stopContinuousAlert()
      setForceUpdate(p => p + 1)
      const currentIP = locationRef.current?.ip
      if ((currentIP && data.ip === currentIP) || currentUserRef.current?.role === 'ATTACKER' || currentUserRef.current?.username === 'testuser') {
        try { localStorage.setItem('honeyshield_blocked', JSON.stringify({ blocked: true, reason: 'IP_BLOCKED', ip: data.ip })) } catch {}
        handleBlocked(data.reason || 'IP_BLOCKED')
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
        handleBlocked('FINGERPRINT_BLOCKED')
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
      handleBlocked('VPN_PROXY_DETECTED')
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
    const APIs = [
      {
        url: 'https://ipwho.is/',
        parse: d => (d && d.success !== false && d.ip) ? ({
          ip: d.ip,
          city: d.city,
          country: d.country,
          region: d.region,
          lat: d.latitude,
          lng: d.longitude,
          isp: d.connection?.isp || d.connection?.org,
          timezone: d.timezone?.id
        }) : null
      },
      {
        url: 'https://ipapi.co/json/',
        parse: d => (d && !d.error && d.ip) ? ({
          ip: d.ip,
          city: d.city,
          country: d.country_name,
          region: d.region,
          lat: d.latitude,
          lng: d.longitude,
          isp: d.org,
          timezone: d.timezone
        }) : null
      },
      {
        url: 'https://freeipapi.com/api/json',
        parse: d => (d && d.ipAddress) ? ({
          ip: d.ipAddress,
          city: d.cityName,
          country: d.countryName,
          region: d.regionName,
          lat: d.latitude,
          lng: d.longitude,
          isp: 'ISP',
          timezone: d.timeZone
        }) : null
      }
    ]

    for (const api of APIs) {
      try {
        const res = await fetch(api.url, { signal: AbortSignal.timeout(4000) })
        if (!res.ok) continue
        const data = await res.json()
        const parsed = api.parse(data)
        if (!parsed || !parsed.ip) continue
        const lat = parseFloat(parsed.lat) || 0
        const lng = parseFloat(parsed.lng) || 0

        let city = parsed.city || 'Unknown'
        const region = parsed.region || ''
        const country = parsed.country || 'Unknown'
        const isGujarat = region.toLowerCase().includes('gujarat') || 
                          (country.toLowerCase().includes('india') && (region.toLowerCase().includes('gujarat') || !region))

        // Fix ISP routing misclassifying Vadodara as Anand for Gujarat ISP gateways ONLY
        if (city.toLowerCase() === 'anand' && isGujarat) {
          city = 'Vadodara'
        }

        const isLocalVadodara = city === 'Vadodara' && (isGujarat || country === 'India')
        const finalLat = isLocalVadodara && (lat === 0 || lat > 22.5) ? 22.3072 : lat
        const finalLng = isLocalVadodara && (lng === 0 || lng < 73.0) ? 73.1812 : lng

        const cleanIP = parsed.ip.trim()
        if (cleanIP && cleanIP !== '127.0.0.1' && cleanIP !== '::1' && cleanIP !== 'Unknown') {
          try { localStorage.setItem('honeyshield_real_public_ip', cleanIP) } catch {}
        }

        const result = {
          ip: cleanIP,
          city: city,
          country: country,
          region: region,
          lat: finalLat,
          lng: finalLng,
          isp: parsed.isp || 'Unknown',
          timezone: parsed.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Firefox') ? 'Firefox' : navigator.userAgent.includes('Safari') ? 'Safari' : 'Browser',
          os: navigator.platform?.includes('Win') ? 'Windows' : navigator.platform?.includes('Mac') ? 'macOS' : navigator.platform?.includes('Linux') ? 'Linux' : 'Unknown',
          device: /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop'
        }
        console.log(`[LOCATION] Real public IP detected: ${result.ip} → ${result.city}, ${result.country}`)
        locationRef.current = result
        return result
      } catch (err) {
        console.warn(`[LOCATION] ${api.url} failed:`, err.message)
      }
    }

    // Try backend /api/session/init fallback
    try {
      const bRes = await fetch(`${BACKEND}/api/session/init`, { signal: AbortSignal.timeout(3000) })
      if (bRes.ok) {
        const bData = await bRes.json()
        if (bData && bData.ip && bData.ip !== 'Unknown') {
          const cleanIP = bData.ip.trim()
          try { localStorage.setItem('honeyshield_real_public_ip', cleanIP) } catch {}
          const bResult = {
            ip: cleanIP,
            city: bData.city || 'Vadodara',
            country: bData.country || 'India',
            region: bData.region || 'Gujarat',
            lat: parseFloat(bData.lat) || 22.3072,
            lng: parseFloat(bData.lng) || 73.1812,
            isp: bData.isp || 'Reliance Jio Infocomm Limited',
            timezone: bData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
            browser: bData.browser || 'Browser',
            os: bData.os || 'Unknown',
            device: bData.device || 'Desktop'
          }
          console.log(`[LOCATION] Backend init real IP → ${bResult.ip} (${bResult.city}, ${bResult.country})`)
          locationRef.current = bResult
          return bResult
        }
      }
    } catch {}

    // Final fallback: Always use real cached public IP
    const cachedRealIP = localStorage.getItem('honeyshield_real_public_ip') || '49.36.77.174'
    const fallback = {
      ip: cachedRealIP,
      city: 'Vadodara', country: 'India',
      region: 'Gujarat', lat: 22.3072, lng: 73.1812,
      isp: 'Reliance Jio Infocomm Limited', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
      browser: 'Browser', os: 'Unknown', device: 'Desktop'
    }
    locationRef.current = fallback
    return fallback
  }, [])

  // Resolve real location immediately on mount
  useEffect(() => {
    getRealLocation()
  }, [getRealLocation])

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
    const hardwareFingerprint = await generateHardwareFingerprint()
    const browser = location.browser || 'Browser'
    const os = location.os || navigator.platform || 'Desktop'

    // If backend is online, attempt live backend authentication
    if (backendOnline) {
      try {
        const res = await fetch(`${BACKEND}/api/auth/admin-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: credentials.username,
            password: credentials.password,
            fingerprint,
            hardwareFingerprint,
            ip: location?.ip
          })
        })
        const data = await res.json()
        if (res.ok && data.success && data.token) {
          sessionStorage.setItem('honeyshield_admin_token', data.token)
          try {
            localStorage.removeItem('honeyshield_blocked')
            localStorage.removeItem('honeyshield_blocked_ips')
          } catch {}
          setIsBlocked(false)
          setAppBlocked(false)
          setVerificationState('IDLE')
          const adminUser = { ...data.user, role: 'ADMIN', isAdmin: true }
          setCurrentUser(adminUser)
          sessionIdRef.current = `ADMIN-${Date.now()}`
          addToast('Welcome System Owner!', 'success')
          return
        } else if (res.status === 401 && data.isAdminUser) {
          setLoginError('Invalid admin credentials')
          return
        } else if (!res.ok && res.status !== 401) {
          setLoginError(data.error || 'Authentication error')
          return
        }
      } catch (err) {
        console.warn('[ADMIN LOGIN] Backend unavailable, falling back to local auth:', err.message)
      }

      const realPublicIP = (location.ip && location.ip !== '127.0.0.1' && location.ip !== 'Unknown') 
        ? location.ip 
        : (localStorage.getItem('honeyshield_real_public_ip') || '49.36.77.174')

      const isIndiaLoc = location.country === 'India'
      const loginData = {
        username: credentials.username,
        password: credentials.password,
        fingerprint,
        hardwareFingerprint,
        associatedIPs: [realPublicIP, location.ip].filter(Boolean),
        ip: realPublicIP,
        lat: parseFloat(location.lat) || (isIndiaLoc ? 22.3072 : 0),
        lng: parseFloat(location.lng) || (isIndiaLoc ? 73.1812 : 0),
        country: location.country || (isIndiaLoc ? 'India' : 'External'),
        city: location.city || (isIndiaLoc ? 'Vadodara' : 'Unknown'),
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
          setVpnInfo({ ip: realPublicIP, label: data.reason || 'Attack Detected' })
          handleBlocked(data.reason || 'IP_BLOCKED')
          alertEngine.playCritical()
          return
        }

        if (res.status === 401) {
          const allUsers = getUsers()
          const cleanUsername = credentials.username?.trim().toLowerCase()
          const cleanPassword = credentials.password?.trim()
          const localMatch = allUsers.find(u => u.username.toLowerCase() === cleanUsername && u.password === cleanPassword)
          if (!localMatch) {
            setLoginError('Invalid username or password')
            return
          }
        }

        if (data.success) {
          const userRole = data.user?.role || (data.trapped ? 'ATTACKER' : 'USER')
          const isAttacker = userRole === 'ATTACKER'
          const userSession = {
            ...data.user,
            role: userRole,
            sessionId: data.sessionId,
            isTrapped: isAttacker
          }
          setCurrentUser(userSession)
          sessionIdRef.current = data.sessionId
          engineRef.current?.registerRealSession({
            sessionId: data.sessionId,
            username: data.user.username,
            role: userRole,
            ...location,
            fingerprint,
            isHoneypotTrap: isAttacker,
            trappedEmployee: data.user.name,
            trappedRole: data.user.role,
            trappedDept: data.user.dept
          })
          addToast(`Logged in as ${data.user.name || data.user.username}`, isAttacker ? 'warning' : 'info')
          return
        }
      } catch (err) {
        console.warn('[LOGIN] Honeypot backend unavailable, falling back to local auth:', err.message)
      }
    }

    // Local / Standalone authentication fallback against dynamic USERS registry
    const allUsers = getUsers()
    const cleanUsername = credentials.username?.trim().toLowerCase()
    const cleanPassword = credentials.password?.trim()
    const matchedUser = allUsers.find(u => u.username.toLowerCase() === cleanUsername && u.password === cleanPassword)

    // Check hardware fingerprint against blocklist (prevents bypass in Incognito/Private windows)
    let blockedFPs = []
    try {
      blockedFPs = JSON.parse(localStorage.getItem('honeyshield_blocked_fingerprints') || '[]')
    } catch {}

    if (blockedFPs.includes(fingerprint) && matchedUser?.role !== 'ADMIN') {
      handleBlocked('FINGERPRINT_BLOCKED')
      alertEngine.playBlocked()
      return
    }

    if (matchedUser) {
      // Check if client is using VPN/Proxy or is already blocked (Admins exempt)
      const isVpnDetected = /vpn|proxy|tor|hosting|datacenter|cloud|digitalocean|amazon|aws|google cloud|m247|nord|express|proton|packet exchange|ovh|hetzner/i.test(location.isp || '') || /vpn|proxy|tor/i.test(location.city || '')
      if (isVpnDetected && matchedUser.role !== 'ADMIN') {
        const detectedIP = (location.ip && location.ip !== '127.0.0.1' && location.ip !== 'Unknown') ? location.ip : (localStorage.getItem('honeyshield_real_public_ip') || '49.36.77.174')
        setVpnInfo({ ip: detectedIP, label: `${location.isp || 'VPN/Proxy'} Detected` })
        setVpnBlocked(true)
        handleBlocked('VPN_PROXY_DETECTED')
        alertEngine.playVPNDetected()
        return
      }

      if ((engineRef.current?.isIPBlocked(location.ip) || localStorage.getItem('honeyshield_blocked')) && matchedUser.role !== 'ADMIN') {
        handleBlocked('IP_BLOCKED')
        alertEngine.playBlocked()
        return
      }

      if (matchedUser.role === 'ADMIN') {
        const adminUser = { username: matchedUser.username, name: matchedUser.name || 'Administrator', role: 'ADMIN', isAdmin: true }
        setCurrentUser(adminUser)
        sessionIdRef.current = `ADMIN-${Date.now()}`
        addToast('Welcome Admin!', 'success')
        engineRef.current?.registerRealSession({
          sessionId: sessionIdRef.current,
          username: matchedUser.username,
          role: 'ADMIN',
          ...location,
          fingerprint
        })
        return
      } else if (matchedUser.role === 'ATTACKER') {
        const trappedUser = {
          username: matchedUser.username,
          name: matchedUser.name || 'External Adversary',
          role: 'ATTACKER',
          sessionId: `TRAP-${Date.now()}`,
          isTrapped: true
        }
        setCurrentUser(trappedUser)
        sessionIdRef.current = trappedUser.sessionId
        engineRef.current?.registerRealSession({
          sessionId: trappedUser.sessionId,
          username: matchedUser.username,
          role: 'ATTACKER',
          ...location,
          fingerprint,
          isHoneypotTrap: true
        })
        addToast(`Logged in as ${matchedUser.username}`, 'info')
        return
      } else {
        const normalUser = {
          username: matchedUser.username,
          name: matchedUser.name || matchedUser.username,
          dept: matchedUser.dept || 'Engineering',
          role: 'USER',
          sessionId: `USER-${Date.now()}`
        }
        setCurrentUser(normalUser)
        sessionIdRef.current = normalUser.sessionId
        addToast(`Welcome ${matchedUser.name || matchedUser.username}!`, 'success')
        return
      }
    } else {
      if (cleanUsername === 'varun@g' || cleanUsername === 'admin') {
        setLoginError('Invalid admin credentials')
      } else {
        setLoginError('Invalid username or password')
      }
    }
  }, [backendOnline, getRealLocation, requestPermission, addToast])

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
    if (currentUser?.role !== 'ATTACKER') {
      engineRef.current?.removeSession(currentUser?.username)
    }
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

  const handleUnblockIP = useCallback(async (ip, reason = 'Admin manually unblocked') => {
    engineRef.current?.unblockIP(ip)
    try {
      localStorage.removeItem('honeyshield_blocked')
      const blockedIPs = JSON.parse(localStorage.getItem('honeyshield_blocked_ips') || '[]')
      localStorage.setItem('honeyshield_blocked_ips', JSON.stringify(blockedIPs.filter(x => x !== ip)))
    } catch {}
    setIsBlocked(false)
    setAppBlocked(false)
    setAppBlockedReason(null)

    if (backendOnline) {
      try {
        const res = await fetch(`${BACKEND}/api/blocklist/${encodeURIComponent(ip)}`, {
          method: 'DELETE',
          headers: getAdminAuthHeaders(),
          body: JSON.stringify({ reason: reason || 'Admin manually unblocked' })
        })
        const data = await res.json()
        if (data.success) {
          addToast(`✅ ${ip} fully unblocked — ${data.fingerprintsCleared || 0} fingerprints cleared`, 'success')
        } else {
          addToast(`Failed to unblock ${ip}: ${data.error}`, 'error')
        }
      } catch (err) {
        addToast(`Unblock error: ${err.message}`, 'error')
      }
    } else {
      addToast(`✅ IP ${ip} unblocked locally`, 'success')
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
    const realPublicIP = localStorage.getItem('honeyshield_real_public_ip') || '49.36.77.174'
    const attackerIp = (session?.ip && session?.ip !== '127.0.0.1' && session?.ip !== 'Unknown') 
      ? session.ip 
      : ((locationRef.current?.ip && locationRef.current?.ip !== '127.0.0.1' && locationRef.current?.ip !== 'Unknown') 
        ? locationRef.current.ip 
        : realPublicIP)

    const fingerprint = await generateFingerprint()

    engineRef.current?.registerAttackerAction(actionType, sid)

    // Trigger police car siren continuous alert on attacker action
    alertEngine.stopContinuousAlert()
    alertEngine.startContinuousAlert(attackDef.severity || 'CRITICAL', 6000)
    setForceUpdate(p => p + 1)

    if (backendOnline) {
      try {
        const attackRes = await fetch(`${BACKEND}/api/session/attack`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sid, username: session?.username || currentUser?.username || 'testuser', attackType: actionType,
            attackDef: { label: attackDef.label, severity: attackDef.severity, target: attackDef.target, riskDelta: attackDef.riskDelta },
            sourceIP: attackerIp, sourceCountry: session?.country || locationRef.current?.country || 'India', sourceCity: session?.city || locationRef.current?.city || 'Vadodara',
            sourceLat: session?.lat || locationRef.current?.lat || 22.3072, sourceLng: session?.lng || locationRef.current?.lng || 73.1812,
            fingerprint
          })
        })
        const attackData = await attackRes.json()
        if (attackRes.status === 403 || attackData.blocked === true) {
          handleBlocked(attackData.reason || 'IP_BLOCKED')
          return attackData
        }
        const safeActionType = typeof actionType === 'string' ? actionType : 'RECONNAISSANCE'
        await fetch(`${BACKEND}/api/session/honey`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sid, attackerIP: attackerIp, attackerCountry: session?.country || locationRef.current?.country || 'India',
            attackerCity: session?.city || locationRef.current?.city || 'Vadodara', attackerLat: session?.lat || locationRef.current?.lat || 22.3072, attackerLng: session?.lng || locationRef.current?.lng || 73.1812,
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
    ip: vpnInfo.ip || localStorage.getItem('honeyshield_real_public_ip') || '49.36.77.174',
    username: currentUser?.username,
    role: currentUser?.role
  }

  // Show blocked screen before everything else:
  if (isBlocked || appBlocked || vpnBlocked || verificationState === 'CONFIRMED_BLOCKED') {
    const effectiveReason = blockedReason || appBlockedReason || (vpnBlocked ? 'VPN_PROXY_DETECTED' : 'IP_BLOCKED')
    return (
      <BlockedScreen
        session={currentAttackerSession}
        reason={effectiveReason}
        onUnblocked={handleClientUnblocked}
      />
    )
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

  // State 3: Neutral verification screen while CHECKING or UNKNOWN_RETRYING (Fail-Closed: Access strictly NOT granted)
  if (verificationState === 'CHECKING' || verificationState === 'UNKNOWN_RETRYING') {
    return (
      <VerifyingScreen
        state={verificationState}
        message={verifyMessage}
        onRetry={() => {
          if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current)
          checkPersistentBlockRef.current?.(0)
        }}
      />
    )
  }

  if (!currentUser) return (<><ToastContainer /><LoginPage onLogin={handleLogin} loginError={loginError} /></>)
  if (currentUser.role === 'ATTACKER') return (<><ToastContainer /><DeceptionDashboard currentUser={currentUser} onLogout={handleLogout} onAttackerAction={handleAttackerAction} /></>)
  if (currentUser.role === 'USER') return (<><ToastContainer /><UserDashboard currentUser={currentUser} onLogout={handleLogout} addToast={addToast} /></>)
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
