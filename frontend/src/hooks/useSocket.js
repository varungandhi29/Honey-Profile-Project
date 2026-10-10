import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { generateFingerprint } from '../utils/fingerprint'
import { BACKEND } from '../utils/backendUrl'
import { alertEngine } from '../audio/alertEngine'

export const useSocket = (props = {}, legacyAddToast, legacyOnBlocked) => {
  const isPositional = props && (props.current !== undefined || typeof legacyAddToast === 'function' || typeof legacyOnBlocked === 'function')
  const options = isPositional ? {} : props

  const socketRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const [latency, setLatency] = useState(null)

  const handlersRef = useRef({
    ...options,
    addToast: options.addToast || legacyAddToast,
    onBlocked: options.onBlocked || legacyOnBlocked
  })

  useEffect(() => {
    handlersRef.current = {
      ...options,
      addToast: options.addToast || legacyAddToast,
      onBlocked: options.onBlocked || legacyOnBlocked
    }
  })

  useEffect(() => {
    const socket = io(BACKEND, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 2000,
      timeout: 5000
    })
    socketRef.current = socket

    socket.on('connect', async () => {
      setConnected(true)
      socket.emit('join_admin')
      console.log('[Socket] Connected:', socket.id)

      // Register device fingerprint room on connect
      try {
        const fp = await generateFingerprint()
        if (fp) {
          socket.emit('register_device', { fingerprint: fp })
        }
      } catch (e) {
        console.warn('[Socket] Could not register fingerprint room:', e.message)
      }
    })

    socket.on('disconnect', () => {
      setConnected(false)
    })

    socket.on('new_attack', data => {
      console.log('[Socket] new_attack:', data.attack?.type)
      handlersRef.current.onAttack?.(data)
    })
    socket.on('new_alert', data => {
      console.log('[Socket] new_alert:', data.title)
      handlersRef.current.onAlert?.(data)
    })
    socket.on('session_updated', data => {
      console.log('[Socket] session_updated:', data.username, 'riskScore:', data.riskScore)
      handlersRef.current.onSessionUpdate?.(data)
      if (data.state === 'ATTACKER' && data.riskScore > 0 && !alertEngine.isAlertActive()) {
        alertEngine.startContinuousAlert('HIGH', 10000)
        const toast = handlersRef.current.addToast
        if (typeof toast === 'function') toast('🚨 ATTACKER IN SYSTEM — Alert active', 'critical')
      }
    })
    socket.on('session_registered', data => handlersRef.current.onSessionUpdate?.(data))
    socket.on('honey_interaction', data => handlersRef.current.onHoney?.(data))
    socket.on('auto_response', data => handlersRef.current.onAutoResponse?.(data))
    socket.on('session_removed', data => handlersRef.current.onSessionRemoved?.(data))

    socket.on('session_blocked', data => {
      console.log('[Socket] session_blocked received:', data)
      const isAdmin = !!sessionStorage.getItem('honeyshield_admin_token') || handlersRef.current.currentUserRef?.current?.isAdmin
      const currentSessionId = handlersRef.current.sessionIdRef?.current
      const currentIP = handlersRef.current.locationRef?.current?.ip
      if (!isAdmin && ((data.sessionId && data.sessionId === currentSessionId) || (currentIP && data.ip === currentIP) || (!currentSessionId && data.ip === currentIP))) {
        console.log('[Socket] THIS SESSION IS BLOCKED — showing blocked screen')
        alertEngine.stopContinuousAlert()
        alertEngine.playBlocked()
        const onBlocked = handlersRef.current.onBlocked
        if (typeof onBlocked === 'function') onBlocked(data.reason || 'IP_BLOCKED')
      }
      handlersRef.current.onSessionBlocked?.(data)
    })

    socket.on('blocked_attempt', data => handlersRef.current.onBlockedAttempt?.(data))

    socket.on('ip_blocked', data => {
      console.log('[Socket] ip_blocked received:', data)
      const isAdmin = !!sessionStorage.getItem('honeyshield_admin_token') || handlersRef.current.currentUserRef?.current?.isAdmin
      const currentIP = handlersRef.current.locationRef?.current?.ip
      if (!isAdmin && currentIP && data.ip === currentIP) {
        alertEngine.stopContinuousAlert()
        alertEngine.playBlocked()
        const onBlocked = handlersRef.current.onBlocked
        if (typeof onBlocked === 'function') onBlocked(data.reason || 'IP_BLOCKED')
      }
      handlersRef.current.onIPBlocked?.(data)
      const toast = handlersRef.current.addToast
      if (typeof toast === 'function') toast(`🚫 ${data.ip} permanently blocked`, 'warning')
    })

    socket.on('ip_unblocked', data => {
      console.log('[Socket] ip_unblocked received:', data)
      handlersRef.current.onIPUnblocked?.(data)
      const toast = handlersRef.current.addToast
      if (typeof toast === 'function') toast(`✅ ${data.ip} unblocked — ${data.reason || 'Admin unblocked'}`, 'success')
    })

    socket.on('client_unblocked', data => handlersRef.current.onClientUnblocked?.(data))
    socket.on('fingerprint_blocked', data => {
      alertEngine.stopContinuousAlert()
      alertEngine.playBlocked()
      handlersRef.current.onFingerprintBlocked?.(data)
    })
    socket.on('fingerprint_unblocked', data => handlersRef.current.onFingerprintUnblocked?.(data))

    socket.on('vpn_detected', data => {
      console.log('[Socket] vpn_detected:', data)
      alertEngine.playVPNDetected()
      const toast = handlersRef.current.addToast
      if (typeof toast === 'function') toast(data.message || `🚨 VPN AUTO-BLOCKED: ${data.ip} detected as ${data.label}`, 'critical')
      handlersRef.current.onVPNDetected?.(data)
    })

    // Failed login attempt escalation
    socket.on('failed_login_attempt', data => {
      console.log('[Socket] failed_login_attempt:', data)
      const toast = handlersRef.current.addToast
      if (data.level === 'FLAGGED') {
        alertEngine.playMedium()
        if (typeof toast === 'function') toast(`⚠️ [FLAGGED] Failed login attempt for ${data.username} from ${data.ip}`, 'warning')
      } else if (data.level === 'SUSPICIOUS') {
        alertEngine.playHigh()
        if (typeof toast === 'function') toast(`⚠️ [SUSPICIOUS] Multiple failed attempts for ${data.username} from ${data.ip}`, 'warning')
      } else if (data.level === 'HIGH_RISK') {
        alertEngine.startContinuousAlert('HIGH', 8000)
        if (typeof toast === 'function') toast(`🚨 [HIGH RISK] Brute force detected on ${data.username} from ${data.ip}`, 'critical')
      } else if (data.level === 'TRAP') {
        alertEngine.playPoliceSiren(5)
        if (typeof toast === 'function') toast(`🍯 [TRAP] Honeypot route triggered for ${data.username} from ${data.ip}`, 'critical')
      }
      handlersRef.current.onFailedLoginAttempt?.(data)
    })

    // Honey trap triggered — attacker found a decoy account or threshold reached
    socket.on('honey_trap_triggered', data => {
      console.log('[Socket] HONEY TRAP TRIGGERED:', data)
      alertEngine.playPoliceSiren(5)
      const toast = handlersRef.current.addToast
      if (typeof toast === 'function') toast(data.message || `🍯 HONEY TRAP: Attacker ${data.username || ''} from ${data.ip} trapped`, 'critical')
      handlersRef.current.onHoneyTrap?.(data)
    })

    // Trap reconnect — attacker already flagged reconnected
    socket.on('trap_reconnect', data => {
      console.log('[Socket] trap_reconnect:', data)
      const toast = handlersRef.current.addToast
      alertEngine.playHoneyTrap()
      if (typeof toast === 'function') toast(data.message || `🍯 Trapped IP ${data.ip} reconnected (${data.username})`, 'warning')
      handlersRef.current.onTrapReconnect?.(data)
    })

    // Suspicious login detected
    socket.on('suspicious_login', data => {
      console.log('[Socket] Suspicious login:', data)
      handlersRef.current.onSuspiciousLogin?.(data)
    })

    // Attacker auto-blocked
    socket.on('attacker_auto_blocked', data => {
      console.log('[Socket] Attacker auto-blocked:', data)
      if (data.playSiren) alertEngine.playCritical()
      alertEngine.stopContinuousAlert()
      handlersRef.current.onAttackerAutoBlocked?.(data)
    })

    // Decoy employees regenerated
    socket.on('employees_regenerated', data => {
      console.log('[Socket] Employees regenerated:', data)
      handlersRef.current.onEmployeesRegenerated?.(data)
    })

    const pingInterval = setInterval(() => {
      const t = Date.now()
      socket.emit('ping_server')
      socket.once('pong_server', () => setLatency(Date.now() - t))
    }, 15000)

    return () => {
      clearInterval(pingInterval)
      socket.disconnect()
    }
  }, [])

  return { connected, latency, socket: socketRef.current }
}
