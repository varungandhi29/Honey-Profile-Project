import geoip from 'geoip-lite'
import { UAParser } from 'ua-parser-js'

export const detectLocation = (req) => {
  const rawIP =
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.socket.remoteAddress || '0.0.0.0'
  const ip = (rawIP === '::1' || rawIP === '127.0.0.1' || rawIP.startsWith('::ffff:127'))
    ? '8.8.8.8'
    : rawIP.replace('::ffff:', '')
  const geo = geoip.lookup(ip) || {}
  const parser = new UAParser(req.headers['user-agent'])
  const browser = parser.getBrowser()
  const os = parser.getOS()
  const device = parser.getDevice()
  return {
    ip,
    country: geo.country || 'Unknown',
    city: geo.city || 'Unknown',
    region: geo.region || 'Unknown',
    lat: geo.ll?.[0] || 0,
    lng: geo.ll?.[1] || 0,
    timezone: geo.timezone || 'Unknown',
    isp: geo.org || 'Unknown',
    browser: `${browser.name || 'Unknown'} ${browser.version || ''}`.trim(),
    os: `${os.name || 'Unknown'} ${os.version || ''}`.trim(),
    device: device.type || 'Desktop',
    userAgent: req.headers['user-agent'] || 'Unknown',
    detectedAt: new Date().toISOString()
  }
}

export const getCountryRisk = (country) => {
  const HIGH = ['CN','RU','KP','IR','SY','CU']
  const MEDIUM = ['BR','NG','UA','RO','TR','PK']
  if (HIGH.includes(country)) return { score: 20, label: 'HIGH RISK' }
  if (MEDIUM.includes(country)) return { score: 8, label: 'MEDIUM RISK' }
  return { score: 0, label: 'LOW RISK' }
}
