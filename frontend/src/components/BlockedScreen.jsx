import React, { useState, useEffect, useId } from 'react'
import { ShieldAlert, Terminal, Download, AlertTriangle, Cpu, Globe, Lock, RefreshCw, XCircle, Skull, FileText, CheckCircle } from 'lucide-react'
import { generateFingerprint } from '../utils/fingerprint'

export default function BlockedScreen({ reason, session, honeyCount = 4 }) {
  const [forensics, setForensics] = useState({
    ip: session?.ip || 'Detecting...',
    country: session?.country || 'Detecting...',
    city: session?.city || 'Detecting...',
    isp: session?.isp || 'Detecting...',
    lat: session?.lat || null,
    lng: session?.lng || null,
    fingerprint: session?.fingerprint || 'Computing...',
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    screen: `${window.screen.width}x${window.screen.height}`,
    cores: navigator.hardwareConcurrency || 8,
    memory: navigator.deviceMemory ? `${navigator.deviceMemory} GB` : '8 GB',
    timestamp: new Date().toISOString(),
    incidentId: `HS-INC-${Math.random().toString(36).substring(2, 9).toUpperCase()}-${Date.now().toString().slice(-4)}`
  })

  const [activeTab, setActiveTab] = useState('overview')
  const [appealOpen, setAppealOpen] = useState(false)
  const [appealText, setAppealText] = useState('')
  const [appealStatus, setAppealStatus] = useState(null) // 'evaluating', 'denied'
  const [typewriterText, setTypewriterText] = useState('')
  const [copied, setCopied] = useState(false)

  const taunts = [
    "Did you really think this was an unpatched corporate portal?",
    "Every SQL payload, directory traversal, and fake credential you touched was executed inside an isolated HoneyShield sandbox.",
    "Zero production assets were accessed. All decoy files and databases provided were synthetic honeypot traps.",
    "Your forensic fingerprint, public IP route, and attack signatures have been cataloged to train our automated neural defense grid.",
    "Thanks for donating your zero-days and attack payloads to our threat intelligence model."
  ]

  // Typewriter effect for taunting message
  useEffect(() => {
    const fullMessage = taunts.join('\n\n')
    let i = 0
    setTypewriterText('')
    const interval = setInterval(() => {
      if (i < fullMessage.length) {
        setTypewriterText(prev => prev + fullMessage.charAt(i))
        i++
      } else {
        clearInterval(interval)
      }
    }, 15)
    return () => clearInterval(interval)
  }, [])

  // Auto-fetch real location & fingerprint if missing
  useEffect(() => {
    let isMounted = true

    const fetchEvidence = async () => {
      try {
        const fp = await generateFingerprint()
        if (isMounted) setForensics(prev => ({ ...prev, fingerprint: fp }))
      } catch (e) {
        console.warn('Fingerprint error:', e)
      }

      if (!session?.ip || session?.ip === '127.0.0.1' || session?.ip === 'Detecting...') {
        try {
          const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(4000) })
          const d = await res.json()
          if (isMounted && d.ip) {
            setForensics(prev => ({
              ...prev,
              ip: d.ip,
              country: d.country_name || 'Unknown',
              city: d.city || 'Unknown',
              isp: d.org || 'Unknown ISP',
              lat: d.latitude,
              lng: d.longitude
            }))
          }
        } catch {
          try {
            const res2 = await fetch('http://ip-api.com/json/', { signal: AbortSignal.timeout(4000) })
            const d2 = await res2.json()
            if (isMounted && d2.query) {
              setForensics(prev => ({
                ...prev,
                ip: d2.query,
                country: d2.country || 'Unknown',
                city: d2.city || 'Unknown',
                isp: d2.isp || 'Unknown ISP',
                lat: d2.lat,
                lng: d2.lon
              }))
            }
          } catch {}
        }
      }
    }

    fetchEvidence()
    return () => { isMounted = false }
  }, [session])

  const trapFiles = [
    { name: '/var/www/backup/payroll_2025.xlsx', action: 'DATA_EXFIL_ATTEMPT', risk: 'CRITICAL', honey: true },
    { name: '/etc/database/production_dump.sql', action: 'SQL_DUMP_PROBE', risk: 'HIGH', honey: true },
    { name: '/api/v2/auth/master_keys.json', action: 'CREDENTIAL_HARVESTING', risk: 'CRITICAL', honey: true },
    { name: '/system/env/AWS_SECRET_KEYS', action: 'TOKEN_THEFT', risk: 'CRITICAL', honey: true },
    { name: 'POST /api/search?q=1\' OR \'1\'=\'1', action: 'SQL_INJECTION', risk: 'HIGH', honey: true },
  ]

  const handleDownloadDossier = () => {
    const dossierData = {
      title: 'HoneyShield SOC Forensic Incident Dossier',
      incidentId: forensics.incidentId,
      timestamp: forensics.timestamp,
      classification: 'NEUTRALIZED_THREAT_CONTAINMENT',
      attackerProfile: {
        publicIP: forensics.ip,
        isp: forensics.isp,
        location: {
          city: forensics.city,
          country: forensics.country,
          coordinates: { lat: forensics.lat, lng: forensics.lng }
        },
        hardwareHash: forensics.fingerprint,
        platform: forensics.platform,
        userAgent: forensics.userAgent,
        screen: forensics.screen,
        hardwareConcurrency: forensics.cores,
        deviceMemory: forensics.memory
      },
      attackSummary: {
        reason: reason || 'MALICIOUS_DECEPTION_TRIGGERED',
        threatScore: '99.4/100 (CRITICAL)',
        trapsTriggeredCount: honeyCount,
        trapsCatalog: trapFiles,
        status: 'PERMANENT_HARDWARE_IP_BAN'
      },
      cryptographicSignature: `SHA256:${forensics.fingerprint.substring(0, 32)}...VERIFIED_BY_HONEYSHIELD_CORE`
    }

    const blob = new Blob([JSON.stringify(dossierData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `honeyshield_incident_${forensics.incidentId.toLowerCase()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleAppealSubmit = (e) => {
    e.preventDefault()
    setAppealStatus('evaluating')
    setTimeout(() => {
      setAppealStatus('denied')
    }, 1800)
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      width: '100vw',
      height: '100vh',
      background: 'radial-gradient(ellipse at center, #180004 0%, #080002 60%, #020001 100%)',
      color: '#F0F6FC',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      zIndex: 99999,
      overflowY: 'auto'
    }}>

      {/* BACKGROUND SCAN LINES */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(255, 0, 60, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 0, 60, 0.03) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
        zIndex: 1
      }} />

      {/* MAIN CONTAINER */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        maxWidth: '1050px',
        background: 'rgba(18, 5, 8, 0.95)',
        border: '1px solid #FF1744',
        boxShadow: '0 0 40px rgba(255, 23, 68, 0.25), inset 0 0 20px rgba(255, 23, 68, 0.1)',
        borderRadius: '12px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>

        {/* HEADER BAR */}
        <div style={{
          padding: '14px 20px',
          background: 'linear-gradient(90deg, #3A000A 0%, #1F0005 100%)',
          borderBottom: '1px solid #FF1744',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ animation: 'blink 1.2s infinite', display: 'flex', alignItems: 'center' }}>
              <Skull size={20} color="#FF1744" />
            </span>
            <span style={{ color: '#FF5252', fontWeight: 800, letterSpacing: '1.5px', fontSize: '13px' }}>
              HONEYSHIELD ACTIVE DEFENSE // THREAT NEUTRALIZED
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              background: 'rgba(255, 23, 68, 0.2)',
              border: '1px solid #FF1744',
              color: '#FF5252',
              fontSize: '11px',
              padding: '3px 8px',
              borderRadius: '4px',
              fontWeight: 700
            }}>
              INCIDENT ID: {forensics.incidentId}
            </span>
            <span style={{
              background: '#FF1744',
              color: '#000',
              fontSize: '11px',
              padding: '3px 8px',
              borderRadius: '4px',
              fontWeight: 900
            }}>
              PERMANENT BAN
            </span>
          </div>
        </div>

        {/* HERO TITLE & TAUNT */}
        <div style={{ padding: '24px 28px', borderBottom: '1px solid rgba(255, 23, 68, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '18px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              background: 'rgba(255, 23, 68, 0.15)',
              border: '1px solid #FF1744',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <ShieldAlert size={32} color="#FF1744" />
            </div>

            <div style={{ flex: 1 }}>
              <h1 style={{
                color: '#FF1744',
                fontSize: '26px',
                fontWeight: 900,
                letterSpacing: '1px',
                margin: '0 0 6px 0',
                textTransform: 'uppercase'
              }}>
                ACCESS TERMINATED & HOST FINGERPRINT QUARANTINED
              </h1>
              <div style={{ color: '#FF8A80', fontSize: '13px', lineHeight: 1.5 }}>
                Your session triggered multiple synthetic honeypots and heuristic anomalies. All actions have been isolated, forensic evidence sealed, and your device profile added to the permanent exclusion registry.
              </div>
            </div>
          </div>

          {/* TAUNT TERMINAL BOX */}
          <div style={{
            marginTop: '20px',
            background: '#090204',
            border: '1px solid rgba(255, 82, 82, 0.35)',
            borderRadius: '8px',
            padding: '16px 20px',
            boxShadow: 'inset 0 0 15px rgba(0,0,0,0.8)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px solid rgba(255,82,82,0.2)', paddingBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#00E676', fontSize: '11px', fontWeight: 700 }}>
                <Terminal size={14} />
                <span>HONEYSHIELD COUNTER-DECEPTION TERMINAL</span>
              </div>
              <span style={{ color: '#888', fontSize: '11px' }}>STATUS: DECEPTION_PAYLOAD_CAPTURED</span>
            </div>

            <pre style={{
              color: '#FFCDD2',
              fontSize: '12.5px',
              lineHeight: 1.6,
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              minHeight: '80px'
            }}>
              {typewriterText}
              <span style={{ animation: 'blink 0.8s infinite', color: '#00E676', fontWeight: 900 }}>_</span>
            </pre>
          </div>
        </div>

        {/* TAB NAVIGATION */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255, 23, 68, 0.2)',
          background: 'rgba(10, 2, 4, 0.7)'
        }}>
          {[
            { id: 'overview', label: '🛡️ Captured Telemetry' },
            { id: 'traps', label: '🍯 Honeypots Triggered' },
            { id: 'dossier', label: '📋 Forensic Identity' },
            { id: 'appeal', label: '⚖️ Ban Appeal' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                if (tab.id === 'appeal') setAppealOpen(true)
              }}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: activeTab === tab.id ? 'rgba(255, 23, 68, 0.15)' : 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #FF1744' : '2px solid transparent',
                color: activeTab === tab.id ? '#FF5252' : '#888',
                fontWeight: activeTab === tab.id ? 700 : 500,
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                fontFamily: 'inherit'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB CONTENTS */}
        <div style={{ padding: '24px 28px' }}>

          {/* TAB 1: OVERVIEW TELEMETRY */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div style={{ background: '#0F0306', border: '1px solid rgba(255, 23, 68, 0.25)', borderRadius: '8px', padding: '14px' }}>
                <div style={{ color: '#888', fontSize: '11px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Globe size={13} color="#FF5252" /> REAL PUBLIC IP
                </div>
                <div style={{ color: '#FF5252', fontSize: '16px', fontWeight: 800 }}>{forensics.ip}</div>
                <div style={{ color: '#AAA', fontSize: '11px', marginTop: '4px' }}>ISP: {forensics.isp}</div>
              </div>

              <div style={{ background: '#0F0306', border: '1px solid rgba(255, 23, 68, 0.25)', borderRadius: '8px', padding: '14px' }}>
                <div style={{ color: '#888', fontSize: '11px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Globe size={13} color="#FF5252" /> GEOLOCATION
                </div>
                <div style={{ color: '#FFF', fontSize: '15px', fontWeight: 700 }}>
                  {forensics.city}, {forensics.country}
                </div>
                <div style={{ color: '#AAA', fontSize: '11px', marginTop: '4px' }}>
                  Coords: {forensics.lat ? `${parseFloat(forensics.lat).toFixed(4)}, ${parseFloat(forensics.lng).toFixed(4)}` : 'Captured via BGP'}
                </div>
              </div>

              <div style={{ background: '#0F0306', border: '1px solid rgba(255, 23, 68, 0.25)', borderRadius: '8px', padding: '14px' }}>
                <div style={{ color: '#888', fontSize: '11px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Cpu size={13} color="#FF5252" /> HARDWARE HASH
                </div>
                <div style={{ color: '#00E676', fontSize: '12px', fontWeight: 700, wordBreak: 'break-all' }}>
                  {forensics.fingerprint ? `${forensics.fingerprint.substring(0, 18)}...` : 'Computing'}
                </div>
                <div style={{ color: '#AAA', fontSize: '11px', marginTop: '4px' }}>
                  {forensics.cores} Cores · {forensics.screen}
                </div>
              </div>

              <div style={{ background: '#0F0306', border: '1px solid rgba(255, 23, 68, 0.25)', borderRadius: '8px', padding: '14px' }}>
                <div style={{ color: '#888', fontSize: '11px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Lock size={13} color="#FF5252" /> CONTAINMENT STATUS
                </div>
                <div style={{ color: '#FF1744', fontSize: '14px', fontWeight: 800 }}>QUARANTINED (99.4%)</div>
                <div style={{ color: '#AAA', fontSize: '11px', marginTop: '4px' }}>SOC Notification Dispatched</div>
              </div>
            </div>
          )}

          {/* TAB 2: HONEYPOTS TRIGGERED */}
          {activeTab === 'traps' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ color: '#FF8A80', fontSize: '12px', fontWeight: 700 }}>
                  DECOY ARTIFACTS INTERACTED WITH ({trapFiles.length})
                </span>
                <span style={{ color: '#00E676', fontSize: '11px' }}>ALL RETURNED DECEPTIVE PAYLOADS</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {trapFiles.map((trap, idx) => (
                  <div key={idx} style={{
                    background: '#0F0306',
                    border: '1px solid rgba(255, 23, 68, 0.2)',
                    borderRadius: '6px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '16px' }}>🍯</span>
                      <div>
                        <div style={{ color: '#FFF', fontSize: '12.5px', fontWeight: 700 }}>{trap.name}</div>
                        <div style={{ color: '#888', fontSize: '11px' }}>Action: {trap.action}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        background: 'rgba(255, 23, 68, 0.2)',
                        color: '#FF5252',
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 800
                      }}>
                        {trap.risk}
                      </span>
                      <span style={{ color: '#00E676', fontSize: '11px', fontWeight: 700 }}>LOGGED</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: FULL FORENSIC DOSSIER */}
          {activeTab === 'dossier' && (
            <div style={{ background: '#090204', border: '1px solid rgba(255, 23, 68, 0.25)', borderRadius: '8px', padding: '16px' }}>
              <div style={{ color: '#FF5252', fontSize: '12px', fontWeight: 800, marginBottom: '12px' }}>
                EXHAUSTIVE DEVICE & NETWORK FINGERPRINT
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px 16px', fontSize: '12px' }}>
                <span style={{ color: '#888' }}>Target IP:</span>
                <span style={{ color: '#FFF', fontWeight: 700 }}>{forensics.ip}</span>

                <span style={{ color: '#888' }}>ISP / ASN:</span>
                <span style={{ color: '#FFF' }}>{forensics.isp}</span>

                <span style={{ color: '#888' }}>Hardware Hash:</span>
                <span style={{ color: '#00E676', wordBreak: 'break-all' }}>{forensics.fingerprint}</span>

                <span style={{ color: '#888' }}>Platform:</span>
                <span style={{ color: '#FFF' }}>{forensics.platform}</span>

                <span style={{ color: '#888' }}>User Agent:</span>
                <span style={{ color: '#AAA', wordBreak: 'break-all', fontSize: '11px' }}>{forensics.userAgent}</span>

                <span style={{ color: '#888' }}>Incident Timestamp:</span>
                <span style={{ color: '#FFF' }}>{forensics.timestamp}</span>
              </div>
            </div>
          )}

          {/* TAB 4: BAN APPEAL */}
          {activeTab === 'appeal' && (
            <div style={{ background: '#0F0306', border: '1px solid rgba(255, 23, 68, 0.25)', borderRadius: '8px', padding: '20px' }}>
              <h3 style={{ color: '#FF5252', fontSize: '14px', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={16} /> APPEAL SECURITY CONTAINMENT BAN
              </h3>
              <p style={{ color: '#AAA', fontSize: '12px', lineHeight: 1.5, marginBottom: '16px' }}>
                If you believe your IP or device was falsely identified as an intrusion actor, submit an explanation to the automated SOC evaluation core.
              </p>

              {appealStatus === 'evaluating' ? (
                <div style={{ textAlign: 'center', padding: '24px' }}>
                  <div style={{ color: '#00E676', fontSize: '14px', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <RefreshCw size={16} className="animate-spin" /> Evaluating heuristic logs & biometric telemetry...
                  </div>
                  <div style={{ color: '#888', fontSize: '11px' }}>Cross-referencing honeypot audit records with global threat intelligence feeds</div>
                </div>
              ) : appealStatus === 'denied' ? (
                <div style={{ background: 'rgba(255, 23, 68, 0.1)', border: '1px solid #FF1744', borderRadius: '6px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ color: '#FF1744', fontSize: '14px', fontWeight: 900, marginBottom: '6px' }}>
                    ❌ APPEAL REJECTED BY AUTOMATED AI CORE
                  </div>
                  <div style={{ color: '#FFCDD2', fontSize: '12px', lineHeight: 1.5 }}>
                    Decoy interaction confidence is 100.0%. Honey credentials were explicitly exfiltrated.
                    <br />
                    <strong>Remaining Ban Duration: 36,500 days (Permanent).</strong>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleAppealSubmit}>
                  <textarea
                    required
                    value={appealText}
                    onChange={e => setAppealText(e.target.value)}
                    placeholder="Provide justification for accessing honeypot endpoints (e.g. 'I was just testing security')..."
                    rows={3}
                    style={{
                      width: '100%',
                      background: '#090204',
                      border: '1px solid rgba(255, 23, 68, 0.4)',
                      borderRadius: '6px',
                      color: '#FFF',
                      padding: '10px 12px',
                      fontSize: '12px',
                      fontFamily: 'inherit',
                      outline: 'none',
                      marginBottom: '12px',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      padding: '10px 20px',
                      background: '#FF1744',
                      color: '#000',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: 800,
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontFamily: 'inherit'
                    }}
                  >
                    SUBMIT TO AI ARBITRATION CORE
                  </button>
                </form>
              )}
            </div>
          )}

        </div>

        {/* BOTTOM ACTION FOOTER */}
        <div style={{
          padding: '16px 28px',
          background: 'rgba(10, 2, 4, 0.9)',
          borderTop: '1px solid rgba(255, 23, 68, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ color: '#888', fontSize: '11px' }}>
            Forensic incident evidence cryptographically signed and stored in HoneyShield Data Vault.
          </div>

          <button
            onClick={handleDownloadDossier}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 18px',
              background: 'rgba(255, 23, 68, 0.15)',
              border: '1px solid #FF1744',
              borderRadius: '6px',
              color: '#FF5252',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#FF1744'; e.currentTarget.style.color = '#000' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 23, 68, 0.15)'; e.currentTarget.style.color = '#FF5252' }}
          >
            <Download size={14} />
            DOWNLOAD FORENSIC DOSSIER (.JSON)
          </button>
        </div>

      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
