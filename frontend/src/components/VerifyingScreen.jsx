import React from 'react'
import { Shield, RefreshCw, AlertTriangle, Clock, Lock } from 'lucide-react'

export default function VerifyingScreen({ state, message, onRetry }) {
  const isRetrying = state === 'UNKNOWN_RETRYING'

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      width: '100vw',
      height: '100vh',
      background: 'radial-gradient(ellipse at center, #0a1120 0%, #040812 60%, #010409 100%)',
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
      {/* Background Matrix/Grid Overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(56, 189, 248, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(56, 189, 248, 0.03) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
        zIndex: 1
      }} />

      {/* Main Container */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        maxWidth: '580px',
        background: 'rgba(10, 18, 32, 0.95)',
        border: isRetrying ? '1px solid #F59E0B' : '1px solid #38BDF8',
        boxShadow: isRetrying
          ? '0 0 40px rgba(245, 158, 11, 0.15), inset 0 0 15px rgba(245, 158, 11, 0.05)'
          : '0 0 40px rgba(56, 189, 248, 0.15), inset 0 0 15px rgba(56, 189, 248, 0.05)',
        borderRadius: '12px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Top Header Bar */}
        <div style={{
          padding: '12px 20px',
          background: isRetrying ? 'rgba(245, 158, 11, 0.12)' : 'rgba(56, 189, 248, 0.12)',
          borderBottom: isRetrying ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(56, 189, 248, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          letterSpacing: '0.1em'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isRetrying ? '#F59E0B' : '#38BDF8', fontWeight: 'bold' }}>
            <Lock size={14} />
            <span>HONEYSHIELD ZERO-TRUST ENFORCEMENT</span>
          </div>
          <div style={{
            padding: '2px 8px',
            borderRadius: '4px',
            background: isRetrying ? 'rgba(245, 158, 11, 0.2)' : 'rgba(56, 189, 248, 0.2)',
            color: isRetrying ? '#FCD34D' : '#7DD3FC',
            fontSize: '10px'
          }}>
            {isRetrying ? 'FAIL-CLOSED: HOLD' : 'CHECKING STATUS'}
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          {/* Animated Icon */}
          <div style={{
            position: 'relative',
            width: '72px',
            height: '72px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isRetrying ? 'rgba(245, 158, 11, 0.1)' : 'rgba(56, 189, 248, 0.1)',
            border: isRetrying ? '2px solid rgba(245, 158, 11, 0.4)' : '2px solid rgba(56, 189, 248, 0.4)',
            borderRadius: '50%'
          }}>
            {isRetrying ? (
              <AlertTriangle size={36} color="#F59E0B" />
            ) : (
              <Shield size={36} color="#38BDF8" />
            )}
          </div>

          <h2 style={{
            margin: '0 0 8px 0',
            fontSize: '18px',
            fontWeight: '600',
            color: '#F0F6FC',
            letterSpacing: '0.05em'
          }}>
            {isRetrying ? 'Status Verification Incomplete' : 'Verifying Security Clearance'}
          </h2>

          <p style={{
            margin: '0 0 20px 0',
            fontSize: '13px',
            color: '#94A3B8',
            lineHeight: '1.6',
            maxWidth: '440px'
          }}>
            {isRetrying
              ? (message || 'Unable to confirm authorization with central verification service.')
              : 'Contacting HoneyShield verification gateway to evaluate clearance status...'}
          </p>

          {/* Status Box */}
          <div style={{
            width: '100%',
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(51, 65, 85, 0.5)',
            borderRadius: '8px',
            padding: '14px 16px',
            marginBottom: '24px',
            textAlign: 'left',
            fontSize: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#94A3B8' }}>
              <Clock size={14} />
              <span>SECURITY PROTOCOL:</span>
              <span style={{ color: '#E2E8F0', fontWeight: 'bold' }}>THREE-STATE FAIL-CLOSED</span>
            </div>
            <div style={{ color: '#64748B', lineHeight: '1.5', fontSize: '11px' }}>
              Protected application endpoints remain locked until an authoritative 200 OK response confirms clean status. Non-200 responses, rate limits, and network anomalies do not grant access.
            </div>
          </div>

          {/* Action Button */}
          {onRetry && (
            <button
              onClick={onRetry}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 22px',
                background: isRetrying ? 'rgba(245, 158, 11, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                border: isRetrying ? '1px solid #F59E0B' : '1px solid #38BDF8',
                borderRadius: '6px',
                color: isRetrying ? '#FCD34D' : '#7DD3FC',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                letterSpacing: '0.05em'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1.0)'}
            >
              <RefreshCw size={14} />
              Retry Verification Now
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
