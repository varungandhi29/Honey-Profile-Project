export default function BlockedScreen({ reason }) {
  const messages = {
    'IP_BLOCKED': '🚫 Your IP address has been permanently blocked by the system administrator.',
    'FINGERPRINT_BLOCKED': '🚫 Your device has been permanently blocked. Changing your IP address will not help.',
    'default': '🚫 Access denied. Your device and network have been permanently blocked by HoneyShield.'
  }
  const text = messages[reason] || messages.default

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
      background: '#0D0000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ fontSize: '64px', marginBottom: '24px' }}>🚫</div>
      <h1 style={{ color: '#FF4444', fontSize: '32px', fontWeight: 800, marginBottom: '16px', fontFamily: 'monospace', textAlign: 'center', letterSpacing: '2px' }}>
        ACCESS PERMANENTLY BLOCKED
      </h1>
      <p style={{ color: '#FF8888', fontSize: '16px', maxWidth: '540px', textAlign: 'center', lineHeight: 1.6, padding: '0 20px' }}>
        {text}
      </p>
      <div style={{ marginTop: '32px', padding: '16px 24px', background: '#1A0000', border: '1px solid #FF4444', borderRadius: '8px', color: '#FF4444', fontSize: '13px', fontFamily: 'monospace', textAlign: 'center', maxWidth: '500px' }}>
        This incident has been logged with your browser fingerprint, IP address, and timestamp.
      </div>
    </div>
  )
}
