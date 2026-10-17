import React, { useState, useEffect } from 'react'
import { BACKEND } from '../../utils/backendUrl'

export default function AlertSettings() {
  const [config, setConfig] = useState({
    slackWebhook: '',
    discordWebhook: '',
    telegramToken: '',
    telegramChatId: '',
    emailTo: '',
    alertLevels: {
      honey_trap: true,
      vpn_block: true,
      brute_force_high: true,
      manual_block: false,
    }
  })
  const [testing, setTesting] = useState(null)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  // Fetch saved settings on component load
  useEffect(() => {
    fetch(`${BACKEND}/api/settings/alerts`)
      .then(res => res.json())
      .then(data => {
        if (data) {
          setConfig(prev => ({
            ...prev,
            slackWebhook: data.slackWebhook || '',
            discordWebhook: data.discordWebhook || '',
            telegramToken: data.telegramToken || '',
            telegramChatId: data.telegramChatId || '',
            emailTo: data.emailTo || '',
            alertLevels: {
              ...prev.alertLevels,
              ...(data.alertLevels || {})
            }
          }))
        }
      })
      .catch(err => console.warn('Could not load alert settings:', err))
      .finally(() => setLoading(false))
  }, [])

  const testAlert = async (channel) => {
    setTesting(channel)
    try {
      const res = await fetch(`${BACKEND}/api/settings/test-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, config })
      })
      const data = await res.json()
      if (data.success) {
        alert(`✅ Test alert sent to ${channel} successfully!`)
      } else {
        alert(`❌ Failed: ${data.error || 'Unknown error'}`)
      }
    } catch (err) {
      alert(`❌ Error: ${err.message}`)
    }
    setTesting(null)
  }

  const saveConfig = async () => {
    try {
      const res = await fetch(`${BACKEND}/api/settings/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      const data = await res.json()
      if (data.success) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        alert(`Failed to save: ${data.error}`)
      }
    } catch (err) {
      alert(`Failed to save: ${err.message}`)
    }
  }

  const FIELDS = [
    { key: 'slackWebhook', label: 'Slack Webhook URL', placeholder: 'https://hooks.slack.com/services/T.../B.../...', icon: '💬', channel: 'slack' },
    { key: 'discordWebhook', label: 'Discord Webhook URL', placeholder: 'https://discord.com/api/webhooks/...', icon: '🎮', channel: 'discord' },
    { key: 'telegramToken', label: 'Telegram Bot Token', placeholder: '123456789:ABCdef...', icon: '✈️', channel: 'telegram' },
    { key: 'telegramChatId', label: 'Telegram Chat ID', placeholder: '-1001234567890', icon: '💬', channel: null },
    { key: 'emailTo', label: 'Alert Email Address', placeholder: 'security@yourcompany.com', icon: '📧', channel: 'email' },
  ]

  const ALERT_TOGGLES = [
    { key: 'honey_trap', label: 'Honey Trap Triggered', desc: 'When attacker is trapped after brute force', severity: 'CRITICAL' },
    { key: 'vpn_block', label: 'VPN/Proxy Auto-Block', desc: 'When VPN or datacenter IP is detected', severity: 'HIGH' },
    { key: 'brute_force_high', label: 'High Risk Brute Force', desc: 'When attempt count reaches HIGH_RISK level', severity: 'HIGH' },
    { key: 'manual_block', label: 'Manual Admin Block', desc: 'When admin manually blocks an IP', severity: 'MEDIUM' },
  ]

  return (
    <div style={{ maxWidth: '760px', padding: '10px 0', animation: 'fadeIn 0.2s ease-in' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <span style={{ fontSize: '24px' }}>🔔</span>
        <h2 style={{ color: '#E6EDF3', fontSize: '20px', fontWeight: 700, margin: 0 }}>Alert Webhooks & Notifications</h2>
      </div>
      <p style={{ color: '#8B949E', fontSize: '13px', margin: '0 0 24px', lineHeight: 1.5 }}>
        Get instant notifications on your phone when attacks are detected. Administrators can block attackers directly from Slack or Discord with a single click without opening the dashboard.
      </p>

      {/* Webhook inputs */}
      <div style={{ background: '#161B22', border: '1px solid #30363D', borderRadius: '12px', padding: '22px', marginBottom: '22px' }}>
        <h3 style={{ color: '#E6EDF3', fontSize: '15px', fontWeight: 600, margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>📡</span> Notification Channels
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {FIELDS.map(field => {
            const hasValue = Boolean(config[field.key])
            const canTest = field.channel && (
              field.channel === 'telegram'
                ? Boolean(config.telegramToken && config.telegramChatId)
                : hasValue
            )
            const isCurrentlyTesting = testing === field.channel

            return (
              <div key={field.key}>
                <label style={{ color: '#8B949E', fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                  {field.icon} {field.label}
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type={field.key.includes('Token') || field.key.includes('Webhook') ? 'password' : 'text'}
                    value={config[field.key] || ''}
                    onChange={e => setConfig(p => ({ ...p, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      background: '#0D1117',
                      border: '1px solid #30363D',
                      borderRadius: '8px',
                      color: '#E6EDF3',
                      fontSize: '13px',
                      outline: 'none',
                      fontFamily: field.key.includes('Token') || field.key.includes('Webhook') ? 'monospace' : 'inherit',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={e => (e.target.style.borderColor = '#3B82F6')}
                    onBlur={e => (e.target.style.borderColor = '#30363D')}
                  />
                  {field.channel && (
                    <button
                      type="button"
                      onClick={() => testAlert(field.channel)}
                      disabled={!canTest || isCurrentlyTesting}
                      style={{
                        padding: '10px 18px',
                        background: canTest ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)',
                        color: canTest ? '#3B82F6' : '#6B7280',
                        border: '1px solid',
                        borderColor: canTest ? 'rgba(59,130,246,0.3)' : '#21262D',
                        borderRadius: '8px',
                        cursor: canTest && !isCurrentlyTesting ? 'pointer' : 'not-allowed',
                        fontSize: '12px',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        opacity: canTest ? 1 : 0.5,
                        transition: 'all 0.2s'
                      }}
                    >
                      {isCurrentlyTesting ? '⏳ Sending...' : '🧪 Test'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Alert level toggles */}
      <div style={{ background: '#161B22', border: '1px solid #30363D', borderRadius: '12px', padding: '22px', marginBottom: '22px' }}>
        <h3 style={{ color: '#E6EDF3', fontSize: '15px', fontWeight: 600, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>⚡</span> Alert Triggers
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {ALERT_TOGGLES.map((toggle, idx) => {
            const isEnabled = Boolean(config.alertLevels[toggle.key])
            return (
              <div
                key={toggle.key}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 0',
                  borderBottom: idx < ALERT_TOGGLES.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none'
                }}
              >
                <div>
                  <div style={{ color: '#E6EDF3', fontSize: '13px', fontWeight: 500 }}>{toggle.label}</div>
                  <div style={{ color: '#8B949E', fontSize: '11px', marginTop: '3px' }}>{toggle.desc}</div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span
                    style={{
                      padding: '3px 8px',
                      background:
                        toggle.severity === 'CRITICAL'
                          ? 'rgba(239,68,68,0.15)'
                          : toggle.severity === 'HIGH'
                          ? 'rgba(249,115,22,0.15)'
                          : 'rgba(245,158,11,0.15)',
                      color:
                        toggle.severity === 'CRITICAL'
                          ? '#EF4444'
                          : toggle.severity === 'HIGH'
                          ? '#F97316'
                          : '#F59E0B',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.04em'
                    }}
                  >
                    {toggle.severity}
                  </span>
                  <div
                    onClick={() =>
                      setConfig(p => ({
                        ...p,
                        alertLevels: {
                          ...p.alertLevels,
                          [toggle.key]: !p.alertLevels[toggle.key]
                        }
                      }))
                    }
                    style={{
                      width: '44px',
                      height: '24px',
                      borderRadius: '12px',
                      background: isEnabled ? '#22C55E' : '#374151',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'background 200ms ease'
                    }}
                  >
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: 'white',
                        position: 'absolute',
                        top: '3px',
                        left: isEnabled ? '23px' : '3px',
                        transition: 'left 200ms ease',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                      }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Save Button */}
      <button
        type="button"
        onClick={saveConfig}
        style={{
          width: '100%',
          padding: '13px',
          background: saved ? 'linear-gradient(135deg,#22C55E,#16A34A)' : 'linear-gradient(135deg,#3B82F6,#1D4ED8)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 600,
          transition: 'all 300ms ease',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}
      >
        {saved ? '✅ Settings Saved!' : '💾 Save Alert Settings'}
      </button>
    </div>
  )
}
