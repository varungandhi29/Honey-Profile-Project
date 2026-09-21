/**
 * Dynamic Backend URL Resolver
 * Ensures localhost always connects to local backend port 3001,
 * and hosted deployments use their configured domain or window.location.origin.
 */
export const getBackendUrl = () => {
  if (typeof window !== 'undefined') {
    const { hostname, port, origin } = window.location
    // If accessing locally on localhost or 127.0.0.1
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `http://${hostname}:3001`
    }
    // If running in production container or same-origin host
    if (port === '3001') {
      return origin
    }
  }
  return import.meta.env.VITE_BACKEND_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001')
}

export const BACKEND = getBackendUrl()
