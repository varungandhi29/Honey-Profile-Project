import { useState, useEffect } from 'react'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

const BlockedIPsPage = ({ data, onBlockIP, onUnblockIP, backendOnline }) => {
  const [blockedList, setBlockedList] = useState([])
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [manualIP, setManualIP] = useState('')
  const [manualReason, setManualReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')
  const [searchIP, setSearchIP] = useState('')

  // Local block log from engine
  const engineBlockLog = data?.blockLog || []

  // Fetch from backend
  const fetchBlocklist = async () => {
    if (!backendOnline) return
    try {
      const res = await fetch(`${BACKEND}/api/blocklist`)
      const d = await res.json()
      setBlockedList(d)
    } catch {}
  }

  useEffect(() => { fetchBlocklist() }, [backendOnline])

  // Merge engine + backend blocked IPs
  const allBlocked = backendOnline ? blockedList : engineBlockLog

  const filtered = allBlocked.filter(b => {
    const matchSearch = !searchIP || b.ip?.includes(searchIP)
    const matchFilter = filter === 'all' || (filter === 'permanent' && b.permanent) || (filter === 'temporary' && !b.permanent)
    return matchSearch && matchFilter
  })

  const handleManualBlock = async () => {
    if (!manualIP.trim()) return
    setLoading(true)
    await onBlockIP(manualIP.trim(), manualReason || 'Manual block by admin')
    setManualIP('')
    setManualReason('')
    setShowBlockModal(false)
    await fetchBlocklist()
    setLoading(false)
  }

  const handleUnblock = async (ip) => {
    await onUnblockIP(ip)
    await fetchBlocklist()
  }

  const cardStyle = { background:'#161B22', border:'1px solid #30363D', borderRadius:'12px', padding:'20px' }

  return (
    <div style={{ padding:'24px' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
        <div>
          <h2 style={{ color:'#E6EDF3', margin:0, fontSize:'20px', fontWeight:700 }}>🚫 Blocked IPs</h2>
          <p style={{ color:'#8B949E', fontSize:'13px', margin:'4px 0 0' }}>
            {allBlocked.length} IP{allBlocked.length !== 1 ? 's' : ''} permanently blocked · Attackers cannot reconnect
          </p>
        </div>
        <button onClick={() => setShowBlockModal(true)}
          style={{ padding:'10px 20px', background:'#FF4444', color:'white', border:'none', borderRadius:'8px', fontWeight:700, fontSize:'13px', cursor:'pointer' }}>
          + Block IP Manually
        </button>
      </div>

      {/* Manual block modal */}
      {showBlockModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={() => setShowBlockModal(false)}>
          <div style={{ background:'#161B22', border:'1px solid #FF4444', borderRadius:'16px', padding:'28px', width:'440px' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color:'#E6EDF3', margin:'0 0 20px' }}>Block IP Address</h3>
            <div style={{ marginBottom:'14px' }}>
              <label style={{ color:'#8B949E', fontSize:'11px', fontWeight:600, display:'block', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.06em' }}>IP Address *</label>
              <input value={manualIP} onChange={e => setManualIP(e.target.value)}
                placeholder="e.g. 185.220.101.42"
                style={{ width:'100%', padding:'10px 14px', background:'#0D1117', border:'1px solid #30363D', borderRadius:'8px', color:'#E6EDF3', fontSize:'13px', outline:'none', boxSizing:'border-box' }}
                onFocus={e => e.target.style.borderColor='#FF4444'}
                onBlur={e => e.target.style.borderColor='#30363D'}
              />
            </div>
            <div style={{ marginBottom:'20px' }}>
              <label style={{ color:'#8B949E', fontSize:'11px', fontWeight:600, display:'block', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Reason</label>
              <input value={manualReason} onChange={e => setManualReason(e.target.value)}
                placeholder="Reason for blocking (optional)"
                style={{ width:'100%', padding:'10px 14px', background:'#0D1117', border:'1px solid #30363D', borderRadius:'8px', color:'#E6EDF3', fontSize:'13px', outline:'none', boxSizing:'border-box' }}
              />
            </div>
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={handleManualBlock} disabled={loading || !manualIP.trim()}
                style={{ flex:1, padding:'11px', background: (!manualIP.trim()||loading)?'#21262D':'#FF4444', color: (!manualIP.trim()||loading)?'#8B949E':'white', border:'none', borderRadius:'8px', fontWeight:700, cursor: (!manualIP.trim()||loading)?'not-allowed':'pointer' }}>
                {loading ? '⏳ Blocking...' : '🚫 Block IP'}
              </button>
              <button onClick={() => setShowBlockModal(false)}
                style={{ flex:1, padding:'11px', background:'#21262D', color:'#E6EDF3', border:'1px solid #30363D', borderRadius:'8px', cursor:'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'20px' }}>
        {[
          { label:'Total Blocked', val:allBlocked.length, color:'#FF4444', icon:'🚫' },
          { label:'Permanent Blocks', val:allBlocked.filter(b=>b.permanent!==false).length, color:'#FF4444', icon:'🔒' },
          { label:'Attacks Prevented', val:allBlocked.reduce((acc,b) => acc + (b.attemptCount||0), 0), color:'#FFC107', icon:'⚡' },
          { label:'Countries Blocked', val:new Set(allBlocked.map(b=>b.country)).size, color:'#8B949E', icon:'🌍' }
        ].map(s => (
          <div key={s.label} style={{ ...cardStyle, textAlign:'center' }}>
            <div style={{ fontSize:'24px', marginBottom:'6px' }}>{s.icon}</div>
            <div style={{ color:s.color, fontSize:'24px', fontWeight:700, fontFamily:'monospace' }}>{s.val}</div>
            <div style={{ color:'#8B949E', fontSize:'11px', marginTop:'2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter + Search */}
      <div style={{ display:'flex', gap:'10px', marginBottom:'16px' }}>
        <input value={searchIP} onChange={e => setSearchIP(e.target.value)}
          placeholder="Search by IP address..."
          style={{ flex:1, padding:'9px 14px', background:'#161B22', border:'1px solid #30363D', borderRadius:'8px', color:'#E6EDF3', fontSize:'13px', outline:'none' }}
        />
        {['all','permanent','temporary'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding:'8px 14px', background:filter===f?'#FF4444':'#161B22', color:filter===f?'white':'#8B949E', border:'1px solid #30363D', borderRadius:'8px', fontSize:'12px', cursor:'pointer', fontWeight:filter===f?700:400, textTransform:'capitalize' }}>
            {f}
          </button>
        ))}
        <button onClick={fetchBlocklist}
          style={{ padding:'8px 14px', background:'#21262D', color:'#8B949E', border:'1px solid #30363D', borderRadius:'8px', fontSize:'12px', cursor:'pointer' }}>
          🔄 Refresh
        </button>
      </div>

      {/* Blocked IPs table */}
      {filtered.length === 0 ? (
        <div style={{ ...cardStyle, textAlign:'center', padding:'48px' }}>
          <div style={{ fontSize:'40px', marginBottom:'12px' }}>✅</div>
          <h3 style={{ color:'#E6EDF3', margin:'0 0 8px' }}>No blocked IPs</h3>
          <p style={{ color:'#8B949E', fontSize:'13px', margin:0 }}>Block attacker IPs from Active Sessions or manually above</p>
        </div>
      ) : (
        <div style={{ ...cardStyle, padding:0, overflow:'hidden' }}>
          {/* Table header */}
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1.5fr 1.5fr 2fr 1.5fr 1fr 1fr auto', padding:'10px 16px', background:'#0D1117', borderBottom:'1px solid #30363D' }}>
            {['IP Address','Country','City','Reason','Blocked At','Attacks','Attempts','Actions'].map(h => (
              <div key={h} style={{ color:'#8B949E', fontSize:'11px', fontWeight:600, letterSpacing:'0.05em' }}>{h}</div>
            ))}
          </div>
          {/* Table rows */}
          {filtered.map((b, i) => (
            <div key={b.ip || i}
              style={{ display:'grid', gridTemplateColumns:'2fr 1.5fr 1.5fr 2fr 1.5fr 1fr 1fr auto', padding:'12px 16px', borderBottom: i < filtered.length-1 ? '1px solid #21262D' : 'none', alignItems:'center', transition:'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background='#1C2128'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#FF4444', flexShrink:0 }} />
                <span style={{ color:'#E6EDF3', fontFamily:'monospace', fontSize:'13px', fontWeight:600 }}>{b.ip}</span>
              </div>
              <div style={{ color:'#8B949E', fontSize:'12px' }}>{b.country || 'Unknown'}</div>
              <div style={{ color:'#8B949E', fontSize:'12px' }}>{b.city || 'Unknown'}</div>
              <div style={{ color:'#8B949E', fontSize:'12px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={b.reason}>{b.reason || 'Manual block'}</div>
              <div style={{ color:'#8B949E', fontSize:'11px', fontFamily:'monospace' }}>
                {b.blockedAt ? new Date(b.blockedAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : 'Unknown'}
              </div>
              <div style={{ color:'#FF4444', fontSize:'12px', fontWeight:700, fontFamily:'monospace' }}>{b.attackCount || 0}</div>
              <div style={{ color:'#FFC107', fontSize:'12px', fontWeight:700, fontFamily:'monospace' }}>{b.attemptCount || 0}</div>
              <button onClick={() => handleUnblock(b.ip)}
                style={{ padding:'5px 12px', background:'rgba(0,255,136,0.1)', color:'#00FF88', border:'1px solid rgba(0,255,136,0.3)', borderRadius:'6px', fontSize:'11px', cursor:'pointer', whiteSpace:'nowrap', fontWeight:600 }}>
                ✓ Unblock
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default BlockedIPsPage
