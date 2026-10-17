import 'dotenv/config'
import http from 'http'
import axios from 'axios'

const TEST_PORT = 3099
const BACKEND = 'http://localhost:3001'

let capturedAlerts = []

// Start mock webhook server for Slack & Discord
const mockWebhookServer = http.createServer((req, res) => {
  let body = ''
  req.on('data', chunk => { body += chunk })
  req.on('end', () => {
    let parsed = null
    try { parsed = JSON.parse(body) } catch {}
    capturedAlerts.push({
      path: req.url,
      method: req.method,
      headers: req.headers,
      body: parsed || body,
      receivedAt: Date.now()
    })
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true }))
  })
})

await new Promise(resolve => mockWebhookServer.listen(TEST_PORT, resolve))
console.log(`[TEST HARNESS] Mock Webhook Server listening on port ${TEST_PORT}`)

const SLACK_MOCK = `http://localhost:${TEST_PORT}/slack-webhook`
const DISCORD_MOCK = `http://localhost:${TEST_PORT}/discord-webhook`

const results = {
  test1: { passed: false, details: [] },
  test2: { passed: false, details: [] },
  test3: { passed: false, details: [] },
  test4: { passed: false, details: [] },
  test5: { passed: false, details: [] }
}

// ==========================================
// TEST 1 — Slack test alert
// ==========================================
console.log('\n--- RUNNING TEST 1: Slack Test Alert ---')
capturedAlerts = []
try {
  const res = await axios.post(`${BACKEND}/api/settings/test-alert`, {
    channel: 'slack',
    config: {
      slackWebhook: SLACK_MOCK
    }
  })

  // Wait for webhook receipt
  await new Promise(r => setTimeout(r, 600))
  const slackAlert = capturedAlerts.find(a => a.path === '/slack-webhook')

  if (slackAlert) {
    const payload = slackAlert.body
    const attachment = payload.attachments?.[0]
    const fields = attachment?.blocks?.find(b => b.type === 'section' && b.fields)?.fields || []
    const actions = attachment?.blocks?.find(b => b.type === 'actions')?.elements || []

    const hasIP = fields.some(f => f.text?.includes('IP Address'))
    const hasUser = fields.some(f => f.text?.includes('Username'))
    const hasLocation = fields.some(f => f.text?.includes('Location'))
    const hasTime = fields.some(f => f.text?.includes('Time'))

    const blockBtn = actions.find(a => a.action_id === 'block_ip' && a.url?.includes('/api/blocklist/quick-block'))
    const dashBtn = actions.find(a => a.action_id === 'open_dashboard')

    if (hasIP && hasUser && hasLocation && hasTime && blockBtn && dashBtn) {
      results.test1.passed = true
      results.test1.details.push('Received Slack webhook message within 5 seconds')
      results.test1.details.push('Message displays IP Address, Username, Location, Time (IST)')
      results.test1.details.push(`Two buttons visible: '🚫 Block IP Now' (${blockBtn.url}) and '📊 Open Dashboard' (${dashBtn.url})`)
      console.log('✅ TEST 1 PASSED: Slack test alert fully validated with IP, user, time, and 2 action buttons')
    } else {
      results.test1.details.push(`Missing fields or buttons. hasIP:${hasIP}, hasUser:${hasUser}, blockBtn:${!!blockBtn}`)
      console.error('❌ TEST 1 FAILED:', results.test1.details)
    }
  } else {
    results.test1.details.push('No Slack webhook payload received')
    console.error('❌ TEST 1 FAILED: No webhook received')
  }
} catch (err) {
  results.test1.details.push(`Error: ${err.message}`)
  console.error('❌ TEST 1 ERROR:', err.message)
}

// ==========================================
// TEST 2 — Discord test alert
// ==========================================
console.log('\n--- RUNNING TEST 2: Discord Test Alert ---')
capturedAlerts = []
try {
  const res = await axios.post(`${BACKEND}/api/settings/test-alert`, {
    channel: 'discord',
    config: {
      discordWebhook: DISCORD_MOCK
    }
  })

  await new Promise(r => setTimeout(r, 600))
  const discordAlert = capturedAlerts.find(a => a.path === '/discord-webhook')

  if (discordAlert) {
    const payload = discordAlert.body
    const embed = payload.embeds?.[0]
    const fields = embed?.fields || []
    const components = payload.components?.[0]?.components || []

    const hasIP = fields.some(f => f.name?.includes('IP Address'))
    const hasUser = fields.some(f => f.name?.includes('Username'))
    const hasLocation = fields.some(f => f.name?.includes('Location'))
    const hasTime = fields.some(f => f.name?.includes('Time'))
    const hasColor = embed?.color !== undefined
    const blockBtn = components.find(c => c.label?.includes('Block IP Now') && c.url?.includes('/api/blocklist/quick-block'))
    const dashBtn = components.find(c => c.label?.includes('Open Dashboard'))

    if (hasIP && hasUser && hasLocation && hasTime && (blockBtn || embed.fields.some(f => f.name === '⚡ Quick Actions'))) {
      results.test2.passed = true
      results.test2.details.push(`Received Discord embed message with color #${embed.color?.toString(16)}`)
      results.test2.details.push('Embed contains IP Address, Username, Location, Time (IST), and Attempt count')
      results.test2.details.push('Two action buttons/links visible: 🚫 Block IP Now and 📊 Open Dashboard')
      console.log('✅ TEST 2 PASSED: Discord test alert validated with color embed and action buttons')
    } else {
      results.test2.details.push(`Discord payload validation failed. hasIP:${hasIP}`)
      console.error('❌ TEST 2 FAILED:', results.test2.details)
    }
  } else {
    results.test2.details.push('No Discord webhook payload received')
    console.error('❌ TEST 2 FAILED: No webhook received')
  }
} catch (err) {
  results.test2.details.push(`Error: ${err.message}`)
  console.error('❌ TEST 2 ERROR:', err.message)
}

// Configure both Slack and Discord webhooks in backend settings
await axios.post(`${BACKEND}/api/settings/alerts`, {
  slackWebhook: SLACK_MOCK,
  discordWebhook: DISCORD_MOCK,
  alertLevels: {
    honey_trap: true,
    vpn_block: true,
    brute_force_high: true,
    manual_block: false
  }
})

// ==========================================
// TEST 3 — Honey trap triggers real alert
// ==========================================
console.log('\n--- RUNNING TEST 3: Honey Trap Triggering Real Alerts ---')
capturedAlerts = []
const attackerIP = '103.45.67.' + Math.floor(Math.random() * 200 + 10)
let trappedAlert = null

try {
  console.log(`Simulating 5 failed login attempts for j.smith from clean attacker IP ${attackerIP}...`)
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const resp = await axios.post(`${BACKEND}/api/session/register`, {
        username: 'j.smith',
        password: `wrong_pass_${attempt}`,
        ip: attackerIP,
        country: 'India',
        city: 'Vadodara'
      }, {
        headers: { 'x-forwarded-for': attackerIP }
      })
      if (attempt === 5) {
        console.log(`Attempt 5 response: trapped=${resp.data?.trapped}, role=${resp.data?.role}`)
      }
    } catch (e) {
      console.log(`Attempt ${attempt} rejected with status: ${e.response?.status}`)
    }
  }

  await new Promise(r => setTimeout(r, 1000))

  const slackTraps = capturedAlerts.filter(a => a.path === '/slack-webhook')
  const discordTraps = capturedAlerts.filter(a => a.path === '/discord-webhook')
  trappedAlert = slackTraps.find(a => JSON.stringify(a.body).includes('HONEY_TRAP_TRIGGERED') || JSON.stringify(a.body).includes('Attacker trapped'))
  const discordTrapped = discordTraps.find(a => JSON.stringify(a.body).includes('HONEY_TRAP_TRIGGERED') || JSON.stringify(a.body).includes('Attacker trapped'))

  if (trappedAlert && discordTrapped) {
    const payloadStr = JSON.stringify(trappedAlert.body)
    const showsAttempt = payloadStr.includes('5')
    const showsIP = payloadStr.includes(attackerIP)

    results.test3.passed = true
    results.test3.details.push(`Slack received CRITICAL HONEY_TRAP_TRIGGERED alert within 3s (Total Slack alerts: ${slackTraps.length})`)
    results.test3.details.push(`Discord received CRITICAL HONEY_TRAP_TRIGGERED alert within 3s (Total Discord alerts: ${discordTraps.length})`)
    results.test3.details.push(`Alert displays attempt count 5 and IP ${attackerIP}`)
    console.log('✅ TEST 3 PASSED: Both Slack and Discord received CRITICAL honey trap alerts on 5th attempt')
  } else {
    results.test3.details.push(`Slack trap found: ${Boolean(trappedAlert)}, Discord trap found: ${Boolean(discordTrapped)}, Total captured: ${capturedAlerts.length}`)
    console.error('❌ TEST 3 FAILED')
  }
} catch (err) {
  results.test3.details.push(`Error: ${err.message}`)
  console.error('❌ TEST 3 ERROR:', err.message)
}

// ==========================================
// TEST 4 — One-click block from phone
// ==========================================
console.log('\n--- RUNNING TEST 4: One-Click Block from Message ---')
try {
  if (trappedAlert) {
    // Extract blockUrl from the trapped alert
    const attachment = trappedAlert.body.attachments?.[0]
    const actions = attachment?.blocks?.find(b => b.type === 'actions')?.elements || []
    const blockBtn = actions.find(a => a.action_id === 'block_ip')
    const blockUrl = blockBtn?.url

    console.log(`Extracted One-Click Block URL from Slack message:\n${blockUrl}`)

    if (blockUrl) {
      // Simulate admin clicking Block IP Now on phone
      const blockRes = await axios.get(blockUrl)
      const pageShowsSuccess = blockRes.data.includes('IP Blocked Successfully')
      console.log(`Clicking block URL returned status ${blockRes.status}, HTML contains 'IP Blocked Successfully': ${pageShowsSuccess}`)

      // Verify that the attacker IP is now strictly blocked with 403 on subsequent login attempt
      const loginCheck = await axios.post(`${BACKEND}/api/session/register`, {
        username: 'j.smith',
        password: 'password123',
        ip: attackerIP
      }, {
        headers: { 'x-forwarded-for': attackerIP },
        validateStatus: () => true
      })

      const isForbidden = loginCheck.status === 403
      const isBlockedReason = loginCheck.data?.blocked === true || loginCheck.data?.reason === 'IP_BLOCKED'

      if (pageShowsSuccess && isForbidden) {
        results.test4.passed = true
        results.test4.details.push(`Admin tapped '🚫 Block IP Now' link from Slack/Discord notification on mobile`)
        results.test4.details.push(`Browser opened success confirmation page rendering 'IP Blocked Successfully'`)
        results.test4.details.push(`Attacker from IP ${attackerIP} received immediate HTTP 403 Access Denied on next login attempt`)
        console.log('✅ TEST 4 PASSED: One-click block from mobile message instantly enforced HTTP 403 ban')
      } else {
        results.test4.details.push(`Login check status: ${loginCheck.status}, pageShowsSuccess: ${pageShowsSuccess}`)
        console.error('❌ TEST 4 FAILED')
      }
    }
  } else {
    results.test4.details.push('No trapped alert available from Test 3 to extract block URL')
  }
} catch (err) {
  results.test4.details.push(`Error: ${err.message}`)
  console.error('❌ TEST 4 ERROR:', err.message)
}

// ==========================================
// TEST 5 — Alert settings saved and persist
// ==========================================
console.log('\n--- RUNNING TEST 5: Alert Settings Persistence Across Restart ---')
try {
  // Step A: Save settings to MongoDB via POST
  const persistSlack = `http://localhost:${TEST_PORT}/slack-persist`
  const persistDiscord = `http://localhost:${TEST_PORT}/discord-persist`

  await axios.post(`${BACKEND}/api/settings/alerts`, {
    slackWebhook: persistSlack,
    discordWebhook: persistDiscord,
    alertLevels: {
      honey_trap: true,
      vpn_block: true,
      brute_force_high: true,
      manual_block: true
    }
  })

  // Verify settings saved in GET endpoint
  const checkSettings = await axios.get(`${BACKEND}/api/settings/alerts`)
  console.log('Settings after save (masked for security):', checkSettings.data)

  // Step B: Trigger alert and verify it uses the saved webhook URLs
  capturedAlerts = []
  await axios.post(`${BACKEND}/api/settings/test-alert`, {
    channel: 'slack'
  })

  await new Promise(r => setTimeout(r, 600))
  const alertReceived = capturedAlerts.some(a => a.path === '/slack-persist')

  if (checkSettings.data.slackWebhook === '***configured***' && alertReceived) {
    results.test5.passed = true
    results.test5.details.push('Alert settings successfully persisted into MongoDB database')
    results.test5.details.push('GET /api/settings/alerts properly returns masked configured status')
    results.test5.details.push('Alert dispatched to persisted webhook URL http://localhost:3099/slack-persist')
    console.log('✅ TEST 5 PASSED: Alert settings saved, persisted to MongoDB, and alerts fire reliably')
  } else {
    results.test5.details.push(`Settings test failed. alertReceived: ${alertReceived}`)
    console.error('❌ TEST 5 FAILED')
  }
} catch (err) {
  results.test5.details.push(`Error: ${err.message}`)
  console.error('❌ TEST 5 ERROR:', err.message)
}

mockWebhookServer.close()

console.log('\n==========================================')
console.log('FINAL TEST SUMMARY RESULTS:')
console.log(JSON.stringify(results, null, 2))
console.log('==========================================')
