import re

file_path = r"c:\Users\DELL\Desktop\Honey-Profile-Project\frontend\src\pages\HoneyShieldV2.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

new_dashboard = """function DeceptionDashboard({ engine, onLogout }) {
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
            <table className="w-full text-left text-sm border-collapse">
                <thead><tr className="border-b"><th className="p-2">Employee ID</th><th className="p-2">Name</th><th className="p-2">Salary</th><th className="p-2">Account Number</th></tr></thead>
                <tbody>
                    <tr className="border-b"><td className="p-2">EMP-001</td><td className="p-2">John Doe</td><td className="p-2">$120,000</td><td className="p-2">****4592</td></tr>
                    <tr className="border-b"><td className="p-2">EMP-002</td><td className="p-2">Jane Smith</td><td className="p-2">$135,000</td><td className="p-2">****8810</td></tr>
                    <tr className="border-b"><td className="p-2">EMP-003</td><td className="p-2">Bob Wilson</td><td className="p-2">$95,000</td><td className="p-2">****2234</td></tr>
                </tbody>
            </table>
        );
    } else if (ext === 'csv') {
        content = <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto">id,name,role,department,salary\\n1,Sarah Connor,CEO,Executive,250000\\n2,John Smith,IT Admin,IT,115000\\n3,Mike Ross,Finance Dir,Finance,180000</pre>;
    } else if (ext === 'txt') {
        content = <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto"># Admin Credentials Backup\\nadmin: $2b$12$e/aGfVw... (Hash)\\nroot: toor\\n\\n# AWS Keys\\nAWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE\\nAWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY</pre>;
    } else if (ext === 'json') {
        content = <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto">{{\\n  "production": {{\\n    "db_host": "db-prod.acmecorp.internal",\\n    "db_user": "admin_rw",\\n    "db_pass": "SuperSecretProdDBPass2025!"\\n  }}\\n}}</pre>;
    } else if (ext === 'pdf') {
        content = <div className="text-center space-y-4"><div className="animate-spin w-8 h-8 border-4 border-[#0052cc] border-t-transparent rounded-full mx-auto mb-2"></div><p>Rendering document...</p></div>;
        setTimeout(() => {
            setModalContent({ title: `Viewing: ${fileName}`, content: <div className="p-4"><h1 className="text-xl font-bold mb-4">Network Topology Diagram</h1><p className="text-gray-600">This document outlines the internal DMZ, core routing, and the firewall rules protecting the production database clusters. DO NOT DISTRIBUTE.</p></div> });
        }, 1500);
    } else if (ext === 'zip') {
        content = <div className="space-y-2"><p className="font-bold">Archive contents: 47 files</p><ul className="list-disc pl-5 text-sm text-gray-600"><li>vpn_cert.pem</li><li>client_config.ovpn</li><li>README.txt</li><li>...and 44 more files</li></ul></div>;
    } else {
        content = <p>Unknown file format</p>;
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
        <pre className="text-xs bg-gray-900 text-green-400 p-4 rounded overflow-auto whitespace-pre-wrap font-mono">
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
            <h1 className="text-3xl font-bold text-[#172b4d]">Welcome back, John Smith — IT Administrator</h1>
            <div className="grid grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded shadow border border-gray-200">
                <p className="text-gray-500 text-sm font-medium">Active Users</p>
                <p className="text-3xl font-bold text-[#0052cc] mt-2">142</p>
              </div>
              <div className="bg-white p-6 rounded shadow border border-gray-200">
                <p className="text-gray-500 text-sm font-medium">Server Uptime</p>
                <p className="text-3xl font-bold text-green-600 mt-2">99.7%</p>
              </div>
              <div className="bg-white p-6 rounded shadow border border-gray-200">
                <p className="text-gray-500 text-sm font-medium">Open Tickets</p>
                <p className="text-3xl font-bold text-amber-600 mt-2">23</p>
              </div>
              <div className="bg-white p-6 rounded shadow border border-gray-200">
                <p className="text-gray-500 text-sm font-medium">Storage Used</p>
                <p className="text-3xl font-bold text-[#172b4d] mt-2">847 GB</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded shadow border border-gray-200">
              <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
              <div className="space-y-4">
                <div className="flex gap-4 items-start"><div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div><div><p className="font-medium text-sm">File accessed: payroll_2025.xlsx</p><p className="text-xs text-gray-500">2 mins ago</p></div></div>
                <div className="flex gap-4 items-start"><div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div><div><p className="font-medium text-sm">Login from 192.168.1.45</p><p className="text-xs text-gray-500">14 mins ago</p></div></div>
                <div className="flex gap-4 items-start"><div className="w-2 h-2 rounded-full bg-purple-500 mt-2"></div><div><p className="font-medium text-sm">Backup completed successfully</p><p className="text-xs text-gray-500">1 hour ago</p></div></div>
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
            <h2 className="text-2xl font-bold text-[#172b4d] mb-6">Corporate File Repository</h2>
            <div className="grid grid-cols-4 gap-6">
              {files.map(f => (
                <div key={f.name} className="bg-white p-4 rounded shadow border border-gray-200 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <FolderOpen size={32} className="text-[#0052cc]"/>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded ${f.type === 'CONFIDENTIAL' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>{f.type}</span>
                  </div>
                  <h3 className="font-semibold text-sm truncate mb-1" title={f.name}>{f.name}</h3>
                  <p className="text-xs text-gray-500 mb-4">{f.size} • Modified {f.date}</p>
                  <div className="mt-auto flex gap-2">
                    <button onClick={() => handleDownload(f.name)} className="flex-1 bg-[#0052cc] hover:bg-[#0747a6] text-white text-xs py-1.5 rounded transition-colors text-center">Download</button>
                    <button onClick={() => handleFileView(f.name)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs py-1.5 rounded transition-colors text-center">View</button>
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
              <h2 className="text-2xl font-bold text-[#172b4d]">Employee Directory</h2>
              <input type="text" placeholder="Search employees..." onKeyDown={handleSearchSubmit} onChange={() => handleInputChange('employee_search')} className="border p-2 rounded w-64 text-sm" />
            </div>
            <div className="bg-white rounded shadow border border-gray-200 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr><th className="p-3">Name</th><th className="p-3">Role</th><th className="p-3">Email</th><th className="p-3">Dept</th><th className="p-3">Phone</th><th className="p-3"></th></tr>
                </thead>
                <tbody>
                  {employees.map(e => (
                    <tr key={e.name} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{e.name}</td>
                      <td className="p-3 text-gray-600">{e.role}</td>
                      <td className="p-3 text-blue-600">{e.email}</td>
                      <td className="p-3 text-gray-600">{e.dept}</td>
                      <td className="p-3 text-gray-600">{e.phone}</td>
                      <td className="p-3"><button onClick={() => { handleFileView(e.name + "_profile.pdf"); }} className="text-[#0052cc] hover:underline text-xs font-semibold">View Profile</button></td>
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
            <h2 className="text-2xl font-bold text-[#172b4d] mb-6">Infrastructure Status</h2>
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-4 rounded shadow border border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Total CPU Usage</p>
                <div className="flex items-end gap-2"><span className="text-2xl font-bold">34%</span><span className="text-sm text-green-500 mb-1">Normal</span></div>
                <div className="w-full bg-gray-200 h-2 mt-3 rounded"><div className="bg-blue-500 h-full rounded" style={{width: '34%'}}></div></div>
              </div>
              <div className="bg-white p-4 rounded shadow border border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Memory Allocation</p>
                <div className="flex items-end gap-2"><span className="text-2xl font-bold">67%</span><span className="text-sm text-amber-500 mb-1">Elevated</span></div>
                <div className="w-full bg-gray-200 h-2 mt-3 rounded"><div className="bg-amber-500 h-full rounded" style={{width: '67%'}}></div></div>
              </div>
              <div className="bg-white p-4 rounded shadow border border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Disk Space</p>
                <div className="flex items-end gap-2"><span className="text-2xl font-bold">52%</span><span className="text-sm text-green-500 mb-1">Stable</span></div>
                <div className="w-full bg-gray-200 h-2 mt-3 rounded"><div className="bg-green-500 h-full rounded" style={{width: '52%'}}></div></div>
              </div>
            </div>
            
            <h3 className="font-bold text-lg mb-4">Active Servers</h3>
            <div className="space-y-4">
              {[
                { name: "DB-SERVER-01", ip: "10.0.1.5", status: "Online", color: "green" },
                { name: "WEB-SERVER-02", ip: "10.0.1.12", status: "Online", color: "green" },
                { name: "BACKUP-SERVER-03", ip: "10.0.1.88", status: "Maintenance", color: "amber" }
              ].map(s => (
                <div key={s.name} className="bg-white p-4 rounded shadow border border-gray-200 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full bg-${s.color}-500`}></div>
                    <div>
                      <p className="font-bold">{s.name}</p>
                      <p className="text-xs text-gray-500 font-mono">{s.ip}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleViewLogs(s.name)} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50 text-gray-700">View Logs</button>
                    <button onClick={() => handleRestart(s.name)} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded text-sm font-medium">Restart Server</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case "Reports":
        return (
          <div className="space-y-6">
             <h2 className="text-2xl font-bold text-[#172b4d] mb-6">Generated Reports</h2>
             <div className="space-y-3">
               {["Q4 Financial Summary", "Employee Performance Review", "Network Audit Report", "Security Compliance Report"].map(r => (
                 <div key={r} className="bg-white p-4 rounded shadow border border-gray-200 flex justify-between items-center">
                   <div className="flex items-center gap-3">
                     <FileText className="text-[#0052cc]"/>
                     <span className="font-medium">{r}</span>
                   </div>
                   <button onClick={() => handleDownload(r + ".pdf")} className="text-[#0052cc] hover:underline text-sm font-medium">Download PDF</button>
                 </div>
               ))}
             </div>
          </div>
        );
      case "Settings":
        return (
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold text-[#172b4d] mb-6">Account Settings</h2>
            <div className="bg-white p-6 rounded shadow border border-gray-200 space-y-6">
              <div>
                <h3 className="font-bold mb-4 border-b pb-2">Profile Information</h3>
                <div className="space-y-4">
                  <div><label className="block text-sm text-gray-600 mb-1">Full Name</label><input type="text" defaultValue="John Smith" readOnly className="w-full border p-2 rounded bg-gray-50" /></div>
                  <div><label className="block text-sm text-gray-600 mb-1">Email</label><input type="email" defaultValue="j.smith@acmecorp.internal" readOnly className="w-full border p-2 rounded bg-gray-50" /></div>
                  <div><label className="block text-sm text-gray-600 mb-1">Department</label><input type="text" defaultValue="IT" readOnly className="w-full border p-2 rounded bg-gray-50" /></div>
                </div>
              </div>
              <div>
                <h3 className="font-bold mb-4 border-b pb-2">Change Password</h3>
                <form className="space-y-4" onSubmit={handlePasswordSubmit}>
                  <div><label className="block text-sm text-gray-600 mb-1">Current Password</label><input type="password" onChange={() => handleInputChange("password_input_1")} className="w-full border p-2 rounded focus:outline-blue-500" /></div>
                  <div><label className="block text-sm text-gray-600 mb-1">New Password</label><input type="password" onChange={() => handleInputChange("password_input_2")} className="w-full border p-2 rounded focus:outline-blue-500" /></div>
                  <button type="submit" className="bg-[#0052cc] hover:bg-[#0747a6] text-white px-4 py-2 rounded">Update Password</button>
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
    <div className="flex h-screen w-full bg-[#f4f5f7] text-[#172b4d] font-sans relative">
      {/* Loading Overlay */}
      {loadingAction && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in-95">
                <div className="animate-spin w-10 h-10 border-4 border-[#0052cc] border-t-transparent rounded-full"></div>
                <p className="font-medium text-[#172b4d]">{loadingAction}</p>
            </div>
        </div>
      )}

      {/* Custom Modal */}
      {modalContent && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-8">
            <div className="bg-white rounded shadow-2xl max-w-4xl w-full flex flex-col max-h-[80vh] overflow-hidden animate-in zoom-in-95">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-lg text-[#172b4d]">{modalContent.title}</h3>
                    <button onClick={() => setModalContent(null)} className="p-1 hover:bg-gray-200 rounded text-gray-500"><X size={20}/></button>
                </div>
                <div className="p-6 overflow-auto">
                    {modalContent.content}
                </div>
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                    <button onClick={() => setModalContent(null)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium text-gray-700">Close</button>
                </div>
            </div>
        </div>
      )}

      <div className="w-64 bg-[#0747a6] flex flex-col shadow-lg text-white shrink-0">
        <div className="p-6 font-bold text-xl border-b border-white/20">
          AcmeCorp Internal
        </div>
        <div className="p-4 space-y-2 flex-1">
          {navItems.map(item => (
            <button 
              key={item.name} 
              onClick={() => handleNav(item.name)} 
              className={`w-full text-left p-2 rounded flex items-center gap-3 transition-colors ${activeTab === item.name ? 'bg-white/20 font-bold' : 'hover:bg-white/10'}`}
            >
              <item.icon size={18}/> {item.name}
            </button>
          ))}
        </div>
        <button onClick={onLogout} className="p-4 hover:bg-red-600 flex items-center gap-3 border-t border-white/20 transition-colors"><LogOut size={18}/> Secure Logout</button>
      </div>
      <div className="flex-1 p-8 overflow-auto">
        {renderContent()}
      </div>

      {toastMessage && (
        <div className="absolute bottom-6 right-6 bg-gray-900 text-white px-4 py-3 rounded shadow-xl flex items-center gap-3 animate-in slide-in-from-bottom-5 z-40">
          <ShieldCheck size={18} className="text-green-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}"""

content = re.sub(
    r"function DeceptionDashboard\(\{ engine, onLogout \}\) \{.*?  \);\n\}",
    new_dashboard,
    content,
    flags=re.DOTALL
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Patch applied for DeceptionDashboard.")
