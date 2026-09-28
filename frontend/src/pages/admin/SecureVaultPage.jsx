import React, { useState, useEffect } from 'react';
import { 
  Lock, Unlock, Shield, FileText, Image as ImageIcon, Video, 
  File, Plus, Edit2, Trash2, Key, Eye, EyeOff, Download, 
  Search, CheckCircle, AlertTriangle, UserCheck, RefreshCw, X
} from 'lucide-react';
import { 
  getAllVaultItemsForAdmin, addVaultItem, updateVaultItem, 
  deleteVaultItem 
} from '../../utils/secureVault';
import { getUsers } from '../../engine/constants';

export default function SecureVaultPage({ currentUser, addToast }) {
  const [items, setItems] = useState([]);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [editModalItem, setEditModalItem] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Upload form state
  const [formCategory, setFormCategory] = useState('IMAGE'); // IMAGE, VIDEO, DOCUMENT, TEXT
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formRecipient, setFormRecipient] = useState('ALL_USERS');
  const [formPassword, setFormPassword] = useState('');
  const [formFileContent, setFormFileContent] = useState('');
  const [formFileName, setFormFileName] = useState('');
  const [formFileType, setFormFileType] = useState('');
  const [formFileSize, setFormFileSize] = useState('');
  const [formTextContent, setFormTextContent] = useState('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  // Available users for recipient dropdown
  const [availableUsers, setAvailableUsers] = useState([]);

  const loadData = () => {
    const vaultData = getAllVaultItemsForAdmin();
    setItems(vaultData);
    const users = getUsers().filter(u => u.role !== 'ATTACKER');
    setAvailableUsers(users);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setFormFileName(file.name);
    setFormFileType(file.type);
    
    // Format file size
    const sizeKB = Math.round(file.size / 1024);
    setFormFileSize(sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`);

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormFileContent(event.target.result);
      setIsProcessingFile(false);
    };
    reader.onerror = () => {
      addToast?.('Failed to process file', 'critical');
      setIsProcessingFile(false);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateVaultItem = (e) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      addToast?.('Please specify a title', 'warning');
      return;
    }

    let contentToStore = formCategory === 'TEXT' ? formTextContent : formFileContent;
    if (!contentToStore) {
      addToast?.('Please provide file content or text', 'warning');
      return;
    }

    try {
      addVaultItem({
        title: formTitle,
        description: formDesc,
        category: formCategory,
        fileType: formCategory === 'TEXT' ? 'text/plain' : formFileType || 'application/octet-stream',
        fileName: formCategory === 'TEXT' ? `${formTitle.toLowerCase().replace(/\s+/g, '_')}.txt` : formFileName || 'file',
        fileSize: formCategory === 'TEXT' ? `${Math.round(formTextContent.length / 1024 * 10) / 10} KB` : formFileSize || '1 KB',
        content: contentToStore,
        recipient: formRecipient,
        accessPassword: formPassword
      }, currentUser);

      addToast?.('🔒 Vault record securely created & dispatched', 'success');
      loadData();
      resetForm();
      setUploadModalOpen(false);
    } catch (err) {
      addToast?.(`Error: ${err.message}`, 'critical');
    }
  };

  const handleUpdateVaultItem = (e) => {
    e.preventDefault();
    if (!editModalItem) return;

    try {
      updateVaultItem(editModalItem.id, {
        title: editModalItem.title,
        description: editModalItem.description,
        recipient: editModalItem.recipient,
        accessPassword: editModalItem.accessPassword,
        content: editModalItem.content
      }, currentUser);

      addToast?.('✅ Vault item updated successfully', 'success');
      loadData();
      setEditModalItem(null);
    } catch (err) {
      addToast?.(`Error: ${err.message}`, 'critical');
    }
  };

  const handleDeleteItem = (id) => {
    try {
      deleteVaultItem(id, currentUser);
      addToast?.('🗑️ Vault item deleted', 'info');
      loadData();
      setDeleteConfirmId(null);
    } catch (err) {
      addToast?.(`Error: ${err.message}`, 'critical');
    }
  };

  const resetForm = () => {
    setFormTitle('');
    setFormDesc('');
    setFormCategory('IMAGE');
    setFormRecipient('ALL_USERS');
    setFormPassword('');
    setFormFileContent('');
    setFormFileName('');
    setFormFileType('');
    setFormFileSize('');
    setFormTextContent('');
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  };

  // Filtered items
  const filteredItems = items.filter(item => {
    const matchesCategory = filterCategory === 'ALL' || item.category === filterCategory;
    const matchesSearch = !searchQuery || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.recipient?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.fileName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categoryStats = {
    TOTAL: items.length,
    IMAGE: items.filter(i => i.category === 'IMAGE').length,
    VIDEO: items.filter(i => i.category === 'VIDEO').length,
    DOCUMENT: items.filter(i => i.category === 'DOCUMENT').length,
    TEXT: items.filter(i => i.category === 'TEXT').length,
    PROTECTED: items.filter(i => i.passwordProtected).length
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', color: '#E6EDF3' }}>
      
      {/* HEADER BAR */}
      <div style={{ background: '#161B22', borderRadius: '12px', padding: '24px', border: '1px solid #30363D', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 800, color: '#F0F6FC', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Lock size={22} color="#00FF88" /> Zero-Trust Secure Data Storage & Vault
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#8B949E' }}>
            Store Images, Videos, Documents, and Classified Notes. Set password-protected access barriers for specific recipient users.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setUploadModalOpen(true); }}
          style={{ padding: '10px 20px', background: '#00FF88', color: '#0D1117', border: 'none', borderRadius: '8px', fontWeight: 800, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
        >
          <Plus size={16} /> Add / Dispatch Secure Data
        </button>
      </div>

      {/* METRIC CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        {[
          { label: 'Total Vault Items', count: categoryStats.TOTAL, icon: File, color: '#58A6FF' },
          { label: 'Encrypted Images', count: categoryStats.IMAGE, icon: ImageIcon, color: '#38BDF8' },
          { label: 'Encrypted Videos', count: categoryStats.VIDEO, icon: Video, color: '#A855F7' },
          { label: 'Secure Documents', count: categoryStats.DOCUMENT, icon: FileText, color: '#10B981' },
          { label: 'Classified Text Notes', count: categoryStats.TEXT, icon: Shield, color: '#F59E0B' },
          { label: 'Password Locked', count: categoryStats.PROTECTED, icon: Key, color: '#EC4899' },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} style={{ background: '#161B22', border: '1px solid #30363D', borderRadius: '10px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#8B949E', fontWeight: 600 }}>{card.label}</span>
                <Icon size={16} color={card.color} />
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: card.color }}>{card.count}</div>
            </div>
          );
        })}
      </div>

      {/* FILTER & SEARCH CONTROLS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '6px', background: '#161B22', padding: '4px', borderRadius: '8px', border: '1px solid #30363D' }}>
          {[
            { id: 'ALL', label: 'All Media' },
            { id: 'IMAGE', label: 'Images' },
            { id: 'VIDEO', label: 'Videos' },
            { id: 'DOCUMENT', label: 'Docs / PDFs' },
            { id: 'TEXT', label: 'Classified Text' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterCategory(tab.id)}
              style={{
                padding: '6px 14px',
                background: filterCategory === tab.id ? '#21262D' : 'transparent',
                border: filterCategory === tab.id ? '1px solid #30363D' : 'none',
                color: filterCategory === tab.id ? '#00FF88' : '#8B949E',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', background: '#161B22', border: '1px solid #30363D', borderRadius: '8px', padding: '0 12px', width: '280px' }}>
          <Search size={15} color="#8B949E" style={{ marginRight: '8px' }} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by title, user, or file..."
            style={{ flex: 1, padding: '8px 0', background: 'transparent', border: 'none', color: '#F0F6FC', fontSize: '12px', outline: 'none' }}
          />
        </div>
      </div>

      {/* VAULT ITEMS GRID */}
      {filteredItems.length === 0 ? (
        <div style={{ background: '#161B22', borderRadius: '12px', padding: '40px', border: '1px solid #30363D', textAlign: 'center', color: '#8B949E' }}>
          <Lock size={36} color="#30363D" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#C9D1D9', marginBottom: '4px' }}>No Vault Items Found</div>
          <div style={{ fontSize: '13px' }}>Upload an image, video, document, or encrypted text to secure it.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {filteredItems.map(item => {
            const isImage = item.category === 'IMAGE';
            const isVideo = item.category === 'VIDEO';
            const isDoc = item.category === 'DOCUMENT';
            const isText = item.category === 'TEXT';

            return (
              <div
                key={item.id}
                style={{
                  background: '#161B22',
                  border: '1px solid #30363D',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'border-color 0.2s',
                  position: 'relative'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#00FF88'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#30363D'}
              >
                {/* Visual Preview / Thumbnail Area */}
                <div style={{ height: '140px', background: '#0D1117', borderBottom: '1px solid #30363D', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                  {isImage && item.content?.startsWith('data:image') ? (
                    <img src={item.content} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : isVideo && item.content?.startsWith('data:video') ? (
                    <video src={item.content} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : isText ? (
                    <div style={{ padding: '16px', fontSize: '11px', color: '#00FF88', fontFamily: 'monospace', width: '100%', height: '100%', overflow: 'hidden', opacity: 0.8 }}>
                      {item.content?.substring(0, 160)}...
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: '#8B949E' }}>
                      <FileText size={40} color="#58A6FF" style={{ marginBottom: '6px' }} />
                      <div style={{ fontSize: '11px', fontFamily: 'monospace' }}>{item.fileName}</div>
                    </div>
                  )}

                  {/* Category Pill */}
                  <div style={{ position: 'absolute', top: '10px', left: '10px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(4px)', color: '#38BDF8', fontSize: '10px', fontWeight: 800, border: '1px solid #334155' }}>
                    {item.category}
                  </div>

                  {/* Recipient Badge */}
                  <div style={{ position: 'absolute', top: '10px', right: '10px', padding: '3px 8px', borderRadius: '4px', background: item.recipient === 'ALL_USERS' ? 'rgba(56,189,248,0.2)' : 'rgba(0,255,136,0.2)', color: item.recipient === 'ALL_USERS' ? '#38BDF8' : '#00FF88', fontSize: '10px', fontWeight: 700, border: `1px solid ${item.recipient === 'ALL_USERS' ? '#38BDF8' : '#00FF88'}40` }}>
                    👤 {item.recipient}
                  </div>
                </div>

                {/* Content Details */}
                <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#F0F6FC', marginBottom: '4px' }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: '12px', color: '#8B949E', marginBottom: '12px', flex: 1, lineHeight: '1.5' }}>
                    {item.description || 'No description provided.'}
                  </div>

                  {/* Security Barrier Password Info (Admin can see password) */}
                  <div style={{ background: '#0D1117', border: '1px solid #21262D', borderRadius: '6px', padding: '8px 10px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                    <span style={{ color: '#8B949E', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Key size={13} color="#F59E0B" /> Recipient Pass:
                    </span>
                    <span style={{ color: item.accessPassword ? '#00FF88' : '#8B949E', fontWeight: 700, fontFamily: 'monospace' }}>
                      {item.accessPassword ? item.accessPassword : 'No Pass (Open)'}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setPreviewItem(item)}
                      style={{ flex: 1, padding: '7px 10px', background: '#21262D', color: '#F0F6FC', border: '1px solid #30363D', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                    >
                      <Eye size={13} /> View / Play
                    </button>
                    <button
                      onClick={() => setEditModalItem({ ...item })}
                      style={{ padding: '7px 12px', background: 'rgba(56,189,248,0.1)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Edit2 size={13} /> Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(item.id)}
                      style={{ padding: '7px 12px', background: 'rgba(255,68,68,0.1)', color: '#FF4444', border: '1px solid rgba(255,68,68,0.3)', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================ */}
      {/* UPLOAD / CREATE VAULT MODAL */}
      {/* ============================================================ */}
      {uploadModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#161B22', border: '1px solid #30363D', borderRadius: '14px', maxWidth: '540px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#F0F6FC', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={18} color="#00FF88" /> Add Secure Data to Vault
              </div>
              <button onClick={() => setUploadModalOpen(false)} style={{ background: 'none', border: 'none', color: '#8B949E', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateVaultItem} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Category Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8B949E', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Media Format
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {[
                    { id: 'IMAGE', label: 'Image', icon: ImageIcon },
                    { id: 'VIDEO', label: 'Video', icon: Video },
                    { id: 'DOCUMENT', label: 'Document', icon: FileText },
                    { id: 'TEXT', label: 'Text / Note', icon: Shield }
                  ].map(cat => {
                    const Icon = cat.icon;
                    const active = formCategory === cat.id;
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => { setFormCategory(cat.id); setFormFileContent(''); setFormFileName(''); }}
                        style={{
                          padding: '10px 4px',
                          background: active ? 'rgba(0,255,136,0.15)' : '#0D1117',
                          border: active ? '1px solid #00FF88' : '1px solid #30363D',
                          color: active ? '#00FF88' : '#8B949E',
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
                        <Icon size={16} />
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title & Description */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8B949E', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Title
                </label>
                <input
                  required
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="e.g. Q3 Executive Financials or Server Topology"
                  style={{ width: '100%', padding: '10px', background: '#0D1117', border: '1px solid #30363D', borderRadius: '6px', color: '#F0F6FC', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8B949E', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Description
                </label>
                <input
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  placeholder="Context, classification level, or instructions..."
                  style={{ width: '100%', padding: '10px', background: '#0D1117', border: '1px solid #30363D', borderRadius: '6px', color: '#F0F6FC', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* Content Input: File Picker OR Textarea */}
              {formCategory === 'TEXT' ? (
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8B949E', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Encrypted Text Content
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={formTextContent}
                    onChange={e => setFormTextContent(e.target.value)}
                    placeholder="Enter classified notes, passwords, API tokens, or memos..."
                    style={{ width: '100%', padding: '10px', background: '#0D1117', border: '1px solid #30363D', borderRadius: '6px', color: '#00FF88', fontSize: '12px', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }}
                  />
                </div>
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8B949E', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Select {formCategory} File (Any format supported)
                  </label>
                  <input
                    type="file"
                    required={!formFileContent}
                    accept={
                      formCategory === 'IMAGE' ? 'image/*' :
                      formCategory === 'VIDEO' ? 'video/*' :
                      '.pdf,.docx,.xlsx,.pptx,.txt,.csv,.zip'
                    }
                    onChange={handleFileUpload}
                    style={{ width: '100%', padding: '10px', background: '#0D1117', border: '1px solid #30363D', borderRadius: '6px', color: '#F0F6FC', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
                  />
                  {formFileName && (
                    <div style={{ marginTop: '6px', fontSize: '11px', color: '#00FF88', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle size={13} /> {formFileName} ({formFileSize})
                    </div>
                  )}
                </div>
              )}

              {/* Recipient Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8B949E', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Target Recipient (Only this user can see)
                </label>
                <select
                  value={formRecipient}
                  onChange={e => setFormRecipient(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: '#0D1117', border: '1px solid #30363D', borderRadius: '6px', color: '#F0F6FC', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                >
                  <option value="ALL_USERS">🌐 All Verified Corporate Users</option>
                  <option value="ADMIN_ONLY">🔒 Admin Only (Confidential SOC)</option>
                  {availableUsers.map(u => (
                    <option key={u.id || u.username} value={u.username}>
                      👤 {u.name || u.username} ({u.username})
                    </option>
                  ))}
                </select>
              </div>

              {/* Password Protection Barrier */}
              <div style={{ background: '#0D1117', border: '1px solid #30363D', borderRadius: '8px', padding: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', marginBottom: '4px' }}>
                  🔑 Mandatory Access Password (Recipient must enter to view)
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    value={formPassword}
                    onChange={e => setFormPassword(e.target.value)}
                    placeholder="Enter password recipient must input..."
                    style={{ flex: 1, padding: '9px 12px', background: '#161B22', border: '1px solid #30363D', borderRadius: '6px', color: '#00FF88', fontSize: '12px', outline: 'none', fontFamily: 'monospace' }}
                  />
                  <button
                    type="button"
                    onClick={() => setFormPassword(generateRandomPassword())}
                    style={{ padding: '8px 12px', background: '#21262D', color: '#F0F6FC', border: '1px solid #30363D', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    ⚡ Auto-Gen
                  </button>
                </div>
                <div style={{ fontSize: '11px', color: '#8B949E', marginTop: '6px' }}>
                  If set, the file appears locked to the user until they input this password.
                </div>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button
                  type="submit"
                  disabled={isProcessingFile}
                  style={{ flex: 1, padding: '11px', background: '#00FF88', color: '#0D1117', border: 'none', borderRadius: '6px', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}
                >
                  {isProcessingFile ? 'Processing Media...' : 'Save to Secure Vault'}
                </button>
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  style={{ padding: '11px 20px', background: '#21262D', color: '#F0F6FC', border: '1px solid #30363D', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* EDIT MODAL */}
      {/* ============================================================ */}
      {editModalItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#161B22', border: '1px solid #30363D', borderRadius: '14px', maxWidth: '500px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#F0F6FC', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={18} color="#38BDF8" /> Edit Vault Record
              </div>
              <button onClick={() => setEditModalItem(null)} style={{ background: 'none', border: 'none', color: '#8B949E', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateVaultItem} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8B949E', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Title
                </label>
                <input
                  required
                  value={editModalItem.title}
                  onChange={e => setEditModalItem({ ...editModalItem, title: e.target.value })}
                  style={{ width: '100%', padding: '10px', background: '#0D1117', border: '1px solid #30363D', borderRadius: '6px', color: '#F0F6FC', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8B949E', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Description
                </label>
                <input
                  value={editModalItem.description}
                  onChange={e => setEditModalItem({ ...editModalItem, description: e.target.value })}
                  style={{ width: '100%', padding: '10px', background: '#0D1117', border: '1px solid #30363D', borderRadius: '6px', color: '#F0F6FC', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8B949E', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Target Recipient
                </label>
                <select
                  value={editModalItem.recipient}
                  onChange={e => setEditModalItem({ ...editModalItem, recipient: e.target.value })}
                  style={{ width: '100%', padding: '10px', background: '#0D1117', border: '1px solid #30363D', borderRadius: '6px', color: '#F0F6FC', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                >
                  <option value="ALL_USERS">🌐 All Verified Corporate Users</option>
                  <option value="ADMIN_ONLY">🔒 Admin Only (Confidential SOC)</option>
                  {availableUsers.map(u => (
                    <option key={u.id || u.username} value={u.username}>
                      👤 {u.name || u.username} ({u.username})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', marginBottom: '6px' }}>
                  🔑 Mandatory Access Password
                </label>
                <input
                  value={editModalItem.accessPassword || ''}
                  onChange={e => setEditModalItem({ ...editModalItem, accessPassword: e.target.value })}
                  placeholder="Set password to unlock (or leave empty for open)"
                  style={{ width: '100%', padding: '10px', background: '#0D1117', border: '1px solid #30363D', borderRadius: '6px', color: '#00FF88', fontSize: '13px', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }}
                />
              </div>

              {editModalItem.category === 'TEXT' && (
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8B949E', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Text Content
                  </label>
                  <textarea
                    rows={5}
                    value={editModalItem.content || ''}
                    onChange={e => setEditModalItem({ ...editModalItem, content: e.target.value })}
                    style={{ width: '100%', padding: '10px', background: '#0D1117', border: '1px solid #30363D', borderRadius: '6px', color: '#00FF88', fontSize: '12px', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '11px', background: '#00FF88', color: '#0D1117', border: 'none', borderRadius: '6px', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditModalItem(null)}
                  style={{ padding: '11px 20px', background: '#21262D', color: '#F0F6FC', border: '1px solid #30363D', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* PREVIEW / PLAY MODAL */}
      {/* ============================================================ */}
      {previewItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#161B22', border: '1px solid #30363D', borderRadius: '16px', maxWidth: '720px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '17px', color: '#F0F6FC' }}>{previewItem.title}</h3>
                <div style={{ fontSize: '12px', color: '#8B949E' }}>
                  Category: {previewItem.category} · Recipient: {previewItem.recipient} · {previewItem.fileSize}
                </div>
              </div>
              <button onClick={() => setPreviewItem(null)} style={{ background: 'none', border: 'none', color: '#8B949E', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            {/* Media Rendering */}
            <div style={{ background: '#0D1117', border: '1px solid #30363D', borderRadius: '10px', padding: '16px', marginBottom: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '260px' }}>
              {previewItem.category === 'IMAGE' ? (
                <img src={previewItem.content} alt={previewItem.title} style={{ maxWidth: '100%', maxHeight: '450px', borderRadius: '6px', objectFit: 'contain' }} />
              ) : previewItem.category === 'VIDEO' ? (
                <video src={previewItem.content} controls autoPlay style={{ width: '100%', maxHeight: '450px', borderRadius: '6px' }} />
              ) : previewItem.category === 'TEXT' ? (
                <pre style={{ color: '#00FF88', fontSize: '13px', lineHeight: '1.7', whiteSpace: 'pre-wrap', wordBreak: 'break-word', width: '100%', margin: 0, fontFamily: 'monospace' }}>
                  {previewItem.content}
                </pre>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px' }}>
                  <FileText size={60} color="#58A6FF" style={{ margin: '0 auto 12px' }} />
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#F0F6FC', marginBottom: '6px' }}>{previewItem.fileName}</div>
                  <div style={{ fontSize: '12px', color: '#8B949E', marginBottom: '16px' }}>Encrypted Corporate Document ({previewItem.fileSize})</div>
                  <a
                    href={previewItem.content}
                    download={previewItem.fileName}
                    style={{ padding: '10px 24px', background: '#00FF88', color: '#0D1117', textDecoration: 'none', borderRadius: '6px', fontWeight: 800, fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Download size={15} /> Download Document
                  </a>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '11px', color: '#8B949E' }}>
                Access Password: <strong style={{ color: '#00FF88', fontFamily: 'monospace' }}>{previewItem.accessPassword || 'None'}</strong>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                style={{ padding: '8px 20px', background: '#21262D', color: '#F0F6FC', border: '1px solid #30363D', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ============================================================ */}
      {deleteConfirmId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#161B22', border: '1px solid #FF4444', borderRadius: '12px', maxWidth: '400px', width: '100%', padding: '24px', textAlign: 'center' }}>
            <AlertTriangle size={36} color="#FF4444" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ color: '#F0F6FC', margin: '0 0 8px', fontSize: '16px' }}>Confirm Permanent Deletion</h3>
            <p style={{ color: '#8B949E', fontSize: '13px', margin: '0 0 20px' }}>
              Are you sure you want to permanently purge this vault item? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleDeleteItem(deleteConfirmId)}
                style={{ flex: 1, padding: '10px', background: '#FF4444', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setDeleteConfirmId(null)}
                style={{ flex: 1, padding: '10px', background: '#21262D', color: '#F0F6FC', border: '1px solid #30363D', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
