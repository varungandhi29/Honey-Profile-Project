import React, { useState, useEffect } from 'react'

// Shows activity from Finance Portal in real time
export default function BridgeMonitorPage({ data }) {
  const [bridgeStats, setBridgeStats] = useState({
    activeTracking: 0,
    totalAttempts: 0,
    redirected: 0,
    blocked: 0,
    details: []
  })
  const [bridgeEvents, setBridgeEvents] = useState([])
  const [backendStatus, setBackendStatus] = useState('Checking...')

  const BRIDGE_URL = import.meta.env.VITE_BRIDGE_URL || 'https://bridge-layer-production.up.railway.app'
  const fetchStats = () => {
    fetch(`${BRIDGE_URL}/api/bridge/stats`)
      .then(r => r.json())
      .then(d => {
        setBridgeStats(d)
        setBackendStatus('Connected')
      })
      .catch(() => {
        setBackendStatus('Connecting / In-Memory')
      })
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 4000)
    return () => clearInterval(interval)
  }, [])

  // Listen for bridge events via custom DOM event or socket dispatch
  useEffect(() => {
    const handler = (e) => {
      const event = e.detail || e
      setBridgeEvents(prev => [event, ...prev].slice(0, 50))
      fetchStats()
    }
    window.addEventListener('bridge_event', handler)
    window.addEventListener('attacker_redirected_to_honeypot', handler)
    return () => {
      window.removeEventListener('bridge_event', handler)
      window.removeEventListener('attacker_redirected_to_honeypot', handler)
    }
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ color: '#E6EDF3', margin: 0, fontSize: '20px', fontWeight: 700 }}>
            🔀 Bridge Monitor & Attack Intelligence
          </h2>
          <p style={{ color: '#8B949E', fontSize: '13px', margin: '4px 0 0' }}>
            Real-time synchronization between AcmeCorp Finance Portal and HoneyShield Honeypot
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: '#161B22', padding: '6px 14px', borderRadius: '20px', border: '1px solid #30363D' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#22C55E',
            boxShadow: '0 0 6px #22C55E'
          }} />
          <span style={{ color: '#22C55E', fontSize: '12px', fontWeight: 600 }}>
            Bridge Active (Port 3500)
          </span>
        </div>
      </div>

      {/* Architecture diagram */}
      <div style={{ background: '#161B22', border: '1px solid #30363D', borderRadius: '12px', padding: '24px' }}>
        <div style={{ color: '#8B949E', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px', fontWeight: 600 }}>
          Dual-System Architecture Topology
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {[
            { label: 'Finance Portal', sub: 'port 3002 / 4000', color: '#3B82F6', icon: '💼', role: 'Real Employee System' },
            { label: 'Bridge Layer', sub: 'port 3500', color: '#A855F7', icon: '🔀', role: 'Traffic Interceptor & Redirector' },
            { label: 'HoneyShield', sub: 'port 5173 / 3001', color: '#22C55E', icon: '🛡️', role: 'Attacker Deception Sandbox' },
          ].map((item, i) => (
            <React.Fragment key={i}>
              <div style={{
                textAlign: 'center',
                padding: '16px 20px',
                background: '#0D1117',
                borderRadius: '10px',
                border: `1px solid ${item.color}44`,
                minWidth: '160px',
                boxShadow: `0 4px 12px ${item.color}11`
              }}>
                <div style={{ fontSize: '24px', marginBottom: '6px' }}>{item.icon}</div>
                <div style={{ color: item.color, fontSize: '14px', fontWeight: 700 }}>{item.label}</div>
                <div style={{ color: '#58A6FF', fontSize: '11px', fontFamily: 'monospace', margin: '2px 0 4px' }}>{item.sub}</div>
                <div style={{ color: '#8B949E', fontSize: '10px' }}>{item.role}</div>
              </div>
              {i < 2 && (
                <div style={{ color: '#A855F7', fontSize: '20px', fontWeight: 700 }}>➔</div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Bridge stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        {[
          { label: 'Active IP Tracking', val: bridgeStats.activeTracking, color: '#3B82F6', desc: 'Monitored sessions' },
          { label: 'Total Failed Attempts', val: bridgeStats.totalAttempts, color: '#F97316', desc: 'Across all accounts' },
          { label: 'Silently Redirected', val: bridgeStats.redirected, color: '#A855F7', desc: 'Trapped in HoneyShield' },
          { label: 'Permanently Blocked', val: bridgeStats.blocked, color: '#EF4444', desc: 'Cross-system blocklist' },
        ].map(s => (
          <div key={s.label} style={{ background: '#161B22', border: '1px solid #30363D', borderRadius: '10px', padding: '18px' }}>
            <div style={{ color: '#8B949E', fontSize: '11px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
            <div style={{ color: s.color, fontSize: '28px', fontWeight: 700, fontFamily: 'monospace' }}>{s.val}</div>
            <div style={{ color: '#6E7681', fontSize: '11px', marginTop: '4px' }}>{s.desc}</div>
          </div>
        ))}
      </div>

      {/* Live event feed */}
      <div style={{ background: '#161B22', border: '1px solid #30363D', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #30363D', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ color: '#E6EDF3', margin: 0, fontSize: '14px', fontWeight: 600 }}>Live Bridge Intercept Events</h3>
            <span style={{ color: '#8B949E', fontSize: '11px' }}>Streaming directly from Finance Portal login attempts</span>
          </div>
          <button
            onClick={() => setBridgeEvents([])}
            style={{
              padding: '4px 10px',
              background: 'transparent',
              border: '1px solid #30363D',
              borderRadius: '6px',
              color: '#8B949E',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            Clear Feed
          </button>
        </div>

        <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
          {bridgeEvents.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#6E7681', fontSize: '13px' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>⏳</div>
              <div>No bridge events yet — waiting for Finance Portal activity</div>
              <div style={{ color: '#484F58', fontSize: '11px', marginTop: '4px' }}>Try attempting failed logins at http://localhost:3002 to see live intercept triggers</div>
            </div>
          ) : (
            bridgeEvents.map((event, i) => {
              const isRedirect = event.type === 'ATTACKER_REDIRECTED'
              const isSuspicious = event.type === 'SUSPICIOUS_ACTIVITY'
              const isBlocked = event.type === 'ATTACKER_BLOCKED' || event.type === 'AUTO_BLOCK'

              return (
                <div
                  key={i}
                  style={{
                    padding: '14px 20px',
                    borderBottom: '1px solid #21262D',
                    display: 'flex',
                    gap: '14px',
                    alignItems: 'flex-start',
                    background: isRedirect
                      ? 'rgba(239, 68, 68, 0.08)'
                      : isSuspicious
                      ? 'rgba(245, 158, 11, 0.05)'
                      : isBlocked
                      ? 'rgba(220, 38, 38, 0.12)'
                      : 'transparent'
                  }}
                >
                  <span style={{ fontSize: '18px', flexShrink: 0, marginTop: '2px' }}>
                    {isRedirect ? '🔀' : isSuspicious ? '⚠️' : isBlocked ? '🚫' : '📝'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{
                        color: isRedirect ? '#EF4444' : isSuspicious ? '#F59E0B' : isBlocked ? '#DC2626' : '#58A6FF',
                        fontSize: '12px',
                        fontWeight: 700,
                        letterSpacing: '0.04em'
                      }}>
                        {event.type?.replace(/_/g, ' ')}
                      </span>
                      <span style={{ color: '#8B949E', fontSize: '11px', fontFamily: 'monospace' }}>
                        {event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString()}
                      </span>
                    </div>
                    <div style={{ color: '#E6EDF3', fontSize: '13px', marginBottom: '4px', lineHeight: 1.4 }}>
                      {event.message || `Login event on user '${event.username}' from ${event.ip}`}
                    </div>
                    <div style={{ display: 'flex', gap: '16px', color: '#8B949E', fontSize: '11px', fontFamily: 'monospace' }}>
                      <span>IP: <strong style={{ color: '#C9D1D9' }}>{event.ip}</strong></span>
                      <span>Target: <strong style={{ color: '#C9D1D9' }}>{event.username}</strong></span>
                      {event.attemptNumber && (
                        <span>Attempt: <strong style={{ color: event.attemptNumber >= 3 ? '#EF4444' : '#F59E0B' }}>#{event.attemptNumber}</strong></span>
                      )}
                      <span>Location: {event.city || 'Unknown'}, {event.country || 'Unknown'}</span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
