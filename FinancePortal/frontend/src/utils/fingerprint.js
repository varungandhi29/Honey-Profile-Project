// Browser Fingerprinting utility
export const generateFingerprint = async () => {
  try {
    const nav = window.navigator
    const screen = window.screen

    const components = [
      nav.userAgent || '',
      nav.language || '',
      nav.languages ? nav.languages.join(',') : '',
      screen.colorDepth || '',
      screen.width + 'x' + screen.height,
      screen.availWidth + 'x' + screen.availHeight,
      new Date().getTimezoneOffset(),
      sessionStorage ? 'true' : 'false',
      localStorage ? 'true' : 'false',
      nav.hardwareConcurrency || '',
      nav.deviceMemory || '',
      nav.platform || ''
    ]

    const str = components.join('###')
    const hash = await hashString(str)
    return hash
  } catch {
    return 'fp_' + Math.random().toString(36).substr(2, 9)
  }
}

const hashString = async (str) => {
  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(str)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  } catch {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash |= 0
    }
    return 'fp_' + Math.abs(hash).toString(16)
  }
}
