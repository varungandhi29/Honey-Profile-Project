export const generateFingerprint = async () => {
  const components = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    colorDepth: screen.colorDepth,
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack,
    plugins: Array.from(navigator.plugins || []).map(p => p.name).join(','),
    canvas: getCanvasFingerprint(),
    webgl: getWebGLFingerprint(),
    fonts: await getInstalledFonts(),
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: navigator.deviceMemory,
    touchPoints: navigator.maxTouchPoints,
  }
  const str = JSON.stringify(components)
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  const fpHash = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
  console.log(`[Fingerprint] Generated: ${fpHash}`)
  return fpHash
}

const getCanvasFingerprint = () => {
  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return 'no-canvas'
    ctx.textBaseline = 'top'
    ctx.font = '14px Arial'
    ctx.fillStyle = '#f60'
    ctx.fillRect(125, 1, 62, 20)
    ctx.fillStyle = '#069'
    ctx.fillText('HoneyShield fingerprint', 2, 15)
    ctx.fillStyle = 'rgba(102,204,0,0.7)'
    ctx.fillText('HoneyShield fingerprint', 4, 17)
    return canvas.toDataURL()
  } catch { return 'error' }
}

const getWebGLFingerprint = () => {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl')
    if (!gl) return 'no-webgl'
    const renderer = gl.getParameter(gl.RENDERER)
    const vendor = gl.getParameter(gl.VENDOR)
    return `${vendor}~${renderer}`
  } catch { return 'error' }
}

const getInstalledFonts = async () => {
  try {
    const fonts = ['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana', 'Helvetica', 'Comic Sans MS', 'Impact', 'Tahoma', 'Trebuchet MS']
    if (!document.fonts) return []
    const detected = []
    for (const font of fonts) {
      const loaded = await document.fonts.load(`12px "${font}"`)
      if (loaded.length > 0) detected.push(font)
    }
    return detected
  } catch { return [] }
}
