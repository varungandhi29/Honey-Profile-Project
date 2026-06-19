import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
export const useSocket = ({ onAttack, onAlert, onSessionUpdate, onHoney, onAutoResponse, onSessionRemoved, onSessionBlocked, onBlockedAttempt, onIPBlocked, onIPUnblocked }) => {
  const socketRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const [latency, setLatency] = useState(null)
  useEffect(() => {
    const socket = io(BACKEND, { transports: ['websocket'], reconnection: true, reconnectionAttempts: 20, reconnectionDelay: 2000, timeout: 5000 })
    socketRef.current = socket
    socket.on('connect', () => { setConnected(true); socket.emit('join_admin'); console.log('[Socket] Connected:', socket.id) })
    socket.on('disconnect', () => { setConnected(false) })
    socket.on('new_attack',       data => { console.log('[Socket] new_attack:', data.attack?.type); onAttack?.(data) })
    socket.on('new_alert',        data => { console.log('[Socket] new_alert:', data.title); onAlert?.(data) })
    socket.on('session_updated',  data => onSessionUpdate?.(data))
    socket.on('session_registered', data => onSessionUpdate?.(data))
    socket.on('honey_interaction', data => onHoney?.(data))
    socket.on('auto_response',    data => onAutoResponse?.(data))
    socket.on('session_removed',  data => onSessionRemoved?.(data))
    socket.on('session_blocked',  data => onSessionBlocked?.(data))
    socket.on('blocked_attempt',  data => onBlockedAttempt?.(data))
    socket.on('ip_blocked',       data => onIPBlocked?.(data))
    socket.on('ip_unblocked',     data => onIPUnblocked?.(data))
    const pingInterval = setInterval(() => {
      const t = Date.now(); socket.emit('ping_server')
      socket.once('pong_server', () => setLatency(Date.now() - t))
    }, 15000)
    return () => { clearInterval(pingInterval); socket.disconnect() }
  }, [])
  return { connected, latency, socket: socketRef.current }
}
