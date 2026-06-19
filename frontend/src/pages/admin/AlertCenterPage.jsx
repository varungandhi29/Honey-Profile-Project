import React, { useState, useEffect } from 'react';
import { AlertTriangle, Check, X, Shield, Activity } from 'lucide-react';

export default function AlertCenterPage({ data, engineRef }) {
  const [sevFilter, setSevFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('New');

  useEffect(() => {
    // Clear unread count on mount (simulated by just viewing)
  }, []);

  const alerts = data.alertLog.filter(a => 
    (sevFilter === 'ALL' || a.severity === sevFilter) &&
    (statusFilter === 'ALL' || a.status === statusFilter)
  );

  return (
    <div style={{ display: 'flex', gap: '20px', height: '100%' }}>
      
      {/* Alerts List */}
      <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(f => (
              <button key={f} onClick={() => setSevFilter(f)} style={{ padding: '6px 12px', background: sevFilter === f ? '#30363D' : '#161B22', color: sevFilter === f ? '#FFF' : '#8B949E', border: '1px solid #30363D', borderRadius: '20px', cursor: 'pointer', fontSize: '11px' }}>
                {f}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['ALL', 'New', 'Acknowledged', 'Dismissed'].map(f => (
              <button key={f} onClick={() => setStatusFilter(f)} style={{ padding: '6px 12px', background: statusFilter === f ? '#30363D' : '#161B22', color: statusFilter === f ? '#FFF' : '#8B949E', border: '1px solid #30363D', borderRadius: '20px', cursor: 'pointer', fontSize: '11px' }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {alerts.length > 0 ? alerts.map(a => {
            const c = a.severity === 'CRITICAL' ? '#FF4444' : a.severity === 'HIGH' ? '#FFC107' : a.severity === 'MEDIUM' ? '#FF9900' : '#00FF88';
            const bg = a.severity === 'CRITICAL' ? 'rgba(255,68,68,0.1)' : '#161B22';
            
            return (
              <div key={a.id} style={{ background: bg, border: `1px solid ${c}40`, borderLeft: `4px solid ${c}`, borderRadius: '8px', padding: '16px', display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
                <div style={{ padding: '8px', background: `${c}20`, borderRadius: '8px', color: c }}><AlertTriangle size={20} /></div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#FFF' }}>{a.title}</div>
                    <div style={{ fontSize: '11px', color: '#8B949E' }}>{new Date(a.timestamp).toLocaleString()}</div>
                  </div>
                  
                  <div style={{ fontSize: '13px', color: '#8B949E', marginBottom: '12px' }}>{a.description}</div>
                  
                  <div style={{ display: 'flex', gap: '15px', fontSize: '11px', color: '#8B949E' }}>
                    <span style={{ fontFamily: 'monospace' }}>IP: {a.sourceIP}</span>
                    <span style={{ fontFamily: 'monospace' }}>Session: {a.sessionId.substr(0,15)}...</span>
                  </div>
                </div>

                {a.status === 'New' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button onClick={() => engineRef.current?.acknowledgeAlert(a.id)} style={{ padding: '6px 12px', background: 'rgba(0,255,136,0.1)', color: '#00FF88', border: '1px solid rgba(0,255,136,0.3)', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={12}/> Ack</button>
                    <button onClick={() => engineRef.current?.dismissAlert(a.id)} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', color: '#8B949E', border: '1px solid #30363D', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}><X size={12}/> Dismiss</button>
                  </div>
                )}
                {a.status !== 'New' && (
                  <div style={{ fontSize: '12px', color: '#8B949E', fontStyle: 'italic', padding: '10px' }}>{a.status}</div>
                )}
              </div>
            );
          }) : <div style={{ textAlign: 'center', color: '#8B949E', padding: '40px' }}>No alerts matching filters</div>}
        </div>
      </div>

      {/* Auto-Response Log */}
      <div style={{ flex: 1, background: '#161B22', borderRadius: '12px', border: '1px solid #30363D', padding: '20px', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ margin: '0 0 20px', color: '#FFF', display: 'flex', alignItems: 'center', gap: '8px' }}><Shield size={18} color="#00FF88" /> Auto-Response Log</h3>
        
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {data.autoResponseLog.length > 0 ? data.autoResponseLog.map(ar => (
            <div key={ar.id} style={{ fontSize: '12px', padding: '12px', background: '#0D1117', border: '1px solid #30363D', borderRadius: '8px', borderLeft: '3px solid #00FF88' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontWeight: 'bold', color: '#00FF88' }}>{ar.action}</span>
                <span style={{ color: '#8B949E', fontSize: '10px' }}>{new Date(ar.timestamp).toLocaleTimeString()}</span>
              </div>
              <div style={{ color: '#FFF', marginBottom: '4px' }}>{ar.reason || ar.result}</div>
              <div style={{ color: '#8B949E', fontFamily: 'monospace', fontSize: '10px' }}>Session: {ar.sessionId}</div>
            </div>
          )) : <div style={{ textAlign: 'center', color: '#8B949E', padding: '40px', fontStyle: 'italic' }}>No auto-responses triggered</div>}
        </div>
      </div>

    </div>
  );
}
