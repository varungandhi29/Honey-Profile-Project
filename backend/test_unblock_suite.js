import { io as ioClient } from '../frontend/node_modules/socket.io-client/build/esm/index.js'
import mongoose from 'mongoose'
import BlockedIP from './models/BlockedIP.js'
import BlockedFingerprint from './models/BlockedFingerprint.js'
import ExemptedIP from './models/ExemptedIP.js'
import AuditLog from './models/AuditLog.js'
import Session from './models/Session.js'
import { checkIPReputation } from './services/ipReputationService.js'

const BASE_URL = 'http://localhost:3001'

let adminToken = ''
let results = []

function assert(condition, name, detail = '') {
  if (condition) {
    console.log(`  ✅ [PASS] ${name} ${detail}`)
    results.push({ name, pass: true, detail })
  } else {
    console.error(`  ❌ [FAIL] ${name} ${detail}`)
    results.push({ name, pass: false, detail })
    throw new Error(`Assertion failed: ${name} — ${detail}`)
  }
}

async function runSuite() {
  console.log('\n======================================================')
  console.log('🚀 HONEYSHIELD UNBLOCK & ACTIVE DEFENSE VERIFICATION SUITE')
  console.log('======================================================\n')

  // Step 0: Get mongoUri and connect mongoose
  console.log('--- SETUP: Connecting to Live Database ---')
  const healthRes = await fetch(`${BASE_URL}/api/health`)
  const healthData = await healthRes.json()
  assert(healthData.status === 'ok' && healthData.mongoUri, 'Backend Online & Reporting Mongo URI', healthData.mongoUri)

  await mongoose.connect(healthData.mongoUri)
  assert(mongoose.connection.readyState === 1, 'Mongoose Connected to Live Database')

  // Authenticate Admin to get Bearer Token
  console.log('\n--- SETUP: Authenticating Admin ---')
  const authRes = await fetch(`${BASE_URL}/api/auth/admin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  })
  const authData = await authRes.json()
  assert(authRes.status === 200 && authData.token, 'Admin Authentication Successful', `Token: ${authData.token?.substring(0, 16)}...`)
  adminToken = authData.token
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  }

  // =========================================================================
  // TEST 1: Idempotency (Clean 200 on repeat unblock)
  // =========================================================================
  console.log('\n--- TEST 1: Idempotency (Clean 200 on repeat unblock) ---')
  const testIP1 = '198.51.100.51'
  // Block first
  await fetch(`${BASE_URL}/api/blocklist`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ ip: testIP1, reason: 'Test 1 Block' })
  })
  // First unblock
  const unblock1 = await fetch(`${BASE_URL}/api/blocklist/${testIP1}`, {
    method: 'DELETE',
    headers: authHeaders
  })
  const u1Data = await unblock1.json()
  assert(unblock1.status === 200 && u1Data.cleared?.ip === true, 'First Unblock IP returns 200 OK and cleared.ip === true')

  // Second unblock (repeat / already unblocked)
  const unblock1Repeat = await fetch(`${BASE_URL}/api/blocklist/${testIP1}`, {
    method: 'DELETE',
    headers: authHeaders
  })
  const u1RepeatData = await unblock1Repeat.json()
  assert(unblock1Repeat.status === 200, 'Second Unblock returns 200 OK (no crash)')
  assert(u1RepeatData.notice && u1RepeatData.notice.includes('idempotent no-op'), 'Notice indicates clean idempotent no-op', `Notice: ${u1RepeatData.notice}`)

  // =========================================================================
  // TEST 2: Redis restart / cache loss for datacenter exemption
  // =========================================================================
  console.log('\n--- TEST 2: Redis Restart & Exemption Repopulation (Datacenter IP stays unblocked) ---')
  const dcIP = '34.64.10.5' // Datacenter range (Google Cloud 34.64.0.0/11)
  // Block it
  await fetch(`${BASE_URL}/api/blocklist`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ ip: dcIP, reason: 'Datacenter test block' })
  })
  // Unblock client (should trigger conditional 24h exemption)
  const dcUnblock = await fetch(`${BASE_URL}/api/blocklist/unblock-client`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ ip: dcIP, reason: 'Test 2 unblock' })
  })
  const dcUnblockData = await dcUnblock.json()
  assert(dcUnblockData.cleared?.vpnExempted === true, 'Conditional VPN exemption granted for datacenter IP')

  // Verify MongoDB document exists
  const mongoExemption = await ExemptedIP.findOne({ ip: dcIP })
  assert(mongoExemption !== null, 'ExemptedIP document exists in MongoDB', `Expires: ${mongoExemption?.expiresAt}`)

  // Simulate complete Redis restart / cache loss using test helper
  await fetch(`${BASE_URL}/api/blocklist/test-cache-del`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: `exempt:vpn:${dcIP}` })
  })

  // Check IP reputation — service should detect cache miss, load from Mongo, and repopulate Redis
  const repAfterRestart = await checkIPReputation(dcIP)
  assert(repAfterRestart.suspicious === false, 'IP reputation reports NOT suspicious (exemption honored after cache loss)')

  // Client on datacenter IP registers session — must NOT be blocked
  const sessRegRes = await fetch(`${BASE_URL}/api/session/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ip: dcIP, username: 'testuser', browser: 'Chrome', os: 'Windows' })
  })
  const sessRegData = await sessRegRes.json()
  assert(sessRegRes.status === 200 && sessRegData.blocked !== true, 'Datacenter client cleanly registers session after Redis restart without reblock')

  // =========================================================================
  // TEST 3: NAT Isolation (Device FP_A under IP stays blocked when IP is unblocked)
  // =========================================================================
  console.log('\n--- TEST 3: NAT Isolation (FP_A stays blocked after IP unblock) ---')
  const sharedIP = '203.0.113.88'
  const fpAttacker = 'FP_NAT_ATTACKER_ALPHA_999'
  const fpInnocent = 'FP_NAT_INNOCENT_BETA_888'

  // Block shared IP and block Attacker FP
  await fetch(`${BASE_URL}/api/blocklist`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ ip: sharedIP, reason: 'NAT IP block' })
  })
  await fetch(`${BASE_URL}/api/blocklist/fingerprint`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ fingerprint: fpAttacker, reason: 'Attacker device on NAT' })
  })

  // Admin performs "Unblock IP" action only
  const unblockSharedIP = await fetch(`${BASE_URL}/api/blocklist/${sharedIP}`, {
    method: 'DELETE',
    headers: authHeaders
  })
  assert(unblockSharedIP.status === 200, 'Unblock IP action succeeded for shared IP')

  // Verify shared IP is unblocked in DB
  const ipCheck = await BlockedIP.findOne({ ip: sharedIP })
  assert(ipCheck === null, 'Shared IP is removed from BlockedIP collection')

  // Verify Device A (Attacker FP) STAYS BLOCKED in MongoDB
  const fpAttackerCheck = await BlockedFingerprint.findOne({ fingerprint: fpAttacker })
  assert(fpAttackerCheck !== null, 'Device A (Attacker FP) remains quarantined in MongoDB BlockedFingerprint')

  // Verify Device B (Innocent FP) is NOT blocked
  const fpInnocentCheck = await BlockedFingerprint.findOne({ fingerprint: fpInnocent })
  assert(fpInnocentCheck === null, 'Device B (Innocent FP) is completely unblocked and clean')

  // Clean up attacker FP
  await fetch(`${BASE_URL}/api/blocklist/fingerprint/${fpAttacker}`, { method: 'DELETE', headers: authHeaders })

  // =========================================================================
  // TEST 4: Threshold recovery (Client after failed attempts can attempt fresh login after unblock)
  // =========================================================================
  console.log('\n--- TEST 4: Threshold Recovery (Failed attempt counters reset) ---')
  const thresholdIP = '198.51.100.77'
  // Populate failed counters in cache via test helper
  await fetch(`${BASE_URL}/api/blocklist/test-cache-set`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: `fails:${thresholdIP}`, value: { count: 5, lastAttempt: Date.now() } })
  })
  await fetch(`${BASE_URL}/api/blocklist/test-cache-set`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: `rapid:${thresholdIP}`, value: { count: 12, lastAttempt: Date.now() } })
  })
  await fetch(`${BASE_URL}/api/blocklist/test-cache-set`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: `blocked:${thresholdIP}`, value: { blocked: true, reason: 'BRUTE_FORCE' } })
  })

  // Full client unblock
  const threshUnblock = await fetch(`${BASE_URL}/api/blocklist/unblock-client`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ ip: thresholdIP, reason: 'Threshold unblock' })
  })
  const threshData = await threshUnblock.json()
  assert(threshData.cleared?.redisFails === true, 'Redis failed login attempts counter cleared')
  assert(threshData.cleared?.redisRapid === true, 'Redis rapid probe counter cleared')

  // =========================================================================
  // TEST 5: Oracle Protection & Caller-Only Check
  // =========================================================================
  console.log('\n--- TEST 5: Oracle Protection (/check-status ignores ?ip=, no reason leaked, mismatched FP ignored) ---')
  const victimIP = '198.51.100.12'
  // Block victim IP in database
  await BlockedIP.create({ ip: victimIP, blockedBy: 'admin', reason: 'CONFIDENTIAL_CLASSIFIED_BLOCK' })
  await fetch(`${BASE_URL}/api/blocklist/test-cache-set`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: `blocked:${victimIP}`, value: { blocked: true, reason: 'CONFIDENTIAL_CLASSIFIED_BLOCK' } })
  })

  // Query /check-status with spoofed ?ip= query parameter
  const probeStatus = await fetch(`${BASE_URL}/api/blocklist/check-status?ip=${victimIP}`)
  const probeData = await probeStatus.json()
  assert(probeData.blocked === false, '/check-status ignored query param ?ip= (evaluated caller socket/local IP instead)')
  assert(probeData.reason === undefined, 'No block reason or classifier leaked in response')
  assert(Object.keys(probeData).length === 1 && probeData.blocked !== undefined, 'Response strictly contains ONLY { blocked: boolean }')

  // Test mismatched fingerprint: submit a blocked fingerprint that belongs to no active session
  const fakeFP = 'FP_RANDOM_PROBE_HASH_NOT_LINKED'
  await BlockedFingerprint.create({ fingerprint: fakeFP, blockedBy: 'admin', reason: 'Secret rule' })
  await fetch(`${BASE_URL}/api/blocklist/test-cache-set`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: `blocked:fp:${fakeFP}`, value: { blocked: true } })
  })

  const fpProbe = await fetch(`${BASE_URL}/api/blocklist/check-status?fingerprint=${fakeFP}`)
  const fpProbeData = await fpProbe.json()
  assert(fpProbeData.blocked === false, 'Mismatched fingerprint not associated with active session was safely ignored')

  // Clean up
  await BlockedIP.deleteOne({ ip: victimIP })
  await BlockedFingerprint.deleteOne({ fingerprint: fakeFP })

  // =========================================================================
  // TEST 6: Rate Limiting (>40 req/min throttled with HTTP 429)
  // =========================================================================
  console.log('\n--- TEST 6: Rate Limiting (>40 req/min on /check-status throttled with HTTP 429) ---')
  let got429 = false
  for (let i = 1; i <= 45; i++) {
    const res = await fetch(`${BASE_URL}/api/blocklist/check-status`)
    if (res.status === 429) {
      got429 = true
      console.log(`    Request #${i} returned HTTP 429 Too Many Requests`)
      break
    }
  }
  assert(got429, 'Rate limiter throttled requests exceeding 40/min with HTTP 429')

  // =========================================================================
  // TEST 7: Admin Lockout Prevention (C3)
  // =========================================================================
  console.log('\n--- TEST 7: Admin Lockout Prevention (Authenticated admin can access panel even if IP is blocked) ---')
  const localAdminIP = '127.0.0.1'
  await BlockedIP.create({ ip: localAdminIP, blockedBy: 'admin', reason: 'Accidental self-block' })
  await fetch(`${BASE_URL}/api/blocklist/test-cache-set`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: `blocked:${localAdminIP}`, value: { blocked: true } })
  })

  // Admin access WITH token
  const adminAccess = await fetch(`${BASE_URL}/api/blocklist/exemptions`, {
    headers: authHeaders
  })
  assert(adminAccess.status === 200, 'Authenticated admin accessed panel with Bearer token despite IP block')

  // Unauthenticated access WITHOUT token
  const unauthAccess = await fetch(`${BASE_URL}/api/blocklist/exemptions`)
  assert(unauthAccess.status === 401, 'Unauthenticated request rejected with HTTP 401')

  // Clean up
  await BlockedIP.deleteOne({ ip: localAdminIP })
  await fetch(`${BASE_URL}/api/blocklist/test-cache-del`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: `blocked:${localAdminIP}` })
  })

  // =========================================================================
  // TEST 8: Conditional Exemption C1 (Residential IP gets NO ExemptedIP record; Datacenter IP DOES get one)
  // =========================================================================
  console.log('\n--- TEST 8: Conditional Exemption C1 (Residential vs Datacenter IP) ---')
  const residentialIP = '198.51.100.22'
  const datacenterIP = '35.200.50.10' // Google Cloud Range

  // Unblock residential IP
  const resUnblock = await fetch(`${BASE_URL}/api/blocklist/unblock-client`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ ip: residentialIP, reason: 'Residential unblock' })
  })
  const resData = await resUnblock.json()
  assert(resData.cleared?.vpnExempted === false, 'Residential IP cleared.vpnExempted is false')
  const resExemptionDoc = await ExemptedIP.findOne({ ip: residentialIP })
  assert(resExemptionDoc === null, 'No ExemptedIP record created in MongoDB for residential IP')

  // Unblock datacenter IP
  const dcUnblock2 = await fetch(`${BASE_URL}/api/blocklist/unblock-client`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ ip: datacenterIP, reason: 'Datacenter unblock' })
  })
  const dcData2 = await dcUnblock2.json()
  assert(dcData2.cleared?.vpnExempted === true, 'Datacenter IP cleared.vpnExempted is true')
  const dcExemptionDoc = await ExemptedIP.findOne({ ip: datacenterIP })
  assert(dcExemptionDoc !== null, 'ExemptedIP record successfully created in MongoDB for datacenter IP', `Original reason: ${dcExemptionDoc?.originalReason}`)

  // =========================================================================
  // TEST 9: Live UI / Socket Transition (Client unblocked in <2s)
  // =========================================================================
  console.log('\n--- TEST 9: Live UI / Socket Transition (Event emitted and received in real-time) ---')
  const testSocketFP = 'FP_SOCKET_REALTIME_VERIFICATION_TEST'
  const socketClient = ioClient(BASE_URL, { transports: ['websocket'] })

  const socketReady = new Promise((resolve) => {
    socketClient.on('connect', () => {
      socketClient.emit('register_device', { fingerprint: testSocketFP })
      resolve()
    })
  })
  await socketReady

  const eventPromise = new Promise((resolve, reject) => {
    const startT = Date.now()
    const timer = setTimeout(() => reject(new Error('Socket event timeout (>2000ms)')), 2000)
    socketClient.on('client_unblocked', (data) => {
      clearTimeout(timer)
      const elapsed = Date.now() - startT
      resolve({ data, elapsed })
    })
  })

  // Trigger unblock
  await fetch(`${BASE_URL}/api/blocklist/unblock-client`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ ip: '198.51.100.123', fingerprint: testSocketFP, reason: 'Live Socket Test' })
  })

  const { data: socketData, elapsed } = await eventPromise
  assert(elapsed < 2000, `client_unblocked socket event received in ${elapsed}ms (< 2000ms threshold)`)
  assert(socketData.type === 'CLIENT' && socketData.fingerprint === testSocketFP, 'Socket event received targeted payload with matching fingerprint')
  socketClient.disconnect()

  // =========================================================================
  // TEST 10: Partial Failure Tracking & Audit Log Verification
  // =========================================================================
  console.log('\n--- TEST 10: AuditLog Verification & Partial Failure Reporting ---')
  // Verify AuditLog entries
  const recentAudit = await AuditLog.findOne({ action: 'UNBLOCK_CLIENT' }).sort({ timestamp: -1 })
  assert(recentAudit !== null, 'AuditLog entry with action UNBLOCK_CLIENT successfully logged in MongoDB')
  assert(recentAudit?.admin === 'admin', 'AuditLog.admin accurately recorded authenticated admin username')
  assert(recentAudit?.details?.cleared !== undefined, 'AuditLog contains granular lifecycle details')

  // Verify 400 Bad Request on invalid call
  const invalidCall = await fetch(`${BASE_URL}/api/blocklist/unblock-client`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({})
  })
  assert(invalidCall.status === 400, 'Empty unblock request safely rejected with HTTP 400 Bad Request')

  console.log('\n======================================================')
  console.log('🎉 ALL 10 VERIFICATION TESTS COMPLETED AND PASSED!')
  console.log('======================================================\n')
  await mongoose.disconnect()
  process.exit(0)
}

runSuite().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err)
  process.exit(1)
})
