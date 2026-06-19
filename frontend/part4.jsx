// part4.jsx

function AdminDashboard({ data, engine, settings, currentUser, onLogout }) {
  const [activeTab, setActiveTab] = useState("Overview");
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    if (currentUser && currentUser.role !== 'ATTACKER') {
      fetch('/api/session/behavior', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentUser.id, eventType: 'PAGE_CHANGE', detail: activeTab })
      }).catch(() => {});
    }
  }, [activeTab, currentUser]);

  const handleExport = () => {
    if (currentUser.role !== 'ADMIN') return;
    const csvContent = "data:text/csv;charset=utf-8," 
      + "ID,Type,Severity,Timestamp,SourceIP,TargetArea,RiskDelta\n"
      + data.attackLog.map(e => `${e.id},${e.type},${e.severity},${e.timestamp},${e.sourceIP},${e.targetArea},${e.riskDelta}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attack_log_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setShowExportModal(false);
  };

  const total = data.sessions.length;
  const attackers = data.sessions.filter(s => s.state === 'ATTACKER').length;
  const pct = total === 0 ? 0 : (attackers / total) * 100;
  
  let threatLevel = "LOW";
  if (pct > 60) threatLevel = "CRITICAL";
  else if (pct > 30) threatLevel = "HIGH";
  else if (pct > 10) threatLevel = "MEDIUM";

  const allNavItems = [
    { name: "Overview", icon: Activity },
    { name: "Active Sessions", icon: Users },
    { name: "Attack Intelligence", icon: Crosshair },
    { name: "Honey Activity", icon: Grid },
    { name: "Geo Map", icon: Globe },
    { name: "Heatmap", icon: MapPin },
    { name: "Alert Center", icon: Bell },
    { name: "Data Vault", icon: HardDrive },
    { name: "Settings", icon: Settings },
  ];

  const navItems = currentUser.role === 'USER' 
    ? allNavItems.filter(i => i.name === 'Overview' || i.name === 'Data Vault')
    : allNavItems;

  return (
    <div className="flex h-screen w-full bg-[#1A1A1A] text-white font-sans overflow-hidden">
      {/* Icon-Only Sidebar */}
      <div className="w-[64px] bg-[#1A1A1A] flex flex-col z-20 shrink-0 items-center py-6 border-r border-[#333]">
        <div className="mb-8">
          <div className="w-10 h-10 bg-[#A8E063] rounded-full flex items-center justify-center text-black font-bold text-xl">HS</div>
        </div>
        <div className="flex-1 flex flex-col gap-4 w-full px-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = activeTab === item.name;
            return (
              <button
                key={item.name}
                onClick={() => setActiveTab(item.name)}
                title={item.name}
                className={`w-12 h-12 flex items-center justify-center rounded-xl mx-auto transition-colors ${active ? 'bg-[#A8E063] text-black' : 'text-[#888888] hover:bg-[#2A2A2A] hover:text-white'}`}
              >
                <Icon size={22} />
              </button>
            );
          })}
        </div>
        <button onClick={onLogout} title="Logout" className="w-12 h-12 flex items-center justify-center rounded-xl mx-auto text-[#888888] hover:bg-[#2A2A2A] hover:text-white transition-colors mt-auto">
          <LogOut size={22} />
        </button>
      </div>

      <div className="flex-1 flex flex-col relative min-w-[1024px]">
        {/* Top Navigation & Profile Area */}
        <div className="h-[80px] flex items-center justify-between px-8 z-10 bg-[#1A1A1A]">
          <div className="flex items-center gap-3">
            {navItems.slice(0, 3).map(item => {
              const active = activeTab === item.name;
              return (
                <button
                  key={item.name + "_top"}
                  onClick={() => setActiveTab(item.name)}
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
              {threatLevel === 'CRITICAL' && <ShieldAlert size={18} className="text-[#FF8C00] animate-pulse" />}
              {threatLevel} THREAT
            </div>
            
            <div className="relative">
              <Bell size={24} className="text-[#888888] cursor-pointer hover:text-white" />
              {data.alertLog.filter(a=>a.status==='New').length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#FF8C00] text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                  {data.alertLog.filter(a=>a.status==='New').length}
                </span>
              )}
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
        </div>

        <div className="flex-1 overflow-y-auto px-8 pb-8 bg-[#1A1A1A] custom-scrollbar">
          {activeTab === "Overview" && <OverviewPage data={data} />}
          {activeTab === "Active Sessions" && <ActiveSessionsPage data={data} engine={engine} role={currentUser.role} />}
          {activeTab === "Attack Intelligence" && <AttackIntelligencePage data={data} />}
          {activeTab === "Geo Map" && <GeoMapPage data={data} />}
          {activeTab === "Heatmap" && <HeatmapPage data={data} />}
          {activeTab === "Alert Center" && <AlertCenterPage data={data} />}
          {activeTab === "Honey Activity" && <HoneyActivityPage data={data} />}
          {activeTab === "Data Vault" && <DataVaultPage data={data} />}
          {activeTab === "Settings" && <SettingsPage settings={settings} engine={engine} />}
        </div>
      </div>

      <button onClick={() => setShowExportModal(true)} className="absolute bottom-8 left-[96px] w-14 h-14 bg-[#A8E063] rounded-full shadow-2xl flex items-center justify-center text-black hover:bg-opacity-80 transition-all z-50">
        <span className="text-3xl leading-none -mt-1">+</span>
      </button>

      {showExportModal && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-8 backdrop-blur-sm">
            <div className="bg-[#242424] rounded-[24px] max-w-md w-full flex flex-col p-8">
                <h3 className="font-[800] text-xl text-white tracking-[0.1em] mb-4">EXPORT DATA</h3>
                <p className="text-[#888888] mb-8">Export all current attack logs and session data to CSV.</p>
                <div className="flex gap-4">
                    <button onClick={() => setShowExportModal(false)} className="flex-1 px-4 py-3 bg-[#1A1A1A] rounded-xl font-bold text-white">Cancel</button>
                    <button onClick={handleExport} className="flex-1 px-4 py-3 bg-[#A8E063] rounded-xl font-bold text-black">Download CSV</button>
                </div>
            </div>
        </div>
      )}

      <div className="absolute top-[90px] right-8 z-50 flex flex-col gap-3 pointer-events-none">
        {data.alertLog.slice(0, 3).filter(a => a.status === 'New').map(alert => (
          <div key={`toast-${alert.id}`} className={`bg-[#242424] p-4 rounded-[16px] shadow-2xl w-80 pointer-events-auto flex items-start gap-3 animate-in slide-in-from-right-8 border-l-4 ${alert.severity === 'CRITICAL' ? 'border-[#FF8C00]' : 'border-white'}`}>
            {alert.severity === 'CRITICAL' ? <ShieldAlert className="text-[#FF8C00] mt-0.5 shrink-0" size={18} /> : <AlertTriangle className="text-white mt-0.5 shrink-0" size={18} />}
            <div className="flex-1">
              <h5 className="text-sm font-bold text-white">{alert.title}</h5>
              <p className="text-xs text-[#888888] mt-1">{alert.description}</p>
            </div>
          </div>
        ))}
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #555; }
        .blink { animation: blinker 1s linear infinite; }
        @keyframes blinker { 50% { opacity: 0; } }
      `}} />
    </div>
  );
}

function DeceptionDashboard({ engine, onLogout }) {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [toastMessage, setToastMessage] = useState(null);
  const [loadingAction, setLoadingAction] = useState(null);
  const [modalContent, setModalContent] = useState(null);
  
  const xssFiredRef = useRef(new Set());

  const onAttackerAction = (actionType) => {
    if (engine) {
      engine.registerAttackerAction(actionType);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDownload = (fileName) => {
    onAttackerAction('DATA_EXFILTRATION');
    setLoadingAction(`Downloading ${fileName}...`);
    setTimeout(() => {
      setLoadingAction(null);
      showToast("Downloaded successfully");
    }, 1500);
  };

  const handleFileView = (fileName) => {
    onAttackerAction('RECONNAISSANCE');
    const ext = fileName.split('.').pop();
    let content = "";
    if (ext === 'xlsx') {
        content = (
            <table className="w-full text-left text-sm border-collapse text-white">
                <thead><tr className="border-b border-[#333]"><th className="p-3">Employee ID</th><th className="p-3">Name</th><th className="p-3">Salary</th><th className="p-3">Account Number</th></tr></thead>
                <tbody>
                    <tr className="border-b border-[#333]"><td className="p-3 font-mono">EMP-001</td><td className="p-3 font-bold">John Doe</td><td className="p-3 text-[#A8E063] font-mono">$120,000</td><td className="p-3 font-mono">****4592</td></tr>
                    <tr className="border-b border-[#333]"><td className="p-3 font-mono">EMP-002</td><td className="p-3 font-bold">Jane Smith</td><td className="p-3 text-[#A8E063] font-mono">$135,000</td><td className="p-3 font-mono">****8810</td></tr>
                    <tr className="border-b border-[#333]"><td className="p-3 font-mono">EMP-003</td><td className="p-3 font-bold">Bob Wilson</td><td className="p-3 text-[#A8E063] font-mono">$95,000</td><td className="p-3 font-mono">****2234</td></tr>
                </tbody>
            </table>
        );
    } else if (ext === 'csv') {
        content = <pre className="text-xs bg-[#1A1A1A] text-[#A8E063] p-4 rounded-xl overflow-auto font-mono">id,name,role,department,salary
1,Sarah Connor,CEO,Executive,250000
2,John Smith,IT Admin,IT,115000
3,Mike Ross,Finance Dir,Finance,180000</pre>;
    } else if (ext === 'txt') {
        content = <pre className="text-xs bg-[#1A1A1A] text-[#A8E063] p-4 rounded-xl overflow-auto font-mono"># Admin Credentials Backup
admin: $2b$12$e/aGfVw... (Hash)
root: toor

# AWS Keys
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY</pre>;
    } else if (ext === 'json') {
        content = <pre className="text-xs bg-[#1A1A1A] text-[#A8E063] p-4 rounded-xl overflow-auto font-mono">{`{
  "production": {
    "db_host": "db-prod.acmecorp.internal",
    "db_user": "admin_rw",
    "db_pass": "SuperSecretProdDBPass2025!"
  }
}`}</pre>;
    } else if (ext === 'pdf') {
        content = <div className="text-center space-y-4"><div className="animate-spin w-8 h-8 border-4 border-[#A8E063] border-t-transparent rounded-full mx-auto mb-2"></div><p className="text-white">Rendering document...</p></div>;
        setTimeout(() => {
            setModalContent({ title: `Viewing: ${fileName}`, content: <div className="p-4"><h1 className="text-xl font-[800] tracking-[0.1em] text-white mb-4 uppercase">Network Topology Diagram</h1><p className="text-[#888888]">This document outlines the internal DMZ, core routing, and the firewall rules protecting the production database clusters. DO NOT DISTRIBUTE.</p></div> });
        }, 1500);
    } else if (ext === 'zip') {
        content = <div className="space-y-2"><p className="font-bold text-white">Archive contents: 47 files</p><ul className="list-disc pl-5 text-sm text-[#888888] font-mono"><li>vpn_cert.pem</li><li>client_config.ovpn</li><li>README.txt</li><li>...and 44 more files</li></ul></div>;
    } else {
        content = <p className="text-white">Unknown file format</p>;
    }

    setModalContent({ title: `Viewing: ${fileName}`, content });
  };

  const handleRestart = (serverName) => {
    onAttackerAction('COMMAND_INJECTION');
    setLoadingAction("Restarting...");
    setTimeout(() => {
      setLoadingAction(null);
      showToast("Server restarted successfully");
    }, 2000);
  };

  const handleViewLogs = (serverName) => {
    onAttackerAction('DIRECTORY_TRAVERSAL');
    const logContent = (
        <pre className="text-xs bg-[#1A1A1A] text-[#A8E063] p-4 rounded-xl overflow-auto whitespace-pre-wrap font-mono">
[2026-04-26 05:12:43] INFO  Web-Server-02: GET /admin/users 200 OK
[2026-04-26 05:12:51] WARN  DB-Server-01: Failed login attempt from 192.168.1.102
[2026-04-26 05:13:02] ERROR Backup-Server-03: Disk threshold exceeded 94%
[2026-04-26 05:13:18] INFO  Web-Server-02: POST /api/export/payroll 200 OK
[2026-04-26 05:13:45] WARN  Auth-Layer: Multiple failed attempts user=admin
        </pre>
    );
    setModalContent({ title: `Logs: ${serverName}`, content: logContent });
  };

  const handleInputChange = (fieldId) => {
    if (!xssFiredRef.current.has(fieldId)) {
        xssFiredRef.current.add(fieldId);
        onAttackerAction('XSS_ATTACK');
    }
  };

  const handleSearchSubmit = (e) => {
    if(e.key === 'Enter') {
      onAttackerAction('SQL_INJECTION');
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    onAttackerAction('CREDENTIAL_STUFFING');
    showToast("Password updated successfully.");
  };

  const navItems = [
    { name: "Dashboard", icon: Activity },
    { name: "My Files", icon: FolderOpen },
    { name: "Employee Directory", icon: Users },
    { name: "System Status", icon: Server },
    { name: "Reports", icon: FileText },
    { name: "Settings", icon: Settings },
  ];

  const handleNav = (name) => {
    setActiveTab(name);
    onAttackerAction('API_ABUSE');
  };

  const renderContent = () => {
    switch (activeTab) {
      case "Dashboard":
        return (
          <div className="space-y-6">
            <h1 className="text-2xl font-[800] text-white uppercase tracking-[0.1em]">Welcome back, John Smith — IT Administrator</h1>
            <div className="grid grid-cols-4 gap-6">
              <div className="bg-[#242424] p-6 rounded-[16px]">
                <p className="text-[#888888] text-xs font-[800] uppercase tracking-[0.1em]">Active Users</p>
                <p className="text-[32px] font-bold font-mono text-white mt-2">142</p>
              </div>
              <div className="bg-[#242424] p-6 rounded-[16px]">
                <p className="text-[#888888] text-xs font-[800] uppercase tracking-[0.1em]">Server Uptime</p>
                <p className="text-[32px] font-bold font-mono text-[#A8E063] mt-2">99.7%</p>
              </div>
              <div className="bg-[#242424] p-6 rounded-[16px]">
                <p className="text-[#888888] text-xs font-[800] uppercase tracking-[0.1em]">Open Tickets</p>
                <p className="text-[32px] font-bold font-mono text-[#FF8C00] mt-2">23</p>
              </div>
              <div className="bg-[#242424] p-6 rounded-[16px]">
                <p className="text-[#888888] text-xs font-[800] uppercase tracking-[0.1em]">Storage Used</p>
                <p className="text-[32px] font-bold font-mono text-white mt-2">847 GB</p>
              </div>
            </div>
            <div className="bg-[#242424] p-6 rounded-[16px]">
              <h2 className="text-sm font-[800] text-white uppercase tracking-[0.1em] mb-6">Recent Activity</h2>
              <div className="space-y-5">
                <div className="flex gap-4 items-start"><div className="w-2 h-2 rounded-full bg-white mt-2"></div><div><p className="font-bold text-white text-sm">File accessed: payroll_2025.xlsx</p><p className="text-xs font-mono text-[#888888] mt-1">2 mins ago</p></div></div>
                <div className="flex gap-4 items-start"><div className="w-2 h-2 rounded-full bg-[#A8E063] mt-2"></div><div><p className="font-bold text-white text-sm">Login from 192.168.1.45</p><p className="text-xs font-mono text-[#888888] mt-1">14 mins ago</p></div></div>
                <div className="flex gap-4 items-start"><div className="w-2 h-2 rounded-full bg-white mt-2"></div><div><p className="font-bold text-white text-sm">Backup completed successfully</p><p className="text-xs font-mono text-[#888888] mt-1">1 hour ago</p></div></div>
              </div>
            </div>
          </div>
        );
      case "My Files":
        const files = [
          { name: "payroll_2025.xlsx", type: "CONFIDENTIAL", size: "2.4 MB", date: "Today" },
          { name: "employee_records_full.csv", type: "CONFIDENTIAL", size: "18.1 MB", date: "Yesterday" },
          { name: "network_topology_diagram.pdf", type: "INTERNAL", size: "4.2 MB", date: "Last Week" },
          { name: "backup_encryption_keys.txt", type: "CONFIDENTIAL", size: "12 KB", date: "1 Month Ago" },
          { name: "admin_credentials_backup.txt", type: "CONFIDENTIAL", size: "4 KB", date: "2 Months Ago" },
          { name: "database_connection_strings.json", type: "CONFIDENTIAL", size: "1.1 MB", date: "3 Months Ago" },
          { name: "vpn_config_files.zip", type: "INTERNAL", size: "8.5 MB", date: "6 Months Ago" },
          { name: "financial_report_Q4.xlsx", type: "INTERNAL", size: "5.6 MB", date: "1 Year Ago" }
        ];
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-[800] text-white uppercase tracking-[0.1em] mb-6">Corporate File Repository</h2>
            <div className="grid grid-cols-4 gap-6">
              {files.map(f => (
                <div key={f.name} className="bg-[#242424] p-5 rounded-[16px] flex flex-col">
                  <div className="flex justify-between items-start mb-5">
                    <FolderOpen size={32} className="text-white"/>
                    <span className={`text-[10px] font-bold font-mono px-2 py-1 rounded-full ${f.type === 'CONFIDENTIAL' ? 'bg-[#FF8C00]' : 'bg-gray-700'}`}>{f.type}</span>
                  </div>
                  <h3 className="font-bold text-white text-sm truncate mb-2" title={f.name}>{f.name}</h3>
                  <p className="text-xs font-mono text-[#888888] mb-5">{f.size} • Modified {f.date}</p>
                  <div className="mt-auto flex gap-3">
                    <button onClick={() => handleDownload(f.name)} className="flex-1 bg-[#A8E063] hover:bg-opacity-80 text-black font-bold text-xs py-2 rounded-full transition-colors text-center">Download</button>
                    <button onClick={() => handleFileView(f.name)} className="flex-1 bg-[#1A1A1A] hover:bg-[#333] text-white font-bold text-xs py-2 rounded-full transition-colors text-center">View</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case "Employee Directory":
        const employees = [
          { name: "Sarah Connor", role: "CEO", email: "s.connor@acmecorp.internal", dept: "Executive", phone: "555-0101" },
          { name: "John Smith", role: "IT Administrator", email: "j.smith@acmecorp.internal", dept: "IT", phone: "555-0202" },
          { name: "Mike Ross", role: "Finance Director", email: "m.ross@acmecorp.internal", dept: "Finance", phone: "555-0303" },
          { name: "Jane Doe", role: "HR Manager", email: "j.doe@acmecorp.internal", dept: "HR", phone: "555-0404" },
          { name: "Robert California", role: "Sales Lead", email: "r.california@acmecorp.internal", dept: "Sales", phone: "555-0505" },
          { name: "Kelly Kapoor", role: "Customer Service", email: "k.kapoor@acmecorp.internal", dept: "Support", phone: "555-0606" },
          { name: "Ryan Howard", role: "VP Development", email: "r.howard@acmecorp.internal", dept: "Engineering", phone: "555-0707" },
          { name: "Pam Beesly", role: "Office Administrator", email: "p.beesly@acmecorp.internal", dept: "Admin", phone: "555-0808" },
          { name: "Jim Halpert", role: "Senior Sales", email: "j.halpert@acmecorp.internal", dept: "Sales", phone: "555-0909" },
          { name: "Dwight Schrute", role: "Assistant to the Regional Manager", email: "d.schrute@acmecorp.internal", dept: "Sales", phone: "555-1010" }
        ];
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-[800] text-white uppercase tracking-[0.1em]">Employee Directory</h2>
              <input type="text" placeholder="Search employees..." onKeyDown={handleSearchSubmit} onChange={() => handleInputChange('employee_search')} className="bg-[#1A1A1A] border-none text-white focus:ring-2 focus:ring-[#A8E063] p-3 rounded-full w-64 text-sm" />
            </div>
            <div className="bg-[#242424] rounded-[16px] overflow-hidden">
              <table className="w-full text-left text-sm text-white">
                <thead className="bg-[#1A1A1A]">
                  <tr><th className="p-4 text-[#888888] font-[800] uppercase tracking-[0.1em] text-xs">Name</th><th className="p-4 text-[#888888] font-[800] uppercase tracking-[0.1em] text-xs">Role</th><th className="p-4 text-[#888888] font-[800] uppercase tracking-[0.1em] text-xs">Email</th><th className="p-4 text-[#888888] font-[800] uppercase tracking-[0.1em] text-xs">Dept</th><th className="p-4 text-[#888888] font-[800] uppercase tracking-[0.1em] text-xs">Phone</th><th className="p-4"></th></tr>
                </thead>
                <tbody>
                  {employees.map(e => (
                    <tr key={e.name} className="border-b border-[#333] hover:bg-[#2A2A2A]">
                      <td className="p-4 font-bold">{e.name}</td>
                      <td className="p-4 text-[#888888]">{e.role}</td>
                      <td className="p-4 font-mono text-white">{e.email}</td>
                      <td className="p-4 text-[#888888]">{e.dept}</td>
                      <td className="p-4 font-mono text-[#888888]">{e.phone}</td>
                      <td className="p-4 text-right"><button onClick={() => { handleFileView(e.name + "_profile.pdf"); }} className="text-[#A8E063] hover:underline text-xs font-bold uppercase tracking-wider">View Profile</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case "System Status":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-[800] text-white uppercase tracking-[0.1em] mb-6">Infrastructure Status</h2>
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="bg-[#242424] p-5 rounded-[16px]">
                <p className="text-xs font-[800] uppercase tracking-[0.1em] text-[#888888] mb-2">Total CPU Usage</p>
                <div className="flex items-end gap-2"><span className="text-[32px] font-bold font-mono text-white leading-none">34%</span><span className="text-sm font-bold text-[#A8E063] mb-1">Normal</span></div>
                <div className="w-full bg-[#1A1A1A] h-2 mt-4 rounded-full overflow-hidden"><div className="bg-[#A8E063] h-full" style={{width: '34%'}}></div></div>
              </div>
              <div className="bg-[#242424] p-5 rounded-[16px]">
                <p className="text-xs font-[800] uppercase tracking-[0.1em] text-[#888888] mb-2">Memory Allocation</p>
                <div className="flex items-end gap-2"><span className="text-[32px] font-bold font-mono text-white leading-none">67%</span><span className="text-sm font-bold text-[#FF8C00] mb-1">Elevated</span></div>
                <div className="w-full bg-[#1A1A1A] h-2 mt-4 rounded-full overflow-hidden"><div className="bg-[#FF8C00] h-full" style={{width: '67%'}}></div></div>
              </div>
              <div className="bg-[#242424] p-5 rounded-[16px]">
                <p className="text-xs font-[800] uppercase tracking-[0.1em] text-[#888888] mb-2">Disk Space</p>
                <div className="flex items-end gap-2"><span className="text-[32px] font-bold font-mono text-white leading-none">52%</span><span className="text-sm font-bold text-[#A8E063] mb-1">Stable</span></div>
                <div className="w-full bg-[#1A1A1A] h-2 mt-4 rounded-full overflow-hidden"><div className="bg-[#A8E063] h-full" style={{width: '52%'}}></div></div>
              </div>
            </div>
            
            <h3 className="font-[800] text-sm text-white uppercase tracking-[0.1em] mb-4">Active Servers</h3>
            <div className="space-y-4">
              {[
                { name: "DB-SERVER-01", ip: "10.0.1.5", status: "Online", color: "green" },
                { name: "WEB-SERVER-02", ip: "10.0.1.12", status: "Online", color: "green" },
                { name: "BACKUP-SERVER-03", ip: "10.0.1.88", status: "Maintenance", color: "amber" }
              ].map(s => (
                <div key={s.name} className="bg-[#242424] p-5 rounded-[16px] flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${s.color === 'green' ? 'bg-[#A8E063]' : 'bg-[#FF8C00]'}`}></div>
                    <div>
                      <p className="font-bold text-white">{s.name}</p>
                      <p className="text-xs text-[#888888] font-mono mt-1">{s.ip}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => handleViewLogs(s.name)} className="px-4 py-2 bg-[#1A1A1A] rounded-full text-xs font-bold text-white hover:bg-[#333]">View Logs</button>
                    <button onClick={() => handleRestart(s.name)} className="px-4 py-2 bg-[#FF8C00] text-white rounded-full text-xs font-bold hover:bg-opacity-80">Restart Server</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case "Reports":
        return (
          <div className="space-y-6">
             <h2 className="text-2xl font-[800] text-white uppercase tracking-[0.1em] mb-6">Generated Reports</h2>
             <div className="space-y-4">
               {["Q4 Financial Summary", "Employee Performance Review", "Network Audit Report", "Security Compliance Report"].map(r => (
                 <div key={r} className="bg-[#242424] p-5 rounded-[16px] flex justify-between items-center">
                   <div className="flex items-center gap-4 text-white">
                     <FileText className="text-white"/>
                     <span className="font-bold">{r}</span>
                   </div>
                   <button onClick={() => handleDownload(r + ".pdf")} className="text-[#A8E063] hover:underline text-xs font-bold uppercase tracking-widest">Download PDF</button>
                 </div>
               ))}
             </div>
          </div>
        );
      case "Settings":
        return (
          <div className="max-w-2xl">
            <h2 className="text-2xl font-[800] text-white uppercase tracking-[0.1em] mb-6">Account Settings</h2>
            <div className="bg-[#242424] p-8 rounded-[16px] space-y-8">
              <div>
                <h3 className="font-[800] text-sm text-white uppercase tracking-[0.1em] mb-5 border-b border-[#333] pb-3">Profile Information</h3>
                <div className="space-y-5">
                  <div><label className="block text-xs font-[800] text-[#888888] uppercase tracking-[0.1em] mb-2">Full Name</label><input type="text" defaultValue="John Smith" readOnly className="w-full bg-[#1A1A1A] text-white border-none p-3 rounded-lg font-bold" /></div>
                  <div><label className="block text-xs font-[800] text-[#888888] uppercase tracking-[0.1em] mb-2">Email</label><input type="email" defaultValue="j.smith@acmecorp.internal" readOnly className="w-full bg-[#1A1A1A] text-white border-none p-3 rounded-lg font-mono" /></div>
                  <div><label className="block text-xs font-[800] text-[#888888] uppercase tracking-[0.1em] mb-2">Department</label><input type="text" defaultValue="IT" readOnly className="w-full bg-[#1A1A1A] text-white border-none p-3 rounded-lg font-bold" /></div>
                </div>
              </div>
              <div>
                <h3 className="font-[800] text-sm text-white uppercase tracking-[0.1em] mb-5 border-b border-[#333] pb-3">Change Password</h3>
                <form className="space-y-5" onSubmit={handlePasswordSubmit}>
                  <div><label className="block text-xs font-[800] text-[#888888] uppercase tracking-[0.1em] mb-2">Current Password</label><input type="password" onChange={() => handleInputChange("password_input_1")} className="w-full bg-[#1A1A1A] text-white border-none p-3 rounded-lg focus:ring-2 focus:ring-[#A8E063]" /></div>
                  <div><label className="block text-xs font-[800] text-[#888888] uppercase tracking-[0.1em] mb-2">New Password</label><input type="password" onChange={() => handleInputChange("password_input_2")} className="w-full bg-[#1A1A1A] text-white border-none p-3 rounded-lg focus:ring-2 focus:ring-[#A8E063]" /></div>
                  <button type="submit" className="bg-[#A8E063] hover:bg-opacity-80 text-black font-bold px-6 py-3 rounded-full mt-2">Update Password</button>
                </form>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#1A1A1A] text-white font-sans relative">
      {/* Loading Overlay */}
      {loadingAction && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] z-50 flex items-center justify-center">
            <div className="bg-[#242424] p-8 rounded-[24px] shadow-2xl flex flex-col items-center gap-6 animate-in zoom-in-95">
                <div className="animate-spin w-12 h-12 border-4 border-[#A8E063] border-t-transparent rounded-full"></div>
                <p className="font-[800] tracking-[0.1em] uppercase text-white">{loadingAction}</p>
            </div>
        </div>
      )}

      {/* Custom Modal */}
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
      )}

      {/* Icon-Only Sidebar for Deception Dashboard */}
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
      </div>
      
      <div className="flex-1 flex flex-col relative min-w-[1024px]">
        {/* Top Navigation & Profile Area */}
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
        </div>
        <div className="flex-1 p-8 overflow-auto">
          {renderContent()}
        </div>
      </div>

      {toastMessage && (
        <div className="absolute bottom-8 right-8 bg-[#242424] border border-[#333] text-white px-5 py-4 rounded-[16px] shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 z-40">
          <ShieldCheck size={20} className="text-[#A8E063]" />
          <span className="text-sm font-bold">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const user = HARDCODED_USERS.find(u => u.id === username && u.password === password);
    if (user) {
      onLogin(user);
    } else {
      setError(true);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#1A1A1A] flex items-center justify-center font-sans">
      <div className="bg-[#242424] p-10 rounded-[24px] w-full max-w-md shadow-2xl">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-[#A8E063] rounded-full flex items-center justify-center text-black font-[800] text-2xl mb-6">HS</div>
          <h1 className="text-2xl font-[800] text-white tracking-[0.1em] uppercase">HONEYSHIELD V2</h1>
        </div>

        {error && (
          <div className="bg-transparent border border-[#FF8C00] text-[#FF8C00] px-4 py-3 rounded-lg mb-6 text-sm font-bold text-center">
            Invalid credentials
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[#888888] text-xs font-[800] uppercase tracking-[0.1em] mb-2">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={e => { setUsername(e.target.value); setError(false); }}
              className="w-full bg-[#1A1A1A] border border-[#333] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#A8E063] transition-colors font-mono"
              required 
            />
          </div>
          <div>
            <label className="block text-[#888888] text-xs font-[800] uppercase tracking-[0.1em] mb-2">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={e => { setPassword(e.target.value); setError(false); }}
              className="w-full bg-[#1A1A1A] border border-[#333] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#A8E063] transition-colors font-mono"
              required 
            />
          </div>
          <button type="submit" className="w-full bg-[#A8E063] hover:bg-opacity-80 text-black font-bold py-4 rounded-lg transition-colors mt-4 text-sm uppercase tracking-widest">
            Login
          </button>
        </form>
      </div>
    </div>
  );
}

export default function HoneyShieldApp() {
  const [currentUser, setCurrentUser] = useState(null);
  
  const [data, setData] = useState({ 
    sessions: [], attackLog: [], honeyLog: [], alertLog: [], autoResponseLog: [], 
    metrics: { uptimeSeconds: 0, totalSessionsProcessed: 0, totalAttacksLogged: 0 } 
  });
  
  const [settings, setSettings] = useState({
    suspiciousThreshold: 36,
    attackerThreshold: 70,
    decayRate: "Normal",
    honeyInterval: 10,
    fakeFiles: FAKE_FILES_INITIAL,
    autoRules: {
      autoHoney: true,
      blockZeroDay: true,
      blockDDoS: true,
      deepTrapAlert: true,
      flagInsider: true
    }
  });

  const engineRef = useRef(null);

  useEffect(() => {
    if (!engineRef.current) {
      engineRef.current = new LiveDataEngine((newState) => {
        setData(newState);
      }, settings);
    }
    return () => {
      if (engineRef.current) engineRef.current.stop();
    };
  }, []);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'ATTACKER' && engineRef.current) {
        engineRef.current.registerAttackerSession();
      } else if (engineRef.current) {
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
      }
    }
  }, [currentUser]);

  if (!currentUser) {
    return <LoginPage onLogin={setCurrentUser} />;
  }

  if (currentUser.role === 'ATTACKER') {
    return <DeceptionDashboard engine={engineRef.current} onLogout={() => setCurrentUser(null)} />;
  }

  return (
    <AdminDashboard 
      data={data} 
      engine={engineRef.current} 
      settings={settings} 
      currentUser={currentUser} 
      onLogout={() => setCurrentUser(null)} 
    />
  );
}
