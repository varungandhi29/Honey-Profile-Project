import React, { useState } from 'react';
import { FolderLock, FileText, Lock, X } from 'lucide-react';

const FOLDERS = [
  { id: 'fin', name: 'Financials Q1-Q4', icon: <FolderLock color="#FFC107" size={32} />, color: '#FFC107', files: [
    { name: 'Q4_Revenue_Final.xlsx', size: '2.4 MB', date: '2026-01-10' },
    { name: 'Tax_Filings_2025.pdf', size: '8.1 MB', date: '2026-01-15' }
  ]},
  { id: 'hr', name: 'HR & Personnel', icon: <FolderLock color="#00FF88" size={32} />, color: '#00FF88', files: [
    { name: 'Employee_Roster_Full.csv', size: '1.2 MB', date: '2026-02-01' },
    { name: 'Performance_Reviews.pdf', size: '4.5 MB', date: '2026-02-15' }
  ]},
  { id: 'src', name: 'Source Code & Configs', icon: <FolderLock color="#0088FF" size={32} />, color: '#0088FF', files: [
    { name: 'API_Keys_Prod.env', size: '12 KB', date: '2026-03-01' },
    { name: 'Backend_V2_Source.zip', size: '45 MB', date: '2026-03-10' }
  ]}
];

export default function DataVaultPage({ currentUser }) {
  const [activeFolder, setActiveFolder] = useState(null);
  const [viewFile, setViewFile] = useState(null);

  const folder = activeFolder ? FOLDERS.find(f => f.id === activeFolder) : null;

  return (
    <div style={{ display: 'flex', gap: '20px', height: '100%', flexDirection: 'column' }}>
      
      <div style={{ background: '#161B22', padding: '20px', borderRadius: '12px', border: '1px solid #30363D', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <Lock size={24} color="#00FF88" />
        <div>
          <h2 style={{ margin: 0, color: '#FFF', fontSize: '18px' }}>Secure Data Vault</h2>
          <div style={{ color: '#8B949E', fontSize: '13px' }}>Authorized access only. Current role: {currentUser.role}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        {FOLDERS.map(f => (
          <div 
            key={f.id} 
            onClick={() => setActiveFolder(f.id)}
            style={{ 
              background: activeFolder === f.id ? '#21262D' : '#161B22', 
              padding: '30px', borderRadius: '12px', border: `1px solid ${activeFolder === f.id ? f.color : '#30363D'}`, 
              cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', transition: 'all 0.2s',
              transform: activeFolder === f.id ? 'translateY(-5px)' : 'none',
              boxShadow: activeFolder === f.id ? `0 10px 20px ${f.color}20` : 'none'
            }}
          >
            {f.icon}
            <div style={{ color: '#FFF', fontWeight: 'bold' }}>{f.name}</div>
            <div style={{ color: '#8B949E', fontSize: '12px' }}>{f.files.length} items</div>
          </div>
        ))}
      </div>

      {folder && (
        <div style={{ background: '#161B22', padding: '20px', borderRadius: '12px', border: `1px solid ${folder.color}`, flex: 1 }}>
          <h3 style={{ margin: '0 0 20px', color: '#FFF', display: 'flex', alignItems: 'center', gap: '10px' }}>
            {folder.icon} {folder.name} Contents
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {folder.files.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px', background: '#0D1117', borderRadius: '8px', border: '1px solid #30363D' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <FileText color="#8B949E" />
                  <div>
                    <div style={{ color: '#FFF', fontWeight: 'bold', fontSize: '14px' }}>{f.name}</div>
                    <div style={{ color: '#8B949E', fontSize: '12px' }}>{f.size} • Modified {f.date}</div>
                  </div>
                </div>
                <button 
                  onClick={() => setViewFile(f)}
                  style={{ padding: '8px 16px', background: `${folder.color}20`, color: folder.color, border: `1px solid ${folder.color}40`, borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  View Data
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File Viewer Modal */}
      {viewFile && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#161B22', border: `1px solid ${folder.color}`, borderRadius: '12px', width: '600px', maxWidth: '90vw', overflow: 'hidden', boxShadow: `0 0 50px ${folder.color}30` }}>
            <div style={{ padding: '15px 20px', background: '#0D1117', borderBottom: '1px solid #30363D', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#FFF', fontWeight: 'bold' }}>
                <FileText color={folder.color} /> {viewFile.name}
              </div>
              <button onClick={() => setViewFile(null)} style={{ background: 'none', border: 'none', color: '#8B949E', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '30px', textAlign: 'center', color: '#E6EDF3' }}>
              <Lock size={48} color="#00FF88" style={{ margin: '0 auto 20px' }} />
              <h2 style={{ color: '#00FF88', marginBottom: '10px' }}>CONFIDENTIAL: Legitimate Data Access</h2>
              <p style={{ color: '#8B949E', lineHeight: '1.6' }}>
                You have successfully accessed a legitimate file in the secure vault.<br/>
                This action is logged as a NORMAL user activity.<br/><br/>
                File Size: {viewFile.size}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
