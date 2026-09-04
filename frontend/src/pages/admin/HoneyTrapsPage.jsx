import React, { useState, useEffect, useMemo } from 'react'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

export default function HoneyTrapsPage({ data, onBlockIP }) {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      const r = await fetch(`${BACKEND}/api/honeypot/employees`)
      const d = await r.json()
      setEmployees(d.employees || [])
    } catch (err) {
      console.error('[HoneyTrapsPage] Failed to fetch employees:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEmployees()
  }, [])

  // Filter trapped sessions from all sessions
  const trappedSessions = useMemo(() => {
    return data?.sessions?.filter(s => s.isHoneypotTrap || s.trappedEmployee) || []
  }, [data?.sessions])

  const handleRegenerate = async () => {
    try {
      setRegenerating(true)
      await fetch(`${BACKEND}/api/honeypot/employees/regenerate`, { method: 'POST' })
      await fetchEmployees()
    } catch (err) {
      console.error('[HoneyTrapsPage] Failed to regenerate employees:', err)
    } finally {
      setRegenerating(false)
    }
  }

  const filteredEmployees = useMemo(() => {
    if (!searchTerm.trim()) return employees
    const term = searchTerm.toLowerCase()
    return employees.filter(e =>
      e.username?.toLowerCase().includes(term) ||
      e.name?.toLowerCase().includes(term) ||
      e.role?.toLowerCase().includes(term) ||
      e.dept?.toLowerCase().includes(term)
    )
  }, [employees, searchTerm])

  const mostTargeted = useMemo(() => {
    if (!employees.length) return 'None'
    const sorted = [...employees].sort((a, b) => (b.loginAttempts || 0) - (a.loginAttempts || 0))
    return sorted[0]?.loginAttempts > 0 ? sorted[0].username : 'None'
  }, [employees])

  const totalFailedAttempts = useMemo(() => {
    return employees.reduce((s, e) => s + (e.loginAttempts || 0), 0)
  }, [employees])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ color: '#E6EDF3', margin: 0, fontSize: '20px', fontWeight: 700 }}>🍯 Honey Trap System</h2>
          <p style={{ color: '#8B949E', margin: '4px 0 0', fontSize: '13px' }}>
            50+ active decoy employee personas trapping unauthorized infiltration attempts
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            style={{
              padding: '8px 16px',
              background: 'rgba(168,85,247,0.15)',
              color: '#A855F7',
              border: '1px solid rgba(168,85,247,0.3)',
              borderRadius: '8px',
              fontSize: '12px',
              cursor: regenerating ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {regenerating ? '🔄 Regenerating...' : '🔄 Regenerate Random Employees'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        {[
          { label: 'Decoy Accounts', val: employees.length, color: '#A855F7', icon: '👤' },
          { label: 'Successful Traps', val: trappedSessions.length, color: '#EF4444', icon: '🍯' },
          { label: 'Total Attempts', val: totalFailedAttempts, color: '#F97316', icon: '⚠️' },
          { label: 'Most Targeted', val: mostTargeted, color: '#EAB308', icon: '🎯' },
        ].map(card => (
          <div key={card.label} style={{ background: '#161B22', border: '1px solid #30363D', borderRadius: '12px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#8B949E', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>{card.label}</span>
              <span style={{ fontSize: '16px' }}>{card.icon}</span>
            </div>
            <div style={{ color: card.color, fontSize: '22px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
              {card.val}
            </div>
          </div>
        ))}
      </div>

      {/* Trapped Sessions Section */}
      {trappedSessions.length > 0 && (
        <div style={{ background: '#161B22', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ color: '#EF4444', margin: 0, fontSize: '14px', fontWeight: 700 }}>🚨 Active Trapped Attackers ({trappedSessions.length})</h3>
            <span style={{ fontSize: '11px', color: '#EF4444', background: 'rgba(239,68,68,0.2)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>MONITORED DECEPTION</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {trappedSessions.map(session => (
              <div key={session.id || session.sessionId} style={{ padding: '14px 20px', borderBottom: '1px solid #21262D', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ color: '#E6EDF3', fontSize: '13px', fontWeight: 600 }}>
                    Logged in as: <span style={{ color: '#00FF88' }}>{session.trappedEmployee || session.username}</span> {session.trappedRole ? `(${session.trappedRole})` : ''}
                  </div>
                  <div style={{ color: '#8B949E', fontSize: '11px', marginTop: '2px' }}>
                    {session.ip} · {session.city || 'Unknown'}, {session.country || 'Unknown'} · Browser: {session.browser || 'Browser'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ color: '#EF4444', fontSize: '12px', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
                    Risk: {session.riskScore || 50}
                  </div>
                  {onBlockIP && (
                    <button
                      onClick={() => onBlockIP(session.ip, `Manual block on trapped decoy session (${session.trappedEmployee || session.username})`)}
                      style={{
                        padding: '6px 14px',
                        background: 'rgba(239,68,68,0.15)',
                        color: '#EF4444',
                        border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: '6px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      🚫 Block Attacker
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Decoy Employee Table */}
      <div style={{ background: '#161B22', border: '1px solid #30363D', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #30363D', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ color: '#E6EDF3', margin: 0, fontSize: '14px', fontWeight: 700 }}>
            👤 Decoy Employee Accounts ({filteredEmployees.length} / {employees.length})
          </h3>
          <input
            type="text"
            placeholder="Search decoy accounts..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              padding: '6px 12px',
              background: '#0D1117',
              border: '1px solid #30363D',
              borderRadius: '6px',
              color: '#E6EDF3',
              fontSize: '12px',
              outline: 'none',
              width: '200px'
            }}
          />
        </div>

        <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#0D1117', position: 'sticky', top: 0, zIndex: 5 }}>
                {['Username', 'Name', 'Role', 'Dept', 'Login Attempts', 'Trapped', 'Last Attempt'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', color: '#8B949E', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #21262D' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#8B949E', fontSize: '13px' }}>
                    Loading decoy employee accounts...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#8B949E', fontSize: '13px' }}>
                    No decoy accounts found.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp, i) => (
                  <tr
                    key={emp.username || i}
                    style={{ borderBottom: '1px solid #21262D', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#1F242C'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px 16px', color: '#06B6D4', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' }}>
                      {emp.username}
                    </td>
                    <td style={{ padding: '10px 16px', color: '#E6EDF3', fontSize: '12px' }}>
                      {emp.name}
                    </td>
                    <td style={{ padding: '10px 16px', color: '#94A3B8', fontSize: '12px' }}>
                      {emp.role}
                    </td>
                    <td style={{ padding: '10px 16px', color: '#94A3B8', fontSize: '12px' }}>
                      {emp.dept}
                    </td>
                    <td style={{ padding: '10px 16px', color: emp.loginAttempts > 0 ? '#F97316' : '#94A3B8', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', fontWeight: emp.loginAttempts > 0 ? 700 : 400 }}>
                      {emp.loginAttempts || 0}
                    </td>
                    <td style={{ padding: '10px 16px', color: emp.successfulTraps > 0 ? '#EF4444' : '#94A3B8', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', fontWeight: emp.successfulTraps > 0 ? 700 : 400 }}>
                      {emp.successfulTraps || 0}
                    </td>
                    <td style={{ padding: '10px 16px', color: '#64748B', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace' }}>
                      {emp.lastAttempt ? new Date(emp.lastAttempt).toLocaleString() : 'Never'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
