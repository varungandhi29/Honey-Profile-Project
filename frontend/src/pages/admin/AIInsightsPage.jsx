import React, { useState, useEffect } from 'react';
import { BrainCircuit, Server, Activity, RefreshCw } from 'lucide-react';

export default function AIInsightsPage({ data, backendOnline }) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modelInfo, setModelInfo] = useState({ algorithm: 'Random Forest', ready: false });

  const fetchInsights = async () => {
    if (!backendOnline) return;
    setLoading(true);
    try {
      const rm = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/ai/health`);
      const dm = await rm.json();
      setModelInfo(prev => ({ ...prev, ready: dm.model_loaded }));

      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/ai/insights`);
      const d = await res.json();
      setInsights(d.insights || []);
    } catch (e) {
      console.warn('AI Insights fetch failed', e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchInsights(); }, [backendOnline]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
      
      {/* AI Status Bar */}
      <div style={{ background: '#161B22', padding: '20px', borderRadius: '12px', border: '1px solid #30363D', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <BrainCircuit size={32} color={modelInfo.ready ? "#00FF88" : "#FF4444"} />
          <div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#FFF' }}>Machine Learning Engine</div>
            <div style={{ fontSize: '12px', color: '#8B949E' }}>Algorithm: {modelInfo.algorithm} | Status: <span style={{ color: modelInfo.ready ? '#00FF88' : '#FF4444' }}>{modelInfo.ready ? 'ONLINE' : 'OFFLINE'}</span></div>
          </div>
        </div>
        <button onClick={fetchInsights} disabled={loading} style={{ padding: '8px 16px', background: '#30363D', color: '#FFF', border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> {loading ? 'Analyzing...' : 'Refresh Predictions'}
        </button>
        <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>

      <div style={{ display: 'flex', gap: '20px', flex: 1, overflow: 'hidden' }}>
        
        {/* Predictions List */}
        <div style={{ flex: 2, background: '#161B22', padding: '20px', borderRadius: '12px', border: '1px solid #30363D', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 20px', color: '#8B949E', fontSize: '14px' }}>Active Session Predictions</h3>
          
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {insights.length > 0 ? insights.map((insight, i) => {
              if (insight.error) return <div key={i} style={{ padding: '12px', background: '#0D1117', border: '1px solid #30363D', borderRadius: '8px', color: '#FF4444', fontSize: '12px' }}>{insight.username} - Error: {insight.error}</div>;
              
              const pred = insight.prediction;
              if (!pred) return null;
              
              const c = pred.label === 'ATTACKER' ? '#FF4444' : pred.label === 'SUSPICIOUS' ? '#FFC107' : '#00FF88';

              return (
                <div key={insight.sessionId} style={{ padding: '15px', background: '#0D1117', border: '1px solid #30363D', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontWeight: 'bold', color: '#FFF', fontSize: '14px' }}>{insight.username}</span>
                    <div style={{ padding: '4px 10px', background: `${c}20`, color: c, border: `1px solid ${c}`, borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                      {pred.label} ({pred.confidence}%)
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <ProbBar label="NORMAL" value={pred.scores.NORMAL} color="#00FF88" />
                    <ProbBar label="SUSPICIOUS" value={pred.scores.SUSPICIOUS} color="#FFC107" />
                    <ProbBar label="ATTACKER" value={pred.scores.ATTACKER} color="#FF4444" />
                  </div>
                </div>
              );
            }) : <div style={{ textAlign: 'center', color: '#8B949E', padding: '40px', fontStyle: 'italic' }}>{modelInfo.ready ? 'Click Refresh to analyze active sessions' : 'AI Engine is offline'}</div>}
          </div>
        </div>

        {/* Feature Importance Info */}
        <div style={{ flex: 1, background: '#161B22', padding: '20px', borderRadius: '12px', border: '1px solid #30363D', overflowY: 'auto' }}>
          <h3 style={{ margin: '0 0 20px', color: '#8B949E', fontSize: '14px' }}>Model Features</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', fontSize: '12px', color: '#8B949E' }}>
            <FeatureItem name="Risk Score" desc="Engine calculated score (0-100)" />
            <FeatureItem name="Attack Count" desc="Number of distinct attack events" />
            <FeatureItem name="Honey Interactions" desc="Files/Credentials accessed in trap" />
            <FeatureItem name="Session Duration" desc="Time since login in seconds" />
            <FeatureItem name="Requests/Min" desc="Action velocity" />
            <FeatureItem name="Unique Attack Types" desc="Variety of attack vectors used" />
            <FeatureItem name="In Honey" desc="Boolean flag if trapped" />
          </div>
        </div>

      </div>
    </div>
  );
}

const ProbBar = ({ label, value, color }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '10px' }}>
    <div style={{ width: '70px', color: '#8B949E' }}>{label}</div>
    <div style={{ flex: 1, background: '#161B22', height: '6px', borderRadius: '3px' }}>
      <div style={{ width: `${value}%`, background: color, height: '100%', borderRadius: '3px' }} />
    </div>
    <div style={{ width: '30px', textAlign: 'right', color: '#FFF' }}>{value}%</div>
  </div>
);

const FeatureItem = ({ name, desc }) => (
  <div style={{ background: '#0D1117', padding: '10px', borderRadius: '6px', border: '1px solid #30363D' }}>
    <div style={{ color: '#FFF', fontWeight: 'bold', marginBottom: '2px' }}>{name}</div>
    <div>{desc}</div>
  </div>
);
