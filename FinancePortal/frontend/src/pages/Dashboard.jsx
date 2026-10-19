import React, { useState, useEffect } from 'react'

// Real employee dashboard — what legitimate employees see
export default function Dashboard({ token, user, onLogout }) {
  const [data, setData] = useState(null)
  const [reports, setReports] = useState([])
  const [invoices, setInvoices] = useState([])
  const [clients, setClients] = useState([])
  const [activePage, setActivePage] = useState('dashboard')
  const BACKEND = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_FINANCE_BACKEND_URL || 'http://localhost:4000'
  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    fetch(`${BACKEND}/api/dashboard`, { headers }).then(r => r.json()).then(setData).catch(() => {})
    fetch(`${BACKEND}/api/reports`, { headers }).then(r => r.json()).then(d => setReports(d.reports || [])).catch(() => {})
    fetch(`${BACKEND}/api/invoices`, { headers }).then(r => r.json()).then(d => setInvoices(d.invoices || [])).catch(() => {})
    fetch(`${BACKEND}/api/clients`, { headers }).then(r => r.json()).then(d => setClients(d.clients || [])).catch(() => {})
  }, [token])

  const NAV = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'reports', label: 'Reports', icon: '📁' },
    { id: 'invoices', label: 'Invoices', icon: '🧾' },
    { id: 'clients', label: 'Clients', icon: '👥' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0F172A', fontFamily: 'Inter, sans-serif' }}>
      {/* Sidebar */}
      <aside style={{
        width: '240px',
        background: '#1E293B',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        height: '100vh',
        boxSizing: 'border-box'
      }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              background: 'linear-gradient(135deg,#3B82F6,#1D4ED8)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px'
            }}>💼</div>
            <div>
              <div style={{ color: '#F1F5F9', fontWeight: 700, fontSize: '13px' }}>AcmeCorp Financial</div>
              <div style={{ color: '#64748B', fontSize: '10px' }}>Employee Portal</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '8px',
                border: 'none',
                background: activePage === item.id ? 'rgba(59,130,246,0.15)' : 'transparent',
                color: activePage === item.id ? '#3B82F6' : '#94A3B8',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: activePage === item.id ? 600 : 400,
                marginBottom: '2px',
                textAlign: 'left'
              }}
            >
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ color: '#F1F5F9', fontSize: '13px', fontWeight: 600, marginBottom: '2px' }}>{user?.name || 'Employee'}</div>
          <div style={{ color: '#64748B', fontSize: '11px', marginBottom: '12px' }}>{user?.title || user?.dept} ({user?.clearance || 'STANDARD'})</div>
          <button
            onClick={onLogout}
            style={{
              width: '100%',
              padding: '8px',
              background: 'rgba(239,68,68,0.1)',
              color: '#EF4444',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 500
            }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ marginLeft: '240px', flex: 1, padding: '32px', boxSizing: 'border-box' }}>
        {/* Dashboard page */}
        {activePage === 'dashboard' && data && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h1 style={{ color: '#F1F5F9', fontSize: '24px', fontWeight: 700, margin: '0 0 4px' }}>{data.welcome}</h1>
                <p style={{ color: '#64748B', fontSize: '13px', margin: 0 }}>Last login: {data.lastLogin}</p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ padding: '4px 10px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22C55E', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                  ● PRODUCTION SECURE
                </span>
              </div>
            </div>

            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
              {[
                { label: 'Total Revenue', val: data.stats.totalRevenue, color: '#22C55E', icon: '💰' },
                { label: 'Monthly Growth', val: data.stats.monthlyGrowth, color: '#3B82F6', icon: '📈' },
                { label: 'Active Clients', val: data.stats.activeClients, color: '#A855F7', icon: '👥' },
                { label: 'Pending Invoices', val: data.stats.pendingInvoices, color: '#EAB308', icon: '🧾' },
                { label: 'Overdue Amount', val: data.stats.overdueAmount, color: '#EF4444', icon: '⚠️' },
                { label: 'Cash Flow', val: data.stats.cashFlow, color: '#06B6D4', icon: '💳' },
              ].map(card => (
                <div key={card.label} style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#64748B', fontSize: '12px' }}>{card.label}</span>
                    <span style={{ fontSize: '18px' }}>{card.icon}</span>
                  </div>
                  <div style={{ color: card.color, fontSize: '24px', fontWeight: 700 }}>{card.val}</div>
                </div>
              ))}
            </div>

            {/* Recent activity */}
            <div style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px' }}>
              <h3 style={{ color: '#F1F5F9', margin: '0 0 16px', fontSize: '15px' }}>Recent Activity</h3>
              {data.recentActivity?.map((act, i) => (
                <div key={i} style={{
                  padding: '12px 0',
                  borderBottom: i < data.recentActivity.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ color: '#F1F5F9', fontSize: '13px', marginBottom: '2px' }}>{act.description}</div>
                    <div style={{ color: '#64748B', fontSize: '11px' }}>{act.time}</div>
                  </div>
                  {act.amount && <div style={{ color: '#22C55E', fontSize: '13px', fontWeight: 600 }}>{act.amount}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reports page */}
        {activePage === 'reports' && (
          <div>
            <h1 style={{ color: '#F1F5F9', fontSize: '24px', fontWeight: 700, marginBottom: '24px' }}>Financial Reports</h1>
            <div style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                    {['Report Name', 'Type', 'Size', 'Date', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#64748B', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r, i) => (
                    <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '12px 16px', color: '#F1F5F9', fontSize: '13px', fontWeight: 500 }}>{r.name}</td>
                      <td style={{ padding: '12px 16px', color: '#94A3B8', fontSize: '12px' }}>{r.type}</td>
                      <td style={{ padding: '12px 16px', color: '#94A3B8', fontSize: '12px' }}>{r.size}</td>
                      <td style={{ padding: '12px 16px', color: '#94A3B8', fontSize: '12px' }}>{r.date}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          background: r.status === 'Final' ? 'rgba(34,197,94,0.1)' : 'rgba(234,179,8,0.1)',
                          color: r.status === 'Final' ? '#22C55E' : '#EAB308'
                        }}>{r.status}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button style={{
                          padding: '4px 12px',
                          background: 'rgba(59,130,246,0.1)',
                          color: '#3B82F6',
                          border: '1px solid rgba(59,130,246,0.2)',
                          borderRadius: '4px',
                          fontSize: '11px',
                          cursor: 'pointer'
                        }}>
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Invoices page */}
        {activePage === 'invoices' && (
          <div>
            <h1 style={{ color: '#F1F5F9', fontSize: '24px', fontWeight: 700, marginBottom: '24px' }}>Invoices</h1>
            <div style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                    {['Invoice ID', 'Client', 'Amount', 'Status', 'Date', 'Due Date'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#64748B', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv, i) => (
                    <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '12px 16px', color: '#3B82F6', fontSize: '13px', fontFamily: 'monospace' }}>{inv.id}</td>
                      <td style={{ padding: '12px 16px', color: '#F1F5F9', fontSize: '13px' }}>{inv.client}</td>
                      <td style={{ padding: '12px 16px', color: '#22C55E', fontSize: '13px', fontWeight: 600 }}>{inv.amount}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          background: inv.status === 'Paid' ? 'rgba(34,197,94,0.1)' : inv.status === 'Overdue' ? 'rgba(239,68,68,0.1)' : 'rgba(234,179,8,0.1)',
                          color: inv.status === 'Paid' ? '#22C55E' : inv.status === 'Overdue' ? '#EF4444' : '#EAB308'
                        }}>{inv.status}</span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#94A3B8', fontSize: '12px' }}>{inv.date}</td>
                      <td style={{ padding: '12px 16px', color: inv.status === 'Overdue' ? '#EF4444' : '#94A3B8', fontSize: '12px' }}>{inv.due}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Clients page */}
        {activePage === 'clients' && (
          <div>
            <h1 style={{ color: '#F1F5F9', fontSize: '24px', fontWeight: 700, marginBottom: '24px' }}>Client Directory</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {clients.map((c, i) => (
                <div key={i} style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ color: '#F1F5F9', fontWeight: 600, fontSize: '15px' }}>{c.name}</div>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      background: c.status === 'Premium' ? 'rgba(168,85,247,0.1)' : 'rgba(34,197,94,0.1)',
                      color: c.status === 'Premium' ? '#A855F7' : '#22C55E'
                    }}>{c.status}</span>
                  </div>
                  <div style={{ color: '#94A3B8', fontSize: '12px', marginBottom: '4px' }}>Contact: {c.contact}</div>
                  <div style={{ color: '#94A3B8', fontSize: '12px', marginBottom: '4px' }}>{c.email}</div>
                  <div style={{ color: '#22C55E', fontSize: '13px', fontWeight: 600, marginTop: '8px' }}>Annual Revenue: {c.revenue}</div>
                  <div style={{ color: '#475569', fontSize: '11px', marginTop: '4px' }}>Client since {c.since}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings page */}
        {activePage === 'settings' && (
          <div>
            <h1 style={{ color: '#F1F5F9', fontSize: '24px', fontWeight: 700, marginBottom: '24px' }}>Account & Security Settings</h1>
            <div style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '24px', maxWidth: '600px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Full Name</label>
                <input value={user?.name || ''} readOnly style={{ width: '100%', padding: '10px 12px', background: '#0F172A', border: '1px solid #334155', borderRadius: '6px', color: '#F1F5F9' }} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Department & Clearance</label>
                <input value={`${user?.dept || ''} — ${user?.clearance || 'STANDARD'}`} readOnly style={{ width: '100%', padding: '10px 12px', background: '#0F172A', border: '1px solid #334155', borderRadius: '6px', color: '#F1F5F9' }} />
              </div>
              <div>
                <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Security Status</label>
                <div style={{ color: '#22C55E', fontSize: '13px', fontWeight: 600 }}>● 2FA Enabled · Hardware Key Enforced</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
