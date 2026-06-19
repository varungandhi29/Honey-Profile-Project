import re
import os

file_path = 'C:/Users/DELL/Desktop/Honey-Profile-Project/frontend/src/pages/HoneyShieldV2.jsx'
base_dir = 'C:/Users/DELL/Desktop/Honey-Profile-Project/frontend/src'

with open(file_path, 'r', encoding='utf-8') as f:
    original_code = f.read()

def get_function(func_name, content):
    pattern = r'(?:const\s+' + func_name + r'\s*=\s*\([^)]*\)\s*=>|function\s+' + func_name + r'\s*\()'
    match = re.search(pattern, content)
    if not match: return ""
    
    start_idx = match.start()
    brace_count = 0
    in_str = False
    str_char = ''
    idx = content.find('{', start_idx)
    if idx == -1: return ""
    
    brace_count = 1
    idx += 1
    while brace_count > 0 and idx < len(content):
        c = content[idx]
        if in_str:
            if c == str_char and content[idx-1] != '\\':
                in_str = False
        else:
            if c in '"\'`':
                in_str = True
                str_char = c
            elif c == '{':
                brace_count += 1
            elif c == '}':
                brace_count -= 1
        idx += 1
    
    if idx < len(content) and content[idx] == ';':
        idx += 1
        
    return content[start_idx:idx]

admin_pages = [
    'OverviewPage', 'ActiveSessionsPage', 'AttackIntelligencePage', 
    'HoneyActivityPage', 'GeoMapPage', 'HeatmapPage', 
    'AlertCenterPage', 'DataVaultPage', 'SettingsPage'
]

imports_recharts = "import { LineChart, Line, BarChart, Bar, ScatterChart, Scatter, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ZAxis } from 'recharts';"
imports_lucide = "import { AlertTriangle, Shield, ShieldAlert, Activity, Globe, Grid, Bell, Key, Settings, Download, Eye, Lock, Unlock, Server, Crosshair, Users, HardDrive, FileText, Database, Terminal, ShieldOff, Zap, ShieldCheck, ChevronRight, X, Clock, MapPin, Monitor, LogOut, FolderOpen } from 'lucide-react';"

for page in admin_pages:
    code = get_function(page, original_code)
    
    imports = "import React, { useState, useMemo, useEffect, useRef } from 'react';\n"
    if 'recharts' in original_code and ('Chart' in code or 'RechartsTooltip' in code):
        imports += imports_recharts + "\n"
    imports += imports_lucide + "\n"
    imports += "import { Badge } from '../../components/ui/Badge';\n"
    imports += "import { Card } from '../../components/ui/Card';\n"
    imports += "import { USERS, ATTACK_TYPES, TARGET_AREAS, FAKE_FILES_INITIAL } from '../../engine/constants';\n"
    
    full_code = f"{imports}\nexport {code}\n"
    
    with open(f'{base_dir}/pages/admin/{page}.jsx', 'w', encoding='utf-8') as f:
        f.write(full_code)

# 7. Extract LoginPage.jsx
login_code = get_function('LoginPage', original_code)
login_imports = "import React, { useState } from 'react';\nimport { USERS } from '../engine/constants';\n\n"
with open(f'{base_dir}/pages/LoginPage.jsx', 'w', encoding='utf-8') as f:
    f.write(login_imports + "export " + login_code + "\n")

# 8. Extract DeceptionDashboard.jsx
deception_code = get_function('DeceptionDashboard', original_code)

# We must replace the inline Toast and Modal and Sidebar/Topbar in DeceptionDashboard and AdminDashboard
sidebar_inline_deception = """      {/* Icon-Only Sidebar for Deception Dashboard */}
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

sidebar_replacement_deception = """      <Sidebar 
        navItems={navItems} 
        currentPage={activeTab} 
        setCurrentPage={handleNav} 
        role="ATTACKER" 
        onLogout={onLogout} 
        iconOnly={true} 
        logo="ACME" 
      />"""

deception_code = deception_code.replace(sidebar_inline_deception, sidebar_replacement_deception)

# Similar extraction for Topbar, Modal, Toast inside DeceptionDashboard
modal_inline_deception = """      {/* Custom Modal */}
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
modal_replacement = "      <Modal content={modalContent} onClose={() => setModalContent(null)} />"
deception_code = deception_code.replace(modal_inline_deception, modal_replacement)

toast_inline = """      {toastMessage && (
        <div className="absolute bottom-8 right-8 bg-[#242424] border border-[#333] text-white px-5 py-4 rounded-[16px] shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 z-40">
          <ShieldCheck size={20} className="text-[#A8E063]" />
          <span className="text-sm font-bold">{toastMessage}</span>
        </div>
      )}"""
toast_replacement = "      <Toast message={toastMessage} />"
deception_code = deception_code.replace(toast_inline, toast_replacement)

topbar_inline_deception = """        {/* Top Navigation & Profile Area */}
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
topbar_replacement_deception = """        <Topbar 
          navItems={navItems} 
          activeTab={activeTab} 
          handleNav={handleNav} 
          currentUser={{id: 'testuser', role: 'IT ADMIN'}} 
        />"""
deception_code = deception_code.replace(topbar_inline_deception, topbar_replacement_deception)

deception_imports = """import React, { useState, useRef } from 'react';
import { Activity, Server, FileText, Settings, Users, FolderOpen, ShieldCheck, X, LogOut } from 'lucide-react';
import { Sidebar } from '../components/layout/Sidebar';
import { Topbar } from '../components/layout/Topbar';
import { Modal } from '../components/ui/Modal';
import { Toast } from '../components/ui/Toast';
import { Badge } from '../components/ui/Badge';\n\n"""
with open(f'{base_dir}/pages/DeceptionDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(deception_imports + "export " + deception_code + "\n")

# 9. Extract AdminDashboard.jsx
admin_code = get_function('AdminDashboard', original_code)
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
sidebar_replacement_admin = """      <Sidebar 
        navItems={navItems} 
        currentPage={activeTab} 
        setCurrentPage={setActiveTab} 
        role={currentUser.role} 
        onLogout={onLogout} 
        logo="HS" 
        unreadAlertCount={data.alertLog.filter(a=>a.status==='New').length}
      />"""
admin_code = admin_code.replace(sidebar_inline_admin, sidebar_replacement_admin)

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
topbar_replacement_admin = """        <Topbar 
          navItems={navItems} 
          activeTab={activeTab} 
          handleNav={setActiveTab} 
          currentUser={currentUser} 
          threatLevel={threatLevel}
          alertCount={data.alertLog.filter(a=>a.status==='New').length}
        />"""
admin_code = admin_code.replace(topbar_inline_admin, topbar_replacement_admin)

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
    f.write(admin_imports + "export " + admin_code + "\n")

# 10. HoneyShieldV2.jsx
honey_code = get_function('HoneyShieldApp', original_code)
honey_imports = """import React, { useState, useEffect, useRef } from 'react';
import LiveDataEngine from './engine/LiveDataEngine';
import { FAKE_FILES_INITIAL } from './engine/constants';
import { LoginPage } from './pages/LoginPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { DeceptionDashboard } from './pages/DeceptionDashboard';\n\n"""
with open(f'{file_path}', 'w', encoding='utf-8') as f:
    f.write(honey_imports + "export default " + honey_code + "\n")
