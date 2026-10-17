/**
 * Dynamic Backend URL Resolver
 * Ensures localhost always connects to local backend port 3001,
 * and hosted deployments use their configured domain or Railway backend.
 */
const PROD_BACKEND = 'https://honey-profile-project-production.up.railway.app'

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

    // 3. If running on Vercel or cloud deployment, route API calls to Railway backend
    if (hostname.includes('vercel.app') || hostname.includes('honeyprofile')) {
      return PROD_BACKEND
    }

    // 4. If backend is serving frontend directly on port 3001
    if (port === '3001') {
      return origin
    }

    // 5. Localhost or LAN IP (e.g. 10.x, 192.168.x) accessing via Vite dev server
    // The backend is running on port 3001 of that same host machine
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
      return `${protocol}//${hostname}:3001`
    }

    return PROD_BACKEND
  }
  return import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
}

export const BACKEND = getBackendUrl()
