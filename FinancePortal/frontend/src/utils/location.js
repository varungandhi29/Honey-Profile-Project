// Real location helper
export const getRealLocation = async () => {
  let locData = {
    ip: '127.0.0.1',
    country: 'United States',
    city: 'New York',
    region: 'NY',
    lat: 40.7128,
    lng: -74.0060,
    timezone: 'America/New_York',
    isp: 'Corporate Network',
    browser: 'Chrome / Edge',
    os: navigator.platform || 'Windows',
    device: 'Desktop'
  }

  try {
    const r = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) })
    const d = await r.json()
    if (d.ip) {
      locData = {
        ...locData,
        ip: d.ip,
        country: d.country_name || locData.country,
        city: d.city || locData.city,
        region: d.region || locData.region,
        lat: d.latitude || locData.lat,
        lng: d.longitude || locData.lng,
        timezone: d.timezone || locData.timezone,
        isp: d.org || locData.isp
      }
    }
  } catch {
    try {
      const r = await fetch('http://ip-api.com/json/', { signal: AbortSignal.timeout(3000) })
      const d = await r.json()
      if (d.query) {
        locData = {
          ...locData,
          ip: d.query,
          country: d.country || locData.country,
          city: d.city || locData.city,
          region: d.regionName || locData.region,
          lat: d.lat || locData.lat,
          lng: d.lon || locData.lng,
          timezone: d.timezone || locData.timezone,
          isp: d.isp || locData.isp
        }
      }
    } catch {}
  }

  return locData
}
