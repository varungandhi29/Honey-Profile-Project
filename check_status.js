const urls = [
  { name: 'Finance Portal Frontend', url: 'http://localhost:3002' },
  { name: 'Finance Portal Backend',  url: 'http://localhost:4000/api/health' },
  { name: 'Bridge Layer Service',    url: 'http://localhost:3500/api/health' },
  { name: 'HoneyShield Frontend',    url: 'http://localhost:5173' },
  { name: 'HoneyShield Backend',     url: 'http://localhost:3001/api/health' }
]

async function check() {
  console.log('\n================ LIVE SYSTEM STATUS ================')
  for (const s of urls) {
    try {
      const res = await fetch(s.url, { signal: AbortSignal.timeout(3000) })
      console.log(`✅ [ONLINE]  ${s.name.padEnd(25)} -> ${s.url.padEnd(38)} (Status: ${res.status})`)
    } catch (e) {
      console.log(`❌ [OFFLINE] ${s.name.padEnd(25)} -> ${s.url.padEnd(38)} (${e.message})`)
    }
  }
  console.log('====================================================\n')
}

check()
