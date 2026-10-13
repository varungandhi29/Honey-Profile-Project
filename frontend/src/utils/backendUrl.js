/**
 * Dynamic Backend URL Resolver
 * Ensures localhost always connects to local backend port 3001,
 * and hosted deployments use their configured domain or window.location.origin.
 */
export const getBackendUrl = () => {
  if (typeof window !== 'undefined') {
    const { hostname, port, origin, protocol } = window.location

    // 1. Explicit production env URL if configured and not pointing to localhost
    const envUrl = import.meta.env.VITE_BACKEND_URL
    if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
      return envUrl
    }

    // 2. Custom override via query param ?backend=https://... or localStorage
    try {
      const paramBackend = new URLSearchParams(window.location.search).get('backend')
      if (paramBackend) {
        localStorage.setItem('honeyshield_custom_backend', paramBackend)
        return paramBackend
      }
      const savedBackend = localStorage.getItem('honeyshield_custom_backend')
      if (savedBackend) return savedBackend
    } catch {}

    // 3. Same-origin (e.g. backend serving frontend on port 3001, or reverse proxy / production domain)
    if (port === '3001' || (!port && (protocol === 'https:' || protocol === 'http:'))) {
      return origin
    }

    // 4. Localhost or LAN IP (e.g. 10.226.12.242, 192.168.x.x) accessing via Vite dev server
    // The backend is running on port 3001 of that same host machine
    return `${protocol}//${hostname}:3001`
  }
  return import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
}

export const BACKEND = getBackendUrl()
