import { Server } from 'socket.io'
import logger from './middleware/logger.js'

const getSocketIP = (socket) => {
  const forwarded = socket.handshake.headers['x-forwarded-for']
  if (forwarded) {
    const ips = forwarded.split(',').map(s => s.trim()).filter(Boolean)
    if (ips.length > 0) return ips[ips.length - 1]
  }
  const realIP = socket.handshake.headers['x-real-ip']
  if (realIP) return realIP.trim()
  return socket.handshake.address || '127.0.0.1'
}

export const initSocket = (httpServer, frontendUrl) => {
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => callback(null, true),
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
  })

  io.on('connection', (socket) => {
    // Derive client IP server-side from handshake/headers — never trust client-supplied IP
    const clientIP = getSocketIP(socket)
    socket.join(`ip:${clientIP}`)
    logger.info(`[SOCKET] Connected: ${socket.id} from ${clientIP} (joined room: ip:${clientIP})`)

    socket.on('join_admin', () => {
      socket.join('admin_room')
      socket.emit('joined', { room: 'admin_room', socketId: socket.id })
      logger.info(`[SOCKET] Admin joined: ${socket.id}`)
    })

    // Register device fingerprint room only
    socket.on('register_device', ({ fingerprint }) => {
      if (fingerprint && typeof fingerprint === 'string' && fingerprint.length <= 128) {
        socket.join(`fp:${fingerprint}`)
        logger.info(`[SOCKET] Socket ${socket.id} registered device room fp:${fingerprint.substr(0, 8)}...`)
      }
    })

    socket.on('ping_server', () => socket.emit('pong_server', { timestamp: Date.now() }))
    socket.on('disconnect', (reason) => logger.info(`[SOCKET] Disconnected: ${socket.id} — ${reason}`))
  })

  setInterval(() => {
    io.emit('server_heartbeat', { timestamp: Date.now(), connections: io.engine.clientsCount })
  }, 30000)

  return io
}
