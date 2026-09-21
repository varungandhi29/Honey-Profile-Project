import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { generateFingerprint } from '../utils/fingerprint'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

export const useSocket = ({
  onAttack,
  onAlert,
  onSessionUpdate,
  onHoney,
  onAutoResponse,
  onSessionRemoved,
  onSessionBlocked,
  onBlockedAttempt,
  onIPBlocked,
  onIPUnblocked,
  onClientUnblocked,
  onFingerprintBlocked,
  onVPNDetected,
  onHoneyTrap,
  onSuspiciousLogin,
  onAttackerAutoBlocked,
  onEmployeesRegenerated,
  onBridgeEvent,
  onAttackerRedirected
}) => {
  const socketRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const [latency, setLatency] = useState(null)

  const handlersRef = useRef({
    onAttack,
    onAlert,
    onSessionUpdate,
    onHoney,
    onAutoResponse,
    onSessionRemoved,
    onSessionBlocked,
    onBlockedAttempt,
    onIPBlocked,
    onIPUnblocked,
    onClientUnblocked,
    onFingerprintBlocked,
    onVPNDetected,
    onHoneyTrap,
    onSuspiciousLogin,
    onAttackerAutoBlocked,
    onEmployeesRegenerated,
    onBridgeEvent,
    onAttackerRedirected
  })

  useEffect(() => {
    handlersRef.current = {
      onAttack,
      onAlert,
      onSessionUpdate,
      onHoney,
      onAutoResponse,
      onSessionRemoved,
      onSessionBlocked,
      onBlockedAttempt,
      onIPBlocked,
      onIPUnblocked,
      onClientUnblocked,
      onFingerprintBlocked,
      onVPNDetected,
      onHoneyTrap,
      onSuspiciousLogin,
      onAttackerAutoBlocked,
      onEmployeesRegenerated,
      onBridgeEvent,
      onAttackerRedirected
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
    })
    socket.on('session_registered', data => handlersRef.current.onSessionUpdate?.(data))
    socket.on('honey_interaction', data => handlersRef.current.onHoney?.(data))
    socket.on('auto_response', data => handlersRef.current.onAutoResponse?.(data))
    socket.on('session_removed', data => handlersRef.current.onSessionRemoved?.(data))
    socket.on('session_blocked', data => handlersRef.current.onSessionBlocked?.(data))
    socket.on('blocked_attempt', data => handlersRef.current.onBlockedAttempt?.(data))
    socket.on('ip_blocked', data => handlersRef.current.onIPBlocked?.(data))
    socket.on('ip_unblocked', data => handlersRef.current.onIPUnblocked?.(data))
    socket.on('client_unblocked', data => handlersRef.current.onClientUnblocked?.(data))
    socket.on('fingerprint_blocked', data => handlersRef.current.onFingerprintBlocked?.(data))
    socket.on('vpn_detected', data => {
      console.log('[Socket] vpn_detected:', data)
      handlersRef.current.onVPNDetected?.(data)
    })

    // Honey trap triggered — attacker found a decoy account
    socket.on('honey_trap_triggered', data => {
      console.log('[Socket] HONEY TRAP TRIGGERED:', data)
      handlersRef.current.onHoneyTrap?.(data)
    })

    // Suspicious login detected
    socket.on('suspicious_login', data => {
      console.log('[Socket] Suspicious login:', data)
      handlersRef.current.onSuspiciousLogin?.(data)
    })

    // Attacker auto-blocked
    socket.on('attacker_auto_blocked', data => {
      console.log('[Socket] Attacker auto-blocked:', data)
      handlersRef.current.onAttackerAutoBlocked?.(data)
    })

    // Decoy employees regenerated
    socket.on('employees_regenerated', data => {
      console.log('[Socket] Employees regenerated:', data)
      handlersRef.current.onEmployeesRegenerated?.(data)
    })

    // Bridge events from Finance Portal
    socket.on('bridge_event', data => {
      console.log('[Socket] bridge_event:', data)
      window.dispatchEvent(new CustomEvent('bridge_event', { detail: data }))
      handlersRef.current.onBridgeEvent?.(data)
    })

    socket.on('attacker_redirected_to_honeypot', data => {
      console.log('[Socket] Attacker redirected from Finance Portal:', data)
      window.dispatchEvent(new CustomEvent('attacker_redirected_to_honeypot', { detail: data }))
      handlersRef.current.onAttackerRedirected?.(data)
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
