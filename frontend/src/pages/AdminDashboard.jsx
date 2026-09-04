import React, { useState, useEffect, useMemo } from 'react';
import { Shield, LogOut, Download, AlertTriangle, Activity, Database, CheckCircle, XCircle } from 'lucide-react';
import { ADMIN_NAV, USER_NAV } from '../engine/constants';
import { alertEngine } from '../audio/alertEngine';
import OverviewPage from './admin/OverviewPage';
import ActiveSessionsPage from './admin/ActiveSessionsPage';
import AttackIntelligencePage from './admin/AttackIntelligencePage';
import HoneyActivityPage from './admin/HoneyActivityPage';
import GeoMapPage from './admin/GeoMapPage';
import HeatmapPage from './admin/HeatmapPage';
import AlertCenterPage from './admin/AlertCenterPage';
import FPFNAnalysisPage from './admin/FPFNAnalysisPage';
import AIInsightsPage from './admin/AIInsightsPage';
import DataVaultPage from './admin/DataVaultPage';
import SettingsPage from './admin/SettingsPage';
import LiveTrackingPage from './admin/LiveTrackingPage';
import BlockedIPsPage from './admin/BlockedIPsPage';
import HoneyTrapsPage from './admin/HoneyTrapsPage';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: '#FF4444', textAlign: 'center', marginTop: '50px' }}>
          <h2>Something went wrong loading this page.</h2>
          <button onClick={() => this.setState({ hasError: false })} style={{ padding: '10px 20px', background: '#30363D', color: '#FFF', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '10px' }}>
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const downloadCSV = (filename, rows, columns) => {
  const header = columns.join(',');
  const body = rows.map(r => columns.map(c => `"${(r[c]||'').toString().replace(/"/g,'""')}"`).join(','));
  const blob = new Blob([[header,...body].join('\n')], { type:'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
};

export default function AdminDashboard({ currentUser, onLogout, data, engineRef, backendOnline, aiOnline, socketConnected, latency, unreadCount, onBlockIP, onUnblockIP, onBlockFingerprint, onUnblockFingerprint }) {
  const [activePage, setActivePage] = useState('Overview');
  const [time, setTime] = useState(new Date());
  const [showExport, setShowExport] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  
  const [settings, setSettings] = useState({
    suspiciousThreshold: 36, attackerThreshold: 70,
    honeyIntervalSeconds: 10, toastMinSeverity: 'HIGH',
    autoResponseRules: { redirectToHoney:true, blockZeroDay:true, blockDDoS:true, deepTrapAlert:true, flagInsiderThreat:true }
  });

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const safeData = {
    sessions: data?.sessions || [],
    attackLog: data?.attackLog || [],
    honeyLog: data?.honeyLog || [],
    alertLog: data?.alertLog || [],
    autoResponseLog: data?.autoResponseLog || []
  };

  const threatLevel = useMemo(() => {
    if (!safeData.sessions.length) return { label: 'LOW', color: '#00FF88', bg: 'transparent', pulse: false };
    const attackers = safeData.sessions.filter(s => s.state === 'ATTACKER').length;
    const pct = (attackers / safeData.sessions.length) * 100;
    if (pct <= 10) return { label: 'LOW', color: '#00FF88', bg: 'transparent', pulse: false };
    if (pct <= 30) return { label: 'MEDIUM', color: '#FFC107', bg: 'transparent', pulse: false };
    if (pct <= 60) return { label: 'HIGH', color: '#FF4444', bg: 'transparent', pulse: true };
    return { label: 'CRITICAL', color: '#FFF', bg: '#FF4444', pulse: true };
  }, [safeData.sessions]);

  const navItems = currentUser.role === 'ADMIN' ? ADMIN_NAV : USER_NAV;

  const renderPage = () => {
    if (currentUser.role === 'USER' && !['Overview', 'Data Vault'].includes(activePage)) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', color: '#8B949E' }}>
          <AlertTriangle size={48} style={{ margin: '0 auto 20px', color: '#FFC107' }} />
          <h2>Access Restricted</h2>
          <p>Your current role ({currentUser.role}) does not have access to this module.</p>
        </div>
      );
    }

    switch (activePage) {
      case 'Overview': return <OverviewPage data={safeData} engineRef={engineRef} currentUser={currentUser} />;
      case 'Active Sessions': return <ActiveSessionsPage data={safeData} settings={settings} engine={engineRef.current} onBlockIP={onBlockIP} backendOnline={backendOnline} />;
      case 'Attack Intelligence': return <AttackIntelligencePage data={safeData} settings={settings} onBlockIP={onBlockIP} />;
      case 'Honey Activity': return <HoneyActivityPage data={safeData} />;
      case 'Honey Traps': return <HoneyTrapsPage data={safeData} onBlockIP={onBlockIP} />;
      case 'Geo Map': return <GeoMapPage data={safeData} onBlockIP={onBlockIP} />;
      case 'Heatmap': return <HeatmapPage data={safeData} />;
      case 'Alert Center': return <AlertCenterPage data={safeData} engineRef={engineRef} />;
      case 'FP/FN Analysis': return <FPFNAnalysisPage data={safeData} engineRef={engineRef} settings={settings} />;
      case 'AI Insights': return <AIInsightsPage data={safeData} backendOnline={backendOnline} />;
      case 'Data Vault': return <DataVaultPage data={safeData} currentUser={currentUser} />;
      case 'Live Tracking': return <LiveTrackingPage data={safeData} onBlockIP={onBlockIP} onBlockFingerprint={onBlockFingerprint} backendOnline={backendOnline} />;
      case 'Blocked IPs': return <BlockedIPsPage data={safeData} onBlockIP={onBlockIP} onUnblockIP={onUnblockIP} onBlockFingerprint={onBlockFingerprint} onUnblockFingerprint={onUnblockFingerprint} backendOnline={backendOnline} />;
      case 'Settings': return <SettingsPage settings={settings} setSettings={setSettings} data={safeData} backendOnline={backendOnline} />;
      default: return <div>Page not found</div>;
    }
  };

  const handleExport = (type) => {
    if (type === 'attacks') downloadCSV(`attacks_${Date.now()}.csv`, safeData.attackLog, ['id','type','severity','sourceIP','sourceCountry','targetArea','sessionId','timestamp']);
    if (type === 'sessions') downloadCSV(`sessions_${Date.now()}.csv`, safeData.sessions, ['id','username','ip','country','state','riskScore','attackCount','duration']);
    if (type === 'honey') downloadCSV(`honey_${Date.now()}.csv`, safeData.honeyLog, ['id','sessionId','attackerIP','attackerCountry','action','fakeTarget','timestamp']);
    if (type === 'alerts') downloadCSV(`alerts_${Date.now()}.csv`, safeData.alertLog, ['id','severity','title','sessionId','sourceIP','status','timestamp']);
    setShowExport(false);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0D1117', color: '#E6EDF3', fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
      
      {/* SIDEBAR */}
      <div style={{ width: '220px', background: '#161B22', borderRight: '1px solid #30363D', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
        <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #30363D' }}>
          <Shield color="#00FF88" size={24} />
          <span style={{ fontWeight: 'bold', fontSize: '16px', letterSpacing: '0.5px' }}>HONEYSHIELD v2</span>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
          {navItems.map(item => {
            const isActive = activePage === item.id;
            return (
              <div 
                key={item.id} 
                onClick={() => setActivePage(item.id)}
                style={{
                  padding: '12px 20px',
                  cursor: 'pointer',
                  borderLeft: isActive ? '3px solid #00FF88' : '3px solid transparent',
                  background: isActive ? 'rgba(0, 255, 136, 0.08)' : 'transparent',
                  color: isActive ? '#00FF88' : '#8B949E',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease',
                  transform: 'translateX(0)',
                }}
                onMouseEnter={e => { if(!isActive) { e.currentTarget.style.background = '#21262D'; e.currentTarget.style.transform = 'translateX(3px)'; } }}
                onMouseLeave={e => { if(!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'translateX(0)'; } }}
              >
                <span>{item.label}</span>
                {item.id === 'Alert Center' && unreadCount > 0 && (
                  <span style={{ background: '#FF4444', color: '#FFF', fontSize: '11px', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>
                    {unreadCount}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ padding: '16px', borderTop: '1px solid #30363D' }}>
          <button 
            onClick={() => setShowExport(true)}
            style={{ width: '100%', padding: '10px', background: 'transparent', border: '1px solid #30363D', color: '#8B949E', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '10px' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#FFF'; e.currentTarget.style.borderColor = '#8B949E'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#8B949E'; e.currentTarget.style.borderColor = '#30363D'; }}
          >
            <Download size={16} /> Export Data
          </button>
          <button 
            onClick={onLogout}
            style={{ width: '100%', padding: '10px', background: 'rgba(255, 68, 68, 0.1)', border: '1px solid rgba(255, 68, 68, 0.2)', color: '#FF4444', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 68, 68, 0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 68, 68, 0.1)'; }}
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* TOPBAR */}
        <div style={{ height: '52px', background: '#161B22', borderBottom: '1px solid #30363D', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <span style={{ fontWeight: 'bold', color: '#FFF' }}>{activePage}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: '#8B949E', fontSize: '13px', marginRight: '10px' }}>THREAT LEVEL:</span>
            <div style={{ 
              padding: '4px 12px', 
              borderRadius: '20px', 
              background: threatLevel.bg, 
              color: threatLevel.color, 
              border: `1px solid ${threatLevel.color}`,
              fontWeight: 'bold', 
              fontSize: '12px',
              animation: threatLevel.pulse ? 'pulse 2s infinite' : 'none',
              boxShadow: threatLevel.pulse ? `0 0 10px ${threatLevel.color}40` : 'none'
            }}>
              {threatLevel.label}
            </div>
            <style>{`@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }`}</style>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {alertEngine.isAlertActive() && (
              <button onClick={() => { alertEngine.stopContinuousAlert(); setForceUpdate(p => p + 1); }}
                style={{ padding:'6px 14px', background:'rgba(255,68,68,0.2)', color:'#FF4444', border:'1px solid #FF4444', borderRadius:'6px', fontSize:'11px', cursor:'pointer', fontWeight:700, animation:'pulse 1s infinite' }}>
                🔕 Stop Alert
              </button>
            )}
            <span style={{ color: '#8B949E', fontSize: '14px', fontFamily: 'monospace' }}>
              {time.toLocaleTimeString()}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ 
                padding: '4px 8px', 
                borderRadius: '4px', 
                background: currentUser.role === 'ADMIN' ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 193, 7, 0.1)', 
                color: currentUser.role === 'ADMIN' ? '#00FF88' : '#FFC107', 
                fontSize: '12px', 
                fontWeight: 'bold',
                border: `1px solid ${currentUser.role === 'ADMIN' ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 193, 7, 0.3)'}`
              }}>
                {currentUser.role}
              </div>
              <span style={{ fontSize: '14px' }}>{currentUser.username}</span>
            </div>
          </div>
        </div>

        {/* STATUS BAR */}
        <div style={{ height: '24px', background: '#0D1117', borderBottom: '1px solid #30363D', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', fontSize: '11px', color: '#8B949E', zIndex: 9 }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: backendOnline ? '#00FF88' : '#FF4444' }} /> API
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: socketConnected ? '#00FF88' : '#FF4444' }} /> WebSocket
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: aiOnline ? '#00FF88' : '#FF4444' }} /> AI Engine
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: backendOnline ? '#00FF88' : '#FF4444' }} /> Database
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: backendOnline ? '#00FF88' : '#FF4444' }} /> Redis
            </span>
          </div>
          <div>
            Latency: {latency !== null ? `${latency}ms` : '---'}
          </div>
        </div>

        {/* SCROLLABLE MAIN CONTENT */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', position: 'relative' }}>
          <ErrorBoundary>
            {renderPage()}
          </ErrorBoundary>
        </div>
      </div>

      {/* EXPORT MODAL */}
      {showExport && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#161B22', border: '1px solid #30363D', borderRadius: '12px', padding: '24px', width: '400px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><Download size={20} color="#00FF88" /> Export Data</h3>
              <button onClick={() => setShowExport(false)} style={{ background: 'none', border: 'none', color: '#8B949E', cursor: 'pointer' }}><XCircle size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={() => handleExport('attacks')} style={{ padding: '12px', background: '#0D1117', border: '1px solid #30363D', color: '#FFF', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                <span>Attack Logs</span> <span style={{ color: '#8B949E' }}>{safeData.attackLog.length} records</span>
              </button>
              <button onClick={() => handleExport('sessions')} style={{ padding: '12px', background: '#0D1117', border: '1px solid #30363D', color: '#FFF', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                <span>Session Data</span> <span style={{ color: '#8B949E' }}>{safeData.sessions.length} records</span>
              </button>
              <button onClick={() => handleExport('honey')} style={{ padding: '12px', background: '#0D1117', border: '1px solid #30363D', color: '#FFF', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                <span>Honey Activity</span> <span style={{ color: '#8B949E' }}>{safeData.honeyLog.length} records</span>
              </button>
              <button onClick={() => handleExport('alerts')} style={{ padding: '12px', background: '#0D1117', border: '1px solid #30363D', color: '#FFF', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                <span>Security Alerts</span> <span style={{ color: '#8B949E' }}>{safeData.alertLog.length} records</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
