import { useState, useEffect } from 'react'
import { BACKEND } from '../../utils/backendUrl'

const BlockedIPsPage = ({
  data,
  onBlockIP,
  onUnblockIP,
  onBlockFingerprint,
  onUnblockFingerprint,
  onUnblockClient,
  backendOnline
}) => {
  const [activeTab, setActiveTab] = useState('ips') // 'ips' | 'fingerprints' | 'exemptions' | 'audit'
  const [blockedList, setBlockedList] = useState([])
  const [blockedFingerprints, setBlockedFingerprints] = useState([])
  const [exemptionsList, setExemptionsList] = useState([])
  const [auditLogs, setAuditLogs] = useState([])

  const [showBlockModal, setShowBlockModal] = useState(false)
  const [manualIP, setManualIP] = useState('')
  const [manualReason, setManualReason] = useState('')
  const [alsoBlockFingerprint, setAlsoBlockFingerprint] = useState(false)
  const [associatedFP, setAssociatedFP] = useState('')
  const [loading, setLoading] = useState(false)

  // Confirmation modal for "Unblock This Client"
  const [showClientModal, setShowClientModal] = useState(false)
  const [clientToUnblock, setClientToUnblock] = useState(null)
  const [clientReason, setClientReason] = useState('Full client unblock by admin')
  const [unblockingClient, setUnblockingClient] = useState(false)

  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const getAuthHeaders = () => {
    const token = sessionStorage.getItem('honeyshield_admin_token')
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  }

  // Local block log from engine
  const engineBlockLog = data?.blockLog || []

  // Fetch blocklists from backend
  const fetchBlocklists = async () => {
    if (!backendOnline) return
    try {
      const resIP = await fetch(`${BACKEND}/api/blocklist`, { headers: getAuthHeaders() })
      const dIP = await resIP.json()
      if (Array.isArray(dIP)) setBlockedList(dIP)

      const resFP = await fetch(`${BACKEND}/api/blocklist/fingerprints`, { headers: getAuthHeaders() })
      const dFP = await resFP.json()
      if (Array.isArray(dFP)) setBlockedFingerprints(dFP)
    } catch {}
  }

  // Fetch 24h VPN exemptions
  const fetchExemptions = async () => {
    if (!backendOnline) return
    try {
      const res = await fetch(`${BACKEND}/api/blocklist/exemptions`, { headers: getAuthHeaders() })
      if (res.ok) {
        const d = await res.json()
        if (Array.isArray(d)) setExemptionsList(d)
      }
    } catch {}
  }

  // Fetch audit logs
  const fetchAuditLogs = async () => {
    if (!backendOnline) return
    try {
      const res = await fetch(`${BACKEND}/api/blocklist/audit-logs`, { headers: getAuthHeaders() })
      if (res.ok) {
        const d = await res.json()
        if (Array.isArray(d)) setAuditLogs(d)
      }
    } catch {}
  }

  useEffect(() => {
    fetchBlocklists()
    if (activeTab === 'exemptions') fetchExemptions()
    if (activeTab === 'audit') fetchAuditLogs()
  }, [backendOnline, activeTab])

  // Merge engine + backend blocked IPs deduplicated by IP
  const ipMap = new Map()
  engineBlockLog.forEach(b => { if (b.ip) ipMap.set(b.ip, b) })
  if (Array.isArray(blockedList)) {
    blockedList.forEach(b => { if (b.ip) ipMap.set(b.ip, b) })
  }
  const allBlockedIPs = Array.from(ipMap.values())

  const filteredIPs = allBlockedIPs.filter(b => {
    const matchSearch = !searchQuery || b.ip?.includes(searchQuery) || b.fingerprint?.includes(searchQuery)
    const matchFilter = filter === 'all' || (filter === 'permanent' && b.permanent) || (filter === 'temporary' && !b.permanent)
    return matchSearch && matchFilter
  })

  const filteredFPs = blockedFingerprints.filter(fp => {
    const matchSearch = !searchQuery || fp.fingerprint?.includes(searchQuery) || fp.reason?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchSearch
  })

  const handleManualBlock = async () => {
    if (!manualIP.trim()) return
    setLoading(true)
    await onBlockIP(manualIP.trim(), manualReason || 'Manual block by admin')

    if (alsoBlockFingerprint && associatedFP.trim()) {
      await onBlockFingerprint?.(associatedFP.trim(), manualReason || 'Manual block by admin')
    }

    setManualIP('')
    setManualReason('')
    setAssociatedFP('')
    setAlsoBlockFingerprint(false)
    setShowBlockModal(false)
    await fetchBlocklists()
    setLoading(false)
  }

  // Action 1: Unblock IP only
  const handleUnblockIP = async (ip) => {
    await onUnblockIP(ip)
    await fetchBlocklists()
    await fetchAuditLogs()
  }

  // Action 2: Unblock Fingerprint (Device) only
  const handleUnblockFP = async (fp) => {
    if (onUnblockFingerprint) {
      await onUnblockFingerprint(fp)
    } else {
      try {
        await fetch(`${BACKEND}/api/blocklist/fingerprint/${encodeURIComponent(fp)}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        })
      } catch {}
    }
    await fetchBlocklists()
    await fetchAuditLogs()
  }

  // Action 3: Unblock This Client (Both IP & Fingerprint + Exemption)
  const openClientModal = (ip, fingerprint) => {
    setClientToUnblock({ ip, fingerprint })
    setClientReason('Full client unblock by admin')
    setShowClientModal(true)
  }

  const handleConfirmClientUnblock = async () => {
    if (!clientToUnblock) return
    setUnblockingClient(true)
    try {
      if (onUnblockClient) {
        await onUnblockClient({
          ip: clientToUnblock.ip,
          fingerprint: clientToUnblock.fingerprint,
          reason: clientReason
        })
      } else {
        await fetch(`${BACKEND}/api/blocklist/unblock-client`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            ip: clientToUnblock.ip,
            fingerprint: clientToUnblock.fingerprint,
            reason: clientReason
          })
        })
      }
      setShowClientModal(false)
      setClientToUnblock(null)
      await fetchBlocklists()
      await fetchExemptions()
      await fetchAuditLogs()
    } catch (err) {
      console.error('[UNBLOCK CLIENT ERROR]', err)
    } finally {
      setUnblockingClient(false)
    }
  }

  // Revoke 24h Exemption
  const handleRevokeExemption = async (ip) => {
    try {
      await fetch(`${BACKEND}/api/blocklist/exemptions/${encodeURIComponent(ip)}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      await fetchExemptions()
      await fetchAuditLogs()
    } catch {}
  }

  const cardStyle = { background:'#161B22', border:'1px solid #30363D', borderRadius:'12px', padding:'20px' }

  return (
    <div style={{ padding:'24px' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
        <div>
          <h2 style={{ color:'#E6EDF3', margin:0, fontSize:'20px', fontWeight:700 }}>
            🛡️ Threat Blocklist & Active Defense Lifecycle
          </h2>
          <p style={{ color:'#8B949E', fontSize:'13px', margin:'4px 0 0' }}>
            Multi-signal blocklist, device fingerprint quarantines, 24h VPN exemptions, and audit logging
          </p>
        </div>
        <button onClick={() => setShowBlockModal(true)}
          style={{ padding:'10px 20px', background:'#FF4444', color:'white', border:'none', borderRadius:'8px', fontWeight:700, fontSize:'13px', cursor:'pointer' }}>
          + Block IP Manually
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:'8px', borderBottom:'1px solid #30363D', marginBottom:'20px' }}>
        <button onClick={() => setActiveTab('ips')}
          style={{ padding:'10px 16px', background:'transparent', border:'none', borderBottom: activeTab === 'ips' ? '3px solid #00FF88' : '3px solid transparent', color: activeTab === 'ips' ? '#00FF88' : '#8B949E', fontWeight: activeTab === 'ips' ? 700 : 500, fontSize:'14px', cursor:'pointer' }}>
          🚫 Blocked IPs ({allBlockedIPs.length})
        </button>
        <button onClick={() => setActiveTab('fingerprints')}
          style={{ padding:'10px 16px', background:'transparent', border:'none', borderBottom: activeTab === 'fingerprints' ? '3px solid #00FF88' : '3px solid transparent', color: activeTab === 'fingerprints' ? '#00FF88' : '#8B949E', fontWeight: activeTab === 'fingerprints' ? 700 : 500, fontSize:'14px', cursor:'pointer' }}>
          🔍 Blocked Fingerprints ({blockedFingerprints.length})
        </button>
        <button onClick={() => setActiveTab('exemptions')}
          style={{ padding:'10px 16px', background:'transparent', border:'none', borderBottom: activeTab === 'exemptions' ? '3px solid #00FF88' : '3px solid transparent', color: activeTab === 'exemptions' ? '#00FF88' : '#8B949E', fontWeight: activeTab === 'exemptions' ? 700 : 500, fontSize:'14px', cursor:'pointer' }}>
          🌐 VPN Exemptions (24h) ({exemptionsList.length})
        </button>
        <button onClick={() => setActiveTab('audit')}
          style={{ padding:'10px 16px', background:'transparent', border:'none', borderBottom: activeTab === 'audit' ? '3px solid #00FF88' : '3px solid transparent', color: activeTab === 'audit' ? '#00FF88' : '#8B949E', fontWeight: activeTab === 'audit' ? 700 : 500, fontSize:'14px', cursor:'pointer' }}>
          📜 Audit Log ({auditLogs.length})
        </button>
      </div>

      {/* Manual block modal */}
      {showBlockModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={() => setShowBlockModal(false)}>
          <div style={{ background:'#161B22', border:'1px solid #FF4444', borderRadius:'16px', padding:'28px', width:'460px' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color:'#E6EDF3', margin:'0 0 20px' }}>Block Attacker</h3>
            <div style={{ marginBottom:'14px' }}>
              <label style={{ color:'#8B949E', fontSize:'11px', fontWeight:600, display:'block', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.06em' }}>IP Address *</label>
              <input value={manualIP} onChange={e => setManualIP(e.target.value)}
                placeholder="e.g. 185.220.101.42"
                style={{ width:'100%', padding:'10px 14px', background:'#0D1117', border:'1px solid #30363D', borderRadius:'8px', color:'#E6EDF3', fontSize:'13px', outline:'none', boxSizing:'border-box' }}
                onFocus={e => e.target.style.borderColor='#FF4444'}
                onBlur={e => e.target.style.borderColor='#30363D'}
              />
            </div>
            <div style={{ marginBottom:'14px' }}>
              <label style={{ color:'#8B949E', fontSize:'11px', fontWeight:600, display:'block', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Reason</label>
              <input value={manualReason} onChange={e => setManualReason(e.target.value)}
                placeholder="Reason for blocking (optional)"
                style={{ width:'100%', padding:'10px 14px', background:'#0D1117', border:'1px solid #30363D', borderRadius:'8px', color:'#E6EDF3', fontSize:'13px', outline:'none', boxSizing:'border-box' }}
              />
            </div>

            <div style={{ marginBottom:'20px', padding:'12px', background:'#0D1117', borderRadius:'8px', border:'1px solid #21262D' }}>
              <label style={{ display:'flex', alignItems:'center', gap:'8px', color:'#E6EDF3', fontSize:'13px', cursor:'pointer' }}>
                <input type="checkbox" checked={alsoBlockFingerprint} onChange={e => setAlsoBlockFingerprint(e.target.checked)} />
                <span>Also block browser fingerprint</span>
              </label>
              {alsoBlockFingerprint && (
                <input value={associatedFP} onChange={e => setAssociatedFP(e.target.value)}
                  placeholder="Paste 64-char fingerprint hash"
                  style={{ width:'100%', marginTop:'10px', padding:'8px 12px', background:'#161B22', border:'1px solid #30363D', borderRadius:'6px', color:'#4FC3F7', fontFamily:'monospace', fontSize:'11px', outline:'none', boxSizing:'border-box' }}
                />
              )}
            </div>

            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={handleManualBlock} disabled={loading || !manualIP.trim()}
                style={{ flex:1, padding:'11px', background: (!manualIP.trim()||loading)?'#21262D':'#FF4444', color: (!manualIP.trim()||loading)?'#8B949E':'white', border:'none', borderRadius:'8px', fontWeight:700, cursor: (!manualIP.trim()||loading)?'not-allowed':'pointer' }}>
                {loading ? '⏳ Blocking...' : '🚫 Block Attacker'}
              </button>
              <button onClick={() => setShowBlockModal(false)}
                style={{ flex:1, padding:'11px', background:'#21262D', color:'#E6EDF3', border:'1px solid #30363D', borderRadius:'8px', cursor:'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for "Unblock This Client" */}
      {showClientModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:250, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={() => setShowClientModal(false)}>
          <div style={{ background:'#161B22', border:'1px solid #00FF88', borderRadius:'16px', padding:'28px', width:'500px', boxShadow:'0 0 30px rgba(0,255,136,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px' }}>
              <span style={{ fontSize:'24px' }}>⚡</span>
              <h3 style={{ color:'#00FF88', margin:0, fontSize:'18px' }}>Confirm Full Client Unblock</h3>
            </div>

            <div style={{ background:'rgba(0,255,136,0.06)', border:'1px solid rgba(0,255,136,0.2)', borderRadius:'8px', padding:'14px', marginBottom:'16px', fontSize:'13px', lineHeight:1.6, color:'#E6EDF3' }}>
              This action will simultaneously:
              <ul style={{ margin:'8px 0 0 16px', padding:0, color:'#A7F3D0' }}>
                <li>Remove the <strong>IP address block</strong> from database and cache</li>
                <li>Remove the <strong>device browser fingerprint</strong> quarantine</li>
                <li>Reset failed login threshold counters for this host</li>
                <li>If a datacenter or VPN range is detected, grant a <strong>24-hour exemption</strong></li>
                <li>Instantly transmit the unblock signal to the client browser</li>
              </ul>
            </div>

            <div style={{ background:'#0D1117', border:'1px solid #30363D', borderRadius:'8px', padding:'12px', marginBottom:'16px', fontSize:'12px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                <span style={{ color:'#8B949E' }}>Target IP:</span>
                <span style={{ color:'#E6EDF3', fontFamily:'monospace', fontWeight:700 }}>{clientToUnblock?.ip || 'N/A'}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:'#8B949E' }}>Fingerprint:</span>
                <span style={{ color:'#4FC3F7', fontFamily:'monospace' }}>
                  {clientToUnblock?.fingerprint ? `${clientToUnblock.fingerprint.substr(0,18)}...` : 'None linked'}
                </span>
              </div>
            </div>

            <div style={{ marginBottom:'20px' }}>
              <label style={{ color:'#8B949E', fontSize:'11px', fontWeight:600, display:'block', marginBottom:'6px', textTransform:'uppercase' }}>Reason for Unblock</label>
              <input value={clientReason} onChange={e => setClientReason(e.target.value)}
                placeholder="e.g. Authorized security testing or false positive"
                style={{ width:'100%', padding:'10px 14px', background:'#0D1117', border:'1px solid #30363D', borderRadius:'8px', color:'#E6EDF3', fontSize:'13px', outline:'none', boxSizing:'border-box' }}
              />
            </div>

            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={handleConfirmClientUnblock} disabled={unblockingClient}
                style={{ flex:1, padding:'11px', background:'#00FF88', color:'#02140A', border:'none', borderRadius:'8px', fontWeight:800, cursor:unblockingClient?'not-allowed':'pointer' }}>
                {unblockingClient ? '⏳ Unblocking...' : '✓ Confirm Full Unblock'}
              </button>
              <button onClick={() => setShowClientModal(false)} disabled={unblockingClient}
                style={{ flex:1, padding:'11px', background:'#21262D', color:'#E6EDF3', border:'1px solid #30363D', borderRadius:'8px', cursor:'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: BLOCKED IPS */}
      {activeTab === 'ips' && (
        <>
          {/* Stats row */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'20px' }}>
            {[
              { label:'Total Blocked IPs', val:allBlockedIPs.length, color:'#FF4444', icon:'🚫' },
              { label:'Permanent Blocks', val:allBlockedIPs.filter(b=>b.permanent!==false).length, color:'#FF4444', icon:'🔒' },
              { label:'Attacks Prevented', val:allBlockedIPs.reduce((acc,b) => acc + (b.attemptCount||0), 0), color:'#FFC107', icon:'⚡' },
              { label:'Countries Blocked', val:new Set(allBlockedIPs.map(b=>b.country)).size, color:'#8B949E', icon:'🌍' }
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
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by IP address or fingerprint..."
              style={{ flex:1, padding:'9px 14px', background:'#161B22', border:'1px solid #30363D', borderRadius:'8px', color:'#E6EDF3', fontSize:'13px', outline:'none' }}
            />
            {['all','permanent','temporary'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding:'8px 14px', background:filter===f?'#FF4444':'#161B22', color:filter===f?'white':'#8B949E', border:'1px solid #30363D', borderRadius:'8px', fontSize:'12px', cursor:'pointer', fontWeight:filter===f?700:400, textTransform:'capitalize' }}>
                {f}
              </button>
            ))}
            <button onClick={fetchBlocklists}
              style={{ padding:'8px 14px', background:'#21262D', color:'#8B949E', border:'1px solid #30363D', borderRadius:'8px', fontSize:'12px', cursor:'pointer' }}>
              🔄 Refresh
            </button>
          </div>

          {/* Blocked IPs table */}
          {filteredIPs.length === 0 ? (
            <div style={{ ...cardStyle, textAlign:'center', padding:'48px' }}>
              <div style={{ fontSize:'40px', marginBottom:'12px' }}>✅</div>
              <h3 style={{ color:'#E6EDF3', margin:'0 0 8px' }}>No blocked IPs</h3>
              <p style={{ color:'#8B949E', fontSize:'13px', margin:0 }}>Block attacker IPs from Active Sessions or manually above</p>
            </div>
          ) : (
            <div style={{ ...cardStyle, padding:0, overflow:'hidden' }}>
              <div style={{ display:'grid', gridTemplateColumns:'2.2fr 1.2fr 1.2fr 2fr 1.4fr 0.8fr 0.8fr 2.6fr', padding:'10px 16px', background:'#0D1117', borderBottom:'1px solid #30363D' }}>
                {['IP Address / Fingerprint','Country','City','Reason','Blocked At','Attacks','Attempts','Actions (3 Lifecycle Options)'].map(h => (
                  <div key={h} style={{ color:'#8B949E', fontSize:'11px', fontWeight:600, letterSpacing:'0.05em' }}>{h}</div>
                ))}
              </div>
              {filteredIPs.map((b, i) => (
                <div key={b.ip || i}
                  style={{ display:'grid', gridTemplateColumns:'2.2fr 1.2fr 1.2fr 2fr 1.4fr 0.8fr 0.8fr 2.6fr', padding:'12px 16px', borderBottom: i < filteredIPs.length-1 ? '1px solid #21262D' : 'none', alignItems:'center', transition:'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background='#1C2128'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                      <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#FF4444', flexShrink:0 }} />
                      <span style={{ color:'#E6EDF3', fontFamily:'monospace', fontSize:'13px', fontWeight:600 }}>{b.ip}</span>
                    </div>
                    {b.fingerprint && (
                      <div style={{ fontSize:'10px', color:'#4FC3F7', fontFamily:'monospace', marginTop:'2px', paddingLeft:'16px' }}>
                        FP: {b.fingerprint.substr(0,14)}...
                      </div>
                    )}
                  </div>
                  <div style={{ color:'#8B949E', fontSize:'12px' }}>{b.country || 'Unknown'}</div>
                  <div style={{ color:'#8B949E', fontSize:'12px' }}>{b.city || 'Unknown'}</div>
                  <div style={{ color:'#8B949E', fontSize:'12px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={b.reason}>{b.reason || 'Manual block'}</div>
                  <div style={{ color:'#8B949E', fontSize:'11px', fontFamily:'monospace' }}>
                    {b.blockedAt ? new Date(b.blockedAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : 'Unknown'}
                  </div>
                  <div style={{ color:'#FF4444', fontSize:'12px', fontWeight:700, fontFamily:'monospace' }}>{b.attackCount || 0}</div>
                  <div style={{ color:'#FFC107', fontSize:'12px', fontWeight:700, fontFamily:'monospace' }}>{b.attemptCount || 0}</div>

                  {/* 3 Distinct Unblock Actions */}
                  <div style={{ display:'flex', gap:'6px', flexWrap:'nowrap' }}>
                    <button onClick={() => handleUnblockIP(b.ip)}
                      title="Lift IP block only"
                      style={{ padding:'5px 8px', background:'rgba(0,255,136,0.1)', color:'#00FF88', border:'1px solid rgba(0,255,136,0.3)', borderRadius:'6px', fontSize:'11px', cursor:'pointer', whiteSpace:'nowrap', fontWeight:600 }}>
                      Unblock IP
                    </button>

                    {b.fingerprint && (
                      <button onClick={() => handleUnblockFP(b.fingerprint)}
                        title="Lift Device Fingerprint block only"
                        style={{ padding:'5px 8px', background:'rgba(79,195,247,0.1)', color:'#4FC3F7', border:'1px solid rgba(79,195,247,0.3)', borderRadius:'6px', fontSize:'11px', cursor:'pointer', whiteSpace:'nowrap', fontWeight:600 }}>
                        Unblock Device
                      </button>
                    )}

                    <button onClick={() => openClientModal(b.ip, b.fingerprint)}
                      title="Complete Client Reset (IP + Device + Thresholds + Conditional VPN Exemption)"
                      style={{ padding:'5px 10px', background:'#00FF88', color:'#02140A', border:'none', borderRadius:'6px', fontSize:'11px', cursor:'pointer', whiteSpace:'nowrap', fontWeight:800 }}>
                      ⚡ Unblock Client
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* TAB 2: BLOCKED FINGERPRINTS */}
      {activeTab === 'fingerprints' && (
        <>
          <div style={{ display:'flex', gap:'10px', marginBottom:'16px' }}>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by fingerprint hash or reason..."
              style={{ flex:1, padding:'9px 14px', background:'#161B22', border:'1px solid #30363D', borderRadius:'8px', color:'#E6EDF3', fontSize:'13px', outline:'none' }}
            />
            <button onClick={fetchBlocklists}
              style={{ padding:'8px 14px', background:'#21262D', color:'#8B949E', border:'1px solid #30363D', borderRadius:'8px', fontSize:'12px', cursor:'pointer' }}>
              🔄 Refresh
            </button>
          </div>

          {filteredFPs.length === 0 ? (
            <div style={{ ...cardStyle, textAlign:'center', padding:'48px' }}>
              <div style={{ fontSize:'40px', marginBottom:'12px' }}>🔍</div>
              <h3 style={{ color:'#E6EDF3', margin:'0 0 8px' }}>No blocked fingerprints</h3>
              <p style={{ color:'#8B949E', fontSize:'13px', margin:0 }}>Fingerprint blocks prevent attackers from bypassing IP blocks via VPN or proxy networks</p>
            </div>
          ) : (
            <div style={{ ...cardStyle, padding:0, overflow:'hidden' }}>
              <div style={{ display:'grid', gridTemplateColumns:'2.5fr 2fr 2fr 1.5fr 1fr auto', padding:'10px 16px', background:'#0D1117', borderBottom:'1px solid #30363D' }}>
                {['Fingerprint Hash','Associated IPs','Reason','Blocked At','Attempts','Actions'].map(h => (
                  <div key={h} style={{ color:'#8B949E', fontSize:'11px', fontWeight:600, letterSpacing:'0.05em' }}>{h}</div>
                ))}
              </div>
              {filteredFPs.map((fp, i) => (
                <div key={fp.fingerprint || i}
                  style={{ display:'grid', gridTemplateColumns:'2.5fr 2fr 2fr 1.5fr 1fr auto', padding:'12px 16px', borderBottom: i < filteredFPs.length-1 ? '1px solid #21262D' : 'none', alignItems:'center', transition:'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background='#1C2128'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <div style={{ color:'#4FC3F7', fontFamily:'monospace', fontSize:'12px', fontWeight:600, wordBreak:'break-all' }} title={fp.fingerprint}>
                    🔑 {fp.fingerprint ? `${fp.fingerprint.substr(0,16)}...` : 'Unknown'}
                  </div>
                  <div style={{ color:'#E6EDF3', fontSize:'11px', fontFamily:'monospace' }}>
                    {fp.associatedIPs?.length > 0 ? (
                      <div style={{ display:'flex', flexWrap:'wrap', gap:'4px' }}>
                        {fp.associatedIPs.map(ip => (
                          <span key={ip} style={{ padding:'2px 6px', background:'#21262D', borderRadius:'4px', color:'#E6EDF3' }}>{ip}</span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color:'#8B949E' }}>None logged</span>
                    )}
                  </div>
                  <div style={{ color:'#8B949E', fontSize:'12px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={fp.reason}>{fp.reason || 'Blocked by admin'}</div>
                  <div style={{ color:'#8B949E', fontSize:'11px', fontFamily:'monospace' }}>
                    {fp.blockedAt ? new Date(fp.blockedAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : 'Unknown'}
                  </div>
                  <div style={{ color:'#FFC107', fontSize:'12px', fontWeight:700, fontFamily:'monospace' }}>{fp.attemptCount || 0}</div>
                  <button onClick={() => handleUnblockFP(fp.fingerprint)}
                    style={{ padding:'5px 12px', background:'rgba(0,255,136,0.1)', color:'#00FF88', border:'1px solid rgba(0,255,136,0.3)', borderRadius:'6px', fontSize:'11px', cursor:'pointer', whiteSpace:'nowrap', fontWeight:600 }}>
                    ✓ Unblock Device
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* TAB 3: VPN EXEMPTIONS (24h) */}
      {activeTab === 'exemptions' && (
        <>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
            <span style={{ color:'#8B949E', fontSize:'13px' }}>
              Active 24-hour exemptions granted to unblocked datacenter/VPN IP ranges to prevent immediate re-blocking.
            </span>
            <button onClick={fetchExemptions}
              style={{ padding:'8px 14px', background:'#21262D', color:'#8B949E', border:'1px solid #30363D', borderRadius:'8px', fontSize:'12px', cursor:'pointer' }}>
              🔄 Refresh Exemptions
            </button>
          </div>

          {exemptionsList.length === 0 ? (
            <div style={{ ...cardStyle, textAlign:'center', padding:'48px' }}>
              <div style={{ fontSize:'40px', marginBottom:'12px' }}>🌐</div>
              <h3 style={{ color:'#E6EDF3', margin:'0 0 8px' }}>No active 24h VPN exemptions</h3>
              <p style={{ color:'#8B949E', fontSize:'13px', margin:0 }}>
                When an IP flagged as datacenter/VPN is unblocked by an admin, a conditional 24h exemption is recorded here.
              </p>
            </div>
          ) : (
            <div style={{ ...cardStyle, padding:0, overflow:'hidden' }}>
              <div style={{ display:'grid', gridTemplateColumns:'2fr 2fr 1.5fr 1.5fr 1.5fr auto', padding:'10px 16px', background:'#0D1117', borderBottom:'1px solid #30363D' }}>
                {['IP Address & Status Badge','Reason / Original Flag','Exempted By','Exempted At','Expires At','Actions'].map(h => (
                  <div key={h} style={{ color:'#8B949E', fontSize:'11px', fontWeight:600, letterSpacing:'0.05em' }}>{h}</div>
                ))}
              </div>
              {exemptionsList.map((ex, i) => (
                <div key={ex.ip || i}
                  style={{ display:'grid', gridTemplateColumns:'2fr 2fr 1.5fr 1.5fr 1.5fr auto', padding:'12px 16px', borderBottom: i < exemptionsList.length-1 ? '1px solid #21262D' : 'none', alignItems:'center' }}>
                  <div>
                    <div style={{ color:'#00FF88', fontFamily:'monospace', fontSize:'13px', fontWeight:700 }}>{ex.ip}</div>
                    <div style={{ display:'inline-block', marginTop:'4px', padding:'2px 8px', background:'rgba(0,255,136,0.15)', border:'1px solid #00FF88', borderRadius:'4px', color:'#00FF88', fontSize:'10px', fontWeight:700 }}>
                      VPN detected — admin exempted
                    </div>
                  </div>
                  <div>
                    <div style={{ color:'#E6EDF3', fontSize:'12px' }}>{ex.reason}</div>
                    <div style={{ color:'#8B949E', fontSize:'11px' }}>Flag: {ex.originalReason || 'Datacenter / VPN Range'}</div>
                  </div>
                  <div style={{ color:'#E6EDF3', fontSize:'12px', fontWeight:600 }}>{ex.exemptedBy || 'admin'}</div>
                  <div style={{ color:'#8B949E', fontSize:'11px', fontFamily:'monospace' }}>
                    {ex.exemptedAt ? new Date(ex.exemptedAt).toLocaleString() : 'N/A'}
                  </div>
                  <div style={{ color:'#FFC107', fontSize:'11px', fontFamily:'monospace', fontWeight:600 }}>
                    {ex.expiresAt ? new Date(ex.expiresAt).toLocaleString() : '24 hours'}
                  </div>
                  <button onClick={() => handleRevokeExemption(ex.ip)}
                    style={{ padding:'5px 12px', background:'rgba(255,68,68,0.1)', color:'#FF4444', border:'1px solid rgba(255,68,68,0.3)', borderRadius:'6px', fontSize:'11px', cursor:'pointer', whiteSpace:'nowrap', fontWeight:600 }}>
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* TAB 4: AUDIT LOG */}
      {activeTab === 'audit' && (
        <>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
            <span style={{ color:'#8B949E', fontSize:'13px' }}>
              Immutable SOC audit trail tracking all block, unblock, and client lifecycle modifications.
            </span>
            <button onClick={fetchAuditLogs}
              style={{ padding:'8px 14px', background:'#21262D', color:'#8B949E', border:'1px solid #30363D', borderRadius:'8px', fontSize:'12px', cursor:'pointer' }}>
              🔄 Refresh Audit Log
            </button>
          </div>

          {auditLogs.length === 0 ? (
            <div style={{ ...cardStyle, textAlign:'center', padding:'48px' }}>
              <div style={{ fontSize:'40px', marginBottom:'12px' }}>📜</div>
              <h3 style={{ color:'#E6EDF3', margin:'0 0 8px' }}>No audit records</h3>
              <p style={{ color:'#8B949E', fontSize:'13px', margin:0 }}>Block and unblock operations will automatically be cataloged here.</p>
            </div>
          ) : (
            <div style={{ ...cardStyle, padding:0, overflow:'hidden' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1.5fr 2fr 1fr 1fr 2.5fr', padding:'10px 16px', background:'#0D1117', borderBottom:'1px solid #30363D' }}>
                {['Timestamp','Action','Target','Target Type','Admin','Reason & Details'].map(h => (
                  <div key={h} style={{ color:'#8B949E', fontSize:'11px', fontWeight:600, letterSpacing:'0.05em' }}>{h}</div>
                ))}
              </div>
              {auditLogs.map((log, i) => {
                const isUnblock = log.action?.startsWith('UNBLOCK')
                return (
                  <div key={log._id || i}
                    style={{ display:'grid', gridTemplateColumns:'1.5fr 1.5fr 2fr 1fr 1fr 2.5fr', padding:'12px 16px', borderBottom: i < auditLogs.length-1 ? '1px solid #21262D' : 'none', alignItems:'center' }}>
                    <div style={{ color:'#8B949E', fontSize:'11px', fontFamily:'monospace' }}>
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                    </div>
                    <div>
                      <span style={{
                        padding:'3px 8px',
                        borderRadius:'4px',
                        fontSize:'11px',
                        fontWeight:800,
                        background: isUnblock ? 'rgba(0,255,136,0.15)' : 'rgba(255,68,68,0.15)',
                        border: `1px solid ${isUnblock ? '#00FF88' : '#FF4444'}`,
                        color: isUnblock ? '#00FF88' : '#FF4444'
                      }}>
                        {log.action}
                      </span>
                    </div>
                    <div style={{ color:'#E6EDF3', fontSize:'12px', fontFamily:'monospace', wordBreak:'break-all' }}>
                      {log.target}
                    </div>
                    <div style={{ color:'#8B949E', fontSize:'11px', fontWeight:600 }}>
                      {log.targetType}
                    </div>
                    <div style={{ color:'#4FC3F7', fontSize:'12px', fontWeight:700 }}>
                      {log.admin || 'admin'}
                    </div>
                    <div>
                      <div style={{ color:'#E6EDF3', fontSize:'12px' }}>{log.reason || 'N/A'}</div>
                      {log.details?.cleared && (
                        <div style={{ color:'#8B949E', fontSize:'10px', marginTop:'2px' }}>
                          Cleared: {Object.keys(log.details.cleared).filter(k => log.details.cleared[k]).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default BlockedIPsPage
