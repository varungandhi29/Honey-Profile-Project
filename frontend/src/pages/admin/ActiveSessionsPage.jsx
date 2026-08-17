import React, { useState } from 'react';
import { Download, Ban, Eye, Crosshair, FolderOpen } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import EvidenceModal from '../../components/EvidenceModal';

export default function ActiveSessionsPage({ data, settings, engine, onBlockIP, backendOnline }) {
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const [filter, setFilter] = useState('ALL');

  const sessions = data.sessions.filter(s => filter === 'ALL' || s.state === filter).sort((a, b) => b.riskScore - a.riskScore);
  const selectedSession = data.sessions.find(s => s.id === selectedSessionId || s.sessionId === selectedSessionId);

  const handleBlockIP = (session) => {
    onBlockIP(session.ip, `Blocked from Active Sessions — state: ${session.state}, risk: ${session.riskScore}`);
  };

  const handleForceHoney = (id) => {
    engine?.boostSessionRisk(id, 99, 10000);
  };

  const handleClearOldSessions = async () => {
    // Remove all sessions from frontend engine that are not currently active
    engine?.clearInactiveSessions();
    // Call backend to mark old sessions inactive
    if (backendOnline !== false) {
      try {
        await fetch('http://localhost:3001/api/session/clear-inactive', { method: 'POST' });
      } catch {}
    }
  };

  return (
    <div style={{ display: 'flex', gap: '20px', height: '100%', position: 'relative' }}>
      
      {/* Sessions List */}
      <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            {['ALL', 'NORMAL', 'SUSPICIOUS', 'ATTACKER'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: '6px 12px', background: filter === f ? '#30363D' : '#161B22', color: filter === f ? '#FFF' : '#8B949E', border: '1px solid #30363D', borderRadius: '20px', cursor: 'pointer', fontSize: '12px' }}>
                {f}
              </button>
            ))}
          </div>
          <button onClick={handleClearOldSessions}
            style={{ padding:'8px 16px', background:'rgba(255,68,68,0.1)', color:'#FF4444', border:'1px solid rgba(255,68,68,0.3)', borderRadius:'8px', fontSize:'12px', cursor:'pointer', fontWeight:600 }}>
            🗑 Clear Old Sessions
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sessions.length > 0 ? sessions.map(s => {
            const isAttacker = s.state === 'ATTACKER';
            const isSelected = selectedSessionId === s.id || selectedSessionId === s.sessionId;
            return (
              <div key={s.id || s.sessionId} onClick={() => setSelectedSessionId(s.id || s.sessionId)} style={{ background: isSelected ? '#21262D' : '#161B22', border: `1px solid ${isAttacker ? 'rgba(255, 68, 68, 0.4)' : '#30363D'}`, borderLeft: isAttacker ? '4px solid #FF4444' : '1px solid #30363D', borderRadius: '8px', padding: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#FFF' }}>{s.username}</span>
                    <span style={{ fontSize: '12px', color: '#8B949E', fontFamily: 'monospace' }}>{s.ip}</span>
                    <StateBadge state={s.state} />
                  </div>
                  <div style={{ fontSize: '12px', color: '#8B949E', display: 'flex', gap: '15px' }}>
                    <span>📍 {s.city}, {s.country}</span>
                    <span>💻 {s.os} / {s.browser}</span>
                    <span>⏱️ {s.duration}s</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: '#8B949E', marginBottom: '4px' }}>Risk Score</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: isAttacker ? '#FF4444' : '#00FF88' }}>{s.riskScore}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedEvidence(s.id || s.sessionId); }}
                      style={{ padding:'5px 12px', background:'rgba(0,212,255,0.1)', color:'#00D4FF', border:'1px solid rgba(0,212,255,0.3)', borderRadius:'6px', fontSize:'11px', cursor:'pointer', display:'flex', alignItems:'center', gap:'4px' }}>
                      <FolderOpen size={12} /> View Evidence
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleBlockIP(s); }}
                      style={{ padding:'5px 10px', background:'rgba(255,68,68,0.1)', color:'#FF4444', border:'1px solid rgba(255,68,68,0.3)', borderRadius:'6px', fontSize:'11px', cursor:'pointer', fontWeight:600 }}>
                      🚫 Block IP
                    </button>
                  </div>
                </div>
              </div>
            );
          }) : <div style={{ textAlign: 'center', color: '#8B949E', padding: '40px' }}>No sessions found</div>}
        </div>
      </div>

      {/* Session Details Panel */}
      <div style={{ flex: 1, background: '#161B22', borderRadius: '12px', border: '1px solid #30363D', padding: '20px', display: 'flex', flexDirection: 'column' }}>
        {selectedSession ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#FFF' }}>Session Details</h3>
              <button onClick={() => setSelectedEvidence(selectedSession.id || selectedSession.sessionId)}
                style={{ padding: '6px 12px', background: 'rgba(0, 212, 255, 0.1)', color: '#00D4FF', border: '1px solid rgba(0, 212, 255, 0.3)', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FolderOpen size={12} /> View Evidence
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button onClick={(e) => { e.stopPropagation(); handleBlockIP(selectedSession); }} style={{ flex: 1, padding: '8px', background: 'rgba(255, 68, 68, 0.1)', color: '#FF4444', border: '1px solid rgba(255, 68, 68, 0.3)', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Ban size={14} /> Block
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleForceHoney(selectedSession.id || selectedSession.sessionId); }} style={{ flex: 1, padding: '8px', background: 'rgba(153, 51, 255, 0.1)', color: '#9933FF', border: '1px solid rgba(153, 51, 255, 0.3)', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Crosshair size={14} /> Honey Trap
              </button>
            </div>

            <div style={{ height: '100px', marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', color: '#8B949E', marginBottom: '10px' }}>Risk Score Timeline</div>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={selectedSession.riskHistory || []}>
                  <YAxis domain={[0, 100]} hide />
                  <Line type="monotone" dataKey="score" stroke="#FF4444" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: '#0D1117', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', color: '#8B949E', marginBottom: '10px' }}>Device Fingerprint</div>
              <div style={{ fontSize: '13px', color: '#FFF', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div><span style={{ color: '#8B949E', width: '100px', display: 'inline-block' }}>Device ID:</span> {selectedSession.fingerprint?.deviceId || 'Unknown'}</div>
                <div><span style={{ color: '#8B949E', width: '100px', display: 'inline-block' }}>Signature:</span> {selectedSession.fingerprint?.behaviorSignature || 'Unknown'}</div>
                <div><span style={{ color: '#8B949E', width: '100px', display: 'inline-block' }}>Pattern:</span> {selectedSession.fingerprint?.requestPattern || 'Unknown'}</div>
                <div><span style={{ color: '#8B949E', width: '100px', display: 'inline-block' }}>Tool Hint:</span> {selectedSession.fingerprint?.toolHint || 'Unknown'}</div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ fontSize: '12px', color: '#8B949E', marginBottom: '10px' }}>Timeline Log</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[...(selectedSession.timeline || [])].reverse().map((t, i) => (
                  <div key={i} style={{ fontSize: '12px', padding: '8px', background: '#0D1117', borderRadius: '6px', borderLeft: `2px solid ${t.action === 'ATTACK' ? '#FF4444' : '#00FF88'}` }}>
                    <div style={{ color: '#8B949E', marginBottom: '4px', fontSize: '10px' }}>{t.timestamp ? new Date(t.timestamp).toLocaleTimeString() : '---'} - {t.action}</div>
                    <div style={{ color: '#FFF' }}>{t.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8B949E', fontSize: '14px' }}>
            Select a session to view details
          </div>
        )}
      </div>

      {selectedEvidence && (
        <EvidenceModal sessionId={selectedEvidence} onClose={() => setSelectedEvidence(null)} />
      )}
    </div>
  );
}

const StateBadge = ({ state }) => {
  const isAttacker = state === 'ATTACKER';
  const isSuspicious = state === 'SUSPICIOUS';
  return (
    <div style={{
      padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold',
      background: isAttacker ? '#FF4444' : isSuspicious ? '#FFC107' : 'rgba(0, 255, 136, 0.1)',
      color: isAttacker || isSuspicious ? '#000' : '#00FF88',
      animation: isAttacker ? 'pulse 1s infinite' : 'none'
    }}>
      {state}
    </div>
  );
};
