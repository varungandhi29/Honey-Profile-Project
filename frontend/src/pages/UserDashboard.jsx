import React, { useState, useEffect } from 'react';
import { ShieldCheck, LogOut, FileText, AlertTriangle, Send, CheckCircle, Lock, Download, Key, Shield, User, Laptop, CheckSquare, Award, Clock } from 'lucide-react';
import { getUsers, saveUsers } from '../engine/constants';

export default function UserDashboard({ currentUser, onLogout, addToast }) {
  const [activeTab, setActiveTab] = useState('Workspace');
  const [newPassword, setNewPassword] = useState('');
  const [pwdChanged, setPwdChanged] = useState(false);

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
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 800 }}>Authorized Corporate Document Repository</h2>
                <p style={{ color: '#94A3B8', margin: 0, fontSize: '13px' }}>
                  Legitimate operational policies, handbooks, and compliance standards for verified employees.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                {[
                  { title: 'Enterprise Security Handbook 2026', size: '2.4 MB', type: 'PDF Policy' },
                  { title: 'Acceptable Use & Remote Access Policy', size: '1.1 MB', type: 'Compliance' },
                  { title: 'IT Helpdesk & Incident Escalation Guide', size: '890 KB', type: 'Documentation' },
                  { title: 'Clean Desk & Data Privacy Checklist', size: '640 KB', type: 'Standard' }
                ].map(doc => (
                  <div key={doc.title} style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={20} color="#3B82F6" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '14px', color: '#F8FAFC' }}>{doc.title}</div>
                        <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>{doc.type} · {doc.size}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDownloadDoc(doc.title)}
                      style={{
                        padding: '8px 14px',
                        background: '#0F172A',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        color: '#3B82F6',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Download size={13} />
                      Download
                    </button>
                  </div>
                ))}
              </div>
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

        </div>
      </div>
    </div>
  );
}
