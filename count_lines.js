import fs from 'fs'

const files = [
  'c:/Users/DELL/Desktop/FinancePortal/backend/server.js',
  'c:/Users/DELL/Desktop/FinancePortal/backend/models/Employee.js',
  'c:/Users/DELL/Desktop/FinancePortal/backend/data/financeData.js',
  'c:/Users/DELL/Desktop/FinancePortal/backend/package.json',
  'c:/Users/DELL/Desktop/FinancePortal/backend/Dockerfile',
  'c:/Users/DELL/Desktop/FinancePortal/frontend/src/App.jsx',
  'c:/Users/DELL/Desktop/FinancePortal/frontend/src/pages/LoginPage.jsx',
  'c:/Users/DELL/Desktop/FinancePortal/frontend/src/pages/Dashboard.jsx',
  'c:/Users/DELL/Desktop/FinancePortal/frontend/src/utils/location.js',
  'c:/Users/DELL/Desktop/FinancePortal/frontend/src/utils/fingerprint.js',
  'c:/Users/DELL/Desktop/FinancePortal/frontend/package.json',
  'c:/Users/DELL/Desktop/FinancePortal/frontend/Dockerfile',
  'c:/Users/DELL/Desktop/BridgeLayer/server.js',
  'c:/Users/DELL/Desktop/BridgeLayer/package.json',
  'c:/Users/DELL/Desktop/BridgeLayer/Dockerfile',
  'c:/Users/DELL/Desktop/Honey-Profile-Project/backend/routes/bridge.js',
  'c:/Users/DELL/Desktop/Honey-Profile-Project/backend/server.js',
  'c:/Users/DELL/Desktop/Honey-Profile-Project/frontend/src/pages/admin/BridgeMonitorPage.jsx',
  'c:/Users/DELL/Desktop/Honey-Profile-Project/frontend/src/engine/constants.js',
  'c:/Users/DELL/Desktop/Honey-Profile-Project/frontend/src/pages/AdminDashboard.jsx',
  'c:/Users/DELL/Desktop/Honey-Profile-Project/frontend/src/hooks/useSocket.js',
  'c:/Users/DELL/Desktop/Honey-Profile-Project/frontend/src/pages/LoginPage.jsx',
  'c:/Users/DELL/Desktop/Honey-Profile-Project/frontend/src/App.jsx',
  'c:/Users/DELL/Desktop/docker-compose.all.yml'
]

console.log('| Component | File Path | Line Count |')
console.log('|---|---|---|')
for (const f of files) {
  try {
    const content = fs.readFileSync(f, 'utf8')
    const lines = content.split('\n').length
    console.log(`| ${f.split('/')[4]} | ${f.replace('c:/Users/DELL/Desktop/', '')} | ${lines} lines |`)
  } catch (e) {
    console.log(`| ERROR | ${f} | ${e.message} |`)
  }
}
