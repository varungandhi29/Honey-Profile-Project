import React, { useState, useEffect } from 'react'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

export default function EvidenceModal({ sessionId, onClose }) {
  const [evidence, setEvidence] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('timeline')

  useEffect(() => {
    if (!sessionId) return
    setLoading(true)
    fetch(`${BACKEND}/api/vault/session/${sessionId}`)
      .then(r => r.json())
      .then(d => { setEvidence(d); setLoading(false) })
      .catch(err => {
        console.warn('[EvidenceModal] Fetch error:', err)
        setLoading(false)
      })
  }, [sessionId])

  if (loading) {
    return (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
        <div style={{ background:'#161B22', border:'1px solid #30363D', borderRadius:'16px', padding:'32px', color:'#8B949E', display:'flex', flexDirection:'column', alignItems:'center', gap:'12px' }}>
          <div style={{ width:'24px', height:'24px', border:'2px solid #00FF88', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
          <span>Loading Session Evidence...</span>
          <style>{`@keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }`}</style>
        </div>
      </div>
    )
  }

  if (!evidence || evidence.error || !evidence.session) {
    return (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
        <div style={{ background:'#161B22', border:'1px solid #30363D', borderRadius:'16px', padding:'32px', color:'#FF4444', textAlign:'center', maxWidth:'420px' }} onClick={e => e.stopPropagation()}>
          <h3 style={{ margin:'0 0 10px' }}>Evidence Not Found</h3>
          <p style={{ color:'#8B949E', fontSize:'13px', marginBottom:'20px' }}>
            No vault records found for session <code>{sessionId}</code>.
          </p>
          <button onClick={onClose} style={{ padding:'8px 18px', background:'#21262D', color:'#FFF', border:'1px solid #30363D', borderRadius:'6px', cursor:'pointer' }}>
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div style={{ background:'#161B22', border:'1px solid #30363D', borderRadius:'16px', width:'800px', maxWidth:'95vw', maxHeight:'85vh', overflow:'auto', padding:'24px', boxShadow:'0 20px 50px rgba(0,0,0,0.7)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'20px' }}>
          <div>
            <h2 style={{ color:'#E6EDF3', margin:0, fontSize:'20px', display:'flex', alignItems:'center', gap:'8px' }}>
              📂 Evidence — {evidence.session.username}
            </h2>
            <p style={{ color:'#8B949E', fontSize:'12px', margin:'4px 0 0', fontFamily:'monospace' }}>
              {evidence.session.ip} · {evidence.session.city}, {evidence.session.country} · {evidence.session.browser} / {evidence.session.os}
            </p>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#8B949E', fontSize:'24px', cursor:'pointer', padding:'0 8px', lineHeight:1 }}>×</button>
        </div>

        {/* Summary cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px', marginBottom:'20px' }}>
          {[
            { label:'Total Attacks', val:evidence.summary.totalAttacks, color:'#FF4444' },
            { label:'Honey Interactions', val:evidence.summary.totalHoneyInteractions, color:'#A855F7' },
            { label:'Critical Attacks', val:evidence.summary.criticalAttacks, color:'#FF4444' },
            { label:'Deep Traps', val:evidence.summary.deepTraps, color:'#FFC107' },
          ].map(s => (
            <div key={s.label} style={{ background:'#0D1117', borderRadius:'8px', padding:'12px', textAlign:'center', border:'1px solid #21262D' }}>
              <div style={{ color:s.color, fontSize:'22px', fontWeight:700, fontFamily:'monospace' }}>{s.val}</div>
              <div style={{ color:'#8B949E', fontSize:'11px', marginTop:'2px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:'4px', marginBottom:'16px', borderBottom:'1px solid #30363D', paddingBottom:'0' }}>
          {[
            { id: 'timeline', label: `Timeline (${evidence.session.timeline?.length || 0})` },
            { id: 'attacks', label: `Attacks (${evidence.attacks.length})` },
            { id: 'honey', label: `Honey Logs (${evidence.honeyLogs.length})` },
            { id: 'alerts', label: `Alerts (${evidence.alerts.length})` }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ padding:'8px 16px', background:'none', border:'none', borderBottom:activeTab===tab.id?'2px solid #00FF88':'2px solid transparent', color:activeTab===tab.id?'#00FF88':'#8B949E', cursor:'pointer', fontSize:'12px', fontWeight:activeTab===tab.id?700:400 }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Timeline tab */}
        {activeTab === 'timeline' && (
          <div style={{ maxHeight:'360px', overflowY:'auto' }}>
            {(!evidence.session.timeline || evidence.session.timeline.length === 0) ? (
              <div style={{ padding:'30px', textAlign:'center', color:'#8B949E', fontSize:'12px' }}>No timeline events recorded</div>
            ) : (
              evidence.session.timeline.slice().reverse().map((event, i) => (
                <div key={i} style={{ display:'flex', gap:'12px', marginBottom:'12px', alignItems:'flex-start', background:'#0D1117', padding:'10px', borderRadius:'8px', border:'1px solid #21262D' }}>
                  <div style={{ color:'#8B949E', fontSize:'10px', fontFamily:'monospace', flexShrink:0, marginTop:'2px', minWidth:'135px' }}>
                    {event.timestamp ? new Date(event.timestamp).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit', second:'2-digit' }) : '---'}
                  </div>
                  <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:event.action==='ATTACK'?'#FF4444':event.action==='LOGIN'?'#00FF88':'#8B949E', marginTop:'4px', flexShrink:0 }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ color:event.action==='ATTACK'?'#FF4444':event.action==='LOGIN'?'#00FF88':'#8B949E', fontSize:'11px', fontWeight:700, marginRight:'8px' }}>{event.action}</span>
                    <span style={{ color:'#E6EDF3', fontSize:'12px' }}>{event.detail}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Attacks tab */}
        {activeTab === 'attacks' && (
          <div style={{ maxHeight:'360px', overflowY:'auto' }}>
            {evidence.attacks.length === 0 ? (
              <div style={{ padding:'30px', textAlign:'center', color:'#8B949E', fontSize:'12px' }}>No attacks recorded for this session</div>
            ) : (
              evidence.attacks.map((attack, i) => (
                <div key={i} style={{ padding:'12px', background:'#0D1117', borderRadius:'8px', marginBottom:'8px', border:'1px solid #21262D' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                    <span style={{ color:attack.severity==='CRITICAL'?'#FF4444':attack.severity==='HIGH'?'#FF8C00':'#FFC107', fontWeight:700, fontSize:'12px' }}>{attack.severity}</span>
                    <span style={{ color:'#8B949E', fontSize:'11px', fontFamily:'monospace' }}>{new Date(attack.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div style={{ color:'#E6EDF3', fontSize:'13px', fontWeight:500 }}>{attack.type}</div>
                  <div style={{ color:'#8B949E', fontSize:'11px', marginTop:'2px' }}>Target: {attack.targetArea} · +{attack.riskDelta} risk</div>
                  {attack.aiPrediction && <div style={{ color:'#A855F7', fontSize:'11px', marginTop:'2px' }}>AI: {attack.aiPrediction}</div>}
                </div>
              ))
            )}
          </div>
        )}

        {/* Honey logs tab */}
        {activeTab === 'honey' && (
          <div style={{ maxHeight:'360px', overflowY:'auto' }}>
            {evidence.honeyLogs.length === 0 ? (
              <div style={{ padding:'30px', textAlign:'center', color:'#8B949E', fontSize:'12px' }}>No honey interactions recorded for this session</div>
            ) : (
              evidence.honeyLogs.map((log, i) => (
                <div key={i} style={{ padding:'12px', background:'#0D1117', borderRadius:'8px', marginBottom:'8px', border:`1px solid ${log.deepTrap?'#FFC107':'#21262D'}` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                    <span style={{ color:'#A855F7', fontWeight:700, fontSize:'12px' }}>{log.action}</span>
                    {log.deepTrap && <span style={{ color:'#FFC107', fontSize:'10px', fontWeight:700 }}>⚠️ DEEP TRAP</span>}
                    <span style={{ color:'#8B949E', fontSize:'11px', fontFamily:'monospace' }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div style={{ color:'#E6EDF3', fontSize:'12px' }}>Decoy Target: {log.fakeTarget}</div>
                  <div style={{ color:'#8B949E', fontSize:'11px', marginTop:'2px' }}>Response: {log.responseSimulated}</div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Alerts tab */}
        {activeTab === 'alerts' && (
          <div style={{ maxHeight:'360px', overflowY:'auto' }}>
            {evidence.alerts.length === 0 ? (
              <div style={{ padding:'30px', textAlign:'center', color:'#8B949E', fontSize:'12px' }}>No alerts recorded for this session</div>
            ) : (
              evidence.alerts.map((alert, i) => (
                <div key={i} style={{ padding:'12px', background:'#0D1117', borderRadius:'8px', marginBottom:'8px', border:'1px solid #21262D' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                    <span style={{ color:alert.severity==='CRITICAL'?'#FF4444':'#FF8C00', fontWeight:700, fontSize:'12px' }}>{alert.severity}</span>
                    <span style={{ color:alert.status==='Acknowledged'?'#00FF88':'#8B949E', fontSize:'10px', padding:'2px 6px', background:'#21262D', borderRadius:'4px' }}>{alert.status}</span>
                  </div>
                  <div style={{ color:'#E6EDF3', fontSize:'12px', fontWeight:500 }}>{alert.title}</div>
                  <div style={{ color:'#8B949E', fontSize:'11px', marginTop:'2px' }}>{alert.description}</div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Export this session */}
        <div style={{ marginTop:'16px', paddingTop:'16px', borderTop:'1px solid #30363D', display:'flex', justifyContent:'flex-end' }}>
          <button onClick={() => window.open(`${BACKEND}/api/vault/session/${sessionId}/export`, '_blank')}
            style={{ padding:'8px 20px', background:'#00FF88', color:'#0D1117', border:'none', borderRadius:'8px', fontWeight:700, fontSize:'12px', cursor:'pointer' }}>
            ⬇ Export Evidence JSON
          </button>
        </div>
      </div>
    </div>
  )
}
