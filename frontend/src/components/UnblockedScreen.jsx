import React from 'react'
import { ShieldCheck, CheckCircle, ArrowRight, Globe, LockOpen, Terminal } from 'lucide-react'

export default function UnblockedScreen({ info, onContinue }) {
  const ip = info?.ip || 'Your IP'
  const timestamp = info?.timestamp ? new Date(info.timestamp).toLocaleString() : new Date().toLocaleString()
  const clearanceCode = `HS-CLR-${Math.random().toString(36).substring(2, 9).toUpperCase()}-${Date.now().toString().slice(-4)}`

  const handleContinue = () => {
    try {
      localStorage.removeItem('honeyshield_blocked')
      localStorage.removeItem('honeyshield_blocked_ips')
    } catch {}
    if (onContinue) onContinue()
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      width: '100vw',
      height: '100vh',
      background: 'radial-gradient(ellipse at center, #021a0f 0%, #030d08 60%, #010603 100%)',
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
      {/* Background Matrix/Scanline Grid */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(0, 255, 136, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 136, 0.04) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
        zIndex: 1
      }} />

      {/* Main Container */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        maxWidth: '750px',
        background: 'rgba(8, 20, 14, 0.95)',
        border: '1px solid #00FF88',
        boxShadow: '0 0 50px rgba(0, 255, 136, 0.2), inset 0 0 20px rgba(0, 255, 136, 0.05)',
        borderRadius: '12px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Top Header Bar */}
        <div style={{
          padding: '14px 20px',
          background: 'linear-gradient(90deg, #052617 0%, #03140c 100%)',
          borderBottom: '1px solid #00FF88',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={22} color="#00FF88" />
            <span style={{ color: '#00FF88', fontWeight: 800, letterSpacing: '1.5px', fontSize: '13px' }}>
              HONEYSHIELD ACTIVE DEFENSE // THREAT CONTAINMENT LIFTED
            </span>
          </div>

          <span style={{
            background: 'rgba(0, 255, 136, 0.15)',
            border: '1px solid #00FF88',
            color: '#00FF88',
            fontSize: '11px',
            padding: '3px 8px',
            borderRadius: '4px',
            fontWeight: 700
          }}>
            CODE: {clearanceCode}
          </span>
        </div>

        {/* Hero Section */}
        <div style={{ padding: '32px 36px', textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'rgba(0, 255, 136, 0.12)',
            border: '1px solid #00FF88',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 0 25px rgba(0, 255, 136, 0.3)'
          }}>
            <CheckCircle size={36} color="#00FF88" />
          </div>

          <h1 style={{
            color: '#00FF88',
            fontSize: '26px',
            fontWeight: 900,
            letterSpacing: '1px',
            margin: '0 0 10px 0',
            textTransform: 'uppercase'
          }}>
            ACCESS RESTORED // SECURITY CLEARANCE GRANTED
          </h1>

          <p style={{
            color: '#A7F3D0',
            fontSize: '14px',
            lineHeight: 1.6,
            maxWidth: '560px',
            margin: '0 auto 24px auto'
          }}>
            The administrative containment on your IP address and device credentials has been formally lifted by SOC Administration. All synthetic trap quarantines have been disengaged.
          </p>

          {/* Telemetry Box */}
          <div style={{
            background: '#041009',
            border: '1px solid rgba(0, 255, 136, 0.25)',
            borderRadius: '8px',
            padding: '16px 20px',
            textAlign: 'left',
            marginBottom: '28px',
            fontSize: '12px'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '8px 16px' }}>
              <span style={{ color: '#6EE7B7' }}>Authorized IP:</span>
              <span style={{ color: '#FFFFFF', fontWeight: 700, fontFamily: 'monospace' }}>{ip}</span>

              <span style={{ color: '#6EE7B7' }}>Status:</span>
              <span style={{ color: '#00FF88', fontWeight: 700 }}>UNBLOCKED (AUTHENTICATED)</span>

              <span style={{ color: '#6EE7B7' }}>Clearance Time:</span>
              <span style={{ color: '#E2E8F0' }}>{timestamp}</span>

              <span style={{ color: '#6EE7B7' }}>Security Protocol:</span>
              <span style={{ color: '#94A3B8' }}>Active telemetry monitored in compliance with HoneyShield Core</span>
            </div>
          </div>

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            style={{
              padding: '12px 32px',
              background: '#00FF88',
              color: '#02140A',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '14px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 0 20px rgba(0, 255, 136, 0.4)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 0 30px rgba(0,255,136,0.6)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 0 20px rgba(0,255,136,0.4)' }}
          >
            <span>Continue to Login</span>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 24px',
          background: 'rgba(3, 15, 9, 0.9)',
          borderTop: '1px solid rgba(0, 255, 136, 0.2)',
          fontSize: '11px',
          color: '#6EE7B7',
          textAlign: 'center'
        }}>
          HoneyShield Cyber Defense Platform // Zero-Trust Deception Grid
        </div>
      </div>
    </div>
  )
}
