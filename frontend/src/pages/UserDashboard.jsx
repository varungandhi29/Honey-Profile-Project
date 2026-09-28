import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, LogOut, FileText, AlertTriangle, Send, CheckCircle, 
  Lock, Unlock, Download, Key, Shield, User, Laptop, CheckSquare, 
  Award, Clock, Image as ImageIcon, Video, Eye, EyeOff, Plus, X 
} from 'lucide-react';
import { getUsers, saveUsers } from '../engine/constants';
import { getVaultItems, addVaultItem, verifyVaultPassword } from '../utils/secureVault';

export default function UserDashboard({ currentUser, onLogout, addToast }) {
  const [activeTab, setActiveTab] = useState('Workspace');
  const [newPassword, setNewPassword] = useState('');
  const [pwdChanged, setPwdChanged] = useState(false);

  // Vault state
  const [vaultItems, setVaultItems] = useState([]);
  const [unlockedItems, setUnlockedItems] = useState(new Set());
  const [passwordModalItem, setPasswordModalItem] = useState(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [previewItem, setPreviewItem] = useState(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // User upload form
  const [uCategory, setUCategory] = useState('IMAGE');
  const [uTitle, setUTitle] = useState('');
  const [uDesc, setUDesc] = useState('');
  const [uPassword, setUPassword] = useState('');
  const [uContent, setUContent] = useState('');
  const [uFileName, setUFileName] = useState('');
  const [uFileType, setUFileType] = useState('');
  const [uFileSize, setUFileSize] = useState('');
  const [uText, setUText] = useState('');

  // Load vault items
  const loadVault = () => {
    const items = getVaultItems(currentUser);
    setVaultItems(items);
  };

  useEffect(() => {
    loadVault();
  }, [currentUser, activeTab]);

  // Incident reporting state
  const [reportType, setReportType] = useState('Phishing Email');
  const [reportUrl, setReportUrl] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);

  // Checklist items
  const [checklist, setChecklist] = useState([
    { id: 1, label: 'Annual Cybersecurity Awareness Training 2026', done: true },
    { id: 2, label: 'Multi-Factor Authentication (2FA) Verified', done: true },
    { id: 3, label: 'Workstation Disk Encryption Status Confirmed', done: true },
    { id: 4, label: 'Quarterly Password Rotation Compliance', done: false },
    { id: 5, label: 'Review Enterprise Acceptable Use Policy', done: false }
  ]);

  const toggleCheck = (id) => {
    setChecklist(prev => prev.map(c => c.id === id ? { ...c, done: !c.done } : c));
  };

  const handleReportIncident = (e) => {
    e.preventDefault();
    if (!reportDetails.trim()) return;

    const report = {
      id: `INC-${Date.now()}`,
      reportedBy: currentUser?.username || 'Employee',
      name: currentUser?.name || 'Enterprise User',
      type: reportType,
      targetUrl: reportUrl || 'N/A',
      details: reportDetails,
      timestamp: new Date().toISOString()
    };

    try {
      const existing = JSON.parse(localStorage.getItem('honeyshield_incident_reports') || '[]');
      localStorage.setItem('honeyshield_incident_reports', JSON.stringify([report, ...existing]));
    } catch {}

    setReportSubmitted(true);
    setReportUrl('');
    setReportDetails('');
    setTimeout(() => setReportSubmitted(false), 4000);
  };

  const handlePasswordChange = (e) => {
    e.preventDefault();
    if (!newPassword.trim()) return;

    const currentUsers = getUsers();
    const updated = currentUsers.map(u => {
      if (u.username === currentUser.username) {
        return { ...u, password: newPassword.trim() };
      }
      return u;
    });

    saveUsers(updated);
    setPwdChanged(true);
    setNewPassword('');
    setTimeout(() => setPwdChanged(false), 3000);
  };

  const handleDownloadDoc = (title) => {
    const blob = new Blob([`HONEYSHIELD ENTERPRISE DOCUMENT\n\nTitle: ${title}\nAuthorized User: ${currentUser.name} (${currentUser.username})\nDepartment: ${currentUser.dept || 'Corporate'}\nClassification: Internal Restricted\nTimestamp: ${new Date().toISOString()}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0F172A', color: '#F1F5F9', fontFamily: 'system-ui, sans-serif', overflow: 'hidden' }}>
      
      {/* SIDEBAR */}
      <div style={{ width: '240px', background: '#1E293B', borderRight: '1px solid #334155', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', background: '#3B82F6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={20} color="#FFF" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '15px', color: '#F8FAFC' }}>HoneyShield</div>
            <div style={{ fontSize: '11px', color: '#94A3B8' }}>Employee Workspace</div>
          </div>
        </div>

        {/* User Profile Snippet */}
        <div style={{ padding: '16px', margin: '16px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '10px', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#10B981', color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px' }}>
              {currentUser?.name ? currentUser.name.charAt(0) : 'U'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#F8FAFC', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {currentUser?.name || currentUser?.username}
              </div>
              <div style={{ fontSize: '11px', color: '#10B981', fontWeight: 600 }}>
                ● Verified Employee
              </div>
            </div>
          </div>
          <div style={{ marginTop: '10px', fontSize: '11px', color: '#94A3B8', fontFamily: 'monospace' }}>
            ID: {currentUser?.username}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {[
            { id: 'Workspace', label: 'My Security Workspace', icon: ShieldCheck },
            { id: 'Report Incident', label: 'Report Threat / Phishing', icon: AlertTriangle },
            { id: 'Company Vault', label: 'Corporate Documents', icon: FileText },
            { id: 'Profile', label: 'Account & Credentials', icon: Key }
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <div
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '11px 14px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '13px',
                  fontWeight: active ? 700 : 500,
                  background: active ? '#3B82F6' : 'transparent',
                  color: active ? '#FFFFFF' : '#94A3B8',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#334155'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                <Icon size={16} color={active ? '#FFF' : '#94A3B8'} />
                <span>{tab.label}</span>
              </div>
            );
          })}
        </div>

        {/* Sign Out Button */}
        <div style={{ padding: '16px', borderTop: '1px solid #334155' }}>
          <button
            onClick={onLogout}
            style={{
              width: '100%',
              padding: '10px',
              background: 'transparent',
              border: '1px solid #475569',
              borderRadius: '8px',
              color: '#F8FAFC',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '13px',
              fontWeight: 600
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#EF4444'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#475569'}
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Top Header */}
        <div style={{ height: '60px', background: '#1E293B', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', flexShrink: 0 }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#F8FAFC' }}>
            {activeTab === 'Workspace' && 'Enterprise Security Workspace'}
            {activeTab === 'Report Incident' && 'Security Incident & Phishing Dispatcher'}
            {activeTab === 'Company Vault' && 'Official Corporate Document Vault'}
            {activeTab === 'Profile' && 'User Credential Self-Service'}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10B981', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>
              🛡️ SOC Connected & Monitored
            </div>
            <div style={{ fontSize: '12px', color: '#94A3B8' }}>
              Department: <strong style={{ color: '#F8FAFC' }}>{currentUser?.dept || 'Engineering'}</strong>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px' }}>
          
          {/* TAB 1: WORKSPACE */}
          {activeTab === 'Workspace' && (
            <div>
              {/* Trust Score Banner */}
              <div style={{ background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', border: '1px solid #334155', borderRadius: '16px', padding: '24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                <div>
                  <div style={{ color: '#94A3B8', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Personal Security Health Index</div>
                  <h1 style={{ fontSize: '36px', fontWeight: 900, color: '#10B981', margin: '6px 0' }}>
                    96 <span style={{ fontSize: '20px', color: '#94A3B8', fontWeight: 500 }}>/ 100 (Grade A+)</span>
                  </h1>
                  <p style={{ color: '#94A3B8', margin: 0, fontSize: '13px' }}>
                    Excellent hygiene! Your credentials and browser environment comply with SOC standards.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '14px 20px', borderRadius: '10px', border: '1px solid #334155', textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#3B82F6' }}>Active</div>
                    <div style={{ fontSize: '11px', color: '#94A3B8' }}>2FA Protection</div>
                  </div>
                  <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '14px 20px', borderRadius: '10px', border: '1px solid #334155', textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#10B981' }}>Clean</div>
                    <div style={{ fontSize: '11px', color: '#94A3B8' }}>Endpoint Audit</div>
                  </div>
                  <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '14px 20px', borderRadius: '10px', border: '1px solid #334155', textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#F59E0B' }}>0</div>
                    <div style={{ fontSize: '11px', color: '#94A3B8' }}>Flagged Threats</div>
                  </div>
                </div>
              </div>

              {/* 2-Column: Checklist & Activity */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
                
                {/* Security Training Checklist */}
                <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '14px', padding: '20px' }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckSquare size={18} color="#3B82F6" />
                    Security Compliance & Training Tasks
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {checklist.map(item => (
                      <div
                        key={item.id}
                        onClick={() => toggleCheck(item.id)}
                        style={{
                          padding: '12px 14px',
                          background: item.done ? 'rgba(16, 185, 129, 0.08)' : '#0F172A',
                          border: `1px solid ${item.done ? 'rgba(16, 185, 129, 0.3)' : '#334155'}`,
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '4px',
                          background: item.done ? '#10B981' : 'transparent',
                          border: `2px solid ${item.done ? '#10B981' : '#64748B'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {item.done && <CheckCircle size={14} color="#FFF" />}
                        </div>
                        <span style={{ fontSize: '13px', color: item.done ? '#F8FAFC' : '#94A3B8', textDecoration: item.done ? 'line-through' : 'none' }}>
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Session & Device Security Info */}
                <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '14px', padding: '20px' }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Laptop size={18} color="#10B981" />
                    Authorized Device Status
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #334155' }}>
                      <span style={{ color: '#94A3B8' }}>Registered Username</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#3B82F6' }}>{currentUser?.username}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #334155' }}>
                      <span style={{ color: '#94A3B8' }}>Assigned Department</span>
                      <span>{currentUser?.dept || 'Engineering'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #334155' }}>
                      <span style={{ color: '#94A3B8' }}>Operating System</span>
                      <span>{navigator.platform}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #334155' }}>
                      <span style={{ color: '#94A3B8' }}>Session Security State</span>
                      <span style={{ color: '#10B981', fontWeight: 700 }}>● Encrypted TLS</span>
                    </div>
                  </div>

                  <div style={{ marginTop: '20px' }}>
                    <button
                      onClick={() => setActiveTab('Report Incident')}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: '#3B82F6',
                        color: '#FFF',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      <AlertTriangle size={15} />
                      Report Suspicious Email / Link
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: REPORT INCIDENT */}
          {activeTab === 'Report Incident' && (
            <div style={{ maxWidth: '640px', margin: '0 auto', background: '#1E293B', border: '1px solid #334155', borderRadius: '16px', padding: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={22} color="#EF4444" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Dispatch Incident to SOC</h2>
                  <p style={{ margin: '2px 0 0', color: '#94A3B8', fontSize: '13px' }}>
                    Alert SOC Administrator (Varun Gandhi) about phishing, suspicious links, or unauthorized messages.
                  </p>
                </div>
              </div>

              {reportSubmitted && (
                <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10B981', color: '#10B981', padding: '14px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle size={18} />
                  Incident successfully submitted to Admin SOC! Threat intelligence unit notified.
                </div>
              )}

              <form onSubmit={handleReportIncident}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94A3B8', marginBottom: '6px' }}>Threat Classification</label>
                  <select
                    value={reportType}
                    onChange={e => setReportType(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: '#0F172A', border: '1px solid #334155', borderRadius: '8px', color: '#F8FAFC', outline: 'none' }}
                  >
                    <option value="Phishing Email">Phishing Email / Fake Invoice</option>
                    <option value="Malicious Link">Suspicious URL / Fake Login Link</option>
                    <option value="Credential Harvest">Attempted Credential Theft</option>
                    <option value="Social Engineering">Impersonation / Vishing Call</option>
                  </select>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94A3B8', marginBottom: '6px' }}>Target URL / Sender Email</label>
                  <input
                    type="text"
                    placeholder="e.g. security-update@fake-verify.xyz"
                    value={reportUrl}
                    onChange={e => setReportUrl(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', background: '#0F172A', border: '1px solid #334155', borderRadius: '8px', color: '#F8FAFC', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94A3B8', marginBottom: '6px' }}>Incident Details & Context</label>
                  <textarea
                    rows={4}
                    placeholder="Describe what occurred, what was requested, or paste email body..."
                    required
                    value={reportDetails}
                    onChange={e => setReportDetails(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', background: '#0F172A', border: '1px solid #334155', borderRadius: '8px', color: '#F8FAFC', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#EF4444',
                    color: '#FFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Send size={16} />
                  Transmit Alert to SOC
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: COMPANY VAULT */}
          {activeTab === 'Company Vault' && (
            <div>
              <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 800, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Lock size={20} color="#10B981" /> Confidential Corporate Data Vault
                  </h2>
                  <p style={{ color: '#94A3B8', margin: 0, fontSize: '13px' }}>
                    End-to-end encrypted storage for Images, Videos, Documents, and Classified Notes dispatched to you.
                  </p>
                </div>
                <button
                  onClick={() => setUploadModalOpen(true)}
                  style={{ padding: '8px 16px', background: '#3B82F6', color: '#FFF', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={15} /> Upload My Secure File
                </button>
              </div>

              {vaultItems.length === 0 ? (
                <div style={{ background: '#1E293B', borderRadius: '12px', padding: '40px', border: '1px solid #334155', textAlign: 'center', color: '#94A3B8' }}>
                  <Lock size={36} color="#475569" style={{ margin: '0 auto 12px' }} />
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#F8FAFC', marginBottom: '4px' }}>No Vault Items Dispatched to You</div>
                  <div style={{ fontSize: '13px' }}>When the SOC Admin sends you confidential files or media, they will appear here.</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                  {vaultItems.map(item => {
                    const isProtected = item.passwordProtected && !unlockedItems.has(item.id);
                    const isImage = item.category === 'IMAGE';
                    const isVideo = item.category === 'VIDEO';
                    const isDoc = item.category === 'DOCUMENT';
                    const isText = item.category === 'TEXT';

                    return (
                      <div
                        key={item.id}
                        style={{
                          background: '#1E293B',
                          border: isProtected ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid #334155',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          transition: 'all 0.2s',
                          position: 'relative'
                        }}
                      >
                        {/* Thumbnail / Header */}
                        <div style={{ height: '140px', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                          {isProtected ? (
                            <div style={{ textAlign: 'center', padding: '16px' }}>
                              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid #F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', color: '#F59E0B' }}>
                                <Lock size={24} />
                              </div>
                              <div style={{ fontSize: '11px', fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase' }}>
                                Access Password Required
                              </div>
                            </div>
                          ) : (
                            <>
                              {isImage && item.content?.startsWith('data:image') ? (
                                <img src={item.content} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : isVideo && item.content?.startsWith('data:video') ? (
                                <video src={item.content} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : isText ? (
                                <div style={{ padding: '14px', fontSize: '11px', color: '#10B981', fontFamily: 'monospace', width: '100%', height: '100%', overflow: 'hidden' }}>
                                  {item.content?.substring(0, 150)}...
                                </div>
                              ) : (
                                <div style={{ textAlign: 'center' }}>
                                  <FileText size={40} color="#3B82F6" style={{ margin: '0 auto 6px' }} />
                                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>{item.fileName}</div>
                                </div>
                              )}
                            </>
                          )}

                          {/* Category Badge */}
                          <div style={{ position: 'absolute', top: '10px', left: '10px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(15,23,42,0.85)', color: '#38BDF8', fontSize: '10px', fontWeight: 800, border: '1px solid #334155' }}>
                            {item.category}
                          </div>

                          {/* Protection status */}
                          <div style={{ position: 'absolute', top: '10px', right: '10px', padding: '3px 8px', borderRadius: '4px', background: isProtected ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)', color: isProtected ? '#F59E0B' : '#10B981', fontSize: '10px', fontWeight: 700, border: `1px solid ${isProtected ? '#F59E0B' : '#10B981'}40` }}>
                            {isProtected ? '🔒 Locked' : '🔓 Decrypted'}
                          </div>
                        </div>

                        {/* Details Area */}
                        <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <div style={{ fontWeight: 700, fontSize: '14px', color: '#F8FAFC', marginBottom: '4px' }}>
                            {item.title}
                          </div>
                          <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '14px', flex: 1, lineHeight: '1.5' }}>
                            {item.description || 'Secure corporate payload'}
                          </div>

                          <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Sender: {item.uploadedBy}</span>
                            <span>{item.fileSize}</span>
                          </div>

                          {/* Action Button */}
                          {isProtected ? (
                            <button
                              onClick={() => {
                                setPasswordModalItem(item);
                                setPasswordInput('');
                                setPasswordError('');
                              }}
                              style={{ width: '100%', padding: '9px', background: '#F59E0B', color: '#0F172A', border: 'none', borderRadius: '6px', fontWeight: 800, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            >
                              <Key size={14} /> Enter Password to Unlock & View
                            </button>
                          ) : (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                onClick={() => setPreviewItem(item)}
                                style={{ flex: 1, padding: '8px', background: '#3B82F6', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                              >
                                <Eye size={14} /> View / Play
                              </button>
                              {item.content && (
                                <a
                                  href={item.content}
                                  download={item.fileName || 'file'}
                                  style={{ padding: '8px 12px', background: '#0F172A', color: '#38BDF8', border: '1px solid #334155', borderRadius: '6px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                  <Download size={14} />
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PROFILE & CREDENTIALS */}
          {activeTab === 'Profile' && (
            <div style={{ maxWidth: '520px', margin: '0 auto', background: '#1E293B', border: '1px solid #334155', borderRadius: '16px', padding: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Key size={22} color="#3B82F6" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Self-Service Credential Rotation</h2>
                  <p style={{ margin: '2px 0 0', color: '#94A3B8', fontSize: '13px' }}>Update your authorized login password.</p>
                </div>
              </div>

              {pwdChanged && (
                <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10B981', color: '#10B981', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', fontWeight: 600 }}>
                  ✅ Password successfully updated! Your new password is now active.
                </div>
              )}

              <form onSubmit={handlePasswordChange}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94A3B8', marginBottom: '6px' }}>Registered Username</label>
                  <input
                    type="text"
                    disabled
                    value={currentUser?.username}
                    style={{ width: '100%', padding: '10px 14px', background: '#0F172A', border: '1px solid #334155', borderRadius: '8px', color: '#94A3B8', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94A3B8', marginBottom: '6px' }}>New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter strong new password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', background: '#0F172A', border: '1px solid #334155', borderRadius: '8px', color: '#F8FAFC', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#3B82F6',
                    color: '#FFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Update My Password
                </button>
              </form>
            </div>
          )}

          {/* ============================================================ */}
          {/* PASSWORD CHALLENGE MODAL (Only users with pass can see) */}
          {/* ============================================================ */}
          {passwordModalItem && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              <div style={{ background: '#1E293B', border: '2px solid #F59E0B', borderRadius: '16px', maxWidth: '440px', width: '100%', padding: '28px', textAlign: 'center', boxShadow: '0 0 40px rgba(245, 158, 11, 0.3)' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid #F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#F59E0B' }}>
                  <Key size={28} />
                </div>
                <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 800, color: '#F8FAFC' }}>
                  Decryption Password Required
                </h3>
                <p style={{ color: '#94A3B8', fontSize: '13px', lineHeight: '1.5', margin: '0 0 20px' }}>
                  The sender has protected <strong style={{ color: '#F8FAFC' }}>"{passwordModalItem.title}"</strong> with a private access password. Enter the password to unlock and decrypt this {passwordModalItem.category}.
                </p>

                {passwordError && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #EF4444', color: '#EF4444', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '12px', fontWeight: 600 }}>
                    {passwordError}
                  </div>
                )}

                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (verifyVaultPassword(passwordModalItem, passwordInput)) {
                    setUnlockedItems(prev => new Set([...prev, passwordModalItem.id]));
                    const unlocked = { ...passwordModalItem };
                    setPasswordModalItem(null);
                    setPasswordInput('');
                    setPasswordError('');
                    setPreviewItem(unlocked);
                    addToast?.('🔓 Decryption key accepted — payload unlocked', 'success');
                  } else {
                    setPasswordError('❌ Incorrect Access Password! Decryption failed. Access denied.');
                  }
                }}>
                  <input
                    type="password"
                    autoFocus
                    required
                    placeholder="Enter access password..."
                    value={passwordInput}
                    onChange={e => setPasswordInput(e.target.value)}
                    style={{ width: '100%', padding: '12px 14px', background: '#0F172A', border: '1px solid #475569', borderRadius: '8px', color: '#00FF88', fontSize: '14px', outline: 'none', marginBottom: '16px', boxSizing: 'border-box', fontFamily: 'monospace', textAlign: 'center' }}
                  />

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="submit"
                      style={{ flex: 1, padding: '11px', background: '#F59E0B', color: '#0F172A', border: 'none', borderRadius: '8px', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}
                    >
                      Unlock & Decrypt
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPasswordModalItem(null); setPasswordInput(''); setPasswordError(''); }}
                      style={{ padding: '11px 20px', background: '#334155', color: '#F8FAFC', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* USER PREVIEW / PLAY MODAL */}
          {/* ============================================================ */}
          {previewItem && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '16px', maxWidth: '720px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: '17px', color: '#F8FAFC' }}>{previewItem.title}</h3>
                    <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                      Sender: {previewItem.uploadedBy} · {previewItem.category} · {previewItem.fileSize}
                    </div>
                  </div>
                  <button onClick={() => setPreviewItem(null)} style={{ background: 'none', border: 'none', color: '#8B949E', cursor: 'pointer' }}>
                    <X size={22} />
                  </button>
                </div>

                <div style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: '10px', padding: '16px', marginBottom: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '260px' }}>
                  {previewItem.category === 'IMAGE' ? (
                    <img src={previewItem.content} alt={previewItem.title} style={{ maxWidth: '100%', maxHeight: '450px', borderRadius: '6px', objectFit: 'contain' }} />
                  ) : previewItem.category === 'VIDEO' ? (
                    <video src={previewItem.content} controls autoPlay style={{ width: '100%', maxHeight: '450px', borderRadius: '6px' }} />
                  ) : previewItem.category === 'TEXT' ? (
                    <pre style={{ color: '#10B981', fontSize: '13px', lineHeight: '1.7', whiteSpace: 'pre-wrap', wordBreak: 'break-word', width: '100%', margin: 0, fontFamily: 'monospace' }}>
                      {previewItem.content}
                    </pre>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '30px' }}>
                      <FileText size={60} color="#3B82F6" style={{ margin: '0 auto 12px' }} />
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#F8FAFC', marginBottom: '6px' }}>{previewItem.fileName}</div>
                      <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '16px' }}>Decrypted Corporate Document ({previewItem.fileSize})</div>
                      <a
                        href={previewItem.content}
                        download={previewItem.fileName}
                        style={{ padding: '10px 24px', background: '#3B82F6', color: '#FFF', textDecoration: 'none', borderRadius: '6px', fontWeight: 800, fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                      >
                        <Download size={15} /> Download Document
                      </a>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setPreviewItem(null)}
                    style={{ padding: '8px 20px', background: '#334155', color: '#F8FAFC', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* USER UPLOAD MODAL */}
          {/* ============================================================ */}
          {uploadModalOpen && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '14px', maxWidth: '500px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Plus size={18} color="#3B82F6" /> Upload Secure Data to Vault
                  </div>
                  <button onClick={() => setUploadModalOpen(false)} style={{ background: 'none', border: 'none', color: '#8B949E', cursor: 'pointer' }}>
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!uTitle.trim()) return;
                  const content = uCategory === 'TEXT' ? uText : uContent;
                  if (!content) {
                    addToast?.('Please specify content or file', 'warning');
                    return;
                  }

                  addVaultItem({
                    title: uTitle,
                    description: uDesc,
                    category: uCategory,
                    fileType: uCategory === 'TEXT' ? 'text/plain' : uFileType,
                    fileName: uCategory === 'TEXT' ? `${uTitle.replace(/\s+/g, '_')}.txt` : uFileName,
                    fileSize: uCategory === 'TEXT' ? '1 KB' : uFileSize,
                    content,
                    recipient: 'ALL_USERS',
                    accessPassword: uPassword
                  }, currentUser);

                  addToast?.('✅ Data securely saved to vault', 'success');
                  loadVault();
                  setUploadModalOpen(false);
                  setUTitle(''); setUDesc(''); setUContent(''); setUText(''); setUPassword('');
                }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '6px' }}>Format</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                      {[
                        { id: 'IMAGE', label: 'Image', icon: ImageIcon },
                        { id: 'VIDEO', label: 'Video', icon: Video },
                        { id: 'DOCUMENT', label: 'Doc', icon: FileText },
                        { id: 'TEXT', label: 'Note', icon: Shield }
                      ].map(cat => {
                        const Icon = cat.icon;
                        const active = uCategory === cat.id;
                        return (
                          <button
                            type="button"
                            key={cat.id}
                            onClick={() => { setUCategory(cat.id); setUContent(''); setUFileName(''); }}
                            style={{
                              padding: '8px 4px',
                              background: active ? 'rgba(59, 130, 246, 0.2)' : '#0F172A',
                              border: active ? '1px solid #3B82F6' : '1px solid #334155',
                              color: active ? '#38BDF8' : '#94A3B8',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Icon size={15} />
                            {cat.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '6px' }}>Title</label>
                    <input
                      required
                      value={uTitle}
                      onChange={e => setUTitle(e.target.value)}
                      placeholder="e.g. Project Specs or Expense Invoice"
                      style={{ width: '100%', padding: '10px', background: '#0F172A', border: '1px solid #334155', borderRadius: '6px', color: '#F8FAFC', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '6px' }}>Description</label>
                    <input
                      value={uDesc}
                      onChange={e => setUDesc(e.target.value)}
                      placeholder="Brief summary..."
                      style={{ width: '100%', padding: '10px', background: '#0F172A', border: '1px solid #334155', borderRadius: '6px', color: '#F8FAFC', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>

                  {uCategory === 'TEXT' ? (
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '6px' }}>Text Content</label>
                      <textarea
                        required
                        rows={4}
                        value={uText}
                        onChange={e => setUText(e.target.value)}
                        placeholder="Type confidential note..."
                        style={{ width: '100%', padding: '10px', background: '#0F172A', border: '1px solid #334155', borderRadius: '6px', color: '#10B981', fontSize: '12px', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }}
                      />
                    </div>
                  ) : (
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '6px' }}>Select {uCategory} File</label>
                      <input
                        type="file"
                        required={!uContent}
                        accept={uCategory === 'IMAGE' ? 'image/*' : uCategory === 'VIDEO' ? 'video/*' : '.pdf,.docx,.xlsx,.txt'}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUFileName(file.name);
                          setUFileType(file.type);
                          setUFileSize(`${Math.round(file.size / 1024)} KB`);
                          const reader = new FileReader();
                          reader.onload = ev => setUContent(ev.target.result);
                          reader.readAsDataURL(file);
                        }}
                        style={{ width: '100%', padding: '10px', background: '#0F172A', border: '1px solid #334155', borderRadius: '6px', color: '#F8FAFC', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
                      />
                      {uFileName && (
                        <div style={{ marginTop: '4px', fontSize: '11px', color: '#10B981' }}>
                          ✓ {uFileName} ({uFileSize})
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', marginBottom: '6px' }}>
                      🔑 Optional Access Password
                    </label>
                    <input
                      value={uPassword}
                      onChange={e => setUPassword(e.target.value)}
                      placeholder="Require password to decrypt..."
                      style={{ width: '100%', padding: '10px', background: '#0F172A', border: '1px solid #334155', borderRadius: '6px', color: '#00FF88', fontSize: '12px', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <button
                      type="submit"
                      style={{ flex: 1, padding: '11px', background: '#3B82F6', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                    >
                      Save to Vault
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadModalOpen(false)}
                      style={{ padding: '11px 20px', background: '#334155', color: '#F8FAFC', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
