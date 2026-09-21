export const USERS = [
  { username: 'admin',    password: 'admin123',    role: 'ADMIN' },
  { username: 'user',     password: 'user123',     role: 'USER' },
  { username: 'testuser', password: 'testuser123', role: 'ATTACKER' },
]

export const ATTACK_TYPES = {
  BRUTE_FORCE:          { label:'Brute Force',          riskDelta:20, severity:'HIGH',     target:'Login Page' },
  CREDENTIAL_STUFFING:  { label:'Credential Stuffing',  riskDelta:18, severity:'HIGH',     target:'Auth Layer' },
  RECONNAISSANCE:       { label:'Reconnaissance',       riskDelta:10, severity:'LOW',      target:'All Areas' },
  ADMIN_INTRUSION:      { label:'Admin Intrusion',      riskDelta:25, severity:'CRITICAL', target:'Admin Panel' },
  DATA_EXFILTRATION:    { label:'Data Exfiltration',    riskDelta:30, severity:'CRITICAL', target:'Database' },
  BOT_ACTIVITY:         { label:'Bot Activity',         riskDelta:12, severity:'MEDIUM',   target:'API Gateway' },
  SESSION_HIJACKING:    { label:'Session Hijacking',    riskDelta:22, severity:'HIGH',     target:'Auth Layer' },
  PRIVILEGE_ESCALATION: { label:'Privilege Escalation', riskDelta:28, severity:'CRITICAL', target:'Admin Panel' },
  INSIDER_THREAT:       { label:'Insider Threat',       riskDelta:35, severity:'CRITICAL', target:'Internal Systems' },
  HONEY_INTERACTION:    { label:'Honey Interaction',    riskDelta:40, severity:'CRITICAL', target:'Deception Layer' },
  SQL_INJECTION:        { label:'SQL Injection',        riskDelta:26, severity:'CRITICAL', target:'Database Layer' },
  XSS_ATTACK:           { label:'XSS Attack',           riskDelta:18, severity:'HIGH',     target:'Frontend' },
  DDOS:                 { label:'DDoS / Volumetric',    riskDelta:15, severity:'HIGH',     target:'API Gateway' },
  API_ABUSE:            { label:'API Abuse',            riskDelta:14, severity:'MEDIUM',   target:'API Endpoints' },
  ZERO_DAY_EXPLOIT:     { label:'Zero-Day Exploit',     riskDelta:45, severity:'CRITICAL', target:'Core System' },
  MAN_IN_THE_MIDDLE:    { label:'Man-in-the-Middle',    riskDelta:32, severity:'CRITICAL', target:'Auth / TLS Layer' },
  DIRECTORY_TRAVERSAL:  { label:'Directory Traversal',  riskDelta:20, severity:'HIGH',     target:'File System' },
  COMMAND_INJECTION:    { label:'Command Injection',    riskDelta:38, severity:'CRITICAL', target:'Server Shell' },
}

export const HONEY_TARGET_MAP = {
  DATA_EXFILTRATION: 'financial_report_Q4.xlsx',
  RECONNAISSANCE: 'network_topology_diagram.pdf',
  COMMAND_INJECTION: '/bin/server_restart.sh',
  DIRECTORY_TRAVERSAL: '/var/log/system.log',
  SQL_INJECTION: '/api/database/query',
  XSS_ATTACK: '/input/search_field',
  CREDENTIAL_STUFFING: '/auth/login',
  PRIVILEGE_ESCALATION: '/admin/users',
  ADMIN_INTRUSION: '/admin/settings',
  API_ABUSE: '/api/endpoints',
  BRUTE_FORCE: '/auth/login',
  SESSION_HIJACKING: '/session/token',
  INSIDER_THREAT: '/internal/data',
  HONEY_INTERACTION: '/honey/trap',
  BOT_ACTIVITY: '/api/bot-check',
  ZERO_DAY_EXPLOIT: '/core/exploit',
  MAN_IN_THE_MIDDLE: '/tls/intercept',
  DDOS: '/api/flood',
}

export const FAKE_FILES = [
  { name:'payroll_2025.xlsx',               level:'CONFIDENTIAL', size:'2.4 MB',  type:'xlsx', action:'DATA_EXFILTRATION',   content:'Employee ID,Name,Salary,Account\n1001,John Smith,95000,****4521\n1002,Sarah Connor,87000,****8834\n1003,Mike Ross,102000,****2291' },
  { name:'employee_records_full.csv',        level:'CONFIDENTIAL', size:'890 KB',  type:'csv',  action:'DATA_EXFILTRATION',   content:'ID,Name,DOB,SSN,Email\n1,John Smith,1985-03-12,***-**-4521,jsmith@acme.com\n2,Sarah Connor,1990-07-24,***-**-8834,sconnor@acme.com' },
  { name:'network_topology_diagram.pdf',     level:'INTERNAL',     size:'3.1 MB',  type:'pdf',  action:'RECONNAISSANCE',      content:'NETWORK TOPOLOGY — CONFIDENTIAL\nGateway: 192.168.1.1\nDB Server: 192.168.1.50\nWeb Server: 192.168.1.51\nBackup: 192.168.1.100' },
  { name:'backup_encryption_keys.txt',       level:'CONFIDENTIAL', size:'12 KB',   type:'txt',  action:'DATA_EXFILTRATION',   content:'AES-256 BACKUP KEYS\nPrimary: a3f8c2d1e4b7f9a2c5d8e1f4a7b0c3d6\nSecondary: b4g9d3e2f5c8g0b3d6e9f2g5h8i1j4k7' },
  { name:'admin_credentials_backup.txt',     level:'CONFIDENTIAL', size:'4 KB',    type:'txt',  action:'CREDENTIAL_STUFFING', content:'ADMIN CREDENTIALS\nadmin: P@ssw0rd!2025\nroot: Sup3rS3cr3t!\ndb_admin: DBpa$$2025' },
  { name:'database_connection_strings.json', level:'CONFIDENTIAL', size:'8 KB',    type:'json', action:'SQL_INJECTION',       content:'{\n  "production": {\n    "host": "db.acmecorp.internal",\n    "port": 5432,\n    "user": "prod_admin",\n    "password": "Pr0d@dm1n2025"\n  }\n}' },
  { name:'vpn_config_files.zip',             level:'INTERNAL',     size:'45 MB',   type:'zip',  action:'DATA_EXFILTRATION',   content:'Archive contents (47 files):\n├── client.ovpn\n├── ca.crt\n├── client.crt\n├── client.key\n└── tls-auth.key' },
  { name:'financial_report_Q4.xlsx',         level:'INTERNAL',     size:'1.8 MB',  type:'xlsx', action:'DATA_EXFILTRATION',   content:'Q4 Financial Summary\nRevenue: $4,821,000\nExpenses: $3,102,000\nNet Profit: $1,719,000' },
]

export const FAKE_EMPLOYEES = [
  { id:'E001', name:'Sarah Connor',   role:'CEO',              email:'sconnor@acmecorp.com',   dept:'Executive', phone:'+1-555-0101' },
  { id:'E002', name:'John Smith',     role:'IT Administrator', email:'jsmith@acmecorp.com',    dept:'IT',        phone:'+1-555-0102' },
  { id:'E003', name:'Mike Ross',      role:'Finance Director', email:'mross@acmecorp.com',     dept:'Finance',   phone:'+1-555-0103' },
  { id:'E004', name:'Lisa Chen',      role:'HR Manager',       email:'lchen@acmecorp.com',     dept:'HR',        phone:'+1-555-0104' },
  { id:'E005', name:'David Park',     role:'DevOps Engineer',  email:'dpark@acmecorp.com',     dept:'Engineering',phone:'+1-555-0105' },
  { id:'E006', name:'Emma Wilson',    role:'Security Analyst', email:'ewilson@acmecorp.com',   dept:'Security',  phone:'+1-555-0106' },
  { id:'E007', name:'Tom Bradley',    role:'Sales Manager',    email:'tbradley@acmecorp.com',  dept:'Sales',     phone:'+1-555-0107' },
  { id:'E008', name:'Anna Martinez',  role:'Legal Counsel',    email:'amartinez@acmecorp.com', dept:'Legal',     phone:'+1-555-0108' },
  { id:'E009', name:'Chris Johnson',  role:'CTO',              email:'cjohnson@acmecorp.com',  dept:'Executive', phone:'+1-555-0109' },
  { id:'E010', name:'Rachel Green',   role:'Product Manager',  email:'rgreen@acmecorp.com',    dept:'Product',   phone:'+1-555-0110' },
]

export const FAKE_SERVERS = [
  { name:'DB-SERVER-01',     status:'Online',      cpu:34, mem:67, disk:45 },
  { name:'WEB-SERVER-02',    status:'Online',      cpu:52, mem:45, disk:62 },
  { name:'BACKUP-SERVER-03', status:'Maintenance', cpu:12, mem:89, disk:91 },
  { name:'AUTH-SERVER-04',   status:'Online',      cpu:28, mem:54, disk:38 },
]

export const FAKE_REPORTS = [
  { name:'Q4 Financial Summary',        size:'2.1 MB', date:'2026-01-15', content:'Q4 Financial Summary\n\nRevenue: $4,821,000\nExpenses: $3,102,000\nNet Profit: $1,719,000\n\nCONFIDENTIAL — AcmeCorp Internal' },
  { name:'Employee Performance Review', size:'890 KB', date:'2026-02-01', content:'Employee Performance Review 2025\n\nTotal Employees: 247\nAvg Rating: 3.8/5\nTop Performer: Sarah Connor (Executive)\n\nCONFIDENTIAL' },
  { name:'Network Audit Report',        size:'3.4 MB', date:'2026-02-14', content:'Network Security Audit Report\n\nVulnerabilities Found: 12\nCritical: 2\nHigh: 4\nMedium: 6\n\nREMEDIATION REQUIRED' },
  { name:'Security Compliance Report',  size:'1.2 MB', date:'2026-03-01', content:'Security Compliance Report\n\nISO 27001: Compliant\nGDPR: Compliant\nSOC 2: In Progress\n\nNext Audit: 2027-03-01' },
]

export const LOG_CONTENT = `[2026-04-26 05:12:43] INFO  GET /admin/users 200 OK
[2026-04-26 05:12:51] WARN  Failed login attempt from 192.168.1.102
[2026-04-26 05:13:02] ERROR Disk threshold exceeded 94%
[2026-04-26 05:13:18] INFO  POST /api/export/payroll 200 OK
[2026-04-26 05:13:45] WARN  Multiple failed attempts user=admin
[2026-04-26 05:14:01] INFO  Backup completed: 47 files archived
[2026-04-26 05:14:33] ERROR Auth timeout: session expired for user dpark
[2026-04-26 05:15:02] INFO  Database sync completed successfully`

export const ADMIN_NAV = [
  { id:'Overview',            label:'Overview' },
  { id:'Bridge Monitor',      label:'Bridge Monitor' },
  { id:'Active Sessions',     label:'Active Sessions' },
  { id:'Attack Intelligence', label:'Attack Intelligence' },
  { id:'Honey Activity',      label:'Honey Activity' },
  { id:'Honey Traps',         label:'Honey Traps' },
  { id:'Geo Map',             label:'Geo Map' },
  { id:'Heatmap',             label:'Heatmap' },
  { id:'Alert Center',        label:'Alert Center' },
  { id:'FP/FN Analysis',      label:'FP/FN Analysis' },
  { id:'AI Insights',         label:'AI Insights' },
  { id:'Data Vault',          label:'Data Vault' },
  { id:'Live Tracking',       label:'Live Tracking' },
  { id:'Blocked IPs',         label:'Blocked IPs' },
  { id:'Settings',            label:'Settings' },
]

export const USER_NAV = [
  { id:'Overview',   label:'Overview' },
  { id:'Data Vault', label:'Data Vault' },
]

export const DECEPTION_NAV = [
  { id:'Dashboard',          label:'Dashboard' },
  { id:'Database',           label:'Database' },
  { id:'My Files',           label:'My Files' },
  { id:'Employee Directory', label:'Employee Directory' },
  { id:'System Status',      label:'System Status' },
  { id:'Reports',            label:'Reports' },
  { id:'Settings',           label:'Settings' },
]
