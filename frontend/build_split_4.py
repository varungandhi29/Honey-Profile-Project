import os

base_dir = 'C:/Users/DELL/Desktop/Honey-Profile-Project/frontend/src'

def extract_sequential(file_path, comp_names):
    content = open(file_path, encoding='utf-8').read()
    blocks = {}
    for i, name in enumerate(comp_names):
        start_str1 = f"const {name} ="
        start_str2 = f"function {name}("
        start_idx = content.find(start_str1)
        if start_idx == -1:
            start_idx = content.find(start_str2)
            
        if i < len(comp_names) - 1:
            next_name = comp_names[i+1]
            end_str1 = f"const {next_name} ="
            end_str2 = f"function {next_name}("
            end_idx = content.find(end_str1)
            if end_idx == -1:
                end_idx = content.find(end_str2)
        else:
            end_idx = len(content)
            
        block = content[start_idx:end_idx].strip()
        
        idx = block.rfind("export default function HoneyShieldApp")
        if idx != -1 and name != 'HoneyShieldApp':
            block = block[:idx].strip()
            
        blocks[name] = block
    return blocks

all_blocks = {}
all_blocks.update(extract_sequential('part2.jsx', ['Badge', 'Card', 'OverviewPage', 'ActiveSessionsPage', 'AttackIntelligencePage']))
all_blocks.update(extract_sequential('part3.jsx', ['GeoMapPage', 'HeatmapPage', 'AlertCenterPage', 'HoneyActivityPage', 'DataVaultPage', 'SettingsPage']))
all_blocks.update(extract_sequential('part4.jsx', ['AdminDashboard', 'DeceptionDashboard', 'LoginPage', 'HoneyShieldApp']))

# Re-apply fixes
old_score_class = "`font-bold text-2xl ${s.riskScore >= 70 ? 'text-[#FF8C00]' : s.riskScore >= 36 ? 'text-white' : 'text-[#A8E063]'}`"
new_score_class = "`font-bold text-2xl ${s.riskScore >= engine.settings.attackerThreshold ? 'text-[#FF8C00]' : s.riskScore >= engine.settings.suspiciousThreshold ? 'text-white' : 'text-[#A8E063]'}`"
all_blocks['ActiveSessionsPage'] = all_blocks['ActiveSessionsPage'].replace(old_score_class, new_score_class)

old_stroke = 'stroke={s.riskScore >= 70 ? "#FF8C00" : "#FFFFFF"}'
new_stroke = 'stroke={s.riskScore >= engine.settings.attackerThreshold ? "#FF8C00" : "#FFFFFF"}'
all_blocks['ActiveSessionsPage'] = all_blocks['ActiveSessionsPage'].replace(old_stroke, new_stroke)

old_settings_page = """const SettingsPage = ({ engine, settings }) => {
  const [localSettings, setLocalSettings] = useState(settings);

  const handleSave = () => {
    engine.updateSettings(localSettings);
  };"""
new_settings_page = """const SettingsPage = ({ engine, settings, setSettings }) => {
  const [localSettings, setLocalSettings] = useState(settings);

  const handleSave = () => {
    setSettings(localSettings);
    engine.updateSettings(localSettings);
  };"""
all_blocks['SettingsPage'] = all_blocks['SettingsPage'].replace(old_settings_page, new_settings_page)

fetch2 = """  useEffect(() => {
    if (currentUser && currentUser.role !== 'ATTACKER') {
      fetch('/api/session/behavior', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentUser.id, eventType: 'PAGE_CHANGE', detail: activeTab })
      }).catch(() => {});
    }
  }, [activeTab, currentUser]);"""
all_blocks['AdminDashboard'] = all_blocks['AdminDashboard'].replace(fetch2, "")

all_blocks['AdminDashboard'] = all_blocks['AdminDashboard'].replace("function AdminDashboard({ data, engine, settings, currentUser, onLogout }) {", "export function AdminDashboard({ data, engine, settings, setSettings, currentUser, onLogout }) {")
all_blocks['AdminDashboard'] = all_blocks['AdminDashboard'].replace("{activeTab === \"Settings\" && <SettingsPage settings={settings} engine={engine} />}", "{activeTab === \"Settings\" && <SettingsPage settings={settings} setSettings={setSettings} engine={engine} />}")

fetch3 = """      } else if (engineRef.current) {
        // Fetch real session data for standard users
        fetch('/api/session/init')
          .then(r => r.json())
          .then(geo => {
            const sessions = engineRef.current.sessions;
            // Get the first NORMAL session (usually just spawned)
            const activeSession = sessions.find(s => s.state !== "ATTACKER");
            if (activeSession) {
                activeSession.id = currentUser.id;
                activeSession.ip = geo.ip;
                activeSession.country = geo.country;
                activeSession.city = geo.city;
                activeSession.lat = geo.lat;
                activeSession.lng = geo.lng;
                activeSession.browser = geo.browser;
                activeSession.os = geo.os;
                activeSession.device = geo.device;
                engineRef.current.updateCallback(engineRef.current.getState());
            }
          })
          .catch(e => console.error(e));
      }"""
all_blocks['HoneyShieldApp'] = all_blocks['HoneyShieldApp'].replace(fetch3, "      }")

old_use_effect = """  useEffect(() => {
    if (!engineRef.current) {
      engineRef.current = new LiveDataEngine((newState) => {
        setData(newState);
      }, settings);
    }
    return () => {
      if (engineRef.current) engineRef.current.stop();
    };
  }, []);"""
new_use_effect = """  useEffect(() => {
    const engine = new LiveDataEngine((newState) => {
      setData(newState);
    }, settings);
    engineRef.current = engine;
    const interval = setInterval(() => engine.tick(), 4000);
    return () => {
      clearInterval(interval);
    };
  }, []);"""
all_blocks['HoneyShieldApp'] = all_blocks['HoneyShieldApp'].replace(old_use_effect, new_use_effect)

all_blocks['HoneyShieldApp'] = all_blocks['HoneyShieldApp'].replace(
"""    <AdminDashboard 
      data={data} 
      engine={engineRef.current} 
      settings={settings} 
      currentUser={currentUser}""",
"""    <AdminDashboard 
      data={data} 
      engine={engineRef.current} 
      settings={settings} 
      setSettings={setSettings}
      currentUser={currentUser}""")

all_blocks['HoneyShieldApp'] = all_blocks['HoneyShieldApp'].replace("function HoneyShieldApp()", "export default function HoneyShieldApp()")

for k in all_blocks:
    all_blocks[k] = all_blocks[k].replace("\\`", "`")

imports_recharts = "import { LineChart, Line, BarChart, Bar, ScatterChart, Scatter, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ZAxis } from 'recharts';"
imports_lucide = "import { AlertTriangle, Shield, ShieldAlert, Activity, Globe, Grid, Bell, Key, Settings, Download, Eye, Lock, Unlock, Server, Crosshair, Users, HardDrive, FileText, Database, Terminal, ShieldOff, Zap, ShieldCheck, ChevronRight, X, Clock, MapPin, Monitor, LogOut, FolderOpen } from 'lucide-react';"

admin_pages = [
    'OverviewPage', 'ActiveSessionsPage', 'AttackIntelligencePage', 
    'HoneyActivityPage', 'GeoMapPage', 'HeatmapPage', 
    'AlertCenterPage', 'DataVaultPage', 'SettingsPage'
]

for page in admin_pages:
    code = all_blocks[page]
    imports = "import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';\n"
    if 'Chart' in code or 'RechartsTooltip' in code or '<Line ' in code or '<Bar ' in code or '<Scatter ' in code or '<Pie ' in code or 'ResponsiveContainer' in code:
        imports += imports_recharts + "\n"
    imports += imports_lucide + "\n"
    imports += "import { Badge } from '../../components/ui/Badge';\n"
    imports += "import { Card } from '../../components/ui/Card';\n"
    imports += "import { USERS, ATTACK_TYPES, TARGET_AREAS, FAKE_FILES_INITIAL } from '../../engine/constants';\n"
    
    full_code = f"{imports}\nexport {code}\n"
    with open(f'{base_dir}/pages/admin/{page}.jsx', 'w', encoding='utf-8') as f:
        f.write(full_code)

with open(f'{base_dir}/components/ui/Badge.jsx', 'w', encoding='utf-8') as f:
    f.write(f"import React from 'react';\n\nexport {all_blocks['Badge']}\n")

with open(f'{base_dir}/components/ui/Card.jsx', 'w', encoding='utf-8') as f:
    f.write(f"import React from 'react';\n\nexport {all_blocks['Card']}\n")

login_imports = "import React, { useState } from 'react';\nimport { USERS } from '../../engine/constants';\n\n"
login_code = all_blocks['LoginPage'].replace('function LoginPage(', 'export function LoginPage(')
with open(f'{base_dir}/pages/LoginPage.jsx', 'w', encoding='utf-8') as f:
    f.write(login_imports + login_code + "\n")

# DeceptionDashboard
deception_code = all_blocks['DeceptionDashboard']
# I will just write DeceptionDashboard and AdminDashboard with the exact inline code kept untouched! 
# Wait, the user specifically requested me to extract Modal, Toast, Topbar, Sidebar.
# I will do it cleanly now.

sidebar_inline_dec = """      {/* Icon-Only Sidebar for Deception Dashboard */}
      <div className="w-[64px] bg-[#1A1A1A] flex flex-col z-20 shrink-0 items-center py-6 border-r border-[#333]">
        <div className="mb-8">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-black font-[800] text-[10px]">ACME</div>
        </div>
        <div className="flex-1 flex flex-col gap-4 w-full px-2">
          {navItems.map(item => (
            <button 
              key={item.name} 
              onClick={() => handleNav(item.name)} 
              title={item.name}
              className={`w-12 h-12 flex items-center justify-center rounded-xl mx-auto transition-colors ${activeTab === item.name ? 'bg-white text-black' : 'text-[#888888] hover:bg-[#2A2A2A] hover:text-white'}`}
            >
              <item.icon size={22}/>
            </button>
          ))}
        </div>
        <button onClick={onLogout} title="Secure Logout" className="w-12 h-12 flex items-center justify-center rounded-xl mx-auto text-[#888888] hover:bg-red-500 hover:text-white transition-colors mt-auto"><LogOut size={22}/></button>
      </div>"""
deception_code = deception_code.replace(sidebar_inline_dec, "      <Sidebar navItems={navItems} currentPage={activeTab} setCurrentPage={handleNav} role=\"ATTACKER\" onLogout={onLogout} iconOnly={true} logo=\"ACME\" />")

modal_inline = """      {/* Custom Modal */}
      {modalContent && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-8 backdrop-blur-[2px]">
            <div className="bg-[#242424] rounded-[24px] shadow-2xl max-w-4xl w-full flex flex-col max-h-[80vh] overflow-hidden animate-in zoom-in-95">
                <div className="p-6 border-b border-[#333] flex justify-between items-center bg-[#1A1A1A]">
                    <h3 className="font-[800] text-sm tracking-[0.1em] uppercase text-white">{modalContent.title}</h3>
                    <button onClick={() => setModalContent(null)} className="p-2 hover:bg-[#333] rounded-full text-[#888888] transition-colors"><X size={20}/></button>
                </div>
                <div className="p-8 overflow-auto">
                    {modalContent.content}
                </div>
                <div className="p-6 border-t border-[#333] bg-[#1A1A1A] flex justify-end">
                    <button onClick={() => setModalContent(null)} className="px-6 py-2 bg-[#A8E063] hover:bg-opacity-80 rounded-full text-sm font-bold text-black transition-colors">Close</button>
                </div>
            </div>
        </div>
      )}"""
deception_code = deception_code.replace(modal_inline, "      <Modal content={modalContent} onClose={() => setModalContent(null)} />")

toast_inline = """      {toastMessage && (
        <div className="absolute bottom-8 right-8 bg-[#242424] border border-[#333] text-white px-5 py-4 rounded-[16px] shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 z-40">
          <ShieldCheck size={20} className="text-[#A8E063]" />
          <span className="text-sm font-bold">{toastMessage}</span>
        </div>
      )}"""
deception_code = deception_code.replace(toast_inline, "      <Toast message={toastMessage} />")

topbar_inline_dec = """        {/* Top Navigation & Profile Area */}
        <div className="h-[80px] flex items-center justify-between px-8 z-10 bg-[#1A1A1A]">
          <div className="flex items-center gap-3">
            {navItems.slice(0, 3).map(item => {
              const active = activeTab === item.name;
              return (
                <button
                  key={item.name + "_top"}
                  onClick={() => handleNav(item.name)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-colors ${active ? 'bg-[#242424] text-white' : 'text-[#888888] hover:text-white'}`}
                >
                  <item.icon size={16} />
                  {item.name}
                </button>
              );
            })}
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-white font-[800] uppercase tracking-[0.1em] text-sm">
              ACMECORP INTERNAL
            </div>
            <div className="flex items-center gap-3 bg-[#242424] pl-4 pr-1.5 py-1.5 rounded-full">
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold text-white leading-tight">testuser</span>
                <span className="text-[10px] font-[800] uppercase tracking-[0.1em] text-[#888888] leading-tight">IT ADMIN</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-white text-black font-bold flex items-center justify-center text-xs">
                TE
              </div>
            </div>
          </div>
        </div>"""
deception_code = deception_code.replace(topbar_inline_dec, "        <Topbar navItems={navItems} activeTab={activeTab} handleNav={handleNav} currentUser={{id: 'testuser', role: 'IT ADMIN'}} />")

deception_imports = """import React, { useState, useRef } from 'react';
import { Activity, Server, FileText, Settings, Users, FolderOpen, ShieldCheck, X, LogOut, ShieldAlert } from 'lucide-react';
import { Sidebar } from '../components/layout/Sidebar';
import { Topbar } from '../components/layout/Topbar';
import { Modal } from '../components/ui/Modal';
import { Toast } from '../components/ui/Toast';
import { Badge } from '../components/ui/Badge';\n\n"""
deception_code = deception_code.replace("function DeceptionDashboard(", "export function DeceptionDashboard(")
with open(f'{base_dir}/pages/DeceptionDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(deception_imports + deception_code + "\n")

admin_code = all_blocks['AdminDashboard']
sidebar_inline_admin = """      {/* Icon-Only Sidebar */}
      <div className="w-[64px] bg-[#1A1A1A] flex flex-col z-20 shrink-0 items-center py-6 border-r border-[#333]">
        <div className="mb-8">
          <div className="w-10 h-10 bg-[#A8E063] rounded-full flex items-center justify-center text-black font-bold text-xl">HS</div>
        </div>
        <div className="flex-1 flex flex-col gap-4 w-full px-2">
          {navItems.map(item => (
            <button 
              key={item.name} 
              onClick={() => setActiveTab(item.name)} 
              title={item.name}
              className={`w-12 h-12 flex items-center justify-center rounded-xl mx-auto transition-colors ${activeTab === item.name ? 'bg-[#2A2A2A] text-[#A8E063]' : 'text-[#888888] hover:bg-[#2A2A2A] hover:text-white'}`}
            >
              <item.icon size={22}/>
              {item.name === 'Alert Center' && data.alertLog.filter(a=>a.status==='New').length > 0 && (
                <span className="absolute top-0 right-0 w-3 h-3 bg-[#FF8C00] rounded-full border-2 border-[#1A1A1A]"></span>
              )}
            </button>
          ))}
        </div>
        <button onClick={onLogout} title="Secure Logout" className="w-12 h-12 flex items-center justify-center rounded-xl mx-auto text-[#888888] hover:bg-red-500 hover:text-white transition-colors mt-auto"><LogOut size={22}/></button>
      </div>"""
admin_code = admin_code.replace(sidebar_inline_admin, "      <Sidebar navItems={navItems} currentPage={activeTab} setCurrentPage={setActiveTab} role={currentUser.role} onLogout={onLogout} logo=\"HS\" unreadAlertCount={data.alertLog.filter(a=>a.status==='New').length} />")

topbar_inline_admin = """        {/* Top Navigation & Profile Area */}
        <div className="h-[80px] flex items-center justify-between px-8 z-10 bg-[#1A1A1A]">
          <div className="flex items-center gap-3">
            {navItems.slice(0, 4).map(item => {
              const active = activeTab === item.name;
              return (
                <button
                  key={item.name + "_top"}
                  onClick={() => setActiveTab(item.name)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-colors ${active ? 'bg-[#242424] text-white' : 'text-[#888888] hover:text-white'}`}
                >
                  <item.icon size={16} />
                  {item.name}
                  {item.name === 'Alert Center' && data.alertLog.filter(a=>a.status==='New').length > 0 && (
                    <span className="ml-1 bg-[#FF8C00] text-white text-[10px] px-1.5 py-0.5 rounded-full">
                      {data.alertLog.filter(a=>a.status==='New').length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-xs font-[800] uppercase tracking-[0.1em] text-[#888888]">Threat Level:</span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${threatLevel === 'CRITICAL' ? 'bg-[#FF8C00] text-white animate-pulse' : threatLevel === 'HIGH' ? 'bg-transparent border border-[#FF8C00] text-white' : 'bg-[#A8E063] text-black'}`}>
                {threatLevel}
              </span>
            </div>

            <div className="flex items-center gap-3 bg-[#242424] pl-4 pr-1.5 py-1.5 rounded-full">
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold text-white leading-tight">{currentUser.id}</span>
                <span className="text-[10px] font-[800] uppercase tracking-[0.1em] text-[#888888] leading-tight">{currentUser.role}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#A8E063] text-black font-bold flex items-center justify-center text-xs">
                {currentUser.id.substring(0, 2).toUpperCase()}
              </div>
            </div>
          </div>
        </div>"""
admin_code = admin_code.replace(topbar_inline_admin, "        <Topbar navItems={navItems} activeTab={activeTab} handleNav={setActiveTab} currentUser={currentUser} threatLevel={threatLevel} alertCount={data.alertLog.filter(a=>a.status==='New').length} />")

admin_imports = """import React, { useState, useEffect } from 'react';
import { Activity, Users, Crosshair, Grid, Globe, MapPin, Bell, HardDrive, Settings, LogOut, ShieldAlert, AlertTriangle } from 'lucide-react';
import { Sidebar } from '../components/layout/Sidebar';
import { Topbar } from '../components/layout/Topbar';
import { OverviewPage } from './admin/OverviewPage';
import { ActiveSessionsPage } from './admin/ActiveSessionsPage';
import { AttackIntelligencePage } from './admin/AttackIntelligencePage';
import { GeoMapPage } from './admin/GeoMapPage';
import { HeatmapPage } from './admin/HeatmapPage';
import { AlertCenterPage } from './admin/AlertCenterPage';
import { HoneyActivityPage } from './admin/HoneyActivityPage';
import { DataVaultPage } from './admin/DataVaultPage';
import { SettingsPage } from './admin/SettingsPage';\n\n"""
with open(f'{base_dir}/pages/AdminDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(admin_imports + admin_code + "\n")

honey_imports = """import React, { useState, useEffect, useRef } from 'react';
import LiveDataEngine from './engine/LiveDataEngine';
import { FAKE_FILES_INITIAL } from './engine/constants';
import { LoginPage } from './pages/LoginPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { DeceptionDashboard } from './pages/DeceptionDashboard';\n\n"""
with open(f'{base_dir}/HoneyShieldV2.jsx', 'w', encoding='utf-8') as f:
    f.write(honey_imports + all_blocks['HoneyShieldApp'] + "\n")
