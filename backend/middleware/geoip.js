import geoip from 'geoip-lite'
import { UAParser } from 'ua-parser-js'

export const COUNTRY_NAMES = {
  'US': 'United States',
  'IN': 'India',
  'GB': 'United Kingdom',
  'DE': 'Germany',
  'FR': 'France',
  'CA': 'Canada',
  'AU': 'Australia',
  'JP': 'Japan',
  'CN': 'China',
  'RU': 'Russia',
  'NL': 'Netherlands',
  'BR': 'Brazil',
  'SG': 'Singapore',
  'KR': 'South Korea',
  'IT': 'Italy',
  'ES': 'Spain',
  'SE': 'Sweden',
  'CH': 'Switzerland',
  'IL': 'Israel',
  'UA': 'Ukraine',
  'RO': 'Romania',
  'PK': 'Pakistan',
  'IR': 'Iran',
  'KP': 'North Korea',
  'SY': 'Syria',
  'CU': 'Cuba',
  'NG': 'Nigeria',
  'ZA': 'South Africa',
  'MX': 'Mexico',
  'AR': 'Argentina'
}

let HOST_PUBLIC_IP = '49.36.77.174'
let HOST_PUBLIC_GEO = {
  ip: '49.36.77.174',
  country: 'India',
  countryCode: 'IN',
  city: 'Vadodara',
  region: 'Gujarat',
  lat: 22.3072,
  lng: 73.1812,
  timezone: 'Asia/Kolkata',
  isp: 'Reliance Jio Infocomm Limited'
}

export const detectHostPublicIP = async () => {
  const apis = [
    'https://api.ipify.org?format=json',
    'https://ipwho.is/',
    'https://api64.ipify.org?format=json'
  ]
  for (const url of apis) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) })
      const data = await res.json()
      if (data && data.ip && data.ip !== '127.0.0.1' && !data.ip.startsWith('127.')) {
        HOST_PUBLIC_IP = data.ip
        const geo = geoip.lookup(data.ip)
        HOST_PUBLIC_GEO = {
          ip: data.ip,
          country: COUNTRY_NAMES[geo?.country] || data.country || 'India',
          countryCode: geo?.country || data.country_code || 'IN',
          city: (geo?.city?.toLowerCase() === 'anand' || !geo?.city) ? 'Vadodara' : geo.city,
          region: geo?.region || data.region || 'Gujarat',
          lat: geo?.ll?.[0] || data.latitude || 22.3072,
          lng: geo?.ll?.[1] || data.longitude || 73.1812,
          timezone: geo?.timezone || 'Asia/Kolkata',
          isp: geo?.org || data.connection?.isp || 'Reliance Jio Infocomm Limited'
        }
        return HOST_PUBLIC_IP
      }
    } catch {}
  }
  return HOST_PUBLIC_IP
}

export const getHostPublicIP = () => HOST_PUBLIC_IP
export const getHostPublicGeo = () => ({ ...HOST_PUBLIC_GEO })

detectHostPublicIP().catch(() => {})

export const resolveIPLocation = (rawIP) => {
  if (!rawIP || rawIP === 'Unknown') {
    return { ...HOST_PUBLIC_GEO }
  }

  const cleanIP = rawIP.replace('::ffff:', '').trim()
  const isLocal = cleanIP === '::1' || cleanIP === '127.0.0.1' || cleanIP.startsWith('127.') || cleanIP === 'localhost' || cleanIP === '0.0.0.0'

  if (isLocal) {
    return { ...HOST_PUBLIC_GEO }
  }

  const geo = geoip.lookup(cleanIP)
  if (!geo) {
    return {
      ip: cleanIP,
      country: 'Unknown',
      countryCode: 'Unknown',
      city: 'Unknown',
      region: 'Unknown',
      lat: 0,
      lng: 0,
      timezone: 'UTC',
      isp: 'Unknown'
    }
  }

  let city = geo.city || 'Unknown'
  const country = COUNTRY_NAMES[geo.country] || geo.country || 'Unknown'
  const region = geo.region || 'Unknown'

  // Only normalize Anand to Vadodara for Gujarat, India ISP gateway misclassifications
  if (city.toLowerCase() === 'anand' && (geo.country === 'IN' || country === 'India') && (region === 'GJ' || region.toLowerCase().includes('gujarat'))) {
    city = 'Vadodara'
  }

  const lat = (city === 'Vadodara' && (country === 'India' || geo.country === 'IN')) ? 22.3072 : (geo.ll?.[0] || 0)
  const lng = (city === 'Vadodara' && (country === 'India' || geo.country === 'IN')) ? 73.1812 : (geo.ll?.[1] || 0)

  return {
    ip: cleanIP,
    country,
    countryCode: geo.country,
    city,
    region,
    lat,
    lng,
    timezone: geo.timezone || 'UTC',
    isp: geo.org || 'Unknown'
  }
}

export const detectLocation = (req) => {
  const forwarded = req.headers['x-forwarded-for']
  const rawIP = (forwarded ? forwarded.split(',')[0].trim() : null) ||
                req.headers['x-real-ip'] ||
                req.ip ||
                req.socket?.remoteAddress ||
                HOST_PUBLIC_IP

  const loc = resolveIPLocation(rawIP)
  const parser = new UAParser(req.headers['user-agent'])
  const browser = parser.getBrowser()
  const os = parser.getOS()
  const device = parser.getDevice()

  return {
    ...loc,
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
