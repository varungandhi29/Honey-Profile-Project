import React, { useState } from 'react'

const LoginPage = ({ onLogin, loginError }) => {
  const [username, setUsername] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      return params.get('user') || ''
    } catch {
      return ''
    }
  })
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!username || !password || loading) return
    setLoading(true)
    try {
      await onLogin({ username, password })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Fake corporate background */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.1) 0%, transparent 70%)' }} />
      <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '16px', padding: '48px 40px', width: '380px', position: 'relative', zIndex: 10, boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '56px', height: '56px', background: 'linear-gradient(135deg,#3B82F6,#1D4ED8)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', margin: '0 auto 16px' }}>🏢</div>
          <h1 style={{ color: '#F1F5F9', fontSize: '22px', fontWeight: 700, margin: 0 }}>AcmeCorp Portal</h1>
          <p style={{ color: '#64748B', fontSize: '13px', margin: '6px 0 0' }}>Enterprise Employee Access System</p>
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ color: '#94A3B8', fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '6px' }}>Username or Email</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter your username"
              style={{ width: '100%', padding: '11px 14px', background: '#0F172A', border: '1px solid #334155', borderRadius: '8px', color: '#F1F5F9', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter' }}
              onFocus={e => e.target.style.borderColor = '#3B82F6'}
              onBlur={e => e.target.style.borderColor = '#334155'}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          <div>
            <label style={{ color: '#94A3B8', fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '6px' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={{ width: '100%', padding: '11px 14px', background: '#0F172A', border: '1px solid #334155', borderRadius: '8px', color: '#F1F5F9', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter' }}
              onFocus={e => e.target.style.borderColor = '#3B82F6'}
              onBlur={e => e.target.style.borderColor = '#334155'}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          {loginError && (
            <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', color: '#EF4444', fontSize: '12px' }}>
              ⚠️ {loginError}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !username || !password}
            style={{
              padding: '12px',
              background: loading ? '#1E293B' : 'linear-gradient(135deg,#3B82F6,#1D4ED8)',
              color: loading ? '#475569' : 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading || !username || !password ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 200ms'
            }}
          >
            {loading ? (
              <><div style={{ width: '16px', height: '16px', border: '2px solid #475569', borderTopColor: '#94A3B8', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> Authenticating...</>
            ) : 'Sign In →'}
          </button>
        </div>

        {/* Fake footer links — all traps */}
        <div style={{ marginTop: '24px', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '16px' }}>
          {['Forgot Password?', 'IT Support', 'Privacy Policy'].map(link => (
            <span
              key={link}
              onClick={() => onLogin({ username: link.toLowerCase().replace(/\s/g, ''), password: 'forgot' })}
              style={{ color: '#64748B', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
            >
              {link}
            </span>
          ))}
        </div>

        <p style={{ color: '#334155', fontSize: '10px', textAlign: 'center', marginTop: '20px', lineHeight: '1.5' }}>
          © 2024 AcmeCorp. Unauthorized access is prohibited and monitored. All activities are logged.
        </p>
      </div>
      <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
    </div>
  )
}

export default LoginPage
