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
        
        # Remove trailing export default if accidentally captured
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

# ActiveSessionsPage fixes
old_score_class = "`font-bold text-2xl ${s.riskScore >= 70 ? 'text-[#FF8C00]' : s.riskScore >= 36 ? 'text-white' : 'text-[#A8E063]'}`"
new_score_class = "`font-bold text-2xl ${s.riskScore >= engine.settings.attackerThreshold ? 'text-[#FF8C00]' : s.riskScore >= engine.settings.suspiciousThreshold ? 'text-white' : 'text-[#A8E063]'}`"
all_blocks['ActiveSessionsPage'] = all_blocks['ActiveSessionsPage'].replace(old_score_class, new_score_class)

old_stroke = 'stroke={s.riskScore >= 70 ? "#FF8C00" : "#FFFFFF"}'
new_stroke = 'stroke={s.riskScore >= engine.settings.attackerThreshold ? "#FF8C00" : "#FFFFFF"}'
all_blocks['ActiveSessionsPage'] = all_blocks['ActiveSessionsPage'].replace(old_stroke, new_stroke)

# SettingsPage fixes
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

# AdminDashboard fixes
# fetch 2
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

all_blocks['AdminDashboard'] = all_blocks['AdminDashboard'].replace("function AdminDashboard({ data, engine, settings, currentUser, onLogout }) {", "function AdminDashboard({ data, engine, settings, setSettings, currentUser, onLogout }) {")
all_blocks['AdminDashboard'] = all_blocks['AdminDashboard'].replace("{activeTab === \"Settings\" && <SettingsPage settings={settings} engine={engine} />}", "{activeTab === \"Settings\" && <SettingsPage settings={settings} setSettings={setSettings} engine={engine} />}")

# HoneyShieldApp fixes
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

# Escaped backticks (already none, but just in case)
for k in all_blocks:
    all_blocks[k] = all_blocks[k].replace("\\`", "`")

# Now write files with correct imports
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
    if 'recharts' in open('part2.jsx', encoding='utf-8').read() and ('Chart' in code or 'RechartsTooltip' in code or '<Line ' in code or '<Bar ' in code or '<Scatter ' in code or '<Pie ' in code or 'ResponsiveContainer' in code):
        imports += imports_recharts + "\n"
    imports += imports_lucide + "\n"
    imports += "import { Badge } from '../../components/ui/Badge';\n"
    imports += "import { Card } from '../../components/ui/Card';\n"
    imports += "import { USERS, ATTACK_TYPES, TARGET_AREAS, FAKE_FILES_INITIAL } from '../../engine/constants';\n"
    
    full_code = f"{imports}\nexport {code}\n"
    with open(f'{base_dir}/pages/admin/{page}.jsx', 'w', encoding='utf-8') as f:
        f.write(full_code)

# Write UI Components correctly!
with open(f'{base_dir}/components/ui/Badge.jsx', 'w', encoding='utf-8') as f:
    f.write(f"import React from 'react';\n\nexport {all_blocks['Badge']}\n")

with open(f'{base_dir}/components/ui/Card.jsx', 'w', encoding='utf-8') as f:
    f.write(f"import React from 'react';\n\nexport {all_blocks['Card']}\n")

# Write LoginPage
login_imports = "import React, { useState } from 'react';\nimport { USERS } from '../engine/constants';\n\n"
with open(f'{base_dir}/pages/LoginPage.jsx', 'w', encoding='utf-8') as f:
    f.write(login_imports + "export " + all_blocks['LoginPage'] + "\n")

# Process DeceptionDashboard inline components replacements
deception_code = all_blocks['DeceptionDashboard']
# Replace inline Sidebar, Modal, Toast, Topbar (I will reuse strings from previous script)
