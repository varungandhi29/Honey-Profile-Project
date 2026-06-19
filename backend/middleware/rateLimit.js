import rateLimit from 'express-rate-limit'
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' }
})
export const attackLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { error: 'Attack log rate limit exceeded' }
})
