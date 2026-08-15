import { useState, useEffect, useRef } from 'react'

const LiveTrackingPage = ({ data, onBlockIP, onBlockFingerprint, backendOnline }) => {
  const sessions = data?.sessions || []
  const attackLog = data?.attackLog || []
  const [selectedSession, setSelectedSession] = useState(null)
  const [liveEvents, setLiveEvents] = useState([])
  const feedRef = useRef(null)

  // Auto-scroll live feed
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = 0
  }, [liveEvents])

  // Build live event feed from attack + honey logs
  useEffect(() => {
    const events = [
      ...attackLog.slice(0,50).map(a => ({
        id: a.id || a.attackId || Math.random().toString(), type: 'ATTACK', severity: a.severity,
        message: `${a.type} from ${a.sourceIP} (${a.sourceCountry}) → ${a.targetArea}`,
        ip: a.sourceIP, country: a.sourceCountry,
        timestamp: a.timestamp, sessionId: a.sessionId
      })),
      ...(data?.honeyLog || []).slice(0,30).map(h => ({
        id: h.id || Math.random().toString(), type: 'HONEY', severity: 'MEDIUM',
        message: `${h.action} → ${h.fakeTarget} by ${h.attackerIP}`,
        ip: h.attackerIP, country: h.attackerCountry,
        timestamp: h.timestamp, sessionId: h.sessionId
      }))
    ].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0,60)
    setLiveEvents(events)
  }, [attackLog.length, data?.honeyLog?.length])

  const stateColor = { ATTACKER:'#FF4444', SUSPICIOUS:'#FFC107', NORMAL:'#00FF88' }
  const severityColor = { CRITICAL:'#FF4444', HIGH:'#FF8C00', MEDIUM:'#FFC107', LOW:'#8B949E' }
  const typeIcon = { ATTACK:'⚡', HONEY:'🍯', LOGIN:'🔑', LOGOUT:'👋', HEARTBEAT:'💓' }

  const getTimeDiff = (timestamp) => {
    const diff = Date.now() - new Date(timestamp).getTime()
    if (diff < 60000) return `${Math.floor(diff/1000)}s ago`
    if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`
    return `${Math.floor(diff/3600000)}h ago`
  }

  return (
    <div style={{ padding:'24px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
        <div>
          <h2 style={{ color:'#E6EDF3', margin:0, fontSize:'20px', fontWeight:700 }}>
            📡 Live Session Tracking
          </h2>
          <p style={{ color:'#8B949E', fontSize:'13px', margin:'4px 0 0' }}>
            Real-time monitoring of all active sessions · {sessions.length} active · {attackLog.length} total attacks
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', background:'rgba(0,255,136,0.1)', border:'1px solid rgba(0,255,136,0.3)', borderRadius:'8px', padding:'8px 14px' }}>
          <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#00FF88', animation:'pulse 1.5s infinite' }} />
          <span style={{ color:'#00FF88', fontSize:'12px', fontWeight:600 }}>LIVE</span>
          <style>{`@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.3)} }`}</style>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'16px' }}>

        {/* Active Sessions panel */}
        <div style={{ background:'#161B22', borderRadius:'12px', border:'1px solid #30363D', overflow:'hidden' }}>
          <div style={{ padding:'14px 16px', background:'#0D1117', borderBottom:'1px solid #30363D', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ color:'#E6EDF3', fontSize:'13px', fontWeight:700 }}>Active Sessions</span>
            <span style={{ color:'#8B949E', fontSize:'11px' }}>{sessions.length} online</span>
          </div>
          <div style={{ maxHeight:'500px', overflowY:'auto' }}>
            {sessions.length === 0 ? (
              <div style={{ padding:'40px', textAlign:'center', color:'#8B949E', fontSize:'13px' }}>No active sessions</div>
            ) : sessions.map(s => {
              const fpHash = s.fingerprintHash || s.fingerprint?.hash || (typeof s.fingerprint === 'string' ? s.fingerprint : null)
              const rep = s.ipReputation

              return (
                <div key={s.id || s.sessionId}
                  style={{ padding:'14px 16px', borderBottom:'1px solid #21262D', cursor:'pointer', background: selectedSession?.id === s.id ? '#1C2128' : 'transparent', transition:'background 0.15s', borderLeft:`3px solid ${stateColor[s.state]||'transparent'}` }}
                  onClick={() => setSelectedSession(selectedSession?.id === s.id ? null : s)}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'6px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                      <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:stateColor[s.state]||'#8B949E', boxShadow:`0 0 6px ${stateColor[s.state]}` }} />
                      <span style={{ color:'#E6EDF3', fontWeight:600, fontSize:'13px' }}>{s.username}</span>
                    </div>
                    <div style={{ display:'flex', gap:'4px' }}>
                      {rep?.suspicious && (
                        <span style={{ padding:'2px 6px', borderRadius:'4px', fontSize:'9px', fontWeight:700, background: rep.reason === 'TOR_EXIT_NODE' ? 'rgba(255,68,68,0.2)' : 'rgba(255,193,7,0.2)', color: rep.reason === 'TOR_EXIT_NODE' ? '#FF4444' : '#FFC107', border: `1px solid ${rep.reason === 'TOR_EXIT_NODE' ? '#FF4444' : '#FFC107'}` }}>
                          {rep.label || 'VPN/Proxy'}
                        </span>
                      )}
                      <span style={{ padding:'2px 8px', borderRadius:'4px', fontSize:'10px', fontWeight:700, background:`${stateColor[s.state]}22`, color:stateColor[s.state] }}>
                        {s.state}
                      </span>
                    </div>
                  </div>

                  {/* Real IP + Location */}
                  <div style={{ fontFamily:'monospace', fontSize:'12px', color:'#4FC3F7', marginBottom:'3px' }}>{s.ip}</div>
                  <div style={{ fontSize:'11px', color:'#8B949E', marginBottom:'3px' }}>
                    📍 {s.city}, {s.country}
                  </div>
                  <div style={{ fontSize:'11px', color:'#8B949E', marginBottom:'3px' }}>
                    🖥 {s.browser} · {s.os}
                  </div>

                  {/* Fingerprint snippet */}
                  {fpHash && (
                    <div style={{ fontSize:'10px', color:'#4FC3F7', fontFamily:'monospace', marginBottom:'6px' }}>
                      🔑 FP: {fpHash.substr(0,12)}...
                    </div>
                  )}

                  {/* Date/Time */}
                  <div style={{ fontSize:'10px', color:'#8B949E', marginBottom:'8px', fontFamily:'monospace' }}>
                    🕐 Login: {s.startTime ? new Date(s.startTime).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit' }) : 'Unknown'}
                  </div>

                  {/* Risk score bar */}
                  <div style={{ marginBottom:'8px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'2px' }}>
                      <span style={{ color:'#8B949E', fontSize:'10px' }}>Risk Score</span>
                      <span style={{ color:stateColor[s.state], fontSize:'10px', fontWeight:700, fontFamily:'monospace' }}>{s.riskScore}/100</span>
                    </div>
                    <div style={{ background:'#21262D', borderRadius:'3px', height:'3px' }}>
                      <div style={{ background:stateColor[s.state], height:'100%', width:`${s.riskScore}%`, borderRadius:'3px', transition:'width 0.5s' }} />
                    </div>
                  </div>

                  {/* Attack count */}
                  {(s.attackCount || s.attackTypes?.length) > 0 && (
                    <div style={{ fontSize:'10px', color:'#FF8C00', marginBottom:'8px' }}>
                      ⚡ {s.attackCount || s.attackTypes?.length} attack{(s.attackCount || s.attackTypes?.length) > 1 ? 's' : ''} detected
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display:'flex', gap:'6px' }}>
                    <button onClick={e => { e.stopPropagation(); onBlockIP(s.ip, `Blocked via Live Tracking by admin — ${s.state} session`) }}
                      style={{ flex:1, padding:'5px', background:'rgba(255,68,68,0.15)', color:'#FF4444', border:'1px solid rgba(255,68,68,0.3)', borderRadius:'6px', fontSize:'10px', cursor:'pointer', fontWeight:600 }}>
                      🚫 Block IP
                    </button>
                    {fpHash && (
                      <button onClick={e => { e.stopPropagation(); onBlockFingerprint?.(fpHash, `Fingerprint blocked via Live Tracking — ${s.username}`) }}
                        style={{ flex:1, padding:'5px', background:'rgba(79,195,247,0.15)', color:'#4FC3F7', border:'1px solid rgba(79,195,247,0.3)', borderRadius:'6px', fontSize:'10px', cursor:'pointer', fontWeight:600 }}>
                        🔑 Block FP
                      </button>
                    )}
                    <button onClick={e => { e.stopPropagation(); setSelectedSession(s) }}
                      style={{ flex:1, padding:'5px', background:'#21262D', color:'#E6EDF3', border:'1px solid #30363D', borderRadius:'6px', fontSize:'10px', cursor:'pointer' }}>
                      👁 Details
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Live event feed */}
        <div style={{ background:'#161B22', borderRadius:'12px', border:'1px solid #30363D', overflow:'hidden', display:'flex', flexDirection:'column' }}>
          <div style={{ padding:'14px 16px', background:'#0D1117', borderBottom:'1px solid #30363D', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
            <span style={{ color:'#E6EDF3', fontSize:'13px', fontWeight:700 }}>Live Event Feed</span>
            <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
              <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#FF4444', animation:'pulse 1s infinite' }} />
              <span style={{ color:'#FF4444', fontSize:'10px', fontWeight:600 }}>LIVE</span>
            </div>
          </div>
          <div ref={feedRef} style={{ flex:1, overflowY:'auto', maxHeight:'500px' }}>
            {liveEvents.length === 0 ? (
              <div style={{ padding:'40px', textAlign:'center', color:'#8B949E' }}>
                <div style={{ fontSize:'28px', marginBottom:'8px' }}>📡</div>
                <div style={{ fontSize:'13px' }}>Waiting for events...</div>
              </div>
            ) : liveEvents.map((event, i) => (
              <div key={event.id || i}
                style={{ padding:'10px 14px', borderBottom:'1px solid #21262D', display:'flex', gap:'10px', alignItems:'flex-start' }}>
                <div style={{ fontSize:'14px', flexShrink:0, marginTop:'1px' }}>{typeIcon[event.type] || '●'}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'2px' }}>
                    <span style={{ color:severityColor[event.severity]||'#8B949E', fontSize:'10px', fontWeight:700 }}>{event.type}</span>
                    <span style={{ color:'#8B949E', fontSize:'10px', fontFamily:'monospace' }}>{getTimeDiff(event.timestamp)}</span>
                  </div>
                  <div style={{ color:'#E6EDF3', fontSize:'11px', marginBottom:'2px', wordBreak:'break-all' }}>{event.message}</div>
                  <div style={{ color:'#8B949E', fontSize:'10px', fontFamily:'monospace' }}>
                    {event.ip} · {new Date(event.timestamp).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
                  </div>
                </div>
                <button onClick={() => onBlockIP(event.ip, `Blocked from live feed — ${event.type}`)}
                  style={{ padding:'3px 8px', background:'rgba(255,68,68,0.1)', color:'#FF4444', border:'1px solid rgba(255,68,68,0.2)', borderRadius:'4px', fontSize:'10px', cursor:'pointer', flexShrink:0, whiteSpace:'nowrap' }}>
                  Block
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected session detail */}
      {selectedSession && (
        <div style={{ background:'#161B22', borderRadius:'12px', border:`1px solid ${stateColor[selectedSession.state]}44`, padding:'20px', marginTop:'16px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
            <h3 style={{ color:'#E6EDF3', margin:0, fontSize:'15px', fontWeight:700 }}>
              Session Detail — {selectedSession.username}
            </h3>
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={() => onBlockIP(selectedSession.ip, `Blocked from session detail — ${selectedSession.state}`)}
                style={{ padding:'8px 16px', background:'rgba(255,68,68,0.15)', color:'#FF4444', border:'1px solid rgba(255,68,68,0.4)', borderRadius:'8px', fontSize:'12px', cursor:'pointer', fontWeight:700 }}>
                🚫 Block This IP
              </button>
              <button onClick={() => setSelectedSession(null)}
                style={{ padding:'8px 16px', background:'#21262D', color:'#8B949E', border:'1px solid #30363D', borderRadius:'8px', fontSize:'12px', cursor:'pointer' }}>
                Close
              </button>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'16px' }}>
            {[
              { label:'Real IP',     val:selectedSession.ip, mono:true, color:'#4FC3F7' },
              { label:'Location',    val:`${selectedSession.city}, ${selectedSession.country}`, color:'#E6EDF3' },
              { label:'Browser',     val:selectedSession.browser, color:'#E6EDF3' },
              { label:'OS',          val:selectedSession.os, color:'#E6EDF3' },
              { label:'State',       val:selectedSession.state, color:stateColor[selectedSession.state] },
              { label:'Risk Score',  val:`${selectedSession.riskScore}/100`, mono:true, color:stateColor[selectedSession.state] },
              { label:'Login Time',  val:selectedSession.startTime ? new Date(selectedSession.startTime).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit' }) : 'Unknown', color:'#8B949E' },
              { label:'Attacks',     val:selectedSession.attackCount || selectedSession.attackTypes?.length || 0, mono:true, color:'#FF8C00' },
            ].map(item => (
              <div key={item.label} style={{ background:'#0D1117', borderRadius:'8px', padding:'12px' }}>
                <div style={{ color:'#8B949E', fontSize:'10px', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'4px' }}>{item.label}</div>
                <div style={{ color:item.color, fontSize:'13px', fontWeight:600, fontFamily:item.mono?'monospace':'inherit', wordBreak:'break-all' }}>{item.val}</div>
              </div>
            ))}
          </div>

          {/* Attack types */}
          {selectedSession.attackTypes?.length > 0 && (
            <div style={{ marginBottom:'16px' }}>
              <div style={{ color:'#8B949E', fontSize:'11px', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>Attack Types Used</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                {selectedSession.attackTypes.map(type => (
                  <span key={type} style={{ padding:'3px 10px', borderRadius:'4px', fontSize:'11px', background:'rgba(255,68,68,0.1)', color:'#FF4444', border:'1px solid rgba(255,68,68,0.2)', fontWeight:500 }}>{type}</span>
                ))}
              </div>
            </div>
          )}

          {/* Session timeline */}
          {selectedSession.timeline?.length > 0 && (
            <div style={{ marginTop:'16px' }}>
              <div style={{ color:'#8B949E', fontSize:'11px', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>Session Timeline</div>
              <div style={{ maxHeight:'200px', overflowY:'auto', background:'#0D1117', borderRadius:'8px', padding:'12px' }}>
                {selectedSession.timeline.slice().reverse().map((event, i) => (
                  <div key={i} style={{ display:'flex', gap:'10px', marginBottom:'8px', alignItems:'flex-start' }}>
                    <div style={{ color:'#8B949E', fontSize:'10px', fontFamily:'monospace', flexShrink:0, marginTop:'1px' }}>
                      {new Date(event.timestamp).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
                    </div>
                    <div style={{ width:'4px', height:'4px', borderRadius:'50%', background:'#30363D', marginTop:'5px', flexShrink:0 }} />
                    <div>
                      <span style={{ color:event.action==='ATTACK'?'#FF4444':event.action==='LOGIN'?'#00FF88':'#8B949E', fontSize:'10px', fontWeight:600, marginRight:'6px' }}>{event.action}</span>
                      <span style={{ color:'#8B949E', fontSize:'11px' }}>{event.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default LiveTrackingPage
