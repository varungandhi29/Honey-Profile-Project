import React, { useState } from 'react';
import { Settings, Save } from 'lucide-react';

export default function SettingsPage({ settings, setSettings, data }) {
  const [local, setLocal] = useState({ ...settings });
  const [saved, setSaved] = useState(false);

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
