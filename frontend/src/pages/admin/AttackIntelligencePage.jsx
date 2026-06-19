import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ShieldAlert, Target, GitCommit, Ban } from 'lucide-react';
import { ATTACK_TYPES } from '../../engine/constants';

export default function AttackIntelligencePage({ data, settings, onBlockIP }) {
  const [timeRange, setTimeRange] = useState(60);

  // Group attacks by hour for timeline
  const now = Date.now();
  const timelineMap = {};
  for (let i = 0; i <= 60; i += 5) {
    const t = new Date(now - i * 60000);
    const key = `${t.getHours().toString().padStart(2,'0')}:${Math.floor(t.getMinutes()/5)*5}`;
    timelineMap[key] = { time: key, CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  }
  
  data.attackLog.forEach(a => {
    const t = new Date(a.timestamp);
    if ((now - t.getTime()) / 60000 <= 60) {
      const key = `${t.getHours().toString().padStart(2,'0')}:${Math.floor(t.getMinutes()/5)*5}`;
      if (timelineMap[key]) timelineMap[key][a.severity]++;
    }
  });
  const timelineData = Object.values(timelineMap).reverse();

  // Attack Breakdown
  const typeStats = {};
  Object.values(ATTACK_TYPES).forEach(def => {
    typeStats[def.label] = { label: def.label, count: 0, severity: def.severity, riskDelta: def.riskDelta, lastSeen: null };
  });
  data.attackLog.forEach(a => {
    if (typeStats[a.type]) {
      typeStats[a.type].count++;
      if (!typeStats[a.type].lastSeen || new Date(a.timestamp) > new Date(typeStats[a.type].lastSeen)) {
        typeStats[a.type].lastSeen = a.timestamp;
      }
    }
  });
  const breakdown = Object.values(typeStats).sort((a, b) => b.count - a.count);

  // Threat Intelligence Panel (Top IPs)
  const ipStats = {};
  data.attackLog.forEach(a => {
    if (!ipStats[a.sourceIP]) ipStats[a.sourceIP] = { ip: a.sourceIP, country: a.sourceCountry, city: a.sourceCity, count: 0, types: new Set() };
    ipStats[a.sourceIP].count++;
    ipStats[a.sourceIP].types.add(a.type);
  });
  const topIPs = Object.values(ipStats).sort((a, b) => b.count - a.count).slice(0, 5);

  // Correlation Campaigns
  const campaigns = {};
  data.attackLog.forEach(a => {
    if (!a.correlationId) return;
    if (!campaigns[a.correlationId]) campaigns[a.correlationId] = { id: a.correlationId, sourceIP: a.sourceIP, attacks: [], sessions: new Set() };
    campaigns[a.correlationId].attacks.push(a.type);
    campaigns[a.correlationId].sessions.add(a.sessionId);
  });
  const campaignList = Object.values(campaigns).filter(c => c.attacks.length > 2).slice(0, 4);

  // Most Targeted
  const targets = {};
  data.attackLog.forEach(a => { targets[a.targetArea] = (targets[a.targetArea] || 0) + 1; });
  const mostTargeted = Object.entries(targets).sort((a, b) => b[1] - a[1])[0] || ['None', 0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '20px' }}>
        
        {/* Timeline */}
        <div style={{ background: '#161B22', padding: '20px', borderRadius: '12px', border: '1px solid #30363D' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, color: '#8B949E', fontSize: '14px' }}>Attack Timeline (60 min)</h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={timelineData}>
              <XAxis dataKey="time" tick={{ fill: '#8B949E', fontSize: 10 }} />
              <YAxis tick={{ fill: '#8B949E', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#0D1117', border: '1px solid #30363D' }} />
              <Line type="monotone" dataKey="CRITICAL" stroke="#FF4444" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="HIGH" stroke="#FFC107" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="MEDIUM" stroke="#FF9900" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="LOW" stroke="#00FF88" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Most Targeted Card */}
        <div style={{ background: 'rgba(255, 68, 68, 0.05)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255, 68, 68, 0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <Target size={48} color="#FF4444" style={{ marginBottom: '15px' }} />
          <div style={{ color: '#8B949E', fontSize: '13px', marginBottom: '5px' }}>Most Targeted Area</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#FFF' }}>{mostTargeted[0]}</div>
          <div style={{ color: '#FF4444', fontSize: '14px', marginTop: '10px', fontWeight: 'bold' }}>{mostTargeted[1]} attacks</div>
        </div>
      </div>

      {/* Second Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        
        {/* Breakdown Table */}
        <div style={{ background: '#161B22', padding: '20px', borderRadius: '12px', border: '1px solid #30363D', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 15px', color: '#8B949E', fontSize: '14px' }}>Attack Breakdown</h3>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ color: '#8B949E', borderBottom: '1px solid #30363D' }}>
                  <th style={{ padding: '10px 0' }}>Type</th>
                  <th>Count</th>
                  <th>Severity</th>
                  <th>Risk Δ</th>
                  <th>Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((b, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(48, 54, 61, 0.5)' }}>
                    <td style={{ padding: '10px 0', color: '#FFF' }}>{b.label}</td>
                    <td style={{ fontWeight: 'bold' }}>{b.count}</td>
                    <td>
                      <span style={{ 
                        padding: '2px 6px', borderRadius: '4px', fontSize: '10px', 
                        background: b.severity === 'CRITICAL' ? 'rgba(255,68,68,0.2)' : b.severity === 'HIGH' ? 'rgba(255,193,7,0.2)' : 'rgba(0,255,136,0.1)',
                        color: b.severity === 'CRITICAL' ? '#FF4444' : b.severity === 'HIGH' ? '#FFC107' : '#00FF88'
                      }}>{b.severity}</span>
                    </td>
                    <td>+{b.riskDelta}</td>
                    <td style={{ color: '#8B949E' }}>{b.lastSeen ? new Date(b.lastSeen).toLocaleTimeString() : 'Never'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Threat Intelligence / Campaigns */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ background: '#161B22', padding: '20px', borderRadius: '12px', border: '1px solid #30363D' }}>
            <h3 style={{ margin: '0 0 15px', color: '#8B949E', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldAlert size={16} /> Top Threat IPs
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {topIPs.length > 0 ? topIPs.map((ip, i) => (
                <div key={i} style={{ background: '#0D1117', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 68, 68, 0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#FF4444' }}>{ip.ip}</span>
                    <span style={{ fontSize: '12px', color: '#8B949E' }}>{ip.count} events</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#8B949E', marginBottom: '8px' }}>📍 {ip.city}, {ip.country}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#FFF' }}>{Array.from(ip.types).slice(0,2).join(', ')}...</span>
                    <button onClick={() => onBlockIP(ip.ip, `Blocked from Attack Intelligence — ${ip.count} attacks`)}
                      style={{ padding:'5px 12px', background:'rgba(255,68,68,0.1)', color:'#FF4444', border:'1px solid rgba(255,68,68,0.3)', borderRadius:'6px', fontSize:'11px', cursor:'pointer' }}>
                      Block
                    </button>
                  </div>
                </div>
              )) : <div style={{ color: '#8B949E', fontSize: '13px', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>No active threats</div>}
            </div>
          </div>

          <div style={{ background: '#161B22', padding: '20px', borderRadius: '12px', border: '1px solid #30363D' }}>
            <h3 style={{ margin: '0 0 15px', color: '#8B949E', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <GitCommit size={16} /> Attack Campaigns
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {campaignList.length > 0 ? campaignList.map(c => (
                <div key={c.id} style={{ background: '#0D1117', padding: '10px', borderRadius: '8px', borderLeft: '3px solid #FF9900' }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#FFF', marginBottom: '4px' }}>{c.id}</div>
                  <div style={{ fontSize: '11px', color: '#8B949E' }}>IP: {c.sourceIP}</div>
                  <div style={{ fontSize: '11px', color: '#8B949E' }}>Targets: {c.sessions.size} sessions</div>
                  <div style={{ fontSize: '11px', color: '#FF9900', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.attacks.slice(0,3).join(' → ')}
                  </div>
                </div>
              )) : <div style={{ color: '#8B949E', fontSize: '13px', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>No correlated campaigns</div>}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
