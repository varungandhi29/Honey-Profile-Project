import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LogOut, Folder, Users, Server, FileText, Settings, Download, Search, AlertCircle, Activity, Database } from 'lucide-react';
import { DECEPTION_NAV, FAKE_FILES, FAKE_EMPLOYEES, FAKE_SERVERS, FAKE_REPORTS, LOG_CONTENT } from '../engine/constants';

// ============================================================================
// FAKE PAGES COMPONENTS
// ============================================================================

const FakeDashboard = ({ triggerAttack, addToast }) => {
  const [searchVal, setSearchVal] = useState('')
  const [searched, setSearched] = useState(false)
  const searchTriggered = useRef(false)

  const handleSearch = (e) => {
    e.preventDefault()
    triggerAttack('SQL_INJECTION')
    setSearched(true)
    addToast('Search completed — 0 results found', 'success')
  }

  const handleSearchChange = (val) => {
    setSearchVal(val)
    if (!searchTriggered.current) {
      triggerAttack('XSS_ATTACK')
      searchTriggered.current = true
    }
  }

  return (
    <div>
      {/* Welcome card */}
      <div style={{ background:'#161B22', borderRadius:'12px', padding:'20px', marginBottom:'16px', border:'1px solid #30363D' }}>
        <h2 style={{ color:'#E6EDF3', margin:'0 0 4px' }}>Welcome back, John Smith</h2>
        <p style={{ color:'#8B949E', margin:0, fontSize:'13px' }}>IT Administrator · Last login: Today 09:14 AM</p>
      </div>

      {/* Search bar — triggers SQL_INJECTION + XSS */}
      <form onSubmit={handleSearch} style={{ display:'flex', gap:'8px', marginBottom:'20px' }}>
        <input
          value={searchVal}
          onChange={e => handleSearchChange(e.target.value)}
          placeholder="Search files, employees, reports..."
          style={{ flex:1, padding:'10px 14px', background:'#161B22', border:'1px solid #30363D', borderRadius:'8px', color:'#E6EDF3', fontSize:'13px', outline:'none' }}
          onFocus={e => e.target.style.borderColor = '#00FF88'}
          onBlur={e => e.target.style.borderColor = '#30363D'}
        />
        <button type="submit"
          style={{ padding:'10px 20px', background:'#00FF88', color:'#0D1117', border:'none', borderRadius:'8px', fontWeight:700, cursor:'pointer' }}>
          Search
        </button>
      </form>

      {/* 4 metric cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'16px' }}>
        {[
          ['👥','Active Users','142'],
          ['🖥','Server Uptime','99.7%'],
          ['🎫','Open Tickets','23'],
          ['💾','Storage Used','847 GB']
        ].map(([icon,label,val]) => (
          <div key={label} style={{ background:'#161B22', borderRadius:'12px', padding:'16px', border:'1px solid #30363D', textAlign:'center', cursor:'pointer' }}
            onClick={() => triggerAttack('RECONNAISSANCE')}
            onMouseEnter={e => e.currentTarget.style.borderColor='rgba(0,255,136,0.4)'}
            onMouseLeave={e => e.currentTarget.style.borderColor='#30363D'}>
            <div style={{ fontSize:'24px', marginBottom:'6px' }}>{icon}</div>
            <div style={{ color:'#E6EDF3', fontSize:'20px', fontWeight:700 }}>{val}</div>
            <div style={{ color:'#8B949E', fontSize:'11px' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div style={{ background:'#161B22', borderRadius:'12px', padding:'20px', border:'1px solid #30363D' }}>
        <h3 style={{ color:'#E6EDF3', margin:'0 0 14px', fontSize:'14px', fontWeight:700 }}>Recent Activity</h3>
        {[
          'File accessed: payroll_2025.xlsx',
          'Login from 192.168.1.45',
          'Backup completed successfully',
          'Report generated: Q4 Financial',
          'User profile updated: jsmith'
        ].map((item, i) => (
          <div key={i}
            style={{ padding:'9px 0', borderBottom: i < 4 ? '1px solid #21262D' : 'none', color:'#8B949E', fontSize:'13px', cursor:'pointer' }}
            onClick={() => triggerAttack('RECONNAISSANCE')}
            onMouseEnter={e => e.currentTarget.style.color='#E6EDF3'}
            onMouseLeave={e => e.currentTarget.style.color='#8B949E'}>
            <span style={{ color:'#00FF88', marginRight:'8px' }}>●</span>{item}
          </div>
        ))}
      </div>
    </div>
  )
}

const FakeDatabase = ({ triggerAttack, addToast, downloadFile }) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [running, setRunning] = useState(false)
  const queryTriggered = useRef(false)

  const FAKE_TABLES = ['users', 'employees', 'financial_records', 'admin_logs', 'api_keys', 'sessions', 'backups']

  const MOCK_DB = {
    users: [
      { id: 1, username: 'admin', password: '$2b$10$h7X3kP8y...[redacted]', email: 'admin@acmecorp.com', role: 'ADMIN', last_login: '2026-04-26 09:14:22' },
      { id: 2, username: 'jsmith', password: '$2b$10$9sA2mD7f...[redacted]', email: 'jsmith@acmecorp.com', role: 'USER', last_login: '2026-04-26 08:30:11' },
      { id: 3, username: 'sconnor', password: '$2b$10$2lK8jF5h...[redacted]', email: 'sconnor@acmecorp.com', role: 'CEO', last_login: '2026-04-25 16:45:00' },
      { id: 4, username: 'mross', password: '$2b$10$8jH5kS4d...[redacted]', email: 'mross@acmecorp.com', role: 'USER', last_login: '2026-04-26 09:02:15' },
      { id: 5, username: 'lchen', password: '$2b$10$5hG4fD3s...[redacted]', email: 'lchen@acmecorp.com', role: 'HR', last_login: '2026-04-26 07:15:30' },
      { id: 6, username: 'dpark', password: '$2b$10$3kD9sA2f...[redacted]', email: 'dpark@acmecorp.com', role: 'DEVOPS', last_login: '2026-04-26 09:10:00' },
      { id: 7, username: 'ewilson', password: '$2b$10$1fJ8hG6d...[redacted]', email: 'ewilson@acmecorp.com', role: 'SECURITY', last_login: '2026-04-26 08:45:12' },
      { id: 8, username: 'tbradley', password: '$2b$10$0hK7fD4s...[redacted]', email: 'tbradley@acmecorp.com', role: 'SALES', last_login: '2026-04-25 17:30:00' },
      { id: 9, username: 'amartinez', password: '$2b$10$9gH5fS3d...[redacted]', email: 'amartinez@acmecorp.com', role: 'LEGAL', last_login: '2026-04-25 15:20:00' },
      { id: 10, username: 'cjohnson', password: '$2b$10$2kD8sA1f...[redacted]', email: 'cjohnson@acmecorp.com', role: 'CTO', last_login: '2026-04-26 09:12:00' },
      { id: 11, username: 'rgreen', password: '$2b$10$4jH7kS5d...[redacted]', email: 'rgreen@acmecorp.com', role: 'PRODUCT', last_login: '2026-04-26 08:10:22' },
      { id: 12, username: 'tstark', password: '$2b$10$7sA8mD2f...[redacted]', email: 'tstark@acmecorp.com', role: 'GUEST', last_login: '2026-04-24 11:30:45' },
      { id: 13, username: 'bbanner', password: '$2b$10$3lK5jF9h...[redacted]', email: 'bbanner@acmecorp.com', role: 'RESEARCH', last_login: '2026-04-23 14:15:00' },
      { id: 14, username: 'natasha', password: '$2b$10$0hG2fD8s...[redacted]', email: 'nromanoff@acmecorp.com', role: 'AGENT', last_login: '2026-04-26 06:12:34' },
      { id: 15, username: 'thor', password: '$2b$10$9sD2mA6f...[redacted]', email: 'thor@acmecorp.com', role: 'USER', last_login: '2026-04-22 10:05:00' }
    ],
    employees: [
      { id: 1, name: 'Sarah Connor', role: 'CEO', email: 'sconnor@acmecorp.com', dept: 'Executive', phone: '+1-555-0101' },
      { id: 2, name: 'John Smith', role: 'IT Administrator', email: 'jsmith@acmecorp.com', dept: 'IT', phone: '+1-555-0102' },
      { id: 3, name: 'Mike Ross', role: 'Finance Director', email: 'mross@acmecorp.com', dept: 'Finance', phone: '+1-555-0103' },
      { id: 4, name: 'Lisa Chen', role: 'HR Manager', email: 'lchen@acmecorp.com', dept: 'HR', phone: '+1-555-0104' },
      { id: 5, name: 'David Park', role: 'DevOps Engineer', email: 'dpark@acmecorp.com', dept: 'Engineering', phone: '+1-555-0105' },
      { id: 6, name: 'Emma Wilson', role: 'Security Analyst', email: 'ewilson@acmecorp.com', dept: 'Security', phone: '+1-555-0106' },
      { id: 7, name: 'Tom Bradley', role: 'Sales Manager', email: 'tbradley@acmecorp.com', dept: 'Sales', phone: '+1-555-0107' },
      { id: 8, name: 'Anna Martinez', role: 'Legal Counsel', email: 'amartinez@acmecorp.com', dept: 'Legal', phone: '+1-555-0108' },
      { id: 9, name: 'Chris Johnson', role: 'CTO', email: 'cjohnson@acmecorp.com', dept: 'Executive', phone: '+1-555-0109' },
      { id: 10, name: 'Rachel Green', role: 'Product Manager', email: 'rgreen@acmecorp.com', dept: 'Product', phone: '+1-555-0110' },
      { id: 11, name: 'Steve Rogers', role: 'Security Specialist', email: 'srogers@acmecorp.com', dept: 'Security', phone: '+1-555-0111' },
      { id: 12, name: 'Bruce Banner', role: 'Lead Researcher', email: 'bbanner@acmecorp.com', dept: 'R&D', phone: '+1-555-0112' },
      { id: 13, name: 'Clint Barton', role: 'Logistics Manager', email: 'cbarton@acmecorp.com', dept: 'Operations', phone: '+1-555-0113' },
      { id: 14, name: 'Wanda Maximoff', role: 'UX Designer', email: 'wmaximoff@acmecorp.com', dept: 'Product', phone: '+1-555-0114' },
      { id: 15, name: 'Peter Parker', role: 'IT Intern', email: 'pparker@acmecorp.com', dept: 'IT', phone: '+1-555-0115' }
    ],
    financial_records: [
      { id: 1, period: '2025-Q1', revenue: '$4,120,000', expenses: '$2,850,000', net_profit: '$1,270,000', status: 'Audited' },
      { id: 2, period: '2025-Q2', revenue: '$4,350,000', expenses: '$2,990,000', net_profit: '$1,360,000', status: 'Audited' },
      { id: 3, period: '2025-Q3', revenue: '$4,610,000', expenses: '$3,050,000', net_profit: '$1,560,000', status: 'Audited' },
      { id: 4, period: '2025-Q4', revenue: '$4,821,000', expenses: '$3,102,000', net_profit: '$1,719,000', status: 'Audited' },
      { id: 5, period: '2026-Q1', revenue: '$5,100,000', expenses: '$3,400,000', net_profit: '$1,700,000', status: 'Pending' },
      { id: 6, period: '2026-M01', revenue: '$1,650,000', expenses: '$1,100,000', net_profit: '$550,000', status: 'Approved' },
      { id: 7, period: '2026-M02', revenue: '$1,700,000', expenses: '$1,120,000', net_profit: '$580,000', status: 'Approved' },
      { id: 8, period: '2026-M03', revenue: '$1,750,000', expenses: '$1,180,000', net_profit: '$570,000', status: 'Approved' },
      { id: 9, period: '2026-M04', revenue: '$1,800,000', expenses: '$1,210,000', net_profit: '$590,000', status: 'Draft' }
    ],
    admin_logs: [
      { id: 1, timestamp: '2026-04-26 09:14:22', user: 'admin', ip: '192.168.1.45', action: 'User login' },
      { id: 2, timestamp: '2026-04-26 09:10:05', user: 'dpark', ip: '192.168.1.12', action: 'Deploy service-web v2.4.1' },
      { id: 3, timestamp: '2026-04-26 08:45:12', user: 'ewilson', ip: '192.168.1.88', action: 'Security scan completed' },
      { id: 4, timestamp: '2026-04-26 08:30:11', user: 'jsmith', ip: '192.168.1.23', action: 'User login' },
      { id: 5, timestamp: '2026-04-26 07:15:30', user: 'lchen', ip: '192.168.1.5', action: 'Updated payroll_2025.xlsx' },
      { id: 6, timestamp: '2026-04-26 05:12:43', user: 'system', ip: '127.0.0.1', action: 'Cron job: session cleanup' },
      { id: 7, timestamp: '2026-04-25 16:45:00', user: 'sconnor', ip: '192.168.1.99', action: 'User login' }
    ],
    api_keys: [
      { id: 1, name: 'payment-gateway-prod', api_key: 'sk_live_51N...[redacted]', status: 'Active', created_by: 'cjohnson' },
      { id: 2, name: 'sendgrid-api-key', api_key: 'SG.yR2x...[redacted]', status: 'Active', created_by: 'dpark' },
      { id: 3, name: 'aws-s3-backup-bucket', api_key: 'AKIAIOSFODNN7EXAMPLE', status: 'Active', created_by: 'dpark' },
      { id: 4, name: 'slack-webhook-alerts', api_key: 'hooks.slack.com/services/...[redacted]', status: 'Active', created_by: 'ewilson' },
      { id: 5, name: 'github-oauth-token', api_key: 'ghp_1f2...[redacted]', status: 'Revoked', created_by: 'jsmith' }
    ],
    sessions: [
      { id: 1, session_token: 'sess_9sA2mD...[redacted]', username: 'admin', ip: '192.168.1.45', status: 'Active' },
      { id: 2, session_token: 'sess_3kD9sA...[redacted]', username: 'dpark', ip: '192.168.1.12', status: 'Active' },
      { id: 3, session_token: 'sess_1fJ8hG...[redacted]', username: 'ewilson', ip: '192.168.1.88', status: 'Active' },
      { id: 4, session_token: 'sess_9sD2mA...[redacted]', username: 'jsmith', ip: '192.168.1.23', status: 'Idle' },
      { id: 5, session_token: 'sess_0hG2fD...[redacted]', username: 'lchen', ip: '192.168.1.5', status: 'Expired' }
    ],
    backups: [
      { id: 1, archive_name: 'prod_db_backup_20260425.tar.gz', size: '12.4 GB', path: '/backups/db/', status: 'Verified' },
      { id: 2, archive_name: 'web_assets_backup_20260424.tar.gz', size: '45.1 GB', path: '/backups/web/', status: 'Verified' },
      { id: 3, archive_name: 'config_files_backup_20260426.tar.gz', size: '1.2 MB', path: '/backups/config/', status: 'Pending' }
    ]
  }

  const handleQueryChange = (val) => {
    setQuery(val)
    if (!queryTriggered.current && val.length > 0) {
      triggerAttack('XSS_ATTACK')
      queryTriggered.current = true
    }
  }

  const handleRunQuery = () => {
    if (!query.trim()) return
    triggerAttack('SQL_INJECTION')
    triggerAttack('HONEY_INTERACTION')
    setRunning(true)

    // Simple table parser to match tables from MOCK_DB
    let matchedTable = 'users' // Default fallback
    const normalizedQuery = query.toLowerCase()
    for (const table of FAKE_TABLES) {
      if (normalizedQuery.includes(table)) {
        matchedTable = table
        break
      }
    }

    const matchedRows = MOCK_DB[matchedTable] || MOCK_DB.users

    setTimeout(() => {
      setResults({
        rows: matchedRows,
        query,
        rowCount: matchedRows.length,
        executionTime: `${(Math.random() * 0.005 + 0.001).toFixed(3)}s`
      })
      setRunning(false)
      addToast(`✅ Query executed — ${matchedRows.length} rows returned`)
    }, 800)
  }

  const handleExportResults = () => {
    if (!results || results.rows.length === 0) return
    triggerAttack('DATA_EXFILTRATION')
    
    const headers = Object.keys(results.rows[0])
    const csvContent = [
      headers.join(','),
      ...results.rows.map(row => 
        headers.map(header => {
          const val = row[header] !== undefined && row[header] !== null ? String(row[header]) : ''
          // Escape quotes in CSV if commas, quotes, or newlines exist
          if (val.includes(',') || val.includes('"') || val.includes('\n')) {
            return `"${val.replace(/"/g, '""')}"`
          }
          return val
        }).join(',')
      )
    ].join('\n')

    downloadFile('query_results.csv', csvContent)
    addToast('✅ Query results exported to CSV')
  }

  const handleTableClick = (table) => {
    triggerAttack('RECONNAISSANCE')
    setQuery(`SELECT * FROM ${table} LIMIT 100;`)
    queryTriggered.current = false
  }

  const handleDropTable = (table) => {
    triggerAttack('COMMAND_INJECTION')
    triggerAttack('INSIDER_THREAT')
    addToast(`⚠️ DROP TABLE ${table} requires elevated privileges`, 'error')
  }

  return (
    <div>
      <h2 style={{ color:'#E6EDF3', marginBottom:'20px' }}>Database Console</h2>
      <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:'16px' }}>
        {/* Table list */}
        <div style={{ background:'#161B22', borderRadius:'12px', border:'1px solid #30363D', padding:'12px' }}>
          <div style={{ color:'#8B949E', fontSize:'11px', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>Tables</div>
          {FAKE_TABLES.map(table => (
            <div key={table}
              style={{ padding:'7px 10px', borderRadius:'6px', cursor:'pointer', fontSize:'12px', color:'#E6EDF3', marginBottom:'2px', display:'flex', justifyContent:'space-between', alignItems:'center' }}
              onMouseEnter={e => e.currentTarget.style.background='#21262D'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}>
              <span onClick={() => handleTableClick(table)}>🗄 {table}</span>
              <button onClick={() => handleDropTable(table)}
                style={{ background:'none', border:'none', color:'#FF4444', fontSize:'11px', cursor:'pointer', opacity:0.6, padding:'0 2px' }}>
                🗑️
              </button>
            </div>
          ))}
        </div>
        {/* Query Area */}
        <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
          <div style={{ background:'#161B22', borderRadius:'12px', border:'1px solid #30363D', padding:'16px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
              <span style={{ color:'#8B949E', fontSize:'12px' }}>SQL Query Editor</span>
              <button onClick={handleRunQuery} disabled={running}
                style={{ padding:'6px 16px', background:'#00FF88', color:'#0D1117', border:'none', borderRadius:'6px', fontWeight:700, cursor:'pointer' }}>
                {running ? '⏳ Executing...' : '⚡ Run Query'}
              </button>
            </div>
            <textarea value={query} onChange={e => handleQueryChange(e.target.value)}
              placeholder="SELECT * FROM users;"
              style={{ width:'100%', height:'80px', background:'#0D1117', border:'1px solid #30363D', borderRadius:'8px', color:'#00FF88', fontFamily:'monospace', padding:'10px', boxSizing:'border-box', outline:'none', resize:'none' }}
            />
          </div>
          {results && results.rows.length > 0 && (
            <div style={{ background:'#161B22', borderRadius:'12px', border:'1px solid #30363D', padding:'16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
                <span style={{ color:'#8B949E', fontSize:'12px' }}>Query Results ({results.rowCount} rows in {results.executionTime})</span>
                <button onClick={handleExportResults}
                  style={{ padding:'6px 12px', background:'#21262D', color:'#E6EDF3', border:'1px solid #30363D', borderRadius:'6px', fontSize:'12px', cursor:'pointer' }}>
                  📤 Export CSV
                </button>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px', color:'#C9D1D9', textAlign:'left' }}>
                  <thead>
                    <tr style={{ color:'#8B949E', borderBottom:'1px solid #30363D' }}>
                      {Object.keys(results.rows[0] || {}).map(key => (
                        <th key={key} style={{ padding:'6px', textTransform:'capitalize' }}>{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.rows.map((r, i) => (
                      <tr key={i} style={{ borderBottom:'1px solid #21262D' }}>
                        {Object.entries(r).map(([key, val], idx) => (
                          <td key={idx} style={{ 
                            padding:'8px 6px', 
                            color: key === 'id' ? '#00FF88' : '#C9D1D9', 
                            fontFamily: ['id', 'password', 'api_key', 'session_token'].includes(key) ? 'monospace' : 'inherit' 
                          }}>
                            {val}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const FakeFiles = ({ triggerAttack, addToast, downloadFile, setModal }) => {
  const [downloading, setDownloading] = useState({})
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const searchTriggered = useRef(false)

  const handleSearchChange = (val) => {
    setSearch(val)
    if (!searchTriggered.current && val.length > 0) {
      triggerAttack('XSS_ATTACK')
      searchTriggered.current = true
    }
  }

  const handleFilterClick = (level) => {
    triggerAttack('SQL_INJECTION')
    setFilter(level)
  }

  const handleDownload = (file) => {
    triggerAttack(file.action)
    triggerAttack('HONEY_INTERACTION')
    setDownloading(prev => ({ ...prev, [file.name]: true }))
    setTimeout(() => {
      downloadFile(file.name, file.content)
      setDownloading(prev => ({ ...prev, [file.name]: false }))
      addToast(`✅ ${file.name} downloaded successfully`)
    }, 1500)
  }

  const handleView = (file) => {
    triggerAttack('RECONNAISSANCE')
    triggerAttack('HONEY_INTERACTION')
    setModal({ type: 'file', data: file })
  }

  const filtered = FAKE_FILES.filter(f => {
    const matchSearch = f.name.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'ALL' || f.level === filter
    return matchSearch && matchFilter
  })

  const levelColor = { CONFIDENTIAL:'#FF4444', INTERNAL:'#FFC107', PUBLIC:'#00FF88' }
  const levelBg = { CONFIDENTIAL:'rgba(255,68,68,0.1)', INTERNAL:'rgba(255,193,7,0.1)', PUBLIC:'rgba(0,255,136,0.1)' }
  const fileIcon = { xlsx:'📊', csv:'📋', pdf:'📄', json:'🔧', zip:'🗜️', txt:'📝' }

  return (
    <div>
      <h2 style={{ color:'#E6EDF3', marginBottom:'20px' }}>My Files</h2>

      {/* Search + Filter */}
      <div style={{ display:'flex', gap:'10px', marginBottom:'20px', flexWrap:'wrap' }}>
        <input
          value={search}
          onChange={e => handleSearchChange(e.target.value)}
          placeholder="Search files..."
          style={{ flex:1, minWidth:'200px', padding:'9px 14px', background:'#161B22', border:'1px solid #30363D', borderRadius:'8px', color:'#E6EDF3', fontSize:'13px', outline:'none' }}
          onFocus={e => e.target.style.borderColor='#00FF88'}
          onBlur={e => e.target.style.borderColor='#30363D'}
        />
        {['ALL','CONFIDENTIAL','INTERNAL'].map(level => (
          <button key={level} onClick={() => handleFilterClick(level)}
            style={{ padding:'8px 14px', background: filter===level?'#00FF88':'#161B22', color: filter===level?'#0D1117':'#8B949E', border:'1px solid #30363D', borderRadius:'8px', fontSize:'12px', cursor:'pointer', fontWeight: filter===level?700:400 }}>
            {level}
          </button>
        ))}
      </div>

      {/* File grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(230px,1fr))', gap:'16px' }}>
        {filtered.map(file => (
          <div key={file.name}
            style={{ background:'#161B22', border:'1px solid #30363D', borderRadius:'12px', padding:'20px', transition:'border-color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor='rgba(0,255,136,0.4)'}
            onMouseLeave={e => e.currentTarget.style.borderColor='#30363D'}>
            <div style={{ fontSize:'32px', marginBottom:'8px' }}>{fileIcon[file.type] || '📄'}</div>
            <div style={{ color:'#E6EDF3', fontSize:'13px', fontWeight:600, marginBottom:'4px', wordBreak:'break-all' }}>{file.name}</div>
            <div style={{ color:'#8B949E', fontSize:'11px', marginBottom:'10px' }}>{file.size} · Modified today</div>
            <span style={{ fontSize:'10px', padding:'3px 8px', borderRadius:'4px', background:levelBg[file.level]||levelBg.INTERNAL, color:levelColor[file.level]||'#FFC107', fontWeight:600 }}>
              {file.level}
            </span>
            <div style={{ display:'flex', gap:'8px', marginTop:'14px' }}>
              <button
                onClick={() => handleDownload(file)}
                disabled={!!downloading[file.name]}
                style={{ flex:1, padding:'8px', background:downloading[file.name]?'#21262D':'#00FF88', color:downloading[file.name]?'#8B949E':'#0D1117', border:'none', borderRadius:'6px', fontSize:'12px', fontWeight:700, cursor:downloading[file.name]?'wait':'pointer', transition:'all 0.2s' }}>
                {downloading[file.name] ? '⏳ Downloading...' : '⬇ Download'}
              </button>
              <button
                onClick={() => handleView(file)}
                style={{ flex:1, padding:'8px', background:'#21262D', color:'#E6EDF3', border:'1px solid #30363D', borderRadius:'6px', fontSize:'12px', cursor:'pointer' }}>
                👁 View
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const FakeDirectory = ({ triggerAttack, addToast, setModal }) => {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const searchTriggered = useRef(false)

  const handleSearchChange = (val) => {
    setSearch(val)
    if (!searchTriggered.current && val.length > 0) {
      triggerAttack('XSS_ATTACK')
      searchTriggered.current = true
    }
  }

  const handleSort = (field) => {
    triggerAttack('SQL_INJECTION')
    setSortBy(field)
  }

  const handleViewProfile = (emp) => {
    triggerAttack('PRIVILEGE_ESCALATION')
    triggerAttack('HONEY_INTERACTION')
    setModal({ type: 'profile', data: emp })
  }

  const handleEmailClick = (emp) => {
    triggerAttack('RECONNAISSANCE')
    addToast(`Opening email to ${emp.email}...`, 'success')
  }

  const filtered = FAKE_EMPLOYEES.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.role.toLowerCase().includes(search.toLowerCase()) ||
    e.dept.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
        <h2 style={{ color:'#E6EDF3', margin:0 }}>Employee Directory</h2>
        <span style={{ color:'#8B949E', fontSize:'12px' }}>{filtered.length} employees</span>
      </div>

      {/* Search + Sort */}
      <div style={{ display:'flex', gap:'10px', marginBottom:'16px' }}>
        <input
          value={search}
          onChange={e => handleSearchChange(e.target.value)}
          placeholder="Search by name, role, department..."
          style={{ flex:1, padding:'9px 14px', background:'#161B22', border:'1px solid #30363D', borderRadius:'8px', color:'#E6EDF3', fontSize:'13px', outline:'none' }}
          onFocus={e => e.target.style.borderColor='#00FF88'}
          onBlur={e => e.target.style.borderColor='#30363D'}
        />
        <select
          value={sortBy}
          onChange={e => handleSort(e.target.value)}
          style={{ padding:'9px 12px', background:'#161B22', border:'1px solid #30363D', borderRadius:'8px', color:'#E6EDF3', fontSize:'13px', outline:'none', cursor:'pointer' }}>
          <option value="name">Sort by Name</option>
          <option value="dept">Sort by Department</option>
          <option value="role">Sort by Role</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background:'#161B22', borderRadius:'12px', border:'1px solid #30363D', overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'2fr 2fr 3fr 1.5fr 2fr auto', padding:'10px 16px', background:'#0D1117', borderBottom:'1px solid #30363D' }}>
          {['Name','Role','Email','Dept','Phone',''].map(h => (
            <div key={h} style={{ color:'#8B949E', fontSize:'11px', fontWeight:600, letterSpacing:'0.06em' }}>{h}</div>
          ))}
        </div>
        {filtered.map((emp, i) => (
          <div key={emp.id}
            style={{ display:'grid', gridTemplateColumns:'2fr 2fr 3fr 1.5fr 2fr auto', padding:'12px 16px', borderBottom: i < filtered.length-1 ? '1px solid #21262D' : 'none', alignItems:'center', cursor:'default', transition:'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background='#1C2128'}
            onMouseLeave={e => e.currentTarget.style.background='transparent'}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:'#00FF88', color:'#0D1117', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:700, flexShrink:0 }}>
                {emp.name.charAt(0)}
              </div>
              <span style={{ color:'#E6EDF3', fontSize:'13px', fontWeight:500 }}>{emp.name}</span>
            </div>
            <div style={{ color:'#8B949E', fontSize:'12px' }}>{emp.role}</div>
            <div style={{ color:'#4FC3F7', fontSize:'12px', cursor:'pointer', textDecoration:'underline' }}
              onClick={() => handleEmailClick(emp)}>
              {emp.email}
            </div>
            <div style={{ color:'#8B949E', fontSize:'12px' }}>{emp.dept}</div>
            <div style={{ color:'#8B949E', fontSize:'12px' }}>{emp.phone}</div>
            <button onClick={() => handleViewProfile(emp)}
              style={{ padding:'5px 12px', background:'#21262D', color:'#E6EDF3', border:'1px solid #30363D', borderRadius:'6px', fontSize:'11px', cursor:'pointer', whiteSpace:'nowrap' }}>
              View
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

const FakeSystemStatus = ({ triggerAttack, addToast, downloadFile, setModal }) => {
  const [restarting, setRestarting] = useState({})
  const [stopping, setStopping] = useState({})

  const handleViewLogs = (server) => {
    triggerAttack('DIRECTORY_TRAVERSAL')
    triggerAttack('HONEY_INTERACTION')
    setModal({ type: 'logs', data: server })
  }

  const handleRestart = (server) => {
    triggerAttack('COMMAND_INJECTION')
    triggerAttack('HONEY_INTERACTION')
    setRestarting(prev => ({ ...prev, [server.name]: true }))
    addToast(`⚙️ Restarting ${server.name}...`, 'info')
    setTimeout(() => {
      setRestarting(prev => ({ ...prev, [server.name]: false }))
      addToast(`✅ ${server.name} restarted successfully`, 'success')
    }, 2500)
  }

  const handleStop = (server) => {
    triggerAttack('COMMAND_INJECTION')
    setStopping(prev => ({ ...prev, [server.name]: true }))
    addToast(`⛔ Stopping ${server.name}...`, 'info')
    setTimeout(() => {
      setStopping(prev => ({ ...prev, [server.name]: false }))
      addToast(`✅ ${server.name} stopped`, 'success')
    }, 2000)
  }

  const handleSSH = (server) => {
    triggerAttack('PRIVILEGE_ESCALATION')
    addToast(`🔐 Opening SSH connection to ${server.name}...`, 'info')
    setTimeout(() => addToast(`✅ SSH connected to ${server.name} as root`, 'success'), 1500)
  }

  const handleBackup = (server) => {
    triggerAttack('DATA_EXFILTRATION')
    addToast(`💾 Starting backup of ${server.name}...`, 'info')
    setTimeout(() => addToast(`✅ Backup completed: ${server.name}_backup_${Date.now()}.tar.gz`, 'success'), 3000)
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
        <h2 style={{ color:'#E6EDF3', margin:0 }}>System Status</h2>
        <div style={{ display:'flex', gap:'8px' }}>
          <button onClick={() => { triggerAttack('RECONNAISSANCE'); addToast('System scan initiated...', 'info') }}
            style={{ padding:'8px 16px', background:'#21262D', color:'#E6EDF3', border:'1px solid #30363D', borderRadius:'8px', fontSize:'12px', cursor:'pointer' }}>
            🔍 Scan All
          </button>
          <button onClick={() => { triggerAttack('DATA_EXFILTRATION'); addToast('Exporting system report...', 'info'); setTimeout(() => downloadFile('system_report.txt', 'SYSTEM REPORT\n\nAll servers operational\nLast scan: ' + new Date().toISOString()), 1000) }}
            style={{ padding:'8px 16px', background:'#21262D', color:'#E6EDF3', border:'1px solid #30363D', borderRadius:'8px', fontSize:'12px', cursor:'pointer' }}>
            📤 Export Report
          </button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'16px' }}>
        {FAKE_SERVERS.map(server => (
          <div key={server.name}
            style={{ background:'#161B22', border:`1px solid ${server.status==='Online'?'rgba(0,255,136,0.2)':'rgba(255,193,7,0.2)'}`, borderRadius:'12px', padding:'20px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'16px' }}>
              <div>
                <div style={{ color:'#E6EDF3', fontWeight:700, fontSize:'14px', marginBottom:'4px' }}>{server.name}</div>
                <span style={{ fontSize:'11px', fontWeight:600, color:server.status==='Online'?'#00FF88':'#FFC107', display:'flex', alignItems:'center', gap:'4px' }}>
                  <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:server.status==='Online'?'#00FF88':'#FFC107', display:'inline-block' }} />
                  {server.status}
                </span>
              </div>
              <span style={{ fontSize:'28px' }}>🖥</span>
            </div>

            {/* Progress bars */}
            {[['CPU', server.cpu], ['Memory', server.mem], ['Disk', server.disk]].map(([label, val]) => (
              <div key={label} style={{ marginBottom:'8px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'3px' }}>
                  <span style={{ color:'#8B949E', fontSize:'11px' }}>{label}</span>
                  <span style={{ color:val>80?'#FF4444':val>60?'#FFC107':'#00FF88', fontSize:'11px', fontWeight:600 }}>{val}%</span>
                </div>
                <div style={{ background:'#21262D', borderRadius:'4px', height:'4px' }}>
                  <div style={{ background:val>80?'#FF4444':val>60?'#FFC107':'#00FF88', height:'100%', width:`${val}%`, borderRadius:'4px', transition:'width 0.5s' }} />
                </div>
              </div>
            ))}

            {/* Action buttons — all 5 working */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px', marginTop:'16px' }}>
              <button onClick={() => handleViewLogs(server)}
                style={{ padding:'7px', background:'#21262D', color:'#E6EDF3', border:'1px solid #30363D', borderRadius:'6px', fontSize:'11px', cursor:'pointer' }}>
                📋 View Logs
              </button>
              <button onClick={() => handleSSH(server)}
                style={{ padding:'7px', background:'#21262D', color:'#4FC3F7', border:'1px solid rgba(79,195,247,0.3)', borderRadius:'6px', fontSize:'11px', cursor:'pointer' }}>
                🔐 SSH Access
              </button>
              <button onClick={() => handleBackup(server)}
                style={{ padding:'7px', background:'#21262D', color:'#FFC107', border:'1px solid rgba(255,193,7,0.3)', borderRadius:'6px', fontSize:'11px', cursor:'pointer' }}>
                💾 Backup
              </button>
              <button
                onClick={() => stopping[server.name] ? null : handleStop(server)}
                disabled={stopping[server.name]}
                style={{ padding:'7px', background:'rgba(255,193,7,0.1)', color:'#FFC107', border:'1px solid rgba(255,193,7,0.3)', borderRadius:'6px', fontSize:'11px', cursor:'pointer' }}>
                {stopping[server.name] ? '⏳ Stopping...' : '⏸ Stop'}
              </button>
            </div>
            <button
              onClick={() => restarting[server.name] ? null : handleRestart(server)}
              disabled={restarting[server.name]}
              style={{ width:'100%', marginTop:'6px', padding:'8px', background:restarting[server.name]?'#21262D':'rgba(255,68,68,0.15)', color:restarting[server.name]?'#8B949E':'#FF4444', border:`1px solid ${restarting[server.name]?'#30363D':'rgba(255,68,68,0.3)'}`, borderRadius:'6px', fontSize:'12px', cursor:restarting[server.name]?'wait':'pointer', fontWeight:600 }}>
              {restarting[server.name] ? '⏳ Restarting...' : '🔄 Restart Server'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

const FakeReports = ({ triggerAttack, addToast, downloadFile }) => {
  const [downloading, setDownloading] = useState({})
  const [previewing, setPreviewing] = useState(null)

  const handleDownload = (report) => {
    triggerAttack('DATA_EXFILTRATION')
    triggerAttack('HONEY_INTERACTION')
    setDownloading(prev => ({ ...prev, [report.name]: true }))
    setTimeout(() => {
      downloadFile(report.name.replace(/ /g,'_') + '.txt', report.content)
      setDownloading(prev => ({ ...prev, [report.name]: false }))
      addToast(`✅ ${report.name} downloaded`)
    }, 1500)
  }

  const handlePreview = (report) => {
    triggerAttack('RECONNAISSANCE')
    setPreviewing(report)
  }

  const handleShare = (report) => {
    triggerAttack('DATA_EXFILTRATION')
    addToast(`📤 Report shared: ${report.name}`)
  }

  const handlePrint = (report) => {
    triggerAttack('RECONNAISSANCE')
    addToast(`🖨 Printing: ${report.name}...`)
  }

  return (
    <div>
      <h2 style={{ color:'#E6EDF3', marginBottom:'20px' }}>Reports</h2>

      {/* Preview modal */}
      {previewing && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={() => setPreviewing(null)}>
          <div style={{ background:'#161B22', border:'1px solid #30363D', borderRadius:'16px', padding:'28px', width:'560px', maxHeight:'80vh', overflow:'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'16px' }}>
              <h3 style={{ color:'#E6EDF3', margin:0 }}>{previewing.name}</h3>
              <button onClick={() => setPreviewing(null)} style={{ background:'none', border:'none', color:'#8B949E', fontSize:'24px', cursor:'pointer', lineHeight:1 }}>×</button>
            </div>
            <pre style={{ color:'#00FF88', fontSize:'12px', lineHeight:1.8, background:'#0D1117', padding:'16px', borderRadius:'8px', whiteSpace:'pre-wrap', margin:'0 0 16px' }}>
              {previewing.content}
            </pre>
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={() => { handleDownload(previewing); setPreviewing(null) }}
                style={{ padding:'10px 20px', background:'#00FF88', color:'#0D1117', border:'none', borderRadius:'8px', fontWeight:700, cursor:'pointer' }}>
                ⬇ Download
              </button>
              <button onClick={() => { handleShare(previewing); setPreviewing(null) }}
                style={{ padding:'10px 20px', background:'#21262D', color:'#E6EDF3', border:'1px solid #30363D', borderRadius:'8px', cursor:'pointer' }}>
                📤 Share
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
        {FAKE_REPORTS.map(report => (
          <div key={report.name}
            style={{ background:'#161B22', border:'1px solid #30363D', borderRadius:'12px', padding:'20px', transition:'border-color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor='rgba(0,255,136,0.3)'}
            onMouseLeave={e => e.currentTarget.style.borderColor='#30363D'}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ display:'flex', gap:'14px', alignItems:'center' }}>
                <span style={{ fontSize:'28px' }}>📊</span>
                <div>
                  <div style={{ color:'#E6EDF3', fontWeight:600, fontSize:'14px' }}>{report.name}</div>
                  <div style={{ color:'#8B949E', fontSize:'11px', marginTop:'2px' }}>{report.size} · Generated {report.date}</div>
                </div>
              </div>
              <div style={{ display:'flex', gap:'8px' }}>
                <button onClick={() => handlePreview(report)}
                  style={{ padding:'8px 14px', background:'#21262D', color:'#E6EDF3', border:'1px solid #30363D', borderRadius:'8px', fontSize:'12px', cursor:'pointer' }}>
                  👁 Preview
                </button>
                <button onClick={() => handleShare(report)}
                  style={{ padding:'8px 14px', background:'#21262D', color:'#E6EDF3', border:'1px solid #30363D', borderRadius:'8px', fontSize:'12px', cursor:'pointer' }}>
                  📤 Share
                </button>
                <button onClick={() => handlePrint(report)}
                  style={{ padding:'8px 14px', background:'#21262D', color:'#E6EDF3', border:'1px solid #30363D', borderRadius:'8px', fontSize:'12px', cursor:'pointer' }}>
                  🖨 Print
                </button>
                <button
                  onClick={() => handleDownload(report)}
                  disabled={downloading[report.name]}
                  style={{ padding:'8px 18px', background:downloading[report.name]?'#21262D':'#00FF88', color:downloading[report.name]?'#8B949E':'#0D1117', border:'none', borderRadius:'8px', fontWeight:700, fontSize:'12px', cursor:downloading[report.name]?'wait':'pointer', minWidth:'110px' }}>
                  {downloading[report.name] ? '⏳ Downloading...' : '⬇ Download'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const FakeSettings = ({ triggerAttack, addToast, setModal }) => {
  const [form, setForm] = useState({
    email: 'john.smith@acmecorp.com',
    phone: '+1 (555) 234-5678',
    department: 'IT Administration',
    location: 'New York, USA',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [saved, setSaved] = useState(false)
  const [twoFactor, setTwoFactor] = useState(false)
  const [notifications, setNotifications] = useState(true)
  const triggered = useRef({})

  const handleChange = (field, val) => {
    setForm(prev => ({ ...prev, [field]: val }))
    if (!triggered.current[field]) {
      triggerAttack('XSS_ATTACK')
      triggered.current[field] = true
    }
  }

  const handleSave = () => {
    triggerAttack('ADMIN_INTRUSION')
    triggerAttack('HONEY_INTERACTION')
    setSaved(true)
    addToast('✅ Profile settings saved successfully')
    setTimeout(() => setSaved(false), 2500)
  }

  const handlePasswordChange = () => {
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      addToast('⚠️ Please fill all password fields', 'error')
      return
    }
    if (form.newPassword !== form.confirmPassword) {
      addToast('⚠️ Passwords do not match', 'error')
      return
    }
    triggerAttack('CREDENTIAL_STUFFING')
    triggerAttack('BRUTE_FORCE')
    triggerAttack('HONEY_INTERACTION')
    addToast('✅ Password updated successfully')
    setForm(prev => ({ ...prev, currentPassword:'', newPassword:'', confirmPassword:'' }))
  }

  const handleToggle2FA = () => {
    triggerAttack('ADMIN_INTRUSION')
    setTwoFactor(!twoFactor)
    addToast(`✅ Two-factor authentication ${!twoFactor ? 'enabled' : 'disabled'}`)
  }

  const handleExportData = () => {
    triggerAttack('DATA_EXFILTRATION')
    addToast('📤 Exporting your account data...')
    setTimeout(() => addToast('✅ Account data exported to john_smith_data.zip'), 2000)
  }

  const handleDeleteAccount = () => {
    triggerAttack('INSIDER_THREAT')
    triggerAttack('PRIVILEGE_ESCALATION')
    addToast('⚠️ Account deletion requires admin approval', 'error')
  }

  const handleRevokeSession = () => {
    triggerAttack('SESSION_HIJACKING')
    addToast('✅ All other sessions revoked successfully')
  }

  const inputStyle = { width:'100%', padding:'10px 14px', background:'#0D1117', border:'1px solid #30363D', borderRadius:'8px', color:'#E6EDF3', fontSize:'13px', outline:'none', boxSizing:'border-box' }
  const labelStyle = { color:'#8B949E', fontSize:'11px', fontWeight:600, letterSpacing:'0.06em', display:'block', marginBottom:'6px', textTransform:'uppercase' }

  return (
    <div style={{ maxWidth:'600px' }}>
      <h2 style={{ color:'#E6EDF3', marginBottom:'24px' }}>Account Settings</h2>

      {/* Profile section */}
      <div style={{ background:'#161B22', borderRadius:'12px', padding:'24px', border:'1px solid #30363D', marginBottom:'16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'16px', marginBottom:'24px' }}>
          <div style={{ width:'60px', height:'60px', borderRadius:'50%', background:'#00FF88', color:'#0D1117', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:'22px', cursor:'pointer' }}
            onClick={() => { triggerAttack('RECONNAISSANCE'); addToast('Opening photo upload...') }}>J</div>
          <div>
            <div style={{ color:'#E6EDF3', fontWeight:700, fontSize:'16px' }}>John Smith</div>
            <div style={{ color:'#8B949E', fontSize:'12px' }}>IT Administrator · Employee ID: E002</div>
            <button onClick={() => { triggerAttack('RECONNAISSANCE'); addToast('Opening photo upload...') }}
              style={{ marginTop:'4px', fontSize:'11px', color:'#00FF88', background:'none', border:'none', cursor:'pointer', padding:0 }}>
              Change Photo
            </button>
          </div>
        </div>
        {[['Email','email','email'],['Phone','phone','tel'],['Department','department','text'],['Location','location','text']].map(([label,field,type]) => (
          <div key={field} style={{ marginBottom:'16px' }}>
            <label style={labelStyle}>{label}</label>
            <input type={type} value={form[field]}
              onChange={e => handleChange(field, e.target.value)}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor='#00FF88'}
              onBlur={e => e.target.style.borderColor='#30363D'}
            />
          </div>
        ))}
        <button onClick={handleSave}
          style={{ padding:'10px 28px', background:saved?'#1A3A2A':'#00FF88', color:saved?'#00FF88':'#0D1117', border:saved?'1px solid #00FF88':'none', borderRadius:'8px', fontWeight:700, cursor:'pointer', transition:'all 0.2s' }}>
          {saved ? '✓ Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Legacy Admin Portal login card (fake portal) */}
      <div style={{ background:'#161B22', borderRadius:'12px', padding:'24px', border:'1px solid #30363D', marginBottom:'16px' }}>
        <h3 style={{ color:'#E6EDF3', margin:'0 0 8px', fontSize:'15px', fontWeight:700 }}>Legacy Admin Portal</h3>
        <p style={{ color:'#8B949E', margin:'0 0 16px', fontSize:'12px' }}>Access legacy backup controls (Restricted internal subnet)</p>
        <button onClick={() => { triggerAttack('RECONNAISSANCE'); setModal({ type: 'portal' }) }}
          style={{ padding:'10px 20px', background:'#21262D', color:'#E6EDF3', border:'1px solid #30363D', borderRadius:'8px', fontSize:'12px', cursor:'pointer', fontWeight:600 }}>
          🔑 Open Portal Login
        </button>
      </div>

      {/* Security section */}
      <div style={{ background:'#161B22', borderRadius:'12px', padding:'24px', border:'1px solid #30363D', marginBottom:'16px' }}>
        <h3 style={{ color:'#E6EDF3', margin:'0 0 20px', fontSize:'15px', fontWeight:700 }}>Security Settings</h3>

        {/* 2FA toggle */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom:'1px solid #21262D', marginBottom:'16px' }}>
          <div>
            <div style={{ color:'#E6EDF3', fontSize:'13px', fontWeight:500 }}>Two-Factor Authentication</div>
            <div style={{ color:'#8B949E', fontSize:'11px' }}>Add an extra layer of security to your account</div>
          </div>
          <div onClick={handleToggle2FA}
            style={{ width:'44px', height:'24px', borderRadius:'12px', background:twoFactor?'#00FF88':'#30363D', cursor:'pointer', position:'relative', transition:'background 0.2s' }}>
            <div style={{ width:'20px', height:'20px', borderRadius:'50%', background:'white', position:'absolute', top:'2px', left:twoFactor?'22px':'2px', transition:'left 0.2s' }} />
          </div>
        </div>

        {/* Notifications toggle */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom:'1px solid #21262D', marginBottom:'20px' }}>
          <div>
            <div style={{ color:'#E6EDF3', fontSize:'13px', fontWeight:500 }}>Email Notifications</div>
            <div style={{ color:'#8B949E', fontSize:'11px' }}>Receive security alerts via email</div>
          </div>
          <div onClick={() => { setNotifications(!notifications); triggerAttack('ADMIN_INTRUSION') }}
            style={{ width:'44px', height:'24px', borderRadius:'12px', background:notifications?'#00FF88':'#30363D', cursor:'pointer', position:'relative', transition:'background 0.2s' }}>
            <div style={{ width:'20px', height:'20px', borderRadius:'50%', background:'white', position:'absolute', top:'2px', left:notifications?'22px':'2px', transition:'left 0.2s' }} />
          </div>
        </div>

        {/* Password change */}
        <h4 style={{ color:'#E6EDF3', margin:'0 0 16px', fontSize:'13px', fontWeight:600 }}>Change Password</h4>
        {[['Current Password','currentPassword'],['New Password','newPassword'],['Confirm New Password','confirmPassword']].map(([label,field]) => (
          <div key={field} style={{ marginBottom:'14px' }}>
            <label style={labelStyle}>{label}</label>
            <input type="password" value={form[field]}
              onChange={e => handleChange(field, e.target.value)}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor='#00FF88'}
              onBlur={e => e.target.style.borderColor='#30363D'}
            />
          </div>
        ))}
        <button onClick={handlePasswordChange}
          style={{ padding:'10px 24px', background:'rgba(255,68,68,0.1)', color:'#FF4444', border:'1px solid rgba(255,68,68,0.3)', borderRadius:'8px', fontWeight:700, cursor:'pointer' }}>
          Update Password
        </button>
      </div>

      {/* Danger zone */}
      <div style={{ background:'rgba(255,68,68,0.05)', borderRadius:'12px', padding:'24px', border:'1px solid rgba(255,68,68,0.2)' }}>
        <h3 style={{ color:'#FF4444', margin:'0 0 16px', fontSize:'15px', fontWeight:700 }}>⚠️ Danger Zone</h3>
        <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
          <button onClick={handleRevokeSession}
            style={{ padding:'10px 20px', background:'rgba(255,193,7,0.1)', color:'#FFC107', border:'1px solid rgba(255,193,7,0.3)', borderRadius:'8px', fontSize:'12px', cursor:'pointer', fontWeight:600 }}>
            🔓 Revoke All Sessions
          </button>
          <button onClick={handleExportData}
            style={{ padding:'10px 20px', background:'rgba(79,195,247,0.1)', color:'#4FC3F7', border:'1px solid rgba(79,195,247,0.3)', borderRadius:'8px', fontSize:'12px', cursor:'pointer', fontWeight:600 }}>
            📦 Export My Data
          </button>
          <button onClick={handleDeleteAccount}
            style={{ padding:'10px 20px', background:'rgba(255,68,68,0.1)', color:'#FF4444', border:'1px solid rgba(255,68,68,0.3)', borderRadius:'8px', fontSize:'12px', cursor:'pointer', fontWeight:600 }}>
            🗑 Delete Account
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// GLOBAL MODAL COMPONENT
// ============================================================================

const GlobalModal = ({ modal, setModal, triggerAttack, addToast, downloadFile }) => {
  if (!modal) return null

  const close = () => setModal(null)

  // File preview modal
  if (modal.type === 'file') {
    const file = modal.data
    const fileIcon = { xlsx:'📊', csv:'📋', pdf:'📄', json:'🔧', zip:'🗜️', txt:'📝' }
    return (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={close}>
        <div style={{ background:'#161B22', border:'1px solid #30363D', borderRadius:'16px', padding:'28px', width:'580px', maxHeight:'80vh', overflow:'auto' }} onClick={e => e.stopPropagation()}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
              <span style={{ fontSize:'24px' }}>{fileIcon[file.type]||'📄'}</span>
              <h3 style={{ color:'#E6EDF3', margin:0, fontSize:'14px' }}>{file.name}</h3>
            </div>
            <button onClick={close} style={{ background:'none', border:'none', color:'#8B949E', fontSize:'24px', cursor:'pointer', lineHeight:1 }}>×</button>
          </div>
          <div style={{ display:'flex', gap:'8px', marginBottom:'14px' }}>
            <span style={{ fontSize:'11px', padding:'3px 8px', borderRadius:'4px', background:'rgba(255,68,68,0.1)', color:'#FF4444', fontWeight:600 }}>{file.level}</span>
            <span style={{ fontSize:'11px', color:'#8B949E' }}>{file.size}</span>
          </div>
          <pre style={{ color:'#00FF88', fontSize:'12px', lineHeight:1.8, background:'#0D1117', padding:'16px', borderRadius:'8px', whiteSpace:'pre-wrap', wordBreak:'break-word', margin:'0 0 16px', maxHeight:'300px', overflow:'auto', fontFamily:'monospace' }}>
            {file.content}
          </pre>
          <div style={{ display:'flex', gap:'8px' }}>
            <button onClick={() => {
              triggerAttack('DATA_EXFILTRATION')
              triggerAttack('HONEY_INTERACTION')
              downloadFile(file.name, file.content)
              addToast(`✅ ${file.name} downloaded`)
              close()
            }}
              style={{ padding:'10px 20px', background:'#00FF88', color:'#0D1117', border:'none', borderRadius:'8px', fontWeight:700, cursor:'pointer' }}>
              ⬇ Download File
            </button>
            <button onClick={close}
              style={{ padding:'10px 20px', background:'#21262D', color:'#E6EDF3', border:'1px solid #30363D', borderRadius:'8px', cursor:'pointer' }}>
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Profile modal
  if (modal.type === 'profile') {
    const emp = modal.data
    return (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={close}>
        <div style={{ background:'#161B22', border:'1px solid #30363D', borderRadius:'16px', padding:'28px', width:'420px' }} onClick={e => e.stopPropagation()}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'20px' }}>
            <h3 style={{ color:'#E6EDF3', margin:0 }}>Employee Profile</h3>
            <button onClick={close} style={{ background:'none', border:'none', color:'#8B949E', fontSize:'24px', cursor:'pointer' }}>×</button>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'14px', marginBottom:'20px', padding:'16px', background:'#0D1117', borderRadius:'10px' }}>
            <div style={{ width:'56px', height:'56px', borderRadius:'50%', background:'#00FF88', color:'#0D1117', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:'20px', flexShrink:0 }}>
              {emp.name.charAt(0)}
            </div>
            <div>
              <div style={{ color:'#E6EDF3', fontWeight:700, fontSize:'15px' }}>{emp.name}</div>
              <div style={{ color:'#8B949E', fontSize:'12px' }}>{emp.role}</div>
              <div style={{ color:'#8B949E', fontSize:'11px' }}>{emp.dept}</div>
            </div>
          </div>
          {[['Employee ID',emp.id],['Email',emp.email],['Phone',emp.phone],['Department',emp.dept],['Role',emp.role]].map(([k,v]) => (
            <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom:'1px solid #21262D' }}>
              <span style={{ color:'#8B949E', fontSize:'12px' }}>{k}</span>
              <span style={{ color:'#E6EDF3', fontSize:'12px', fontWeight:500 }}>{v}</span>
            </div>
          ))}
          <div style={{ display:'flex', gap:'8px', marginTop:'16px' }}>
            <button onClick={() => { triggerAttack('RECONNAISSANCE'); triggerAttack('HONEY_INTERACTION'); addToast(`📧 Email sent to ${emp.email}`); close() }}
              style={{ flex:1, padding:'9px', background:'#21262D', color:'#E6EDF3', border:'1px solid #30363D', borderRadius:'8px', fontSize:'12px', cursor:'pointer' }}>
              📧 Send Email
            </button>
            <button onClick={() => { triggerAttack('DATA_EXFILTRATION'); triggerAttack('HONEY_INTERACTION'); addToast(`📤 Profile exported: ${emp.name}.txt`); close() }}
              style={{ flex:1, padding:'9px', background:'#21262D', color:'#E6EDF3', border:'1px solid #30363D', borderRadius:'8px', fontSize:'12px', cursor:'pointer' }}>
              📤 Export
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Logs modal
  if (modal.type === 'logs') {
    const server = modal.data
    const logContent = `[2026-04-26 05:12:43] INFO  ${server.name}: GET /admin/users 200 OK\n[2026-04-26 05:12:51] WARN  ${server.name}: Failed login attempt from 192.168.1.102\n[2026-04-26 05:13:02] ERROR ${server.name}: Disk threshold exceeded 94%\n[2026-04-26 05:13:18] INFO  ${server.name}: POST /api/export/payroll 200 OK\n[2026-04-26 05:13:45] WARN  ${server.name}: Multiple failed attempts user=admin`;
    return (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={close}>
        <div style={{ background:'#161B22', border:'1px solid #30363D', borderRadius:'16px', padding:'28px', width:'580px', maxHeight:'80vh', overflow:'auto' }} onClick={e => e.stopPropagation()}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
              <span style={{ fontSize:'24px' }}>📋</span>
              <h3 style={{ color:'#E6EDF3', margin:0, fontSize:'14px' }}>System Logs: {server.name}</h3>
            </div>
            <button onClick={close} style={{ background:'none', border:'none', color:'#8B949E', fontSize:'24px', cursor:'pointer', lineHeight:1 }}>×</button>
          </div>
          <pre style={{ color:'#00FF88', fontSize:'12px', lineHeight:1.8, background:'#0D1117', padding:'16px', borderRadius:'8px', whiteSpace:'pre-wrap', wordBreak:'break-word', margin:'0 0 16px', maxHeight:'300px', overflow:'auto', fontFamily:'monospace' }}>
            {logContent}
          </pre>
          <div style={{ display:'flex', gap:'8px' }}>
            <button onClick={() => {
              triggerAttack('DATA_EXFILTRATION')
              triggerAttack('HONEY_INTERACTION')
              downloadFile(`${server.name}_logs.txt`, logContent)
              addToast(`✅ ${server.name} logs downloaded`)
              close()
            }}
              style={{ padding:'10px 20px', background:'#00FF88', color:'#0D1117', border:'none', borderRadius:'8px', fontWeight:700, cursor:'pointer' }}>
              ⬇ Download Logs
            </button>
            <button onClick={close}
              style={{ padding:'10px 20px', background:'#21262D', color:'#E6EDF3', border:'1px solid #30363D', borderRadius:'8px', cursor:'pointer' }}>
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Portal login modal
  if (modal.type === 'portal') {
    return (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={close}>
        <div style={{ background:'#161B22', border:'1px solid #30363D', borderRadius:'16px', padding:'28px', width:'400px' }} onClick={e => e.stopPropagation()}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'20px' }}>
            <h3 style={{ color:'#E6EDF3', margin:0 }}>Legacy Admin Portal Login</h3>
            <button onClick={close} style={{ background:'none', border:'none', color:'#8B949E', fontSize:'24px', cursor:'pointer' }}>×</button>
          </div>
          <form onSubmit={(e) => {
            e.preventDefault()
            triggerAttack('BRUTE_FORCE')
            triggerAttack('HONEY_INTERACTION')
            addToast('⚠️ Access denied: login attempt flagged as suspicious', 'error')
            close()
          }}>
            <div style={{ marginBottom:'16px' }}>
              <label style={{ color:'#8B949E', fontSize:'11px', fontWeight:600, display:'block', marginBottom:'6px', textTransform:'uppercase' }}>Username</label>
              <input type="text" placeholder="admin" required
                onChange={() => {
                  if (!window.__xss_portal_user) {
                    triggerAttack('XSS_ATTACK')
                    window.__xss_portal_user = true
                  }
                }}
                style={{ width:'100%', padding:'10px 14px', background:'#0D1117', border:'1px solid #30363D', borderRadius:'8px', color:'#E6EDF3', fontSize:'13px', outline:'none', boxSizing:'border-box' }}
              />
            </div>
            <div style={{ marginBottom:'20px' }}>
              <label style={{ color:'#8B949E', fontSize:'11px', fontWeight:600, display:'block', marginBottom:'6px', textTransform:'uppercase' }}>Password</label>
              <input type="password" placeholder="••••••••" required
                onChange={() => {
                  if (!window.__xss_portal_pass) {
                    triggerAttack('XSS_ATTACK')
                    window.__xss_portal_pass = true
                  }
                }}
                style={{ width:'100%', padding:'10px 14px', background:'#0D1117', border:'1px solid #30363D', borderRadius:'8px', color:'#E6EDF3', fontSize:'13px', outline:'none', boxSizing:'border-box' }}
              />
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button type="submit"
                style={{ flex:1, padding:'10px', background:'#00FF88', color:'#0D1117', border:'none', borderRadius:'8px', fontWeight:700, cursor:'pointer' }}>
                🔑 Sign In
              </button>
              <button type="button" onClick={close}
                style={{ flex:1, padding:'10px', background:'#21262D', color:'#E6EDF3', border:'1px solid #30363D', borderRadius:'8px', cursor:'pointer' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return null
}

// ============================================================================
// MAIN DECEPTION DASHBOARD
// ============================================================================

export default function DeceptionDashboard({ currentUser, onLogout, onAttackerAction }) {
  const [activePage, setActivePage] = useState('Dashboard')
  const [toasts, setToasts] = useState([])
  const [modal, setModal] = useState(null) // { type, data }

  const triggerAttack = useCallback((actionType) => {
    console.log('[DECEPTION] triggerAttack called:', actionType)
    if (typeof onAttackerAction === 'function') {
      onAttackerAction(actionType)
    } else {
      console.error('[DECEPTION] onAttackerAction is NOT a function. Type:', typeof onAttackerAction)
    }
  }, [onAttackerAction])

  const addToast = useCallback((msg, type = 'success') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev.slice(-4), { id, msg, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  const downloadFile = useCallback((filename, content) => {
    const blob = new Blob([content || filename], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [])

  const handleNav = useCallback((pageId) => {
    triggerAttack('API_ABUSE')
    setActivePage(pageId)
    setModal(null)
  }, [triggerAttack])

  // DDoS click tracking
  const clickCountRef = useRef(0)
  const clickWindowRef = useRef(Date.now())

  const trackClick = useCallback(() => {
    const now = Date.now()
    if (now - clickWindowRef.current > 10000) {
      clickCountRef.current = 0
      clickWindowRef.current = now
    }
    clickCountRef.current += 1
    if (clickCountRef.current >= 10) {
      triggerAttack('DDOS')
      clickCountRef.current = 0
      clickWindowRef.current = Date.now()
    }
  }, [triggerAttack])

  // Auto time-based triggers
  useEffect(() => {
    const timers = []
    // Reconnaissance every 30s
    timers.push(setInterval(() => triggerAttack('RECONNAISSANCE'), 30000))
    // Session hijacking after 2 min
    timers.push(setTimeout(() => triggerAttack('SESSION_HIJACKING'), 120000))
    // MitM after 3 min
    timers.push(setTimeout(() => triggerAttack('MAN_IN_THE_MIDDLE'), 180000))
    // Insider threat after 5 min
    timers.push(setTimeout(() => triggerAttack('INSIDER_THREAT'), 300000))
    // Zero-day 10% chance every 60s
    timers.push(setInterval(() => {
      if (Math.random() < 0.1) triggerAttack('ZERO_DAY_EXPLOIT')
    }, 60000))
    // Honey interaction every 15s (passive logging)
    timers.push(setInterval(() => triggerAttack('HONEY_INTERACTION'), 15000))
    // Bot activity every 45s
    timers.push(setInterval(() => triggerAttack('BOT_ACTIVITY'), 45000))

    return () => timers.forEach(t => { clearInterval(t); clearTimeout(t) })
  }, [triggerAttack])

  const renderPage = () => {
    const props = { triggerAttack, addToast, downloadFile, modal, setModal }
    switch (activePage) {
      case 'Dashboard':          return <FakeDashboard {...props} />
      case 'Database':           return <FakeDatabase {...props} />
      case 'My Files':           return <FakeFiles {...props} />
      case 'Employee Directory': return <FakeDirectory {...props} />
      case 'System Status':      return <FakeSystemStatus {...props} />
      case 'Reports':            return <FakeReports {...props} />
      case 'Settings':           return <FakeSettings {...props} />
      default:                   return <FakeDashboard {...props} />
    }
  }

  const handleSignOut = () => {
    triggerAttack('API_ABUSE')
    onLogout()
  }

  return (
    <div onClick={trackClick} style={{ display:'flex', height:'100vh', background:'#0D1117', color:'#C9D1D9', fontFamily:'system-ui, -apple-system, sans-serif', overflow:'hidden' }}>
      
      {/* SIDEBAR */}
      <div style={{ width:'220px', background:'#161B22', borderRight:'1px solid #30363D', display:'flex', flexDirection:'column', flexShrink:0 }}>
        <div style={{ padding:'20px', fontSize:'16px', fontWeight:800, letterSpacing:'0.05em', color:'#E6EDF3', borderBottom:'1px solid #30363D', display:'flex', alignItems:'center', gap:'8px' }}>
          <div style={{ width:'28px', height:'28px', background:'#00FF88', borderRadius:'6px', display:'flex', alignItems:'center', justifyContent:'center', color:'#0D1117', fontWeight:900, fontSize:'14px' }}>A</div>
          ACMECORP PORTAL
        </div>
        
        <div style={{ flex:1, padding:'16px 8px', display:'flex', flexDirection:'column', gap:'4px' }}>
          {DECEPTION_NAV.map(item => {
            const isActive = activePage === item.id
            const Icon = {
              'Dashboard': Activity,
              'Database': Database,
              'My Files': Folder,
              'Employee Directory': Users,
              'System Status': Server,
              'Reports': FileText,
              'Settings': Settings
            }[item.id] || Folder

            return (
              <div
                key={item.id}
                onClick={() => handleNav(item.id)}
                style={{
                  padding:'10px 14px',
                  borderRadius:'6px',
                  cursor:'pointer',
                  display:'flex',
                  alignItems:'center',
                  gap:'12px',
                  background: isActive ? '#21262D' : 'transparent',
                  color: isActive ? '#E6EDF3' : '#8B949E',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: '13px',
                  transition: 'background 0.2s, color 0.2s',
                  borderLeft: isActive ? '3px solid #00FF88' : '3px solid transparent'
                }}
                onMouseEnter={e => {
                  if(!isActive) {
                    e.currentTarget.style.background = '#1F242C'
                    e.currentTarget.style.color = '#E6EDF3'
                  }
                }}
                onMouseLeave={e => {
                  if(!isActive) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = '#8B949E'
                  }
                }}
              >
                <Icon size={16} color={isActive ? '#00FF88' : '#8B949E'} />
                <span>{item.label}</span>
              </div>
            )
          })}
        </div>

        <div style={{ padding:'16px', borderTop:'1px solid #30363D' }}>
          <button
            onClick={handleSignOut}
            style={{ width:'100%', padding:'10px', background:'transparent', border:'1px solid #30363D', color:'#E6EDF3', borderRadius:'6px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', fontSize:'13px', fontWeight:600, transition:'border-color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#FF4444'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#30363D'}
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        
        {/* TOPBAR */}
        <div style={{ height:'60px', background:'#161B22', borderBottom:'1px solid #30363D', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 24px', flexShrink:0 }}>
          <div style={{ fontSize:'15px', fontWeight:700, color:'#E6EDF3' }}>{activePage}</div>
          
          <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
            <div style={{ padding:'5px 10px', background:'rgba(255,68,68,0.1)', color:'#FF4444', border:'1px solid rgba(255,68,68,0.2)', borderRadius:'4px', fontSize:'11px', fontWeight:700 }}>
              SYSTEM ACTIVE · ACCESS GRANTED
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:'13px', fontWeight:700, color:'#E6EDF3' }}>{currentUser.username}</div>
                <div style={{ fontSize:'11px', color:'#8B949E' }}>IT Admin</div>
              </div>
              <div style={{ width:'32px', height:'32px', background:'#00FF88', borderRadius:'50%', color:'#0D1117', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:'13px' }}>
                {currentUser.username ? currentUser.username.charAt(0).toUpperCase() : 'T'}
              </div>
            </div>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div style={{ flex:1, overflowY:'auto', padding:'24px' }}>
          {renderPage()}
        </div>
        
      </div>

      {/* TOAST SYSTEM */}
      <div style={{ position:'fixed', top:'20px', right:'20px', zIndex:9999, display:'flex', flexDirection:'column', gap:'10px' }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: t.type === 'error' ? 'rgba(255,68,68,0.1)' : '#161B22',
            border: t.type === 'error' ? '1px solid #FF4444' : '1px solid #30363D',
            color: t.type === 'error' ? '#FF4444' : '#E6EDF3',
            padding: '12px 18px',
            borderRadius: '8px',
            fontSize: '13px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            minWidth: '240px',
            animation: 'slideIn 0.2s ease-out'
          }}>
            {t.type === 'error' ? '⚠️' : t.type === 'info' ? 'ℹ️' : '✅'}
            <span>{t.msg}</span>
          </div>
        ))}
      </div>

      {/* GLOBAL MODALS */}
      <GlobalModal
        modal={modal}
        setModal={setModal}
        triggerAttack={triggerAttack}
        addToast={addToast}
        downloadFile={downloadFile}
      />

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
