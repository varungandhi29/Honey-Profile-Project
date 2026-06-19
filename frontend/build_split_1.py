import os
import re

file_path = 'C:/Users/DELL/Desktop/Honey-Profile-Project/frontend/src/pages/HoneyShieldV2.jsx'
base_dir = 'C:/Users/DELL/Desktop/Honey-Profile-Project/frontend/src'

with open(file_path, 'r', encoding='utf-8') as f:
    original_code = f.read()

# Make directories
dirs = [
    f'{base_dir}/engine',
    f'{base_dir}/components/ui',
    f'{base_dir}/components/layout',
    f'{base_dir}/pages/admin'
]
for d in dirs:
    os.makedirs(d, exist_ok=True)

# We will use simple regex/string parsing to extract blocks

def get_block(start_str, end_regex, content):
    start_idx = content.find(start_str)
    if start_idx == -1: return ""
    match = re.search(end_regex, content[start_idx:])
    if not match: return content[start_idx:]
    return content[start_idx:start_idx + match.end()]

def get_function(func_name, content):
    pattern = r'(?:const\s+' + func_name + r'\s*=\s*\([^)]*\)\s*=>|function\s+' + func_name + r'\s*\()'
    match = re.search(pattern, content)
    if not match: return ""
    
    start_idx = match.start()
    
    # Simple brace matching
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
    
    # If the function is `const ... => { ... };` we should include the semicolon
    if idx < len(content) and content[idx] == ';':
        idx += 1
        
    return content[start_idx:idx]

files_to_write = {}

# 1. constants.js
constants_start = "const USERS = ["
constants_end = "// HELPER FUNCTIONS"
constants_block = original_code[original_code.find(constants_start):original_code.find(constants_end)]
constants_exports = []
for line in constants_block.split('\n'):
    if line.startswith('const '):
        name = line.split(' ')[1]
        constants_exports.append(name)
        constants_block = constants_block.replace(f"const {name}", f"export const {name}")

files_to_write[f'{base_dir}/engine/constants.js'] = constants_block.strip()


# 2. LiveDataEngine.js
helpers_start = "// HELPER FUNCTIONS"
helpers_end = "class LiveDataEngine {"
helpers_block = original_code[original_code.find(helpers_start)+len(helpers_start):original_code.find(helpers_end)].strip()

lde_block = get_block("class LiveDataEngine {", r'}\n\n// =================', original_code)
lde_content = f"""import {{ 
  USERS, ATTACK_TYPES, TARGET_AREAS, FAKE_FILES_INITIAL, FAKE_CREDENTIALS,
  ACTIONS, RESPONSES, BEHAVIOR_SIGNATURES, REQUEST_PATTERNS, TOOL_HINTS,
  COUNTRIES, DEVICES, BROWSERS, OS_LIST
}} from './constants';

{helpers_block}

{lde_block}

export default LiveDataEngine;
"""
files_to_write[f'{base_dir}/engine/LiveDataEngine.js'] = lde_content.replace('// ============================================================================', '').replace('// UI COMPONENTS & PAGES', '').strip()


# Extract UI Components
badge_code = get_function('Badge', original_code)
card_code = get_function('Card', original_code)

files_to_write[f'{base_dir}/components/ui/Badge.jsx'] = f"import React from 'react';\n\nexport {badge_code}"
files_to_write[f'{base_dir}/components/ui/Card.jsx'] = f"import React from 'react';\n\nexport {card_code}"

# 3. Create Modal.jsx
modal_code = """import React from 'react';
import { X } from 'lucide-react';

export const Modal = ({ content, onClose }) => {
  if (!content) return null;
  return (
    <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-8 backdrop-blur-[2px]">
      <div className="bg-[#242424] rounded-[24px] shadow-2xl max-w-4xl w-full flex flex-col max-h-[80vh] overflow-hidden animate-in zoom-in-95">
        <div className="p-6 border-b border-[#333] flex justify-between items-center bg-[#1A1A1A]">
          <h3 className="font-[800] text-sm tracking-[0.1em] uppercase text-white">{content.title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-[#333] rounded-full text-[#888888] transition-colors"><X size={20}/></button>
        </div>
        <div className="p-8 overflow-auto">
          {content.content}
        </div>
        <div className="p-6 border-t border-[#333] bg-[#1A1A1A] flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-[#A8E063] hover:bg-opacity-80 rounded-full text-sm font-bold text-black transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
};
"""
files_to_write[f'{base_dir}/components/ui/Modal.jsx'] = modal_code

# 4. Create Toast.jsx
toast_code = """import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const Toast = ({ message }) => {
  if (!message) return null;
  return (
    <div className="absolute bottom-8 right-8 bg-[#242424] border border-[#333] text-white px-5 py-4 rounded-[16px] shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 z-40">
      <ShieldCheck size={20} className="text-[#A8E063]" />
      <span className="text-sm font-bold">{message}</span>
    </div>
  );
};
"""
files_to_write[f'{base_dir}/components/ui/Toast.jsx'] = toast_code

# 5. Create Sidebar.jsx
sidebar_code = """import React from 'react';
import { LogOut } from 'lucide-react';

export const Sidebar = ({ navItems, currentPage, setCurrentPage, role, onLogout, iconOnly = false, logo = "HS", unreadAlertCount = 0 }) => {
  return (
    <div className="w-[64px] bg-[#1A1A1A] flex flex-col z-20 shrink-0 items-center py-6 border-r border-[#333]">
      <div className="mb-8">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-black font-[800] ${logo === 'HS' ? 'bg-[#A8E063] text-xl' : 'bg-white text-[10px]'}`}>
          {logo}
        </div>
      </div>
      <div className="flex-1 flex flex-col gap-4 w-full px-2">
        {navItems.map(item => (
          <button 
            key={item.name} 
            onClick={() => setCurrentPage(item.name)} 
            title={item.name}
            className={`w-12 h-12 flex items-center justify-center rounded-xl mx-auto transition-colors ${currentPage === item.name ? (logo === 'HS' ? 'bg-[#2A2A2A] text-[#A8E063]' : 'bg-white text-black') : 'text-[#888888] hover:bg-[#2A2A2A] hover:text-white'}`}
          >
            <item.icon size={22}/>
            {item.name === 'Alert Center' && unreadAlertCount > 0 && (
              <span className="absolute top-0 right-0 w-3 h-3 bg-[#FF8C00] rounded-full border-2 border-[#1A1A1A]"></span>
            )}
          </button>
        ))}
      </div>
      {onLogout && (
        <button onClick={onLogout} title="Secure Logout" className="w-12 h-12 flex items-center justify-center rounded-xl mx-auto text-[#888888] hover:bg-red-500 hover:text-white transition-colors mt-auto">
          <LogOut size={22}/>
        </button>
      )}
    </div>
  );
};
"""
files_to_write[f'{base_dir}/components/layout/Sidebar.jsx'] = sidebar_code

# 6. Create Topbar.jsx
topbar_code = """import React from 'react';

export const Topbar = ({ navItems, activeTab, handleNav, currentUser, threatLevel, alertCount, onExport, onLogout, currentTime }) => {
  return (
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
        {threatLevel && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-[800] uppercase tracking-[0.1em] text-[#888888]">Threat Level:</span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${threatLevel === 'CRITICAL' ? 'bg-[#FF8C00] text-white animate-pulse' : threatLevel === 'HIGH' ? 'bg-transparent border border-[#FF8C00] text-white' : 'bg-[#A8E063] text-black'}`}>
              {threatLevel}
            </span>
          </div>
        )}
        {!threatLevel && (
          <div className="flex items-center gap-2 text-white font-[800] uppercase tracking-[0.1em] text-sm">
            ACMECORP INTERNAL
          </div>
        )}
        <div className="flex items-center gap-3 bg-[#242424] pl-4 pr-1.5 py-1.5 rounded-full">
          <div className="flex flex-col items-end">
            <span className="text-sm font-bold text-white leading-tight">{currentUser.id}</span>
            <span className="text-[10px] font-[800] uppercase tracking-[0.1em] text-[#888888] leading-tight">{currentUser.role}</span>
          </div>
          <div className={`w-8 h-8 rounded-full text-black font-bold flex items-center justify-center text-xs ${currentUser.role === 'ATTACKER' ? 'bg-white' : 'bg-[#A8E063]'}`}>
            {currentUser.id.substring(0, 2).toUpperCase()}
          </div>
        </div>
      </div>
    </div>
  );
};
"""
files_to_write[f'{base_dir}/components/layout/Topbar.jsx'] = topbar_code

for path, content in files_to_write.items():
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Engine and UI/Layout components created successfully.")
