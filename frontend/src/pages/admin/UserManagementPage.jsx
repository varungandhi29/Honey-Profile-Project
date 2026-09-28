import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Key, Shield, Trash2, Edit2, RefreshCw, CheckCircle, AlertCircle, Lock, ShieldAlert, FileText } from 'lucide-react';
import { getUsers, saveUsers, DEFAULT_USERS } from '../../engine/constants';

export default function UserManagementPage({ currentUser, addToast }) {
  const [userList, setUserList] = useState(getUsers);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [incidentReports, setIncidentReports] = useState([]);

  // Form states for Add/Edit
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: 'USER',
    dept: 'Operations'
  });

  useEffect(() => {
    // Load incident reports submitted by regular users
    try {
      const reports = JSON.parse(localStorage.getItem('honeyshield_incident_reports') || '[]');
      setIncidentReports(reports);
    } catch {}
  }, []);

  const refreshUsers = () => {
    const fresh = getUsers();
    setUserList(fresh);
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password: pwd }));
  };

  const handleAddUser = (e) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.password.trim()) {
      alert('Username and password are required!');
      return;
    }

    const current = getUsers();
    if (current.some(u => u.username.toLowerCase() === formData.username.trim().toLowerCase())) {
      alert('User with this ID/Username already exists!');
      return;
    }

    const newUser = {
      id: `u-${Date.now()}`,
      username: formData.username.trim().toLowerCase(),
      password: formData.password.trim(),
      role: formData.role,
      name: formData.name.trim() || formData.username.trim(),
      dept: formData.dept,
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };

    const updated = [...current, newUser];
    saveUsers(updated);
    setUserList(updated);
    setShowAddModal(false);
    setFormData({ name: '', username: '', password: '', role: 'USER', dept: 'Operations' });
  };

  const handleUpdatePassword = (e) => {
    e.preventDefault();
    if (!editUser || !formData.password.trim()) return;

    const current = getUsers();
    const updated = current.map(u => {
      if (u.id === editUser.id || u.username === editUser.username) {
        return { ...u, password: formData.password.trim(), role: formData.role, name: formData.name || u.name };
      }
      return u;
    });

    saveUsers(updated);
    setUserList(updated);
    setEditUser(null);
    setFormData({ name: '', username: '', password: '', role: 'USER', dept: 'Operations' });
  };

  const handleDeleteUser = (username) => {
    if (username === 'varun@g') {
      alert('Cannot delete the root administrator account!');
      return;
    }
    if (window.confirm(`Are you sure you want to delete user ${username}?`)) {
      const current = getUsers();
      const updated = current.filter(u => u.username !== username);
      saveUsers(updated);
      setUserList(updated);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset users back to default (varun@g, darshan@p, dhruv@l, rudra@b)?')) {
      saveUsers(DEFAULT_USERS);
      setUserList(DEFAULT_USERS);
    }
  };

  return (
    <div style={{ padding: '24px', color: '#E6EDF3', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users color="#00FF88" size={28} />
            User & Identity Credential Management
          </h1>
          <p style={{ color: '#8B949E', margin: 0, fontSize: '14px' }}>
            Manage active identities, reset passwords, provision users, and monitor cross-browser enforcement policies.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => {
              setFormData({ name: '', username: '', password: '', role: 'USER', dept: 'Operations' });
              generatePassword();
              setShowAddModal(true);
            }}
            style={{
              padding: '10px 18px',
              background: '#00FF88',
              color: '#0D1117',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 0 15px rgba(0, 255, 136, 0.2)'
            }}
          >
            <UserPlus size={16} />
            Provision New User
          </button>

          <button
            onClick={handleResetDefaults}
            style={{
              padding: '10px 16px',
              background: '#21262D',
              color: '#8B949E',
              border: '1px solid #30363D',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={14} />
            Reset Defaults
          </button>
        </div>
      </div>

      {/* Security Banner: Cross-Browser & Incognito Fingerprint Policy */}
      <div style={{
        background: 'rgba(56, 139, 253, 0.1)',
        border: '1px solid rgba(56, 139, 253, 0.3)',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ShieldAlert color="#58A6FF" size={24} />
          <div>
            <div style={{ color: '#58A6FF', fontWeight: 700, fontSize: '14px' }}>
              Hardware & Incognito Fingerprint Lockdown: ACTIVE
            </div>
            <div style={{ color: '#8B949E', fontSize: '12px', marginTop: '2px' }}>
              Blocked attackers (darshan@p or blacklisted IPs) cannot bypass containment by opening Private / Incognito windows. WebGL & Canvas device hashes enforce persistent rejection.
            </div>
          </div>
        </div>
        <div style={{ background: '#161B22', padding: '6px 14px', borderRadius: '6px', border: '1px solid #30363D', fontSize: '12px', color: '#00FF88', fontWeight: 700 }}>
          🔒 Real-Time Lockdown Active
        </div>
      </div>

      {/* Users Table */}
      <div style={{ background: '#161B22', border: '1px solid #30363D', borderRadius: '14px', overflow: 'hidden', marginBottom: '32px' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #30363D', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#E6EDF3' }}>
            System Identities Registry ({userList.length} Accounts)
          </div>
          <span style={{ fontSize: '12px', color: '#8B949E' }}>All credentials securely hashed & verified</span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#0D1117', color: '#8B949E', borderBottom: '1px solid #30363D' }}>
              <th style={{ padding: '14px 20px' }}>User / Display Name</th>
              <th style={{ padding: '14px 20px' }}>Username / ID</th>
              <th style={{ padding: '14px 20px' }}>Current Password</th>
              <th style={{ padding: '14px 20px' }}>Role</th>
              <th style={{ padding: '14px 20px' }}>Department</th>
              <th style={{ padding: '14px 20px' }}>Status</th>
              <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {userList.map((user) => {
              const isVarun = user.username === 'varun@g';
              const isDarshan = user.username === 'darshan@p';
              const roleBadgeColor = user.role === 'ADMIN' ? '#00FF88' : user.role === 'ATTACKER' ? '#FF7B72' : '#58A6FF';
              const roleBg = user.role === 'ADMIN' ? 'rgba(0, 255, 136, 0.1)' : user.role === 'ATTACKER' ? 'rgba(255, 123, 114, 0.1)' : 'rgba(88, 166, 255, 0.1)';

              return (
                <tr key={user.username} style={{ borderBottom: '1px solid #21262D', transition: 'background 0.2s' }}>
                  <td style={{ padding: '14px 20px', fontWeight: 600, color: '#E6EDF3' }}>
                    {user.name || user.username}
                  </td>
                  <td style={{ padding: '14px 20px', fontFamily: 'monospace', color: '#58A6FF', fontWeight: 600 }}>
                    {user.username}
                  </td>
                  <td style={{ padding: '14px 20px', fontFamily: 'monospace', color: '#C9D1D9' }}>
                    <span style={{ background: '#0D1117', padding: '4px 8px', borderRadius: '4px', border: '1px solid #30363D' }}>
                      {user.password}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{ background: roleBg, color: roleBadgeColor, border: `1px solid ${roleBadgeColor}40`, padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                      {user.role}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', color: '#8B949E' }}>
                    {user.dept || 'Corporate'}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#00FF88', fontSize: '12px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00FF88' }}></span>
                      Active
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => {
                          setEditUser(user);
                          setFormData({
                            name: user.name || '',
                            username: user.username,
                            password: user.password,
                            role: user.role,
                            dept: user.dept || 'Operations'
                          });
                        }}
                        style={{
                          background: '#21262D',
                          border: '1px solid #30363D',
                          color: '#58A6FF',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px'
                        }}
                        title="Change password or role"
                      >
                        <Key size={13} />
                        Edit
                      </button>

                      {!isVarun && (
                        <button
                          onClick={() => handleDeleteUser(user.username)}
                          style={{
                            background: '#21262D',
                            border: '1px solid #30363D',
                            color: '#FF7B72',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            fontSize: '12px'
                          }}
                          title="Delete user"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* User Phishing & Incident Reports Box */}
      <div style={{ background: '#161B22', border: '1px solid #30363D', borderRadius: '14px', padding: '20px' }}>
        <h3 style={{ margin: '0 0 14px', fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText color="#58A6FF" size={20} />
          User-Reported Security Incidents (from Employee Portals)
        </h3>
        {incidentReports.length === 0 ? (
          <div style={{ color: '#8B949E', fontSize: '13px', padding: '20px', textAlign: 'center', border: '1px dashed #30363D', borderRadius: '8px' }}>
            No incident reports submitted by employees yet. When users (dhruv@l, rudra@b) report suspicious emails or phishing links from their portal, they will appear here for triage.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {incidentReports.map((report, idx) => (
              <div key={idx} style={{ background: '#0D1117', border: '1px solid #30363D', borderRadius: '8px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#FF7B72', fontSize: '13px' }}>
                    🚨 {report.type || 'Phishing Email'} — Reported by {report.reportedBy || 'Employee'}
                  </div>
                  <div style={{ color: '#8B949E', fontSize: '12px', marginTop: '4px' }}>
                    {report.details} | Target: <span style={{ fontFamily: 'monospace', color: '#58A6FF' }}>{report.targetUrl}</span>
                  </div>
                </div>
                <span style={{ fontSize: '11px', color: '#8B949E', background: '#21262D', padding: '4px 8px', borderRadius: '4px' }}>
                  {new Date(report.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#161B22', border: '1px solid #30363D', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 800, color: '#E6EDF3', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserPlus color="#00FF88" size={20} />
              Provision New User Identity
            </h2>

            <form onSubmit={handleAddUser}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#8B949E', marginBottom: '6px' }}>Full Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Alex Turner"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: '#0D1117', border: '1px solid #30363D', borderRadius: '8px', color: '#E6EDF3', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#8B949E', marginBottom: '6px' }}>Username / ID (Login handle)</label>
                <input
                  type="text"
                  placeholder="e.g. alex@corp"
                  required
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: '#0D1117', border: '1px solid #30363D', borderRadius: '8px', color: '#E6EDF3', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', color: '#8B949E' }}>Password</label>
                  <button
                    type="button"
                    onClick={generatePassword}
                    style={{ background: 'none', border: 'none', color: '#00FF88', fontSize: '11px', cursor: 'pointer', fontWeight: 700 }}
                  >
                    ⚡ Auto-Generate Secure
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: '#0D1117', border: '1px solid #30363D', borderRadius: '8px', color: '#00FF88', fontFamily: 'monospace', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#8B949E', marginBottom: '6px' }}>Role</label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                    style={{ width: '100%', padding: '10px', background: '#0D1117', border: '1px solid #30363D', borderRadius: '8px', color: '#E6EDF3', outline: 'none' }}
                  >
                    <option value="USER">USER (Enterprise Portal)</option>
                    <option value="ADMIN">ADMIN (SOC Command)</option>
                    <option value="ATTACKER">ATTACKER (Deception Trap)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#8B949E', marginBottom: '6px' }}>Department</label>
                  <input
                    type="text"
                    value={formData.dept}
                    onChange={e => setFormData({ ...formData, dept: e.target.value })}
                    style={{ width: '100%', padding: '10px', background: '#0D1117', border: '1px solid #30363D', borderRadius: '8px', color: '#E6EDF3', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '12px', background: '#00FF88', color: '#0D1117', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Save & Provision
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ flex: 1, padding: '12px', background: '#21262D', color: '#8B949E', border: '1px solid #30363D', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Password Modal */}
      {editUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#161B22', border: '1px solid #30363D', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 800, color: '#E6EDF3', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Key color="#58A6FF" size={20} />
              Edit Credentials: {editUser.username}
            </h2>

            <form onSubmit={handleUpdatePassword}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#8B949E', marginBottom: '6px' }}>Display Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: '#0D1117', border: '1px solid #30363D', borderRadius: '8px', color: '#E6EDF3', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', color: '#8B949E' }}>New Password</label>
                  <button
                    type="button"
                    onClick={generatePassword}
                    style={{ background: 'none', border: 'none', color: '#00FF88', fontSize: '11px', cursor: 'pointer', fontWeight: 700 }}
                  >
                    ⚡ Generate New
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: '#0D1117', border: '1px solid #30363D', borderRadius: '8px', color: '#00FF88', fontFamily: 'monospace', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#8B949E', marginBottom: '6px' }}>Assigned Role</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                  style={{ width: '100%', padding: '10px', background: '#0D1117', border: '1px solid #30363D', borderRadius: '8px', color: '#E6EDF3', outline: 'none' }}
                >
                  <option value="USER">USER (Enterprise Portal)</option>
                  <option value="ADMIN">ADMIN (SOC Command)</option>
                  <option value="ATTACKER">ATTACKER (Deception Trap)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '12px', background: '#58A6FF', color: '#0D1117', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Update Credentials
                </button>
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  style={{ flex: 1, padding: '12px', background: '#21262D', color: '#8B949E', border: '1px solid #30363D', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
