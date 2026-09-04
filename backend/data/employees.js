// 30 fixed decoy employees — realistic names and roles
export const FIXED_EMPLOYEES = [
  // Executive tier — high value targets attackers go for first
  { username:'j.smith', password:'JSmith2024!', name:'John Smith', role:'CEO', dept:'Executive', email:'j.smith@acmecorp.com' },
  { username:'s.johnson', password:'Sarah@AcmeCorp', name:'Sarah Johnson', role:'CFO', dept:'Finance', email:'s.johnson@acmecorp.com' },
  { username:'m.williams', password:'MikeW#2024', name:'Mike Williams', role:'CTO', dept:'Technology', email:'m.williams@acmecorp.com' },
  { username:'l.davis', password:'LisaD2024', name:'Lisa Davis', role:'CISO', dept:'Security', email:'l.davis@acmecorp.com' },
  { username:'r.brown', password:'Robert@123', name:'Robert Brown', role:'COO', dept:'Operations', email:'r.brown@acmecorp.com' },

  // IT/Admin tier — attackers target for system access
  { username:'admin', password:'admin123', name:'System Admin', role:'SysAdmin', dept:'IT', email:'admin@acmecorp.com' },
  { username:'administrator', password:'Admin@2024', name:'IT Administrator', role:'SysAdmin', dept:'IT', email:'administrator@acmecorp.com' },
  { username:'it.support', password:'Support@2024', name:'IT Support', role:'IT Support', dept:'IT', email:'it.support@acmecorp.com' },
  { username:'sysadmin', password:'Sysadmin#123', name:'System Admin', role:'SysAdmin', dept:'IT', email:'sysadmin@acmecorp.com' },
  { username:'devops', password:'DevOps2024!', name:'DevOps Engineer', role:'DevOps', dept:'Engineering', email:'devops@acmecorp.com' },

  // Finance tier — attackers target for financial data
  { username:'a.wilson', password:'Alice2024!', name:'Alice Wilson', role:'Finance Manager', dept:'Finance', email:'a.wilson@acmecorp.com' },
  { username:'b.moore', password:'BobM@Corp', name:'Bob Moore', role:'Accountant', dept:'Finance', email:'b.moore@acmecorp.com' },
  { username:'finance', password:'Finance@2024', name:'Finance Dept', role:'Finance User', dept:'Finance', email:'finance@acmecorp.com' },
  { username:'payroll', password:'Payroll#123', name:'Payroll Admin', role:'Payroll Manager', dept:'HR', email:'payroll@acmecorp.com' },

  // Engineering tier
  { username:'t.taylor', password:'TomT@2024', name:'Tom Taylor', role:'Senior Engineer', dept:'Engineering', email:'t.taylor@acmecorp.com' },
  { username:'j.anderson', password:'JenA#Corp', name:'Jennifer Anderson', role:'Lead Developer', dept:'Engineering', email:'j.anderson@acmecorp.com' },
  { username:'k.thomas', password:'Kevin@Dev', name:'Kevin Thomas', role:'Backend Engineer', dept:'Engineering', email:'k.thomas@acmecorp.com' },
  { username:'developer', password:'Dev@2024!', name:'Developer Account', role:'Developer', dept:'Engineering', email:'developer@acmecorp.com' },
  { username:'dbadmin', password:'DBAdmin#2024', name:'DB Administrator', role:'DBA', dept:'IT', email:'dbadmin@acmecorp.com' },

  // HR tier
  { username:'hr.manager', password:'HRManager@24', name:'HR Manager', role:'HR Manager', dept:'HR', email:'hr.manager@acmecorp.com' },
  { username:'p.jackson', password:'PatJ@2024', name:'Patricia Jackson', role:'HR Director', dept:'HR', email:'p.jackson@acmecorp.com' },

  // Security tier — highest value honeypot
  { username:'security', password:'Security@2024', name:'Security Team', role:'Security Analyst', dept:'Security', email:'security@acmecorp.com' },
  { username:'firewall', password:'Firewall#123', name:'Firewall Admin', role:'Network Admin', dept:'Security', email:'firewall@acmecorp.com' },

  // Generic accounts attackers commonly try
  { username:'guest', password:'guest', name:'Guest Account', role:'Guest', dept:'General', email:'guest@acmecorp.com' },
  { username:'test', password:'test123', name:'Test Account', role:'Tester', dept:'QA', email:'test@acmecorp.com' },
  { username:'backup', password:'Backup@2024', name:'Backup Admin', role:'Backup Operator', dept:'IT', email:'backup@acmecorp.com' },
  { username:'service', password:'Service#123', name:'Service Account', role:'Service User', dept:'IT', email:'service@acmecorp.com' },
  { username:'operator', password:'Operator@24', name:'System Operator', role:'Operator', dept:'Operations', email:'operator@acmecorp.com' },
  { username:'monitor', password:'Monitor#2024', name:'Monitor Admin', role:'Monitor', dept:'IT', email:'monitor@acmecorp.com' },
  { username:'root', password:'root123', name:'Root Account', role:'Root', dept:'IT', email:'root@acmecorp.com' },
]

// Generate random employees dynamically on startup
export const generateRandomEmployees = (count = 20) => {
  const firstNames = ['James','Emma','Oliver','Sophia','William','Isabella','Benjamin','Mia','Lucas','Charlotte','Henry','Amelia','Alexander','Harper','Mason','Evelyn','Ethan','Abigail','Daniel','Emily']
  const lastNames = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Wilson','Taylor','Anderson','Thomas','Jackson','White','Harris','Martin','Thompson','Moore','Allen','Young']
  const roles = ['Analyst','Manager','Director','Engineer','Coordinator','Specialist','Administrator','Consultant','Supervisor','Executive']
  const depts = ['Finance','Engineering','Marketing','Sales','HR','Operations','IT','Legal','Security','Research']

  return Array.from({ length: count }, (_, i) => {
    const first = firstNames[Math.floor(Math.random() * firstNames.length)]
    const last = lastNames[Math.floor(Math.random() * lastNames.length)]
    const role = roles[Math.floor(Math.random() * roles.length)]
    const dept = depts[Math.floor(Math.random() * depts.length)]
    const username = `${first.toLowerCase()[0]}.${last.toLowerCase()}${Math.floor(Math.random()*99)}`
    const password = `${last}@${2020 + Math.floor(Math.random()*5)}!`
    return {
      username,
      password,
      name: `${first} ${last}`,
      role,
      dept,
      email: `${username}@acmecorp.com`,
      isRandom: true
    }
  })
}

// Combine all employees
export const ALL_EMPLOYEES = [
  ...FIXED_EMPLOYEES,
  ...generateRandomEmployees(20)
]
