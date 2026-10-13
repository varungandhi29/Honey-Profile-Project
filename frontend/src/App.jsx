import { useState, useRef, useEffect, useCallback } from 'react'
import LiveDataEngine from './engine/LiveDataEngine'
import { USERS, getUsers, ATTACK_TYPES, HONEY_TARGET_MAP } from './engine/constants'
import { useSocket } from './hooks/useSocket'
import { useNotifications } from './hooks/useNotifications'
import { generateFingerprint, generateHardwareFingerprint, detectPrivateBrowser } from './utils/fingerprint'
import { alertEngine } from './audio/alertEngine'
import { honeyBus } from './utils/honeyBus'
import LoginPage from './pages/LoginPage'
import AdminDashboard from './pages/AdminDashboard'
import DeceptionDashboard from './pages/DeceptionDashboard'
import UserDashboard from './pages/UserDashboard'
import RealUserPortal from './components/RealUserPortal'
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
  // Cross-tab & cross-device real-time sync via HoneyBus
  useEffect(() => {
    const unsub = honeyBus.subscribe((e) => {
      if (!e || !e.type) return

      if (e.type === 'ATTACK_EVENT') {
        const attack = e.payload?.attack
        const severity = attack?.severity || 'CRITICAL'
        if (attack) engineRef.current?.injectAttackEvent(attack)
        if (e.payload?.honeyLog) engineRef.current?.injectHoneyEvent(e.payload.honeyLog)
        if (e.payload?.alert) engineRef.current?.injectAlert(e.payload.alert)
        if (e.payload?.session) engineRef.current?.updateSession(e.payload.session)
        alertEngine.stopContinuousAlert()
        alertEngine.startContinuousAlert(severity, 6000)
        setForceUpdate(p => p + 1)
        addToast(`🚨 CRITICAL: ${attack?.type || 'Attack'} from ${attack?.sourceIP || 'Adversary'}`, 'critical')
      } else if (e.type === 'SESSION_JOINED' || e.type === 'SESSION_HEARTBEAT') {
        const s = e.payload?.session
        if (s) {
          engineRef.current?.updateSession(s)
        }
        if (s?.role === 'ATTACKER' && e.type === 'SESSION_JOINED') {
          alertEngine.stopContinuousAlert()
          alertEngine.startContinuousAlert('CRITICAL', 6000)
          setForceUpdate(p => p + 1)
          addToast(`🚨 ADVERSARY INFILTRATION: ${s.username} connected from ${s.city || s.country || 'Remote'}`, 'critical')
        }
      } else if (e.type === 'REQUEST_SYNC') {
        // Active session replies to newly opened Admin dashboard
        if (currentUserRef.current) {
          const cur = currentUserRef.current
          const activeSess = {
            id: sessionIdRef.current || `SESSION-${cur.username}`,
            sessionId: sessionIdRef.current || `SESSION-${cur.username}`,
            username: cur.username,
            role: cur.role || (cur.isAdmin ? 'ADMIN' : 'USER'),
            state: cur.role === 'ATTACKER' ? 'ATTACKER' : 'NORMAL',
            riskScore: cur.role === 'ATTACKER' ? 85 : 0,
            ...locationRef.current,
            isPrivateBrowser: Boolean(cur.isPrivateBrowser),
            isVPN: Boolean(cur.isVPN),
            vpnLabel: cur.isVPN ? 'Simulated VPN / Proxy' : undefined,
            startTime: cur.startTime || new Date()
          }
          honeyBus.publish('SESSION_HEARTBEAT', { session: activeSess })
        }
      } else if (e.type === 'SESSION_LOGOUT') {
        if (e.payload?.username) {
          engineRef.current?.removeSession(e.payload.username)
        }
      } else if (e.type === 'BLOCK_IP' || e.type === 'CLIENT_BLOCKED') {
        alertEngine.stopContinuousAlert()
        alertEngine.playBlocked()
        setForceUpdate(p => p + 1)

        const payload = e.payload || {}
        if (payload.ip) {
          engineRef.current?.blockIP(payload.ip, payload.blockedBy || 'admin', payload.reason)
        }

        // Persist block flags in browser blocklists
        try {
          if (payload.ip) {
            const bIps = JSON.parse(localStorage.getItem('honeyshield_blocked_ips') || '[]')
            if (!bIps.includes(payload.ip)) {
              localStorage.setItem('honeyshield_blocked_ips', JSON.stringify([...bIps, payload.ip]))
            }
          }
          if (payload.username) {
            const bUsers = JSON.parse(localStorage.getItem('honeyshield_blocked_usernames') || '[]')
            if (!bUsers.includes(payload.username.toLowerCase())) {
              localStorage.setItem('honeyshield_blocked_usernames', JSON.stringify([...bUsers, payload.username.toLowerCase()]))
            }
          }
          if (payload.fingerprint) {
            const bFps = JSON.parse(localStorage.getItem('honeyshield_blocked_fingerprints') || '[]')
            if (!bFps.includes(payload.fingerprint)) {
              localStorage.setItem('honeyshield_blocked_fingerprints', JSON.stringify([...bFps, payload.fingerprint]))
            }
          }
        } catch {}

        const isCurrentAdmin = (
          currentUserRef.current?.role === 'ADMIN' ||
          currentUserRef.current?.isAdmin ||
          currentUserRef.current?.username === 'varun@g' ||
          currentUserRef.current?.username === 'admin'
        )

        if (!isCurrentAdmin) {
          const curRole = currentUserRef.current?.role?.toUpperCase()
          const curName = currentUserRef.current?.username?.toLowerCase()
          const isAttackerRole = (
            curRole === 'ATTACKER' ||
            currentUserRef.current?.isTrapped ||
            curName === 'darshan@p' ||
            curName === 'attacker' ||
            curName === 'testuser'
          )
          const isTargeted = (
            (payload.allAttackers && isAttackerRole) ||
            (payload.username && curName === payload.username.toLowerCase()) ||
            (payload.sessionId && sessionIdRef.current === payload.sessionId) ||
            (payload.ip && (locationRef.current?.ip === payload.ip || localStorage.getItem('honeyshield_real_public_ip') === payload.ip)) ||
            isAttackerRole
          )

          if (isTargeted) {
            console.log('[HoneyBus] Target client permanently contained & blocked:', payload)
            try {
              localStorage.setItem('honeyshield_blocked', JSON.stringify({
                blocked: true,
                reason: payload.reason || 'SOC_CONTAINMENT',
                ip: payload.ip || locationRef.current?.ip,
                sessionId: sessionIdRef.current,
                username: currentUserRef.current?.username
              }))
              sessionStorage.setItem('honeyshield_blocked', 'true')
              document.cookie = "honeyshield_blocked=true; path=/; max-age=31536000"
            } catch {}
            handleBlocked(payload.reason || 'SOC_CONTAINMENT')
          }
        }
      } else if (e.type === 'UNBLOCK_IP' || e.type === 'CLIENT_UNBLOCKED') {
        const payload = e.payload || {}
        if (payload.ip) {
          engineRef.current?.unblockIP(payload.ip)
        }
        try {
          if (payload.ip) {
            const bIps = JSON.parse(localStorage.getItem('honeyshield_blocked_ips') || '[]')
            localStorage.setItem('honeyshield_blocked_ips', JSON.stringify(bIps.filter(x => x !== payload.ip)))
          }
          if (payload.username) {
            const bUsers = JSON.parse(localStorage.getItem('honeyshield_blocked_usernames') || '[]')
            localStorage.setItem('honeyshield_blocked_usernames', JSON.stringify(bUsers.filter(x => x !== payload.username.toLowerCase())))
          }
        } catch {}
        handleClientUnblocked(payload)
      }
    })
    return () => unsub()
  }, [addToast, handleBlocked, handleClientUnblocked])

  // Continuous cross-PC presence heartbeat (broadcasts active sessions across global cloud relay every 4s)
  useEffect(() => {
    if (!currentUser) return
    const heartbeatInterval = setInterval(() => {
      const cur = currentUserRef.current
      if (!cur) return
      const s = {
        id: sessionIdRef.current || `SESSION-${cur.username}`,
        sessionId: sessionIdRef.current || `SESSION-${cur.username}`,
        username: cur.username,
        role: cur.role || (cur.isAdmin ? 'ADMIN' : 'USER'),
        state: cur.role === 'ATTACKER' ? 'ATTACKER' : 'NORMAL',
        riskScore: cur.role === 'ATTACKER' ? 85 : 0,
        ...locationRef.current,
        isPrivateBrowser: Boolean(cur.isPrivateBrowser),
        isVPN: Boolean(cur.isVPN),
        vpnLabel: cur.isVPN ? 'Simulated VPN / Proxy' : undefined,
        startTime: cur.startTime || new Date()
      }
      honeyBus.publish('SESSION_HEARTBEAT', { session: s })
    }, 4000)
    return () => clearInterval(heartbeatInterval)
  }, [currentUser])

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
            if (wasLocallyFlagged) {
              setVerificationState('CONFIRMED_BLOCKED')
              setIsBlocked(true)
              setAppBlocked(true)
              setAppBlockedReason('PERMANENT_DEVICE_BAN')
              return
            } else {
              setVerificationState('IDLE')
              setIsBlocked(false)
              setAppBlocked(false)
              return
            }
          }
        }

        // Server returned error / 429
        if (wasLocallyFlagged) {
          setVerificationState('CONFIRMED_BLOCKED')
          setAppBlocked(true)
          setIsBlocked(true)
          setAppBlockedReason('PERMANENT_DEVICE_BAN')
          return
        } else {
          setVerificationState('IDLE')
          setAppBlocked(false)
          setIsBlocked(false)
        }
      } catch (err) {
        if (isCancelled) return
        if (wasLocallyFlagged) {
          setVerificationState('CONFIRMED_BLOCKED')
          setAppBlocked(true)
          setIsBlocked(true)
          setAppBlockedReason('PERMANENT_DEVICE_BAN')
          return
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
    currentUserRef,
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
      const isCurrentAdmin = currentUserRef.current?.role === 'ADMIN' || currentUserRef.current?.isAdmin || currentUserRef.current?.username === 'varun@g'
      if (!isCurrentAdmin && currentUserRef.current) {
        const isAttacker = (
          currentUserRef.current?.role?.toUpperCase() === 'ATTACKER' ||
          currentUserRef.current?.role?.toLowerCase() === 'attacker' ||
          currentUserRef.current?.isTrapped ||
          currentUserRef.current?.username === 'darshan@p' ||
          currentUserRef.current?.username === 'attacker' ||
          currentUserRef.current?.username === 'testuser'
        )
        const isMatch = (
          (data.sessionId && (data.sessionId === currentSessionId || currentSessionId?.includes(data.username))) ||
          (data.username && currentUserRef.current?.username === data.username) ||
          (data.ip && currentIP && data.ip === currentIP) ||
          isAttacker
        )
        if (isMatch) {
          try { localStorage.setItem('honeyshield_blocked', JSON.stringify({ blocked: true, reason: data.reason || 'IP_BLOCKED', sessionId: data.sessionId })) } catch {}
          handleBlocked(data.reason || 'IP_BLOCKED')
          return
        }
      }
      addToast(`🚫 Session blocked: ${data.sessionId || data.ip}`, 'info')
    },
    onBlockedAttempt: (data) => {
      alertEngine.playBlocked()
      const isCurrentAdmin = currentUserRef.current?.role === 'ADMIN' || currentUserRef.current?.isAdmin || currentUserRef.current?.username === 'varun@g'
      const isAttacker = !isCurrentAdmin && (
        currentUserRef.current?.role?.toUpperCase() === 'ATTACKER' ||
        currentUserRef.current?.role?.toLowerCase() === 'attacker' ||
        currentUserRef.current?.isTrapped ||
        currentUserRef.current?.username === 'darshan@p' ||
        currentUserRef.current?.username === 'attacker' ||
        currentUserRef.current?.username === 'testuser'
      )
      if (isAttacker) {
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
      const isCurrentAdmin = currentUserRef.current?.role === 'ADMIN' || currentUserRef.current?.isAdmin || currentUserRef.current?.username === 'varun@g'
      if (!isCurrentAdmin && currentUserRef.current) {
        const isAttacker = (
          currentUserRef.current?.role?.toUpperCase() === 'ATTACKER' ||
          currentUserRef.current?.role?.toLowerCase() === 'attacker' ||
          currentUserRef.current?.isTrapped ||
          currentUserRef.current?.username === 'darshan@p' ||
          currentUserRef.current?.username === 'attacker' ||
          currentUserRef.current?.username === 'testuser'
        )
        const isMatch = (
          (data.ip && currentIP && data.ip === currentIP) ||
          (data.username && currentUserRef.current?.username === data.username) ||
          isAttacker
        )
        if (isMatch) {
          try { localStorage.setItem('honeyshield_blocked', JSON.stringify({ blocked: true, reason: 'IP_BLOCKED', ip: data.ip })) } catch {}
          handleBlocked(data.reason || 'IP_BLOCKED')
          return
        }
      }
      addToast(`🚫 IP ${data.ip} blocked`, 'warning')
    },
    onFingerprintBlocked: (data) => {
      alertEngine.playBlocked()
      alertEngine.stopContinuousAlert()
      setForceUpdate(p => p + 1)
      const isCurrentAdmin = currentUserRef.current?.role === 'ADMIN' || currentUserRef.current?.isAdmin || currentUserRef.current?.username === 'varun@g'
      const isAttacker = !isCurrentAdmin && (
        currentUserRef.current?.role?.toUpperCase() === 'ATTACKER' ||
        currentUserRef.current?.role?.toLowerCase() === 'attacker' ||
        currentUserRef.current?.isTrapped ||
        currentUserRef.current?.username === 'darshan@p' ||
        currentUserRef.current?.username === 'attacker' ||
        currentUserRef.current?.username === 'testuser'
      )
      if (isAttacker) {
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
        parse: d => d.success ? ({ ip: d.ip, city: d.city, country: d.country, region: d.region, lat: d.latitude, lng: d.longitude, isp: d.connection?.isp, timezone: d.timezone?.id }) : null
      },
      {
        url: 'https://api.ipify.org?format=json',
        parse: d => d.ip ? ({ ip: d.ip, city: 'Vadodara', country: 'India', lat: 22.3072, lng: 73.1812 }) : null
      },
      {
        url: 'https://ipapi.co/json/',
        parse: d => ({ ip: d.ip, city: d.city, country: d.country_name, region: d.region, lat: d.latitude, lng: d.longitude, isp: d.org, timezone: d.timezone })
      }
    ]

    for (const api of APIs) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 4000)
        const res = await fetch(api.url, { signal: controller.signal })
        clearTimeout(timeout)
        if (!res.ok) continue
        const data = await res.json()
        const parsed = api.parse(data)
        if (!parsed) continue
        const lat = parseFloat(parsed.lat) || 22.3072
        const lng = parseFloat(parsed.lng) || 73.1812
        const result = {
          ip: parsed.ip || '182.71.244.10',
          city: (parsed.city?.toLowerCase() === 'anand' || !parsed.city) ? 'Vadodara' : parsed.city,
          country: parsed.country || 'India',
          region: parsed.region || '',
          lat, lng,
          isp: parsed.isp || 'Telecom Network',
          timezone: parsed.timezone || 'Asia/Kolkata',
          browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Firefox') ? 'Firefox' : navigator.userAgent.includes('Safari') ? 'Safari' : 'Browser',
          os: navigator.platform?.includes('Win') ? 'Windows' : navigator.platform?.includes('Mac') ? 'macOS' : 'Linux',
          device: /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop'
        }
        try {
          if (result.ip && result.ip !== 'Unknown') {
            localStorage.setItem('honeyshield_real_public_ip', result.ip)
          }
        } catch {}
        console.log(`[LOCATION] ${api.url} → ${result.city}, ${result.country} [${lat}, ${lng}] IP: ${result.ip}`)
        locationRef.current = result
        return result
      } catch (err) {
        console.warn(`[LOCATION] ${api.url} failed:`, err.message)
      }
    }

    console.warn('[LOCATION] All APIs failed — using Vadodara fallback')
    const fallback = {
      ip: (typeof localStorage !== 'undefined' ? localStorage.getItem('honeyshield_real_public_ip') : null) || '49.36.77.174',
      city: 'Vadodara', country: 'India',
      region: 'Gujarat', lat: 22.3072, lng: 73.1812,
      isp: 'Reliance Jio Infocomm', timezone: 'Asia/Kolkata',
      browser: 'Browser', os: 'Desktop', device: 'Desktop'
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
    const isPrivateBrowser = await detectPrivateBrowser()
    const browser = location.browser || 'Browser'
    const os = location.os || navigator.platform || 'Desktop'

    // If backend is online, attempt live backend authentication
    if (backendOnline) {
      // 1. Admin login route
      const cleanUser = credentials.username?.trim().toLowerCase()
      if (cleanUser === 'admin' || cleanUser === 'varun@g') {
        try {
          const res = await fetch(`${BACKEND}/api/auth/admin-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: credentials.username,
              password: credentials.password,
              fingerprint,
              hardwareFingerprint,
              ip: location?.ip,
              browser,
              os,
              isPrivateBrowser
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
            const adminSessionId = data.sessionId || `ADMIN-${Date.now()}`
            const adminUser = { ...data.user, role: 'ADMIN', isAdmin: true, sessionId: adminSessionId, isPrivateBrowser }
            setCurrentUser(adminUser)
            sessionIdRef.current = adminSessionId
            engineRef.current?.registerRealSession({
              sessionId: adminSessionId,
              username: adminUser.username,
              role: 'ADMIN',
              ...location,
              browser,
              os,
              isPrivateBrowser,
              fingerprint,
              state: 'NORMAL',
              riskScore: 0
            })
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
          console.warn('[ADMIN LOGIN] Backend unavailable, continuing:', err.message)
        }
      }

      // 2. All user / attacker registrations go through /api/session/register
      const realPublicIP = (location.ip && location.ip !== '127.0.0.1' && location.ip !== 'Unknown') 
        ? location.ip 
        : (localStorage.getItem('honeyshield_real_public_ip') || '49.36.77.174')

      const isIndiaLoc = location.country === 'India'
      const loginData = {
        username: credentials.username?.trim(),
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
        isPrivateBrowser,
        simulateVPN: Boolean(credentials.simulateVPN)
      }

      try {
        const res = await fetch(`${BACKEND}/api/session/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(fingerprint ? { 'x-fingerprint': fingerprint } : {})
          },
          body: JSON.stringify(loginData)
        })
        const data = await res.json().catch(() => ({}))

        if (res.status === 403 || data.blocked) {
          if (data.reason === 'VPN_PROXY_DETECTED') {
            setVpnInfo({ ip: realPublicIP, label: data.label || 'VPN / Datacenter IP' })
            setVpnBlocked(true)
            alertEngine.playVPNDetected()
          } else {
            alertEngine.playBlocked()
          }
          handleBlocked(data.reason || 'IP_BLOCKED')
          return
        }

        if (res.status === 401) {
          setLoginError(data.error || 'Invalid username or password')
          return
        }

        if (data.success) {
          sessionIdRef.current = data.sessionId
          if (data.trapped) {
            const trappedUser = {
              username: credentials.username,
              name: credentials.username,
              role: 'ATTACKER',
              sessionId: data.sessionId,
              isTrapped: true,
              isPrivateBrowser
            }
            setCurrentUser(trappedUser)
            engineRef.current?.registerRealSession({
              sessionId: data.sessionId,
              username: credentials.username,
              role: 'ATTACKER',
              ...location,
              browser,
              os,
              fingerprint,
              isPrivateBrowser,
              isHoneypotTrap: true
            })
            addToast(`Logged in as ${credentials.username}`, 'warning')
            return
          } else if (data.role === 'admin' || cleanUser === 'admin' || cleanUser === 'varun@g') {
            const adminUser = {
              username: credentials.username,
              name: 'Administrator',
              role: 'ADMIN',
              sessionId: data.sessionId,
              isAdmin: true,
              isPrivateBrowser
            }
            setCurrentUser(adminUser)
            engineRef.current?.registerRealSession({
              sessionId: data.sessionId,
              username: credentials.username,
              role: 'ADMIN',
              ...location,
              browser,
              os,
              isPrivateBrowser,
              fingerprint,
              state: 'NORMAL',
              riskScore: 0
            })
            addToast('Welcome System Owner!', 'success')
            return
          } else {
            const realUser = {
              username: credentials.username,
              name: credentials.username === 'testuser' ? 'Test User' : credentials.username,
              dept: 'Engineering',
              role: 'employee',
              sessionId: data.sessionId,
              isRealUser: true
            }
            setCurrentUser(realUser)
            addToast(`Welcome ${realUser.name}!`, 'success')
            return
          }
        }
      } catch (err) {
        console.warn('[LOGIN] /api/session/register failed, falling back to local auth:', err.message)
      }
    }

    // Local / Standalone authentication fallback
    const cleanUsername = credentials.username?.trim().toLowerCase()
    const cleanPassword = credentials.password?.trim()
    const REAL_USERS = {
      'admin': 'admin123',
      'testuser': 'testuser123',
      'varun@g': 'varun@29',
      'dhruv@l': 'dhruv@123',
      'rudra@b': 'rudra@123',
      'darshan@p': 'darshan@01'
    }

    let blockedFPs = []
    let blockedUsers = []
    let blockedIPsList = []
    try {
      blockedFPs = JSON.parse(localStorage.getItem('honeyshield_blocked_fingerprints') || '[]')
      blockedUsers = JSON.parse(localStorage.getItem('honeyshield_blocked_usernames') || '[]')
      blockedIPsList = JSON.parse(localStorage.getItem('honeyshield_blocked_ips') || '[]')
    } catch {}

    const isBlockedClient = (
      blockedFPs.includes(fingerprint) ||
      blockedUsers.includes(cleanUsername) ||
      (location.ip && blockedIPsList.includes(location.ip))
    )

    if (isBlockedClient && cleanUsername !== 'admin' && cleanUsername !== 'varun@g') {
      handleBlocked('CREDENTIAL_QUARANTINED')
      alertEngine.playBlocked()
      return
    }

    const ATTACKERS = {
      'darshan@p': 'darshan@123',
      'attacker': 'attacker123'
    }

    if (ATTACKERS[cleanUsername] && ATTACKERS[cleanUsername] === cleanPassword) {
      const isSimulatedVPN = Boolean(credentials.simulateVPN)
      const trappedSessionId = `TRAP-${Date.now()}`
      const trappedUser = {
        username: cleanUsername,
        name: cleanUsername === 'darshan@p' ? 'Patel Darshan' : cleanUsername,
        role: 'ATTACKER',
        sessionId: trappedSessionId,
        isTrapped: true,
        isPrivateBrowser,
        isVPN: isSimulatedVPN
      }
      setCurrentUser(trappedUser)
      sessionIdRef.current = trappedSessionId
      const attackerSessionObj = {
        id: trappedSessionId,
        sessionId: trappedSessionId,
        username: cleanUsername,
        role: 'ATTACKER',
        state: 'ATTACKER',
        riskScore: 85,
        ...location,
        browser,
        os,
        fingerprint,
        isPrivateBrowser,
        isVPN: isSimulatedVPN,
        vpnLabel: isSimulatedVPN ? 'Simulated VPN / Proxy' : undefined,
        isHoneypotTrap: true,
        startTime: new Date()
      }
      engineRef.current?.registerRealSession(attackerSessionObj)
      honeyBus.publish('SESSION_JOINED', { session: attackerSessionObj })

      if (isSimulatedVPN) {
        setVpnInfo({ ip: location.ip || '182.71.244.10', label: 'Simulated VPN / Proxy' })
        setVpnBlocked(false)
        alertEngine.playVPNDetected()
        addToast(`🚨 AUTO-VPN DETECTED: Attacker routed through proxy tunnel`, 'critical')
        honeyBus.publish('ATTACK_EVENT', {
          attack: {
            id: `ATK-VPN-${Date.now()}`,
            type: 'VPN / PROXY INFILTRATION',
            severity: 'HIGH',
            sourceIP: location.ip || '182.71.244.10',
            sourceCountry: location.country || 'India',
            sourceCity: location.city || 'Vadodara',
            targetArea: '/auth/vpn-gateway',
            riskDelta: 35,
            sessionId: trappedSessionId
          },
          alert: {
            id: `ALERT-VPN-${Date.now()}`,
            severity: 'HIGH',
            title: 'Proxy / Anonymizer Tunnel Active',
            description: `Session for ${cleanUsername} originated from encrypted proxy/VPN tunnel`,
            sourceIP: location.ip || '182.71.244.10',
            timestamp: new Date().toISOString()
          },
          session: attackerSessionObj
        })
      }

      addToast(`Logged in as ${cleanUsername}`, 'warning')
      return
    }

    if (REAL_USERS[cleanUsername] && REAL_USERS[cleanUsername] === cleanPassword) {
      if (cleanUsername === 'admin' || cleanUsername === 'varun@g') {
        const adminSessionId = `ADMIN-${Date.now()}`
        const adminUser = {
          username: cleanUsername,
          name: 'Administrator',
          role: 'ADMIN',
          isAdmin: true,
          sessionId: adminSessionId,
          isPrivateBrowser,
          isVPN: Boolean(credentials.simulateVPN)
        }
        setCurrentUser(adminUser)
        sessionIdRef.current = adminSessionId
        const adminSessionObj = {
          id: adminSessionId,
          sessionId: adminSessionId,
          username: cleanUsername,
          role: 'ADMIN',
          state: 'NORMAL',
          riskScore: 0,
          ...location,
          browser,
          os,
          isPrivateBrowser,
          isVPN: Boolean(credentials.simulateVPN),
          vpnLabel: credentials.simulateVPN ? 'Simulated VPN / Proxy' : undefined,
          fingerprint,
          startTime: new Date()
        }
        engineRef.current?.registerRealSession(adminSessionObj)
        honeyBus.publish('SESSION_JOINED', { session: adminSessionObj })
        honeyBus.publish('REQUEST_SYNC', { requestedBy: 'admin' })
        addToast('Welcome Admin (System Owner)!', 'success')
        return
      } else {
        const normalSessionId = `USER-${Date.now()}`
        const normalUser = {
          username: cleanUsername,
          name: cleanUsername === 'testuser' ? 'Test User' : cleanUsername,
          dept: 'Engineering',
          role: 'employee',
          sessionId: normalSessionId,
          isRealUser: true,
          isPrivateBrowser,
          isVPN: Boolean(credentials.simulateVPN)
        }
        setCurrentUser(normalUser)
        sessionIdRef.current = normalSessionId
        const userSessionObj = {
          id: normalSessionId,
          sessionId: normalSessionId,
          username: cleanUsername,
          role: 'USER',
          state: 'NORMAL',
          riskScore: 5,
          ...location,
          browser,
          os,
          isPrivateBrowser,
          isVPN: Boolean(credentials.simulateVPN),
          fingerprint,
          startTime: new Date()
        }
        engineRef.current?.registerRealSession(userSessionObj)
        honeyBus.publish('SESSION_JOINED', { session: userSessionObj })
        addToast(`Welcome ${normalUser.name}!`, 'success')
        return
      }
    } else {
      setLoginError('Invalid username or password')
    }
  }, [backendOnline, getRealLocation, requestPermission, addToast, handleBlocked])

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
    honeyBus.publish('SESSION_LOGOUT', { username: currentUser?.username, sessionId: sessionIdRef.current })
    setCurrentUser(null)
    sessionIdRef.current = null
    alertEngine.stopContinuousAlert()
    setForceUpdate(p => p + 1)
  }, [backendOnline, currentUser])

  const handleBlockIP = useCallback(async (target, reason = 'Manual block by admin') => {
    let ip = typeof target === 'string' ? target : target?.ip
    let sessionId = typeof target === 'object' ? (target?.sessionId || target?.id) : null
    let username = typeof target === 'object' ? target?.username : null
    let fingerprint = typeof target === 'object' ? (target?.fingerprint?.deviceId || target?.fingerprint) : null

    // If target was just an IP string, look up the active session in engine to grab username/sessionId/fingerprint
    if (!sessionId || !username) {
      const match = engineRef.current?.sessions?.find(s => s.ip === ip || s.sessionId === target || s.username === target)
      if (match) {
        if (!ip) ip = match.ip
        sessionId = match.sessionId || match.id
        username = match.username
        fingerprint = match.fingerprint?.deviceId || match.fingerprint
      }
    }

    if (ip) engineRef.current?.blockIP(ip, currentUser?.username, reason)
    alertEngine.playBlocked()
    alertEngine.stopContinuousAlert()
    setForceUpdate(p => p + 1)

    // Store in blocklists (DO NOT block the admin machine executing the block!)
    try {
      if (ip) {
        const blockedIPs = JSON.parse(localStorage.getItem('honeyshield_blocked_ips') || '[]')
        if (!blockedIPs.includes(ip)) {
          localStorage.setItem('honeyshield_blocked_ips', JSON.stringify([...blockedIPs, ip]))
        }
      }
      if (username) {
        const blockedUsers = JSON.parse(localStorage.getItem('honeyshield_blocked_usernames') || '[]')
        if (!blockedUsers.includes(username.toLowerCase())) {
          localStorage.setItem('honeyshield_blocked_usernames', JSON.stringify([...blockedUsers, username.toLowerCase()]))
        }
      }
      if (fingerprint) {
        const blockedFPs = JSON.parse(localStorage.getItem('honeyshield_blocked_fingerprints') || '[]')
        if (!blockedFPs.includes(fingerprint)) {
          localStorage.setItem('honeyshield_blocked_fingerprints', JSON.stringify([...blockedFPs, fingerprint]))
        }
      }
    } catch {}

    const isAttackerTarget = !username || username.toLowerCase() === 'darshan@p' || username.toLowerCase() === 'attacker' || target?.state === 'ATTACKER' || target?.role === 'ATTACKER'

    // CRITICAL FOR DEPLOYED WEB & CROSS-BROWSER: Broadcast across HoneyBus to instantly quarantine attacker
    honeyBus.publish('CLIENT_BLOCKED', {
      ip,
      sessionId,
      username,
      fingerprint,
      allAttackers: isAttackerTarget,
      reason: reason || 'Manual block by admin',
      blockedBy: currentUser?.username || 'admin'
    })
    honeyBus.publish('BLOCK_IP', {
      ip,
      sessionId,
      username,
      fingerprint,
      allAttackers: isAttackerTarget,
      reason: reason || 'Manual block by admin'
    })

    if (backendOnline && ip) {
      try {
        const res = await fetch(`${BACKEND}/api/blocklist`, {
          method: 'POST',
          headers: getAdminAuthHeaders(),
          body: JSON.stringify({
            ip,
            sessionId,
            username,
            fingerprint,
            blockedBy: currentUser?.username || 'admin',
            reason,
            permanent: true
          })
        })
        const data = await res.json().catch(() => ({}))
        if (data && data.success) {
          addToast(`🚫 Attacker ${username || ip} permanently quarantined`, 'warning')
        }
      } catch (e) {
        addToast(`🚫 ${username || ip} blocked across tabs & network`, 'warning')
      }
    } else {
      addToast(`🚫 ${username || ip} blocked across tabs & network`, 'warning')
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

    // Broadcast unblock across HoneyBus
    honeyBus.publish('CLIENT_UNBLOCKED', { ip, reason })
    honeyBus.publish('UNBLOCK_IP', { ip, reason })

    if (backendOnline) {
      try {
        const res = await fetch(`${BACKEND}/api/blocklist/${encodeURIComponent(ip)}`, {
          method: 'DELETE',
          headers: getAdminAuthHeaders(),
          body: JSON.stringify({ reason: reason || 'Admin manually unblocked' })
        })
        const data = await res.json().catch(() => ({}))
        if (data && data.success) {
          addToast(`✅ ${ip} fully unblocked — ${data.fingerprintsCleared || 0} fingerprints cleared`, 'success')
        } else {
          addToast(`✅ ${ip} unblocked locally and across network`, 'success')
        }
      } catch (err) {
        addToast(`✅ IP ${ip} unblocked locally and across network`, 'success')
      }
    } else {
      addToast(`✅ IP ${ip} unblocked across tabs & network`, 'success')
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
    if (!currentUser) return
    const sendHeartbeat = async () => {
      // 1. Instant local storage cross-tab containment check
      try {
        const isCurrentAdmin = currentUser.role === 'ADMIN' || currentUser.isAdmin || currentUser.username === 'varun@g'
        if (!isCurrentAdmin) {
          const localBlock = localStorage.getItem('honeyshield_blocked')
          if (localBlock) {
            const parsed = JSON.parse(localBlock)
            if (parsed && parsed.blocked) {
              handleBlocked(parsed.reason || 'IP_BLOCKED')
              return
            }
          }
          const blockedIPs = JSON.parse(localStorage.getItem('honeyshield_blocked_ips') || '[]')
          const myIP = locationRef.current?.ip
          if (myIP && blockedIPs.includes(myIP)) {
            handleBlocked('IP_BLOCKED')
            return
          }
        }
      } catch {}

      // 2. Authoritative backend heartbeat check
      if (backendOnline && sessionIdRef.current) {
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
          const data = await res.json().catch(() => ({}))
          if (data && data.blocked) {
            addToast('🚫 Your session has been terminated by administration (IP Blocked)', 'critical')
            setAppBlockedReason(data.reason || 'IP_BLOCKED')
            setAppBlocked(true)
            handleBlocked(data.reason || 'IP_BLOCKED')
          }
        } catch (e) {
          console.warn('[HEARTBEAT] Failed:', e.message)
        }
      }
    }
    sendHeartbeat()
    const interval = setInterval(sendHeartbeat, 3000)
    return () => clearInterval(interval)
  }, [currentUser, backendOnline, handleLogout, addToast, handleBlocked])

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

    // Check if client is already flagged as blocked
    try {
      const localBlock = localStorage.getItem('honeyshield_blocked')
      if (localBlock && JSON.parse(localBlock)?.blocked) {
        handleBlocked('IP_BLOCKED')
        return { blocked: true, reason: 'IP_BLOCKED' }
      }
      const blockedIPs = JSON.parse(localStorage.getItem('honeyshield_blocked_ips') || '[]')
      if (blockedIPs.includes(attackerIp) || (locationRef.current?.ip && blockedIPs.includes(locationRef.current.ip))) {
        handleBlocked('IP_BLOCKED')
        return { blocked: true, reason: 'IP_BLOCKED' }
      }
    } catch {}

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
            fingerprint,
            isPrivateBrowser: Boolean(currentUser?.isPrivateBrowser || session?.isPrivateBrowser)
          })
        })
        const attackData = await attackRes.json()
        if (attackRes.status === 403 || attackData.blocked === true) {
          handleBlocked(attackData.reason || 'IP_BLOCKED')
          return attackData
        }
        const safeActionType = typeof actionType === 'string' ? actionType : 'RECONNAISSANCE'
        const honeyRes = await fetch(`${BACKEND}/api/session/honey`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sid, attackerIP: attackerIp, attackerCountry: session?.country || locationRef.current?.country || 'India',
            attackerCity: session?.city || locationRef.current?.city || 'Vadodara', attackerLat: session?.lat || locationRef.current?.lat || 22.3072, attackerLng: session?.lng || locationRef.current?.lng || 73.1812,
            action: safeActionType.includes('EXFIL')||safeActionType.includes('DATA')?'DOWNLOAD':safeActionType.includes('COMMAND')||safeActionType.includes('INJECT')?'EXEC':safeActionType.includes('TRAVERSAL')?'READ':safeActionType.includes('CREDENTIAL')?'LOGIN_ATTEMPT':'READ',
            fakeTarget: HONEY_TARGET_MAP[safeActionType] || '/system/unknown'
          })
        })
        if (honeyRes.status === 403) {
          handleBlocked('IP_BLOCKED')
          return attackData
        }
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

  // 1. Not logged in
  if (!currentUser) return (<><ToastContainer /><LoginPage onLogin={handleLogin} loginError={loginError} /></>)

  // 2. Admin -> SOC Dashboard
  if (currentUser.isAdmin || currentUser.role === 'ADMIN' || currentUser.role === 'admin') {
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

  // 3. Real employee -> AcmeCorp Employee Portal
  if (currentUser.isRealUser || currentUser.role === 'employee' || currentUser.role === 'USER') {
    return (
      <>
        <ToastContainer />
        <RealUserPortal user={currentUser} currentUser={currentUser} onLogout={handleLogout} />
      </>
    )
  }

  // 4. Attacker / Trapped -> Deception Dashboard (fake environment)
  return (
    <>
      <ToastContainer />
      <DeceptionDashboard currentUser={currentUser} onLogout={handleLogout} onAttackerAction={handleAttackerAction} />
    </>
  )
}
