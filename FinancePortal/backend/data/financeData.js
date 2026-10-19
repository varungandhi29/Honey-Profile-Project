// Realistic financial data — what employees see when logged in
export const generateDashboardData = async (user) => ({
  welcome: `Welcome back, ${user.name}`,
  lastLogin: new Date(Date.now() - 86400000).toLocaleString(),
  stats: {
    totalRevenue: '$4,823,450',
    monthlyGrowth: '+12.4%',
    activeClients: 147,
    pendingInvoices: 23,
    overdueAmount: '$89,230',
    cashFlow: '$1,240,000',
  },
  recentActivity: [
    { type: 'payment', description: 'Invoice #INV-2024-0891 paid by Vertex Corp', amount: '$45,000', time: '2 hours ago' },
    { type: 'invoice', description: 'New invoice created for Nexus Industries', amount: '$78,500', time: '4 hours ago' },
    { type: 'report', description: 'Q3 Financial Report generated', amount: null, time: '1 day ago' },
    { type: 'client', description: 'New client onboarded: Sterling Holdings', amount: null, time: '2 days ago' },
    { type: 'payment', description: 'Salary disbursement completed', amount: '$284,000', time: '3 days ago' },
  ],
  alerts: [
    { severity: 'warning', message: '3 invoices overdue by 30+ days' },
    { severity: 'info', message: 'Monthly audit scheduled for next week' },
  ]
})

export const getReports = async (user) => ({
  reports: [
    { id:'RPT-001', name:'Q3 2024 Financial Report', type:'Quarterly', size:'2.4 MB', date:'2024-10-01', status:'Final', clearance:'FINANCE' },
    { id:'RPT-002', name:'Annual Budget Forecast 2025', type:'Annual', size:'5.1 MB', date:'2024-09-15', status:'Draft', clearance:'EXECUTIVE' },
    { id:'RPT-003', name:'Client Revenue Analysis', type:'Monthly', size:'1.2 MB', date:'2024-10-15', status:'Final', clearance:'FINANCE' },
    { id:'RPT-004', name:'Payroll Summary October 2024', type:'Monthly', size:'890 KB', date:'2024-10-31', status:'Final', clearance:'HR' },
    { id:'RPT-005', name:'Tax Filing Q3 2024', type:'Quarterly', size:'3.3 MB', date:'2024-10-20', status:'Submitted', clearance:'EXECUTIVE' },
    { id:'RPT-006', name:'IT Infrastructure Cost Report', type:'Monthly', size:'780 KB', date:'2024-10-28', status:'Final', clearance:'IT' },
  ].filter(r => {
    if (user.clearance === 'EXECUTIVE') return true
    return r.clearance === user.clearance || r.clearance === 'STANDARD'
  })
})

export const getInvoices = async (user) => ({
  invoices: [
    { id:'INV-2024-0891', client:'Vertex Corporation', amount:'$45,000', status:'Paid', date:'2024-10-01', due:'2024-10-15' },
    { id:'INV-2024-0892', client:'Nexus Industries Ltd', amount:'$78,500', status:'Pending', date:'2024-10-05', due:'2024-11-05' },
    { id:'INV-2024-0893', client:'Sterling Holdings', amount:'$125,000', status:'Overdue', date:'2024-09-01', due:'2024-10-01' },
    { id:'INV-2024-0894', client:'Meridian Partners', amount:'$32,000', status:'Paid', date:'2024-10-10', due:'2024-10-25' },
    { id:'INV-2024-0895', client:'Apex Financial Group', amount:'$89,500', status:'Pending', date:'2024-10-12', due:'2024-11-12' },
    { id:'INV-2024-0896', client:'Global Trade Co', amount:'$56,200', status:'Overdue', date:'2024-08-15', due:'2024-09-15' },
  ]
})

export const getClients = async () => ({
  clients: [
    { id:'CLT-001', name:'Vertex Corporation', contact:'David Chen', email:'d.chen@vertex.com', revenue:'$450,000', status:'Active', since:'2019' },
    { id:'CLT-002', name:'Nexus Industries Ltd', contact:'Emma Wilson', email:'e.wilson@nexus.com', revenue:'$280,000', status:'Active', since:'2021' },
    { id:'CLT-003', name:'Sterling Holdings', contact:'James Sterling', email:'j.sterling@sterling.com', revenue:'$890,000', status:'Active', since:'2017' },
    { id:'CLT-004', name:'Meridian Partners', contact:'Sarah Kim', email:'s.kim@meridian.com', revenue:'$320,000', status:'Active', since:'2020' },
    { id:'CLT-005', name:'Apex Financial Group', contact:'Robert Apex', email:'r.apex@apexfin.com', revenue:'$1,200,000', status:'Premium', since:'2015' },
  ]
})
