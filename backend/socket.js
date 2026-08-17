import { Server } from 'socket.io'
import logger from './middleware/logger.js'
import { cache } from './services/cacheService.js'
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
    logger.info(`[SOCKET] Connected: ${socket.id} from ${socket.handshake.address}`)
    socket.on('join_admin', () => {
      socket.join('admin_room')
      socket.emit('joined', { room: 'admin_room', socketId: socket.id })
      logger.info(`[SOCKET] Admin joined: ${socket.id}`)
    })
    socket.on('ping_server', () => socket.emit('pong_server', { timestamp: Date.now() }))
    socket.on('disconnect', (reason) => logger.info(`[SOCKET] Disconnected: ${socket.id} — ${reason}`))
  })
  setInterval(() => {
    io.emit('server_heartbeat', { timestamp: Date.now(), connections: io.engine.clientsCount })
  }, 30000)
  return io
}
