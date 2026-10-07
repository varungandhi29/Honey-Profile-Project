/**
 * HoneyShield Forensic Hardware & Browser Fingerprinting Engine
 * 
 * Generates:
 * 1. generateFingerprint(): Browser session fingerprint (canvas, webgl, userAgent)
 * 2. generateHardwareFingerprint(): Universal hardware fingerprint (GPU, CPU, screen, platform, timezone)
 *    Strictly identical across Chrome, Edge, Brave, Opera, and Incognito on the same physical machine.
 */

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
  return fpHash
}

/**
 * Universal Hardware Fingerprint
 * Invariant across all browsers, software, tools, and incognito sessions on this physical device.
 */
export const generateHardwareFingerprint = async () => {
  const hwWebGL = getHardwareWebGL()
  const hwComponents = {
    screen: typeof screen !== 'undefined' ? `${screen.width}x${screen.height}x${screen.colorDepth}` : '0x0',
    cores: typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 4) : 4,
    memory: typeof navigator !== 'undefined' ? (navigator.deviceMemory || 8) : 8,
    platform: typeof navigator !== 'undefined' ? navigator.platform : 'Win32',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    tzOffset: new Date().getTimezoneOffset(),
    webgl: hwWebGL,
    touchPoints: typeof navigator !== 'undefined' ? (navigator.maxTouchPoints || 0) : 0
  }
  const str = JSON.stringify(hwComponents)
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  const hwHash = 'hw_' + Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
  return hwHash
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
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) return 'no-webgl'
    const renderer = gl.getParameter(gl.RENDERER)
    const vendor = gl.getParameter(gl.VENDOR)
    return `${vendor}~${renderer}`
  } catch { return 'error' }
}

const getHardwareWebGL = () => {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) return 'no-webgl'
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    const unmaskedRenderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)
    const unmaskedVendor = ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR)
    return `${unmaskedVendor}~${unmaskedRenderer}`
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
