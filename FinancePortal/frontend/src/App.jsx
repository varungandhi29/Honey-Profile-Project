import React, { useState, useEffect } from 'react'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import { getRealLocation } from './utils/location'
import { generateFingerprint } from './utils/fingerprint'

const BACKEND = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_FINANCE_BACKEND_URL || 'http://localhost:4000'

export default function App() {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('fp_token'))
  const [loginError, setLoginError] = useState('')
  const [redirecting, setRedirecting] = useState(false)

  // Check existing token on load
  useEffect(() => {
    if (token) {
      fetch(`${BACKEND}/api/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(d => {
          if (d.error) {
            setToken(null)
            localStorage.removeItem('fp_token')
          }
        })
        .catch(() => {})
    }
  }, [token])

  const handleLogin = async ({ username, password }) => {
    setLoginError('')
    try {
      const location = await getRealLocation()
      const fingerprint = await generateFingerprint()

      const res = await fetch(`${BACKEND}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          fingerprint,
          ip: location.ip,
          lat: location.lat,
          lng: location.lng,
          country: location.country,
          city: location.city
        })
      })

      const data = await res.json()

      if (data.blocked) {
        setLoginError('Access denied. Your IP has been blocked by system administration.')
        return
      }

      // SILENT REDIRECT TO HONEYPOT
      if (data.redirect) {
        setRedirecting(true)
        console.log('[REDIRECT] Silently redirecting to honeypot...')
        // Small delay to simulate verification and avoid suspicion
        await new Promise(r => setTimeout(r, 600 + Math.random() * 800))
        // Redirect to HoneyShield with username pre-filled
        const honeypotUrl = data.honeypotUrl || import.meta.env.VITE_HONEYPOT_URL || 'https://honeyprofile.vercel.app'
        window.location.href = `${honeypotUrl}?user=${encodeURIComponent(username)}&ref=portal`
        return
      }

      if (res.status === 401) {
        const remaining = 3 - (data.attemptCount || 0)
        const warning = data.warning ? ` (${data.warning})` : ''
        setLoginError(
          `Invalid credentials.${remaining > 0 ? ` ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` : ' Security threshold exceeded.'}${warning}`
        )
        return
      }

      if (data.success) {
        localStorage.setItem('fp_token', data.token)
        setToken(data.token)
        setUser(data.user)
      } else {
        setLoginError(data.error || 'Authentication failed')
      }
    } catch (err) {
      console.error('[FINANCE LOGIN ERROR]', err)
      setLoginError('Connection error. Please try again.')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('fp_token')
    setToken(null)
    setUser(null)
  }

  if (redirecting) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0F172A',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid #334155',
          borderTopColor: '#3B82F6',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          marginBottom: '16px'
        }} />
        <div style={{ color: '#94A3B8', fontSize: '14px', fontWeight: 500 }}>Authenticating... please wait</div>
        <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!user && !token) {
    return <LoginPage onLogin={handleLogin} error={loginError} />
  }

  return <Dashboard token={token} user={user} onLogout={handleLogout} />
}
