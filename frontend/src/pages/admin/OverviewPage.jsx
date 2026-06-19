import React from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ShieldCheck, Users, AlertTriangle, Crosshair, Target } from 'lucide-react';

export default function OverviewPage({ data, currentUser }) {
  if (currentUser.role === 'USER') {
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '20px' }}>
          <div style={{ background: '#161B22', padding: '20px', borderRadius: '12px', border: '1px solid #30363D' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#8B949E', marginBottom: '10px' }}>
              <Users size={18} /> Total Active Sessions
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{data.sessions.length}</div>
          </div>
          <div style={{ background: 'rgba(0, 255, 136, 0.05)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(0, 255, 136, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#00FF88', marginBottom: '10px' }}>
              <ShieldCheck size={18} /> System Status
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#00FF88' }}>Protected</div>
          </div>
        </div>
        <div style={{ background: '#161B22', padding: '40px', borderRadius: '12px', border: '1px solid #30363D', textAlign: 'center' }}>
          <ShieldCheck size={64} color="#00FF88" style={{ margin: '0 auto 20px' }} />
          <h2 style={{ margin: 0, color: '#E6EDF3' }}>System is Protected</h2>
          <p style={{ color: '#8B949E', marginTop: '10px' }}>HoneyShield is actively monitoring your network.</p>
        </div>
      </div>
    );
  }

  const attackers = data.sessions.filter(s => s.state === 'ATTACKER').length;
  const suspicious = data.sessions.filter(s => s.state === 'SUSPICIOUS').length;
  const honeyTrapped = data.sessions.filter(s => s.inHoney).length;
  const zeroDay = data.alertLog.filter(a => a.title.includes('Zero-Day')).length;

  const pieData = [
    { name: 'Normal', value: data.sessions.length - attackers - suspicious, color: '#00FF88' },
    { name: 'Suspicious', value: suspicious, color: '#FFC107' },
    { name: 'Attacker', value: attackers, color: '#FF4444' }
  ].filter(d => d.value > 0);

  const attackCounts = {};
  data.attackLog.forEach(a => { attackCounts[a.type] = (attackCounts[a.type] || 0) + 1; });
  const barData = Object.entries(attackCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const targetCounts = {};
  data.attackLog.forEach(a => { targetCounts[a.targetArea] = (targetCounts[a.targetArea] || 0) + 1; });
  const topTargets = Object.entries(targetCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const fingerprints = {};
  data.sessions.filter(s => s.state === 'ATTACKER').forEach(s => {
    const hint = s.fingerprint?.toolHint || 'Unknown';
    fingerprints[hint] = (fingerprints[hint] || 0) + 1;
  });
  const topFingerprints = Object.entries(fingerprints).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 5 Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '15px' }}>
        <MetricCard icon={<Users />} label="Total Sessions" value={data.sessions.length} />
        <MetricCard icon={<AlertTriangle />} label="Attackers" value={attackers} color="#FF4444" />
        <MetricCard icon={<Target />} label="Suspicious" value={suspicious} color="#FFC107" />
        <MetricCard icon={<Crosshair />} label="Honey Trapped" value={honeyTrapped} color="#9933FF" />
        <MetricCard icon={<AlertTriangle />} label="Zero-Day Alerts" value={zeroDay} color="#FF4444" bg="rgba(255, 68, 68, 0.1)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
        {/* Risk Distribution PieChart */}
        <div style={{ background: '#161B22', padding: '20px', borderRadius: '12px', border: '1px solid #30363D' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '14px', color: '#8B949E' }}>Risk Distribution</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#0D1117', border: '1px solid #30363D' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="No session data" />
          )}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '10px' }}>
            {pieData.map(d => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: d.color }} />
                {d.name} ({d.value})
              </div>
            ))}
          </div>
        </div>

        {/* Attack Type BarChart */}
        <div style={{ background: '#161B22', padding: '20px', borderRadius: '12px', border: '1px solid #30363D' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '14px', color: '#8B949E' }}>Top Attack Vectors</h3>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: '#8B949E', fontSize: 10 }} tickFormatter={v => v.substr(0,10)} />
                <YAxis tick={{ fill: '#8B949E', fontSize: 10 }} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#0D1117', border: '1px solid #30363D' }} />
                <Bar dataKey="count" fill="#FF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="No attack data yet" />
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '20px' }}>
        {/* Live Activity Feed */}
        <div style={{ background: '#161B22', padding: '20px', borderRadius: '12px', border: '1px solid #30363D', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 15px', fontSize: '14px', color: '#8B949E' }}>Live Activity Feed</h3>
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '300px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.attackLog.length > 0 ? data.attackLog.slice(0, 50).map(a => {
              const c = a.severity === 'CRITICAL' ? '#FF4444' : a.severity === 'HIGH' ? '#FFC107' : '#00FF88';
              return (
                <div key={a.id} style={{ display: 'flex', gap: '10px', fontSize: '12px', padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', borderLeft: `3px solid ${c}` }}>
                  <span style={{ color: '#8B949E' }}>{new Date(a.timestamp).toLocaleTimeString()}</span>
                  <span style={{ color: c, fontWeight: 'bold', width: '120px' }}>{a.type}</span>
                  <span style={{ flex: 1 }}>{a.sourceIP} ({a.sourceCountry}) → {a.targetArea}</span>
                </div>
              );
            }) : <EmptyState message="Awaiting activity..." />}
          </div>
        </div>

        {/* Top Targeted Areas */}
        <div style={{ background: '#161B22', padding: '20px', borderRadius: '12px', border: '1px solid #30363D' }}>
          <h3 style={{ margin: '0 0 15px', fontSize: '14px', color: '#8B949E' }}>Top Targets</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topTargets.length > 0 ? topTargets.map(([t, c], i) => (
              <div key={t} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ color: '#8B949E' }}>#{i+1}</span> {t}</span>
                <span style={{ background: 'rgba(255, 68, 68, 0.1)', color: '#FF4444', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>{c}</span>
              </div>
            )) : <EmptyState message="No targets hit" />}
          </div>
        </div>

        {/* Top Fingerprints */}
        <div style={{ background: '#161B22', padding: '20px', borderRadius: '12px', border: '1px solid #30363D' }}>
          <h3 style={{ margin: '0 0 15px', fontSize: '14px', color: '#8B949E' }}>Attacker Tools</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topFingerprints.length > 0 ? topFingerprints.map(([t, c], i) => (
              <div key={t} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span>{t}</span>
                <span style={{ background: '#30363D', color: '#FFF', padding: '2px 6px', borderRadius: '4px' }}>{c}</span>
              </div>
            )) : <EmptyState message="No tools detected" />}
          </div>
        </div>
      </div>
    </div>
  );
}

const MetricCard = ({ icon, label, value, color = '#E6EDF3', bg = '#161B22' }) => (
  <div style={{ background: bg, padding: '20px', borderRadius: '12px', border: '1px solid #30363D' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#8B949E', marginBottom: '10px', fontSize: '13px' }}>
      {React.cloneElement(icon, { size: 16 })} {label}
    </div>
    <div style={{ fontSize: '28px', fontWeight: 'bold', color }}>{value}</div>
  </div>
);

const EmptyState = ({ message }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8B949E', fontSize: '13px', fontStyle: 'italic', minHeight: '100px' }}>
    {message}
  </div>
);
