import React, { useState, useEffect } from 'react';
import { Settings, Save, Volume2, Database } from 'lucide-react';
import { alertEngine } from '../../audio/alertEngine';

const StorageInfoSection = ({ backendOnline }) => {
  const [dbStats, setDbStats] = useState(null);

  useEffect(() => {
    if (backendOnline !== false) {
      fetch('http://localhost:3001/api/analytics/overview')
        .then(r => r.json())
        .then(d => setDbStats(d))
        .catch(() => {});
    }
  }, [backendOnline]);

  return (
    <div style={{ background: '#0D1117', borderRadius: '12px', padding: '20px', border: '1px solid #30363D' }}>
      <h3 style={{ color: '#E6EDF3', margin: '0 0 16px', fontSize: '15px' }}>
        💾 Data Storage
      </h3>

      {/* Storage locations */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
        {[
          { icon: '🗄️', label: 'Primary Database', value: 'MongoDB', detail: 'Sessions, attacks, honey logs, alerts, blocked IPs', color: '#00FF88' },
          { icon: '⚡', label: 'Cache Layer', value: 'Redis', detail: 'Active sessions, risk scores, block lists (fast lookup)', color: '#00D4FF' },
          { icon: '🤖', label: 'AI Engine', value: 'Python FastAPI', detail: 'Random Forest model, behavioral risk scores', color: '#A855F7' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', padding: '12px', background: '#161B22', borderRadius: '8px', border: '1px solid #21262D' }}>
            <span style={{ fontSize: '20px', flexShrink: 0 }}>{item.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span style={{ color: '#E6EDF3', fontSize: '13px', fontWeight: 600 }}>{item.label}</span>
                <span style={{ color: item.color, fontSize: '12px', fontWeight: 700, fontFamily: 'monospace' }}>{item.value}</span>
              </div>
              <div style={{ color: '#8B949E', fontSize: '11px' }}>{item.detail}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Live record counts from MongoDB */}
      {dbStats && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ color: '#8B949E', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
            Live Record Counts
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' }}>
            {[
              { label: 'Sessions', val: dbStats.totalSessions || 0, color: '#00FF88' },
              { label: 'Attacks', val: dbStats.totalAttacks || 0, color: '#FF4444' },
              { label: 'Honey Logs', val: dbStats.honeyInteractions || 0, color: '#A855F7' },
              { label: 'Alerts', val: dbStats.unreadAlerts || 0, color: '#FFC107' },
            ].map(s => (
              <div key={s.label} style={{ background: '#161B22', border: '1px solid #30363D', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
                <div style={{ color: s.color, fontSize: '20px', fontWeight: 700, fontFamily: 'monospace' }}>{s.val}</div>
                <div style={{ color: '#8B949E', fontSize: '10px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How to access */}
      <div style={{ padding: '12px 16px', background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: '8px' }}>
        <div style={{ color: '#00D4FF', fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>How to Access Your Data</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[
            { label: 'Data Vault page', desc: 'View all stored attack evidence with tabs for attacks, sessions, honey logs, alerts' },
            { label: 'Evidence Modal', desc: 'Click "📂 View Evidence" on any session in Active Sessions page' },
            { label: 'Export all data', desc: 'Data Vault → Export button → downloads complete evidence as JSON' },
            { label: 'Export one session', desc: 'Evidence Modal → Export Evidence JSON button' },
            { label: 'Alert Center', desc: 'All generated security alerts with acknowledge/dismiss controls' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
              <span style={{ color: '#00FF88', flexShrink: 0 }}>→</span>
              <span style={{ color: '#00D4FF', fontWeight: 600, marginRight: '4px' }}>{item.label}:</span>
              <span style={{ color: '#8B949E' }}>{item.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function SettingsPage({ settings, setSettings, data, backendOnline }) {
  const [local, setLocal] = useState({ ...settings });
  const [saved, setSaved] = useState(false);

  const [audioEnabled, setAudioEnabled] = useState(() => localStorage.getItem('hs_audio_enabled') !== 'false');
  const [audioVolume, setAudioVolume] = useState(() => parseInt(localStorage.getItem('hs_audio_volume') || '70'));

  useEffect(() => {
    alertEngine.setEnabled(audioEnabled);
    alertEngine.setVolume(audioVolume / 100);
  }, [audioEnabled, audioVolume]);

  const handleAudioToggle = (enabled) => {
    setAudioEnabled(enabled);
    alertEngine.setEnabled(enabled);
    localStorage.setItem('hs_audio_enabled', enabled);
  };

  const handleVolumeChange = (vol) => {
    setAudioVolume(vol);
    alertEngine.setVolume(vol / 100);
    localStorage.setItem('hs_audio_volume', vol);
  };

  const handleSave = () => {
    setSettings(local);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px' }}>
      
      <div style={{ background: '#161B22', padding: '20px', borderRadius: '12px', border: '1px solid #30363D', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <Settings size={24} color="#00FF88" />
        <h2 style={{ margin: 0, color: '#FFF', fontSize: '18px' }}>System Configuration</h2>
      </div>

      <div style={{ background: '#161B22', padding: '30px', borderRadius: '12px', border: '1px solid #30363D', display: 'flex', flexDirection: 'column', gap: '30px' }}>
        
        {/* Storage Info Section */}
        <StorageInfoSection backendOnline={backendOnline} />

        {/* Alert Audio Section */}
        <div style={{ background: '#0D1117', borderRadius: '12px', padding: '20px', border: '1px solid #30363D' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Volume2 size={20} color="#00FF88" />
            <h3 style={{ color: '#E6EDF3', margin: 0, fontSize: '15px' }}>Alert Audio</h3>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <div style={{ color: '#E6EDF3', fontSize: '13px', fontWeight: 500 }}>Audio Alerts</div>
              <div style={{ color: '#8B949E', fontSize: '11px' }}>Play sound when attacks detected</div>
            </div>
            <div onClick={() => handleAudioToggle(!audioEnabled)}
              style={{ width: '44px', height: '24px', borderRadius: '12px', background: audioEnabled ? '#00FF88' : '#30363D', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px', left: audioEnabled ? '22px' : '2px', transition: 'left 0.2s' }} />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ color: '#8B949E', fontSize: '12px', marginBottom: '6px' }}>Volume: {audioVolume}%</div>
            <input type="range" min="0" max="100" value={audioVolume}
              onChange={e => handleVolumeChange(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#00FF88' }} />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { label:'🚨 Test Police Siren (CRITICAL)', fn:() => { alertEngine.init(); alertEngine.playCritical() } },
              { label:'🔊 Test HIGH Siren', fn:() => { alertEngine.init(); alertEngine.playHigh() } },
              { label:'🍯 Test Honey Trap', fn:() => { alertEngine.init(); alertEngine.playHoneyTrap() } },
              { label:'🚔 Test VPN Alert', fn:() => { alertEngine.init(); alertEngine.playVPNDetected() } },
              { label:'✅ Test Block Confirm', fn:() => { alertEngine.init(); alertEngine.playBlocked() } },
            ].map(btn => (
              <button key={btn.label} onClick={btn.fn}
                style={{ padding: '8px 14px', background: '#21262D', color: '#E6EDF3', border: '1px solid #30363D', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', transition: 'background 0.2s', fontWeight: 500 }}
                onMouseEnter={e => e.currentTarget.style.background = '#30363D'}
                onMouseLeave={e => e.currentTarget.style.background = '#21262D'}>
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Risk Thresholds */}
        <div>
          <h3 style={{ margin: '0 0 15px', color: '#FFF', fontSize: '16px', borderBottom: '1px solid #30363D', paddingBottom: '10px' }}>Risk Thresholds</h3>
          
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px', color: '#8B949E' }}>
              <span>Suspicious Threshold (Default: 36)</span>
              <span style={{ color: '#FFC107', fontWeight: 'bold' }}>{local.suspiciousThreshold}</span>
            </div>
            <input 
              type="range" min="10" max="50" value={local.suspiciousThreshold} 
              onChange={e => setLocal({...local, suspiciousThreshold: parseInt(e.target.value)})}
              style={{ width: '100%', accentColor: '#FFC107' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px', color: '#8B949E' }}>
              <span>Attacker Threshold (Default: 70)</span>
              <span style={{ color: '#FF4444', fontWeight: 'bold' }}>{local.attackerThreshold}</span>
            </div>
            <input 
              type="range" min="51" max="95" value={local.attackerThreshold} 
              onChange={e => setLocal({...local, attackerThreshold: parseInt(e.target.value)})}
              style={{ width: '100%', accentColor: '#FF4444' }}
            />
          </div>
        </div>

        {/* Auto-Response Rules */}
        <div>
          <h3 style={{ margin: '0 0 15px', color: '#FFF', fontSize: '16px', borderBottom: '1px solid #30363D', paddingBottom: '10px' }}>Auto-Response Rules</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {Object.entries(local.autoResponseRules).map(([key, val]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer' }}>
                <div style={{ width: '40px', height: '20px', background: val ? '#00FF88' : '#30363D', borderRadius: '10px', position: 'relative', transition: 'background 0.2s' }}>
                  <div style={{ position: 'absolute', top: '2px', left: val ? '22px' : '2px', width: '16px', height: '16px', background: '#FFF', borderRadius: '50%', transition: 'left 0.2s' }} />
                </div>
                <span style={{ color: '#E6EDF3', fontSize: '14px' }}>
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div style={{ paddingTop: '20px', borderTop: '1px solid #30363D', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button 
            onClick={handleSave}
            style={{ padding: '12px 24px', background: '#00FF88', color: '#0D1117', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Save size={18} /> Save Settings
          </button>
          {saved && <span style={{ color: '#00FF88', fontSize: '14px', animation: 'fadeIn 0.3s' }}>Settings saved successfully!</span>}
        </div>

      </div>
    </div>
  );
}
