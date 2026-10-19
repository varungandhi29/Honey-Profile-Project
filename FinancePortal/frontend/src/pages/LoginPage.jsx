import React, { useState } from 'react'

// Professional finance company login — looks completely real
export default function LoginPage({ onLogin, error }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    if (!username || !password || loading) return
    setLoading(true)
    try {
      await onLogin({ username, password })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Company branding left side */}
      <div style={{
        flex: 1,
        padding: '60px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        maxWidth: '500px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: 'linear-gradient(135deg,#3B82F6,#1D4ED8)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px'
          }}>💼</div>
          <div>
            <div style={{ color: '#F1F5F9', fontSize: '22px', fontWeight: 800 }}>AcmeCorp Financial</div>
            <div style={{ color: '#64748B', fontSize: '12px' }}>Enterprise Finance Management System</div>
          </div>
        </div>

        <h1 style={{ color: '#F1F5F9', fontSize: '36px', fontWeight: 700, lineHeight: 1.2, marginBottom: '16px' }}>
          Secure Access to<br/>Financial Intelligence
        </h1>

        <p style={{ color: '#94A3B8', fontSize: '15px', lineHeight: 1.7, marginBottom: '32px' }}>
          Access your financial reports, client data, invoices, and corporate analytics through our secure employee portal.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { icon: '📊', text: 'Real-time financial dashboards' },
            { icon: '📁', text: 'Secure document management' },
            { icon: '👥', text: 'Client relationship data' },
            { icon: '🔒', text: 'Bank-grade encryption' },
          ].map(item => (
            <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#94A3B8', fontSize: '13px' }}>
              <span>{item.icon}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Login form right side */}
      <div style={{
        width: '420px',
        margin: '40px',
        background: 'rgba(30,41,59,0.8)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px',
        padding: '48px 40px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
      }}>
        <h2 style={{ color: '#F1F5F9', fontSize: '22px', fontWeight: 700, marginBottom: '6px' }}>Employee Sign In</h2>
        <p style={{ color: '#64748B', fontSize: '13px', marginBottom: '32px' }}>Enter your corporate credentials to continue</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ color: '#94A3B8', fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '6px' }}>Employee Username</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="e.g. j.smith"
              style={{
                width: '100%',
                padding: '12px 14px',
                background: 'rgba(15,23,42,0.8)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                color: '#F1F5F9',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              onFocus={e => e.target.style.borderColor = '#3B82F6'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ color: '#94A3B8', fontSize: '12px', fontWeight: 500 }}>Password</label>
              <span style={{ color: '#3B82F6', fontSize: '11px', cursor: 'pointer' }}>Forgot password?</span>
            </div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={{
                width: '100%',
                padding: '12px 14px',
                background: 'rgba(15,23,42,0.8)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                color: '#F1F5F9',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              onFocus={e => e.target.style.borderColor = '#3B82F6'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '8px',
              color: '#EF4444',
              fontSize: '12px',
              lineHeight: 1.4
            }}>
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            style={{
              padding: '13px',
              background: loading ? '#1E293B' : 'linear-gradient(135deg,#3B82F6,#1D4ED8)',
              color: loading ? '#475569' : 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading || !username || !password ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '4px'
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid #475569',
                  borderTopColor: '#94A3B8',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                Authenticating...
              </>
            ) : '🔐 Sign In to Portal'}
          </button>
        </form>

        <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
          <p style={{ color: '#475569', fontSize: '11px', lineHeight: 1.6, margin: 0 }}>
            🔒 This system is monitored 24/7. All access attempts are logged.<br/>
            Unauthorized access is strictly prohibited and will be prosecuted.
          </p>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  )
}
