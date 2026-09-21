import React, { useState, useEffect } from 'react';
import { Lock, Download, Database, Shield, AlertTriangle, Activity, FileText, FolderOpen } from 'lucide-react';
import EvidenceModal from '../../components/EvidenceModal';
import { BACKEND } from '../../utils/backendUrl';

export default function DataVaultPage({ currentUser, backendOnline }) {
  const [vaultData, setVaultData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('attacks')
  const [selectedEvidence, setSelectedEvidence] = useState(null)

  const fetchVault = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${BACKEND}/api/vault`)
      if (res.ok) {
        const d = await res.json()
        setVaultData(d)
      }
    } catch (e) {
      console.warn('[VAULT] Fetch error:', e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVault()
  }, [backendOnline])

  const handleExport = () => {
    window.open(`${BACKEND}/api/vault/export`, '_blank')
  }

  const attacks = vaultData?.attacks || []
  const sessions = vaultData?.sessions || []
  const honeyLogs = vaultData?.honeyLogs || []
  const alerts = vaultData?.alerts || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', padding: '24px', position: 'relative' }}>
      
      {/* Header card */}
      <div style={{ background: '#161B22', padding: '20px', borderRadius: '12px', border: '1px solid #30363D', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <Lock size={28} color="#00FF88" />
          <div>
            <h2 style={{ margin: 0, color: '#FFF', fontSize: '18px' }}>AES-256 Encrypted Evidence Vault</h2>
            <div style={{ color: '#8B949E', fontSize: '13px', marginTop: '2px' }}>
              Persistent security evidence stored in MongoDB · {vaultData?.totalRecords || 0} total records
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {vaultData?.exportedAt && (
            <span style={{ color: '#8B949E', fontSize: '11px', fontFamily: 'monospace' }}>
              Last Sync: {new Date(vaultData.exportedAt).toLocaleTimeString()}
            </span>
          )}
          <button 
            onClick={fetchVault}
            style={{ padding: '8px 14px', background: '#21262D', color: '#E6EDF3', border: '1px solid #30363D', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
            🔄 Refresh
          </button>
          <button 
            onClick={handleExport}
            style={{ padding: '8px 16px', background: '#00FF88', color: '#0D1117', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={14} /> Export JSON Evidence
          </button>
        </div>
      </div>

      {/* Tabs bar */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid #30363D', paddingBottom: '10px' }}>
        {[
          { id: 'attacks', label: `⚡ Attack Records (${attacks.length})` },
          { id: 'sessions', label: `💻 Sessions (${sessions.length})` },
          { id: 'honey', label: `🍯 Honey Traps (${honeyLogs.length})` },
          { id: 'alerts', label: `🔔 Alerts (${alerts.length})` },
        ].map(t => (
          <button 
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '8px 16px',
              background: activeTab === t.id ? '#21262D' : 'transparent',
              color: activeTab === t.id ? '#00FF88' : '#8B949E',
              border: `1px solid ${activeTab === t.id ? '#00FF88' : 'transparent'}`,
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px'
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Table view */}
      <div style={{ flex: 1, background: '#161B22', borderRadius: '12px', border: '1px solid #30363D', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#8B949E' }}>Loading Evidence Vault...</div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {activeTab === 'attacks' && (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#0D1117', color: '#8B949E', borderBottom: '1px solid #30363D' }}>
                    <th style={{ padding: '12px 16px' }}>Attack ID</th>
                    <th style={{ padding: '12px 16px' }}>Type</th>
                    <th style={{ padding: '12px 16px' }}>Severity</th>
                    <th style={{ padding: '12px 16px' }}>Source IP</th>
                    <th style={{ padding: '12px 16px' }}>Target</th>
                    <th style={{ padding: '12px 16px' }}>Time</th>
                    <th style={{ padding: '12px 16px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {attacks.length === 0 ? (
                    <tr><td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#8B949E' }}>No attack evidence recorded yet</td></tr>
                  ) : attacks.map((a, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #21262D', color: '#E6EDF3' }}>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#4FC3F7' }}>{a.id}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{a.type}</td>
                      <td style={{ padding: '12px 16px', color: a.severity === 'CRITICAL' ? '#FF4444' : a.severity === 'HIGH' ? '#FF8C00' : '#FFC107', fontWeight: 700 }}>{a.severity}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>{a.sourceIP} ({a.sourceCountry})</td>
                      <td style={{ padding: '12px 16px' }}>{a.targetArea}</td>
                      <td style={{ padding: '12px 16px', color: '#8B949E', fontFamily: 'monospace' }}>{new Date(a.timestamp).toLocaleString()}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {a.sessionId && (
                          <button onClick={() => setSelectedEvidence(a.sessionId)}
                            style={{ padding: '4px 10px', background: 'rgba(0,212,255,0.1)', color: '#00D4FF', border: '1px solid rgba(0,212,255,0.3)', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <FolderOpen size={11} /> Evidence
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'sessions' && (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#0D1117', color: '#8B949E', borderBottom: '1px solid #30363D' }}>
                    <th style={{ padding: '12px 16px' }}>Session ID</th>
                    <th style={{ padding: '12px 16px' }}>User</th>
                    <th style={{ padding: '12px 16px' }}>Role</th>
                    <th style={{ padding: '12px 16px' }}>IP</th>
                    <th style={{ padding: '12px 16px' }}>State</th>
                    <th style={{ padding: '12px 16px' }}>Risk</th>
                    <th style={{ padding: '12px 16px' }}>Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.length === 0 ? (
                    <tr><td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#8B949E' }}>No session logs found</td></tr>
                  ) : sessions.map((s, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #21262D', color: '#E6EDF3' }}>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#4FC3F7' }}>{s.id}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{s.username}</td>
                      <td style={{ padding: '12px 16px' }}>{s.role}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>{s.ip} ({s.city})</td>
                      <td style={{ padding: '12px 16px', color: s.state === 'ATTACKER' ? '#FF4444' : '#00FF88', fontWeight: 700 }}>{s.state}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 700 }}>{s.riskScore}/100</td>
                      <td style={{ padding: '12px 16px' }}>
                        <button onClick={() => setSelectedEvidence(s.id)}
                          style={{ padding: '4px 10px', background: 'rgba(0,212,255,0.1)', color: '#00D4FF', border: '1px solid rgba(0,212,255,0.3)', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <FolderOpen size={11} /> View Evidence
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'honey' && (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#0D1117', color: '#8B949E', borderBottom: '1px solid #30363D' }}>
                    <th style={{ padding: '12px 16px' }}>Log ID</th>
                    <th style={{ padding: '12px 16px' }}>Action</th>
                    <th style={{ padding: '12px 16px' }}>Decoy Target</th>
                    <th style={{ padding: '12px 16px' }}>Attacker IP</th>
                    <th style={{ padding: '12px 16px' }}>Deep Trap</th>
                    <th style={{ padding: '12px 16px' }}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {honeyLogs.length === 0 ? (
                    <tr><td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#8B949E' }}>No honey interaction evidence recorded yet</td></tr>
                  ) : honeyLogs.map((h, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #21262D', color: '#E6EDF3' }}>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#4FC3F7' }}>{h.id}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{h.action}</td>
                      <td style={{ padding: '12px 16px', color: '#FFC107' }}>{h.fakeTarget}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>{h.attackerIP}</td>
                      <td style={{ padding: '12px 16px', color: h.deepTrap ? '#FF4444' : '#8B949E' }}>{h.deepTrap ? '🍯 DEEP TRAP' : 'Normal'}</td>
                      <td style={{ padding: '12px 16px', color: '#8B949E', fontFamily: 'monospace' }}>{new Date(h.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'alerts' && (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#0D1117', color: '#8B949E', borderBottom: '1px solid #30363D' }}>
                    <th style={{ padding: '12px 16px' }}>Alert ID</th>
                    <th style={{ padding: '12px 16px' }}>Title</th>
                    <th style={{ padding: '12px 16px' }}>Severity</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px' }}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.length === 0 ? (
                    <tr><td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: '#8B949E' }}>No alerts recorded in vault</td></tr>
                  ) : alerts.map((al, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #21262D', color: '#E6EDF3' }}>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#4FC3F7' }}>{al.id}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{al.title}</td>
                      <td style={{ padding: '12px 16px', color: al.severity === 'CRITICAL' ? '#FF4444' : '#FF8C00', fontWeight: 700 }}>{al.severity}</td>
                      <td style={{ padding: '12px 16px' }}>{al.status || 'New'}</td>
                      <td style={{ padding: '12px 16px', color: '#8B949E', fontFamily: 'monospace' }}>{new Date(al.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {selectedEvidence && (
        <EvidenceModal sessionId={selectedEvidence} onClose={() => setSelectedEvidence(null)} />
      )}
    </div>
  )
}
