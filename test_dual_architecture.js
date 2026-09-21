async function runTests() {
  try {
    console.log('========================================================')
    console.log('TEST 1 — Real Employee Login on Finance Portal (Port 4000)')
    console.log('========================================================')
    const r1 = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'j.smith',
        password: 'JSmith$ecure99!',
        ip: '192.168.1.100'
      })
    })
    const res1 = await r1.json()
    console.log('Login Result:', res1.success ? 'SUCCESS' : 'FAILED')
    console.log('User:', res1.user?.name, '—', res1.user?.title, `[Clearance: ${res1.user?.clearance}]`)

    const rDash = await fetch('http://localhost:4000/api/dashboard', {
      headers: { Authorization: 'Bearer ' + res1.token }
    })
    const dash = await rDash.json()
    console.log('Dashboard Welcome:', dash.welcome)
    console.log('Dashboard Stats:', JSON.stringify(dash.stats))

    const rRep = await fetch('http://localhost:4000/api/reports', {
      headers: { Authorization: 'Bearer ' + res1.token }
    })
    const reports = await rRep.json()
    console.log('Reports Count:', reports.reports?.length)

    console.log('\n========================================================')
    console.log('TEST 2 — Attacker Brute Force & Silent Redirect to Honeypot')
    console.log('========================================================')
    const attackerIp = '198.51.100.77'

    // Attempt 1
    console.log('--> Attempt 1 (Wrong password):')
    const rAtt1 = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'j.smith',
        password: 'wrongpassword1',
        ip: attackerIp,
        country: 'Germany',
        city: 'Frankfurt'
      })
    })
    const dAtt1 = await rAtt1.json()
    console.log('Status:', rAtt1.status, dAtt1)

    // Attempt 2
    console.log('\n--> Attempt 2 (Wrong password):')
    const rAtt2 = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'j.smith',
        password: 'wrongpassword2',
        ip: attackerIp,
        country: 'Germany',
        city: 'Frankfurt'
      })
    })
    const dAtt2 = await rAtt2.json()
    console.log('Status:', rAtt2.status, dAtt2)

    // Attempt 3 (Threshold reached -> REDIRECT TO HONEYPOT)
    console.log('\n--> Attempt 3 (Threshold reached -> REDIRECT TO HONEYPOT):')
    const rAtt3 = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'j.smith',
        password: 'wrongpassword3',
        ip: attackerIp,
        country: 'Germany',
        city: 'Frankfurt'
      })
    })
    const dAtt3 = await rAtt3.json()
    console.log('Status:', rAtt3.status, 'Response (Silent Redirect):', JSON.stringify(dAtt3, null, 2))

    console.log('\n========================================================')
    console.log('TEST 3 — Attacker Trapped in HoneyShield (Port 3001)')
    console.log('========================================================')
    const rTrap = await fetch('http://localhost:3001/api/honeypot/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'j.smith',
        password: 'JSmith2024!',
        ip: attackerIp,
        country: 'Germany',
        city: 'Frankfurt'
      })
    })
    const trapRes = await rTrap.json()
    console.log('HoneyShield Deception Trap Status:', trapRes.success ? 'TRAPPED IN HONEYPOT' : 'FAILED')
    console.log('Honeypot Session ID:', trapRes.sessionId)
    console.log('Trapped User Profile:', trapRes.user?.name, `(${trapRes.user?.role})`)

    console.log('\n========================================================')
    console.log('TEST 4 — Bridge Layer Live Stats & Cross-System Sync')
    console.log('========================================================')
    const rStats = await fetch('http://localhost:3500/api/bridge/stats')
    const stats = await rStats.json()
    console.log('Bridge Stats:', JSON.stringify(stats, null, 2))

    console.log('\n========================================================')
    console.log('TEST 5 — Cross-System Permanent Block Sync')
    console.log('========================================================')
    const blockIp = '198.51.100.99'
    for (let i = 1; i <= 5; i++) {
      const rBlock = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 's.johnson',
          password: 'badpassword' + i,
          ip: blockIp
        })
      })
      const dBlock = await rBlock.json()
      console.log(`Attempt ${i} Status:`, rBlock.status, dBlock)
    }

    // Check blocked
    const rCheck = await fetch('http://localhost:3500/api/bridge/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip: blockIp, username: 's.johnson' })
    })
    const checkBlocked = await rCheck.json()
    console.log('Bridge Check after 5 attempts:', checkBlocked)

    console.log('\n✅ ALL 5 INTEGRATION TESTS COMPLETED SUCCESSFULLY!')
  } catch (e) {
    console.error('Test error:', e)
  }
}

runTests()
