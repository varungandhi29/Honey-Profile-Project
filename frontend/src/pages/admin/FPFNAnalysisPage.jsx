import React from 'react';
import { Activity, AlertTriangle, Crosshair, CheckCircle2 } from 'lucide-react';

export default function FPFNAnalysisPage({ data, engineRef, settings }) {
  const ST = settings.suspiciousThreshold;
  const AT = settings.attackerThreshold;

  const TP = data.sessions.filter(s => s.state === 'ATTACKER' && s.riskScore >= AT).length;
  const TN = data.sessions.filter(s => s.state === 'NORMAL' && s.riskScore < ST).length;
  const FP = data.sessions.filter(s => s.state === 'NORMAL' && s.riskScore >= ST).length;
  const FN = data.sessions.filter(s => s.state === 'ATTACKER' && s.riskScore < AT && s.fnStartTime && Date.now() - new Date(s.fnStartTime).getTime() > 60000).length;

  const total = Math.max(data.sessions.length, 1);
  const accuracy = (((TP + TN) / total) * 100).toFixed(1);
  const precision = ((TP / Math.max(TP + FP, 1)) * 100).toFixed(1);
  const recall = ((TP / Math.max(TP + FN, 1)) * 100).toFixed(1);
  const f1 = ((2 * parseFloat(precision) * parseFloat(recall)) / Math.max(parseFloat(precision) + parseFloat(recall), 0.01)).toFixed(1);

  const simulateFP = () => {
    const normal = data.sessions.find(s => s.state === 'NORMAL');
    if (normal) engineRef.current?.boostSessionRisk(normal.id, 85, 10000);
  };

  const simulateFN = () => {
    engineRef.current?.createStealthSession();
  };

  const resetSim = () => {
    data.sessions.filter(s => s.isSimulated).forEach(s => engineRef.current?.removeSessionById(s.id));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      <div style={{ background: 'rgba(0, 136, 255, 0.1)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(0, 136, 255, 0.3)', color: '#E6EDF3', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
        <Activity color="#0088FF" />
        This page demonstrates real-time detection accuracy measurement based on live session data and current risk thresholds.
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
        <Card title="True Positives (TP)" value={TP} color="#00FF88" sub="Attackers correctly identified" />
        <Card title="True Negatives (TN)" value={TN} color="#00FF88" sub="Normal users allowed" />
        <Card title="False Positives (FP)" value={FP} color="#FF4444" sub="Normal users blocked" />
        <Card title="False Negatives (FN)" value={FN} color="#FF9900" sub="Attackers missed" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
        <Card title="Accuracy" value={`${accuracy}%`} color="#FFF" sub="(TP+TN)/Total" />
        <Card title="Precision" value={`${precision}%`} color="#FFF" sub="TP/(TP+FP)" />
        <Card title="Recall" value={`${recall}%`} color="#FFF" sub="TP/(TP+FN)" />
        <Card title="F1 Score" value={f1} color="#FFF" sub="Harmonic mean" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* Confusion Matrix */}
        <div style={{ background: '#161B22', padding: '20px', borderRadius: '12px', border: '1px solid #30363D' }}>
          <h3 style={{ margin: '0 0 20px', color: '#8B949E', fontSize: '14px' }}>Confusion Matrix</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: '10px', alignItems: 'center' }}>
            <div />
            <div style={{ textAlign: 'center', color: '#8B949E', fontSize: '12px' }}>Actual Attacker</div>
            <div style={{ textAlign: 'center', color: '#8B949E', fontSize: '12px' }}>Actual Normal</div>
            
            <div style={{ textAlign: 'right', color: '#8B949E', fontSize: '12px', paddingRight: '10px' }}>Predicted<br/>Attacker</div>
            <MatrixCell label="TP" value={TP} color="#00FF88" bg="rgba(0,255,136,0.1)" />
            <MatrixCell label="FP" value={FP} color="#FF4444" bg="rgba(255,68,68,0.1)" />
            
            <div style={{ textAlign: 'right', color: '#8B949E', fontSize: '12px', paddingRight: '10px' }}>Predicted<br/>Normal</div>
            <MatrixCell label="FN" value={FN} color="#FF9900" bg="rgba(255,153,0,0.1)" />
            <MatrixCell label="TN" value={TN} color="#00FF88" bg="rgba(0,255,136,0.1)" />
          </div>
        </div>

        {/* Simulation Controls */}
        <div style={{ background: '#161B22', padding: '20px', borderRadius: '12px', border: '1px solid #30363D' }}>
          <h3 style={{ margin: '0 0 20px', color: '#8B949E', fontSize: '14px' }}>Simulation Controls</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ background: 'rgba(255,68,68,0.05)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,68,68,0.2)' }}>
              <div style={{ fontWeight: 'bold', color: '#FF4444', marginBottom: '5px' }}>False Positive (FP)</div>
              <div style={{ fontSize: '12px', color: '#8B949E', marginBottom: '10px' }}>Boosts a normal user's risk score above threshold artificially for 10s.</div>
              <button onClick={simulateFP} style={{ padding: '8px 16px', background: '#FF4444', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>SIMULATE FP</button>
            </div>

            <div style={{ background: 'rgba(255,153,0,0.05)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,153,0,0.2)' }}>
              <div style={{ fontWeight: 'bold', color: '#FF9900', marginBottom: '5px' }}>False Negative (FN)</div>
              <div style={{ fontSize: '12px', color: '#8B949E', marginBottom: '10px' }}>Creates a stealth attacker that stays below threshold.</div>
              <button onClick={simulateFN} style={{ padding: '8px 16px', background: '#FF9900', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>SIMULATE FN</button>
            </div>

            <button onClick={resetSim} style={{ padding: '10px', background: 'transparent', border: '1px solid #30363D', color: '#8B949E', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>RESET SIMULATIONS</button>
          </div>
        </div>

      </div>
    </div>
  );
}

const Card = ({ title, value, color, sub }) => (
  <div style={{ background: '#161B22', padding: '20px', borderRadius: '12px', border: '1px solid #30363D' }}>
    <div style={{ color: '#8B949E', fontSize: '12px', marginBottom: '10px' }}>{title}</div>
    <div style={{ fontSize: '28px', fontWeight: 'bold', color }}>{value}</div>
    <div style={{ color: '#8B949E', fontSize: '11px', marginTop: '5px' }}>{sub}</div>
  </div>
);

const MatrixCell = ({ label, value, color, bg }) => (
  <div style={{ background: bg, border: `1px solid ${color}40`, padding: '20px', borderRadius: '8px', textAlign: 'center', transition: 'transform 0.2s', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
    <div style={{ fontSize: '14px', fontWeight: 'bold', color }}>{label}</div>
    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#FFF', marginTop: '5px' }}>{value}</div>
  </div>
);
