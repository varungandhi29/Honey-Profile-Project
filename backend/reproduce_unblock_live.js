import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import express from 'express'
import { createServer } from 'http'
import fs from 'fs'
import path from 'path'
import blocklistRoutes from './routes/blocklist.js'
import sessionRoutes from './routes/session.js'
import honeypotRoutes from './routes/honeypot.js'
import BlockedIP from './models/BlockedIP.js'
import BlockedFingerprint from './models/BlockedFingerprint.js'
import Session from './models/Session.js'
import Employee from './models/Employee.js'
import { cache } from './services/cacheService.js'
import { initSocket } from './socket.js'
import { initBroadcast } from './services/broadcastService.js'
import { seedEmployees } from './services/employeeService.js'

async function runReproduction() {
  console.log('\n=============================================================')
  console.log('STEP 0: LIVE REPRODUCTION OF UNBLOCK IP BUG')
  console.log('=============================================================\n')

  // 1. Setup DB on drive D (200GB free)
  const dbDir = 'D:\\mongo-tmp\\repro_' + Date.now()
  fs.mkdirSync(dbDir, { recursive: true })
  const mongoServer = await MongoMemoryServer.create({
    instance: { dbPath: dbDir }
  })
  const mongoUri = mongoServer.getUri()
  await mongoose.connect(mongoUri)
  console.log('1. [SETUP] In-memory MongoDB connected at:', mongoUri)

  // 2. Setup Express & Socket
  const app = express()
  const httpServer = createServer(app)
  const io = initSocket(httpServer)
  app.set('io', io)
  initBroadcast(io)
  app.use(express.json())
  app.use('/api/blocklist', blocklistRoutes)
  app.use('/api/session', sessionRoutes)
  app.use('/api/honeypot', honeypotRoutes)

  await new Promise((resolve) => httpServer.listen(0, resolve))
  const port = httpServer.address().port
  const baseUrl = `http://127.0.0.1:${port}`
  console.log('2. [SETUP] Test server listening on:', baseUrl)

  await seedEmployees()

  // -------------------------------------------------------------
  // TEST SCENARIO 1: Client blocked with IP + Fingerprint
  // -------------------------------------------------------------
  console.log('\n--- SCENARIO 1: CLIENT BLOCKED WITH IP & FINGERPRINT ---')
  const clientIP = '198.51.100.50'
  const clientFP = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  const clientSessionId = `SESSION-${Date.now()}`

  // Register session first
  console.log(`[ACTION] Registering session for IP: ${clientIP}, FP: ${clientFP.substr(0,16)}...`)
  const reg1 = await fetch(`${baseUrl}/api/session/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: clientSessionId,
      username: 'attacker1',
      role: 'ATTACKER',
      ip: clientIP,
      fingerprint: clientFP
    })
  })
  console.log('[RESULT] Initial Register HTTP Status:', reg1.status)

  // Admin blocks this IP with fingerprint (or auto-block)
  console.log(`[ACTION] Admin blocks IP: ${clientIP} and FP: ${clientFP.substr(0,16)}...`)
  const blockRes = await fetch(`${baseUrl}/api/blocklist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ip: clientIP,
      blockedBy: 'admin',
      reason: 'Malicious attack detected'
    })
  })
  const fpBlockRes = await fetch(`${baseUrl}/api/blocklist/fingerprint`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fingerprint: clientFP,
      blockedBy: 'admin',
      reason: 'Malicious attack detected',
      associatedIPs: [clientIP]
    })
  })
  console.log('[RESULT] Block IP HTTP Status:', blockRes.status)
  console.log('[RESULT] Block FP HTTP Status:', fpBlockRes.status)

  // Verify MongoDB & Cache state BEFORE unblock
  console.log('\n[STATE BEFORE UNBLOCK]:')
  console.log('  MongoDB BlockedIP:', await BlockedIP.findOne({ ip: clientIP }))
  console.log('  MongoDB BlockedFingerprint:', await BlockedFingerprint.findOne({ fingerprint: clientFP }))
  console.log('  MongoDB Session isBlocked:', (await Session.findOne({ sessionId: clientSessionId }))?.isBlocked)
  console.log('  Cache blocked:${ip}:', await cache.get(`blocked:${clientIP}`))
  console.log('  Cache blocked:fp:${fingerprint}:', await cache.get(`blocked:fp:${clientFP}`))

  // Admin clicks UNBLOCK IP
  console.log(`\n[ACTION] Admin clicks UNBLOCK IP: DELETE ${baseUrl}/api/blocklist/${clientIP}`)
  const unblockRes = await fetch(`${baseUrl}/api/blocklist/${encodeURIComponent(clientIP)}`, {
    method: 'DELETE'
  })
  const unblockJson = await unblockRes.json()
  console.log('[RESULT] DELETE Status:', unblockRes.status, unblockJson)

  // Verify MongoDB & Cache state AFTER unblock
  console.log('\n[STATE AFTER UNBLOCK]:')
  const afterBlockedIP = await BlockedIP.findOne({ ip: clientIP })
  const afterBlockedFP = await BlockedFingerprint.findOne({ fingerprint: clientFP })
  const afterSession = await Session.findOne({ sessionId: clientSessionId })
  const afterCachedIP = await cache.get(`blocked:${clientIP}`)
  const afterCachedFP = await cache.get(`blocked:fp:${clientFP}`)

  console.log('  MongoDB BlockedIP:', afterBlockedIP ? 'STILL PRESENT ❌' : 'DELETED ✅')
  console.log('  MongoDB BlockedFingerprint:', afterBlockedFP ? 'STILL PRESENT ❌' : 'DELETED ✅')
  console.log('  MongoDB Session isBlocked:', afterSession?.isBlocked ? 'STILL TRUE ❌' : 'CLEARED ✅')
  console.log('  Cache blocked:${ip}:', afterCachedIP ? 'STILL PRESENT ❌' : 'DELETED ✅')
  console.log('  Cache blocked:fp:${fingerprint}:', afterCachedFP ? 'STILL PRESENT ❌' : 'DELETED ✅')

  // NEXT CLIENT REQUEST 1: Client tries to register session again
  console.log(`\n[NEXT REQUEST 1] Client attempts to register session (/api/session/register)`)
  const reg2 = await fetch(`${baseUrl}/api/session/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: `SESSION-RECONNECT-${Date.now()}`,
      username: 'attacker1',
      role: 'ATTACKER',
      ip: clientIP,
      fingerprint: clientFP
    })
  })
  const reg2Json = await reg2.json()
  console.log('[RESULT] Next Request 1 HTTP Status:', reg2.status)
  console.log('[RESULT] Next Request 1 Response Body:', reg2Json)
  console.log('[ROOT CAUSE CHECK 1]:', reg2Json.reason === 'FINGERPRINT_BLOCKED' ? 'RE-BLOCKED BY CHECK 3 (FINGERPRINT_BLOCKED)!' : 'ALLOWED')

  // NEXT CLIENT REQUEST 2: Client on same device changes network (new IP, same fingerprint)
  const newIP = '198.51.100.99'
  console.log(`\n[NEXT REQUEST 2] Client changes network (new IP: ${newIP}, same FP) attempts to register`)
  const reg3 = await fetch(`${baseUrl}/api/session/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: `SESSION-NEWNET-${Date.now()}`,
      username: 'attacker1',
      role: 'ATTACKER',
      ip: newIP,
      fingerprint: clientFP
    })
  })
  const reg3Json = await reg3.json()
  console.log('[RESULT] Next Request 2 HTTP Status:', reg3.status)
  console.log('[RESULT] Next Request 2 Response Body:', reg3Json)
  console.log('[ROOT CAUSE CHECK 2]:', reg3Json.reason === 'FINGERPRINT_BLOCKED' ? 'RE-BLOCKED BY CHECK 3 (FINGERPRINT_BLOCKED)!' : 'ALLOWED')

  // -------------------------------------------------------------
  // TEST SCENARIO 2: Datacenter / Cloud / VPN IP
  // -------------------------------------------------------------
  console.log('\n--- SCENARIO 2: DATACENTER / VPN IP AUTO-BLOCK & UNBLOCK ---')
  const vpnIP = '34.64.10.5' // GCP range in DATACENTER_RANGES: '34.64.0.0/10'
  const vpnFP = 'clean-fp-' + Date.now()

  console.log(`[ACTION] Client with Datacenter IP (${vpnIP}) registers`)
  const vpnReg1 = await fetch(`${baseUrl}/api/session/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: `VPN-SESSION-${Date.now()}`,
      username: 'vpnuser',
      role: 'USER',
      ip: vpnIP,
      fingerprint: vpnFP
    })
  })
  const vpnReg1Json = await vpnReg1.json()
  console.log('[RESULT] VPN Register HTTP Status:', vpnReg1.status, vpnReg1Json)

  console.log(`[ACTION] Admin UNBLOCKS the VPN IP (${vpnIP}): DELETE ${baseUrl}/api/blocklist/${vpnIP}`)
  const vpnUnblockRes = await fetch(`${baseUrl}/api/blocklist/${encodeURIComponent(vpnIP)}`, {
    method: 'DELETE'
  })
  console.log('[RESULT] Unblock VPN IP Status:', vpnUnblockRes.status)
  console.log('  Cache blocked:${vpnIP} immediately after unblock:', await cache.get(`blocked:${vpnIP}`))

  console.log(`[NEXT REQUEST 3] Client with Datacenter IP (${vpnIP}) makes the very next request`)
  const vpnReg2 = await fetch(`${baseUrl}/api/session/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: `VPN-SESSION-2-${Date.now()}`,
      username: 'vpnuser',
      role: 'USER',
      ip: vpnIP,
      fingerprint: vpnFP
    })
  })
  const vpnReg2Json = await vpnReg2.json()
  console.log('[RESULT] Next Request 3 HTTP Status:', vpnReg2.status)
  console.log('[RESULT] Next Request 3 Response Body:', vpnReg2Json)
  console.log('[ROOT CAUSE CHECK 3]:', vpnReg2Json.reason === 'VPN_PROXY_DETECTED' ? 'RE-BLOCKED BY CHECK 4 (VPN_PROXY_DETECTED)!' : 'ALLOWED')
  console.log('  Cache blocked:${vpnIP} re-created in cache:', await cache.get(`blocked:${vpnIP}`))

  // -------------------------------------------------------------
  // STEP 0b: Check counters in Employee and cache
  // -------------------------------------------------------------
  console.log('\n--- STEP 0b: COUNTERS AND THRESHOLDS AUDIT ---')
  const bruteIP = '198.51.100.77'
  console.log(`[ACTION] Simulating 5 failed logins for IP: ${bruteIP} to hit brute force threshold`)
  for (let i = 1; i <= 5; i++) {
    await fetch(`${baseUrl}/api/honeypot/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'baduser', password: 'wrongpassword', ip: bruteIP })
    })
  }
  console.log('  Cache fails:${bruteIP}:', await cache.get(`fails:${bruteIP}`))
  console.log('  Cache rapid:${bruteIP}:', await cache.get(`rapid:${bruteIP}`))
  console.log('  MongoDB BlockedIP for brute force:', await BlockedIP.findOne({ ip: bruteIP }))

  console.log(`[ACTION] Admin unblocks ${bruteIP}`)
  await fetch(`${baseUrl}/api/blocklist/${encodeURIComponent(bruteIP)}`, { method: 'DELETE' })
  console.log('  Cache fails:${bruteIP} after unblock:', await cache.get(`fails:${bruteIP}`))

  // Check Employee counters
  const employees = await Employee.find({ loginAttempts: { $gt: 0 } })
  console.log('  Employee documents with loginAttempts > 0:', employees.map(e => ({ username: e.username, attempts: e.loginAttempts, successfulTraps: e.successfulTraps })))

  console.log('\n=============================================================')
  console.log('REPRODUCTION COMPLETE')
  console.log('=============================================================\n')

  await mongoose.disconnect()
  await mongoServer.stop()
  httpServer.close()
  try { fs.rmSync(dbDir, { recursive: true, force: true }) } catch {}
  process.exit(0)
}

runReproduction().catch(err => {
  console.error('Reproduction Script Error:', err)
  process.exit(1)
})
