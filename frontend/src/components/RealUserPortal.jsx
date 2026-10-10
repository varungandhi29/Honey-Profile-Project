import { useState, useEffect } from 'react'

// This is what REAL legitimate users see
// Same AcmeCorp branding as fake portal but different data
// Only accessible via legitimate login with no brute force history

export default function RealUserPortal({ user: propUser, currentUser, onLogout }) {
  const user = propUser || currentUser || {}
  const [activeTab, setActiveTab] = useState('dashboard')

  const REAL_DATA = {
    stats: {
      messages: 14,
      tasks: 7,
      documents: 23,
      notifications: 3
    },
    recentActivity: [
      { action: 'Document viewed', item: 'Q3_Report_Final.pdf', time: '10 minutes ago', icon: '📄' },
      { action: 'Task completed', item: 'Review security policy', time: '2 hours ago', icon: '✅' },
      { action: 'Message received', item: 'From: HR Department', time: '3 hours ago', icon: '📨' },
      { action: 'Login detected', item: `From: ${user.city || 'Vadodara'}, India`, time: 'Just now', icon: '🔑' },
    ],
    announcements: [
      { title: 'System Maintenance', body: 'Scheduled maintenance this Saturday 2AM-4AM IST', priority: 'medium', date: 'Oct 5' },
      { title: 'Security Reminder', body: 'Please update your passwords before October 15th', priority: 'high', date: 'Oct 3' },
      { title: 'New Policy Update', body: 'Work from home policy has been updated. Please review.', priority: 'low', date: 'Sep 30' },
    ]
  }

  const NAV = [
    { id:'dashboard', label:'Dashboard', icon:'📊' },
    { id:'documents', label:'Documents', icon:'📁' },
    { id:'messages',  label:'Messages',  icon:'📨' },
    { id:'tasks',     label:'My Tasks',  icon:'✅' },
    { id:'profile',   label:'Profile',   icon:'👤' },
  ]

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#0F172A', fontFamily:'Inter, sans-serif' }}>

      {/* Sidebar */}
      <aside style={{ width:'220px', background:'#1E293B', borderRight:'1px solid rgba(255,255,255,0.06)', display:'flex', flexDirection:'column', position:'fixed', height:'100vh' }}>
        <div style={{ padding:'20px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'36px', height:'36px', background:'linear-gradient(135deg,#3B82F6,#1D4ED8)', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px' }}>🏢</div>
          <div>
            <div style={{ color:'#F1F5F9', fontWeight:700, fontSize:'13px' }}>AcmeCorp</div>
            <div style={{ color:'#64748B', fontSize:'10px' }}>Employee Portal</div>
          </div>
        </div>

        <nav style={{ flex:1, padding:'12px 8px' }}>
          {NAV.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', borderRadius:'8px', border:'none', background:activeTab===item.id?'rgba(59,130,246,0.15)':'transparent', color:activeTab===item.id?'#3B82F6':'#94A3B8', cursor:'pointer', fontSize:'13px', fontWeight:activeTab===item.id?600:400, marginBottom:'2px', textAlign:'left', transition:'all 150ms' }}>
              <span style={{ fontSize:'15px' }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div style={{ padding:'16px', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'12px' }}>
            <div style={{ width:'32px', height:'32px', background:'linear-gradient(135deg,#3B82F6,#06B6D4)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700, fontSize:'13px' }}>
              {user.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <div style={{ color:'#F1F5F9', fontSize:'12px', fontWeight:600 }}>{user.username}</div>
              <div style={{ color:'#64748B', fontSize:'10px' }}>Standard Employee</div>
            </div>
          </div>
          <button onClick={onLogout}
            style={{ width:'100%', padding:'8px', background:'rgba(239,68,68,0.1)', color:'#EF4444', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'6px', cursor:'pointer', fontSize:'12px', fontWeight:500 }}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ marginLeft:'220px', flex:1, padding:'28px' }}>

        {/* Topbar */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
          <div>
            <h1 style={{ color:'#F1F5F9', fontSize:'22px', fontWeight:700, margin:0 }}>
              {activeTab === 'dashboard' ? `Good day, ${user.username} 👋` :
               activeTab === 'documents' ? '📁 My Documents' :
               activeTab === 'messages' ? '📨 Messages' :
               activeTab === 'tasks' ? '✅ My Tasks' : '👤 My Profile'}
            </h1>
            <p style={{ color:'#64748B', fontSize:'13px', margin:'4px 0 0' }}>
              {new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
            </p>
          </div>
          <div style={{ display:'flex', gap:'12px', alignItems:'center' }}>
            <div style={{ position:'relative' }}>
              <div style={{ width:'36px', height:'36px', background:'#1E293B', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:'16px' }}>🔔</div>
              {REAL_DATA.stats.notifications > 0 && (
                <div style={{ position:'absolute', top:'-4px', right:'-4px', width:'16px', height:'16px', background:'#EF4444', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'9px', color:'white', fontWeight:700 }}>
                  {REAL_DATA.stats.notifications}
                </div>
              )}
            </div>
            <div style={{ width:'36px', height:'36px', background:'linear-gradient(135deg,#3B82F6,#06B6D4)', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700, fontSize:'15px' }}>
              {user.username?.[0]?.toUpperCase() || 'U'}
            </div>
          </div>
        </div>

        {/* Dashboard tab */}
        {activeTab === 'dashboard' && (
          <div>
            {/* Stat cards */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'14px', marginBottom:'20px' }}>
              {[
                { label:'Unread Messages', val:REAL_DATA.stats.messages, color:'#3B82F6', icon:'📨', sub:'2 urgent' },
                { label:'Pending Tasks', val:REAL_DATA.stats.tasks, color:'#F59E0B', icon:'⏳', sub:'3 due today' },
                { label:'Documents', val:REAL_DATA.stats.documents, color:'#10B981', icon:'📄', sub:'5 shared with you' },
                { label:'Notifications', val:REAL_DATA.stats.notifications, color:'#EF4444', icon:'🔔', sub:'Action required' },
              ].map(card => (
                <div key={card.label}
                  style={{ background:'#1E293B', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', padding:'18px', cursor:'pointer', transition:'border-color 200ms' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor=`${card.color}44`}
                  onMouseLeave={e => e.currentTarget.style.borderColor='rgba(255,255,255,0.06)'}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
                    <span style={{ color:'#64748B', fontSize:'11px', textTransform:'uppercase', letterSpacing:'0.06em' }}>{card.label}</span>
                    <span style={{ fontSize:'18px' }}>{card.icon}</span>
                  </div>
                  <div style={{ color:card.color, fontSize:'28px', fontWeight:700, marginBottom:'4px' }}>{card.val}</div>
                  <div style={{ color:'#475569', fontSize:'11px' }}>{card.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
              {/* Recent activity */}
              <div style={{ background:'#1E293B', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', padding:'20px' }}>
                <h3 style={{ color:'#F1F5F9', fontSize:'14px', fontWeight:600, margin:'0 0 16px' }}>Recent Activity</h3>
                {REAL_DATA.recentActivity.map((act, i) => (
                  <div key={i} style={{ display:'flex', gap:'12px', alignItems:'flex-start', padding:'10px 0', borderBottom:i<REAL_DATA.recentActivity.length-1?'1px solid rgba(255,255,255,0.04)':'none' }}>
                    <span style={{ fontSize:'16px', flexShrink:0 }}>{act.icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ color:'#F1F5F9', fontSize:'12px', fontWeight:500 }}>{act.action}</div>
                      <div style={{ color:'#94A3B8', fontSize:'11px' }}>{act.item}</div>
                    </div>
                    <div style={{ color:'#475569', fontSize:'10px', flexShrink:0 }}>{act.time}</div>
                  </div>
                ))}
              </div>

              {/* Announcements */}
              <div style={{ background:'#1E293B', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', padding:'20px' }}>
                <h3 style={{ color:'#F1F5F9', fontSize:'14px', fontWeight:600, margin:'0 0 16px' }}>Company Announcements</h3>
                {REAL_DATA.announcements.map((ann, i) => (
                  <div key={i} style={{ padding:'12px', background:'#0F172A', borderRadius:'8px', marginBottom:'8px', borderLeft:`3px solid ${ann.priority==='high'?'#EF4444':ann.priority==='medium'?'#F59E0B':'#10B981'}` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                      <span style={{ color:'#F1F5F9', fontSize:'12px', fontWeight:600 }}>{ann.title}</span>
                      <span style={{ color:'#475569', fontSize:'10px' }}>{ann.date}</span>
                    </div>
                    <p style={{ color:'#94A3B8', fontSize:'11px', margin:0, lineHeight:1.5 }}>{ann.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Documents tab */}
        {activeTab === 'documents' && (
          <div style={{ background:'#1E293B', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', overflow:'hidden' }}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ color:'#94A3B8', fontSize:'13px' }}>23 documents</span>
              <button style={{ padding:'6px 14px', background:'rgba(59,130,246,0.15)', color:'#3B82F6', border:'1px solid rgba(59,130,246,0.3)', borderRadius:'6px', fontSize:'12px', cursor:'pointer' }}>+ Upload</button>
            </div>
            {[
              { name:'Q3_Report_Final.pdf', type:'PDF', size:'2.4 MB', modified:'Oct 1', shared: true },
              { name:'Security_Policy_v2.docx', type:'DOC', size:'890 KB', modified:'Sep 28', shared: false },
              { name:'Employee_Handbook_2026.pdf', type:'PDF', size:'5.1 MB', modified:'Sep 15', shared: true },
              { name:'IT_Asset_Register.xlsx', type:'XLS', size:'340 KB', modified:'Sep 10', shared: false },
              { name:'Meeting_Notes_Oct2.txt', type:'TXT', size:'12 KB', modified:'Oct 2', shared: false },
            ].map((doc, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:'14px', padding:'14px 20px', borderBottom:'1px solid rgba(255,255,255,0.04)', cursor:'pointer', transition:'background 150ms' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.02)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                <span style={{ fontSize:'20px' }}>{doc.type==='PDF'?'📕':doc.type==='DOC'?'📘':doc.type==='XLS'?'📗':'📄'}</span>
                <div style={{ flex:1 }}>
                  <div style={{ color:'#F1F5F9', fontSize:'13px', fontWeight:500 }}>{doc.name}</div>
                  <div style={{ color:'#475569', fontSize:'11px' }}>{doc.size} • Modified {doc.modified}</div>
                </div>
                {doc.shared && <span style={{ padding:'2px 8px', background:'rgba(59,130,246,0.1)', color:'#3B82F6', borderRadius:'4px', fontSize:'10px' }}>Shared</span>}
                <span style={{ color:'#475569', fontSize:'13px', cursor:'pointer' }}>↓</span>
              </div>
            ))}
          </div>
        )}

        {/* Messages tab */}
        {activeTab === 'messages' && (
          <div style={{ background:'#1E293B', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', overflow:'hidden' }}>
            {[
              { from:'HR Department', subject:'October Salary Slip Available', preview:'Your October 2026 salary slip is now available for download...', time:'2h ago', unread:true },
              { from:'IT Support', subject:'Password Reset Reminder', preview:'This is a reminder to update your password before October 15...', time:'5h ago', unread:true },
              { from:'Team Lead', subject:'Project Update Required', preview:'Please send me the status update for the current sprint by EOD...', time:'Yesterday', unread:false },
              { from:'Admin', subject:'Office Closure Notice', preview:'The office will be closed on October 14 for Diwali...', time:'2 days ago', unread:false },
            ].map((msg, i) => (
              <div key={i} style={{ display:'flex', gap:'14px', padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.04)', cursor:'pointer', background:msg.unread?'rgba(59,130,246,0.03)':'transparent' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.02)'}
                onMouseLeave={e => e.currentTarget.style.background=msg.unread?'rgba(59,130,246,0.03)':'transparent'}>
                <div style={{ width:'36px', height:'36px', background:'linear-gradient(135deg,#3B82F6,#06B6D4)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700, fontSize:'14px', flexShrink:0 }}>
                  {msg.from[0]}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'3px' }}>
                    <span style={{ color:msg.unread?'#F1F5F9':'#94A3B8', fontSize:'13px', fontWeight:msg.unread?600:400 }}>{msg.from}</span>
                    <span style={{ color:'#475569', fontSize:'11px' }}>{msg.time}</span>
                  </div>
                  <div style={{ color:'#F1F5F9', fontSize:'12px', fontWeight:msg.unread?500:400, marginBottom:'2px' }}>{msg.subject}</div>
                  <div style={{ color:'#475569', fontSize:'11px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{msg.preview}</div>
                </div>
                {msg.unread && <div style={{ width:'8px', height:'8px', background:'#3B82F6', borderRadius:'50%', flexShrink:0, marginTop:'4px' }} />}
              </div>
            ))}
          </div>
        )}

        {/* Tasks tab */}
        {activeTab === 'tasks' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {[
              { task:'Submit monthly timesheet', due:'Today', priority:'high', done:false },
              { task:'Review updated security policy', due:'Oct 10', priority:'high', done:false },
              { task:'Complete Q3 self-assessment', due:'Oct 12', priority:'medium', done:false },
              { task:'Update emergency contact info', due:'Oct 15', priority:'low', done:false },
              { task:'Attend security awareness training', due:'Completed', priority:'low', done:true },
            ].map((task, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:'14px', padding:'14px 18px', background:'#1E293B', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'10px', opacity:task.done?0.5:1 }}>
                <div style={{ width:'20px', height:'20px', borderRadius:'50%', border:`2px solid ${task.done?'#10B981':task.priority==='high'?'#EF4444':task.priority==='medium'?'#F59E0B':'#94A3B8'}`, background:task.done?'#10B981':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, cursor:'pointer' }}>
                  {task.done && <span style={{ color:'white', fontSize:'11px' }}>✓</span>}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ color:task.done?'#64748B':'#F1F5F9', fontSize:'13px', fontWeight:500, textDecoration:task.done?'line-through':'none' }}>{task.task}</div>
                  <div style={{ color:'#475569', fontSize:'11px', marginTop:'2px' }}>Due: {task.due}</div>
                </div>
                <span style={{ padding:'2px 8px', borderRadius:'4px', fontSize:'10px', fontWeight:600, background:task.priority==='high'?'rgba(239,68,68,0.1)':task.priority==='medium'?'rgba(245,158,11,0.1)':'rgba(148,163,184,0.1)', color:task.priority==='high'?'#EF4444':task.priority==='medium'?'#F59E0B':'#94A3B8' }}>
                  {task.priority.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Profile tab */}
        {activeTab === 'profile' && (
          <div style={{ maxWidth:'600px' }}>
            <div style={{ background:'#1E293B', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', padding:'28px', marginBottom:'16px' }}>
              <div style={{ display:'flex', gap:'20px', alignItems:'center', marginBottom:'24px' }}>
                <div style={{ width:'64px', height:'64px', background:'linear-gradient(135deg,#3B82F6,#06B6D4)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700, fontSize:'24px' }}>
                  {user.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <div style={{ color:'#F1F5F9', fontSize:'18px', fontWeight:700 }}>{user.username}</div>
                  <div style={{ color:'#64748B', fontSize:'13px' }}>Standard Employee</div>
                  <div style={{ color:'#3B82F6', fontSize:'12px', marginTop:'4px' }}>● Active</div>
                </div>
              </div>
              {[
                { label:'Employee ID', value:'EMP-2024-0047' },
                { label:'Department', value:'Information Technology' },
                { label:'Location', value:'Vadodara, Gujarat, India' },
                { label:'Joined', value:'January 2024' },
                { label:'Access Level', value:'Standard' },
              ].map(field => (
                <div key={field.label} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ color:'#64748B', fontSize:'13px' }}>{field.label}</span>
                  <span style={{ color:'#F1F5F9', fontSize:'13px', fontWeight:500 }}>{field.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
