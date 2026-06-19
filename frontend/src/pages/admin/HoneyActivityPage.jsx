import React, { useState } from 'react';
import { Database, FileCode, Key, Target } from 'lucide-react';

export default function HoneyActivityPage({ data }) {
  const [filter, setFilter] = useState('ALL');

  const logs = data.honeyLog.filter(l => filter === 'ALL' || l.action === filter);

  const totalInteractions = data.honeyLog.length;
  const fakeFiles = data.honeyLog.filter(l => l.action === 'DOWNLOAD' || l.action === 'READ').length;
  const fakeCreds = data.honeyLog.filter(l => l.action === 'LOGIN_ATTEMPT').length;
  const deepTraps = data.sessions.filter(s => s.honeyInteractions >= 10).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
      
      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
        <MetricCard icon={<Target />} label="Total Interactions" value={totalInteractions} color="#9933FF" />
        <MetricCard icon={<FileCode />} label="Fake Files Accessed" value={fakeFiles} color="#00FF88" />
        <MetricCard icon={<Key />} label="Fake Credentials Tried" value={fakeCreds} color="#FFC107" />
        <MetricCard icon={<Database />} label="Deep Trap Sessions" value={deepTraps} color="#FF4444" />
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        {['ALL', 'READ', 'DOWNLOAD', 'EXEC', 'LOGIN_ATTEMPT'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '6px 12px', background: filter === f ? '#30363D' : '#161B22', color: filter === f ? '#FFF' : '#8B949E', border: '1px solid #30363D', borderRadius: '20px', cursor: 'pointer', fontSize: '12px' }}>
            {f}
          </button>
        ))}
      </div>

      <div style={{ background: '#161B22', borderRadius: '12px', border: '1px solid #30363D', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <h3 style={{ margin: 0, padding: '20px', color: '#8B949E', fontSize: '14px', borderBottom: '1px solid #30363D' }}>Live Deception Feed</h3>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {logs.length > 0 ? logs.map(l => (
            <div key={l.id} style={{ 
              display: 'flex', alignItems: 'center', gap: '15px', padding: '12px', 
              background: '#0D1117', border: '1px solid #30363D', borderRadius: '8px',
              borderLeft: l.action === 'DOWNLOAD' ? '4px solid #00FF88' : l.action === 'EXEC' ? '4px solid #FF4444' : l.action === 'LOGIN_ATTEMPT' ? '4px solid #FFC107' : '4px solid #9933FF'
            }}>
              <div style={{ color: '#8B949E', fontSize: '12px', width: '80px' }}>{new Date(l.timestamp).toLocaleTimeString()}</div>
              
              <div style={{ width: '150px', fontSize: '13px', fontWeight: 'bold', color: '#FFF' }}>
                {l.attackerIP} <span style={{ fontSize: '11px', color: '#8B949E', fontWeight: 'normal' }}><br/>{l.attackerCountry}</span>
              </div>
              
              <div style={{ padding: '4px 8px', background: '#161B22', borderRadius: '4px', fontSize: '11px', color: '#8B949E', minWidth: '80px', textAlign: 'center' }}>
                {l.action}
              </div>
              
              <div style={{ flex: 1, color: '#FFF', fontSize: '13px', fontFamily: 'monospace' }}>
                → {l.fakeTarget}
              </div>

              <div style={{ color: '#00FF88', fontSize: '12px', fontWeight: 'bold' }}>
                {l.responseSimulated}
              </div>

              {/* Deep Trap Badge */}
              {data.sessions.find(s => s.id === l.sessionId)?.honeyInteractions >= 10 && (
                <div style={{ padding: '2px 8px', background: 'rgba(255, 193, 7, 0.1)', border: '1px solid #FFC107', color: '#FFC107', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold' }}>
                  DEEP TRAP
                </div>
              )}
            </div>
          )) : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8B949E', fontStyle: 'italic' }}>No honey interactions yet.</div>}
        </div>
      </div>
    </div>
  );
}

const MetricCard = ({ icon, label, value, color }) => (
  <div style={{ background: '#161B22', padding: '20px', borderRadius: '12px', border: `1px solid #30363D`, borderBottom: `3px solid ${color}` }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#8B949E', marginBottom: '10px', fontSize: '13px' }}>
      {React.cloneElement(icon, { size: 16, color })} {label}
    </div>
    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#FFF' }}>{value}</div>
  </div>
);
