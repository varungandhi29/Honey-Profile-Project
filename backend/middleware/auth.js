import { cache } from '../services/cacheService.js'
import logger from './logger.js'

/**
 * Check whether a request carries a valid admin session Bearer token.
 * Single hardened authentication path — no bypass headers or static secrets.
 */
export const isAdminAuthenticated = async (req) => {
  try {
    const authHeader = req.headers['authorization'] || ''
    
    // Check Bearer token
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim()
      if (token) {
        const session = await cache.get(`admin:session:${token}`)
        if (session && session.username) {
          return session
        }
      }
    }
  } catch (err) {
    logger.warn(`[AUTH CHECK ERROR] ${err.message}`)
  }
  return null
}

/**
 * Middleware requiring admin authorization.
 * Attaches req.admin = { username, ip, sessionId } or rejects with 401.
 */
export const requireAdmin = async (req, res, next) => {
  const admin = await isAdminAuthenticated(req)
  if (!admin) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Admin authentication required to perform this action'
    })
  }
  req.admin = admin
  next()
}
