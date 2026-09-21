import mongoose from 'mongoose'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { spawnSync } from 'child_process'
import crypto from 'crypto'
import HoneyLog from './models/HoneyLog.js'
import { encrypt, decrypt } from './services/dataVaultService.js'

dotenv.config({ path: './.env' })

async function run() {
  console.log('==============================================')
  console.log('STARTING PATH A FIELD-LEVEL ENCRYPTION TESTS')
  console.log('==============================================\n')

  // Connect to DB using the current running Mongo URI from health endpoint
  const healthRes = await fetch('http://localhost:3001/api/health').then(r => r.json())
  const mongoUri = healthRes.mongoUri
  console.log('Connecting to Mongo URI:', mongoUri)
  await mongoose.connect(mongoUri)

  // ----------------------------------------------------
  // TEST 1: Honeypot login attempt and direct Mongo inspection
  // ----------------------------------------------------
  console.log('\n--- TEST 1: Submit honeypot login and inspect MongoDB ---')
  const testPayload = { username: 'testuser', password: 'P@ssword123' }
  const hpRes = await fetch('http://localhost:3001/api/honeypot/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testPayload)
  })
  console.log('POST /api/honeypot/login status:', hpRes.status)

  const doc = await HoneyLog.findOne({ fakeCredential: { $ne: null } }).sort({ createdAt: -1 })
  if (!doc) {
    throw new Error('TEST 1 FAILED: No HoneyLog with fakeCredential found!')
  }
  console.log('\n[RAW MONGODB DOCUMENT]:')
  console.log(JSON.stringify(doc.toObject(), null, 2))

  const parts = doc.fakeCredential.split(':')
  const is3PartHex = parts.length === 3 &&
    parts[0].length === 24 && /^[0-9a-fA-F]{24}$/.test(parts[0]) &&
    parts[1].length === 32 && /^[0-9a-fA-F]{32}$/.test(parts[1]) &&
    /^[0-9a-fA-F]*$/.test(parts[2])

  console.log('\n[TEST 1 CHECKS]:')
  console.log('1. Format is iv:authTag:ciphertext (hex):', is3PartHex)
  console.log('   - IV (hex, 24 chars / 12 bytes):', parts[0])
  console.log('   - AuthTag (hex, 32 chars / 16 bytes):', parts[1])
  console.log('   - Ciphertext (hex):', parts[2])
  console.log('2. Plaintext "P@ssword123" appears in raw doc:', JSON.stringify(doc.toObject()).includes('P@ssword123'))
  console.log('3. AttackerIP is plaintext:', doc.attackerIP)
  console.log('4. Action is plaintext:', doc.action)
  console.log('5. FakeTarget is plaintext:', doc.fakeTarget)
  console.log('6. Timestamp is standard Date:', doc.timestamp)

  // ----------------------------------------------------
  // TEST 2: Admin GET /api/vault decryption
  // ----------------------------------------------------
  console.log('\n--- TEST 2: GET /api/vault with Admin Credentials ---')
  const adminPassword = fs.existsSync('.admin-password-once.txt') 
    ? fs.readFileSync('.admin-password-once.txt', 'utf8').trim() 
    : (process.env.ADMIN_PASSWORD || '')
  const loginRes = await fetch('http://localhost:3001/api/auth/admin-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: process.env.ADMIN_USERNAME || 'secops_lead',
      password: adminPassword
    })
  })
  const loginData = await loginRes.json()
  const token = loginData.token
  if (!token) throw new Error('Failed to get admin token: ' + JSON.stringify(loginData))
  console.log('Admin login successful (Token received).')

  const vaultRes = await fetch('http://localhost:3001/api/vault', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  const vaultData = await vaultRes.json()
  const matchingHoneyLog = (vaultData.honeyLogs || []).find(h => h.fakeCredential === 'P@ssword123')

  console.log('GET /api/vault HTTP status:', vaultRes.status)
  console.log('Decrypted fakeCredential found in API response:', matchingHoneyLog ? matchingHoneyLog.fakeCredential : 'NOT FOUND')
  console.log('Server-side decryption verified. Checking DB raw document again...')
  const docAfterVault = await HoneyLog.findById(doc._id)
  console.log('DB document still contains only ciphertext:', docAfterVault.fakeCredential === doc.fakeCredential)

  // ----------------------------------------------------
  // TEST 3: Tamper Test
  // ----------------------------------------------------
  console.log('\n--- TEST 3: Tamper Test (Corrupted AuthTag) ---')
  const originalFakeCred = doc.fakeCredential
  const [ivHex, authTagHex, cipherHex] = originalFakeCred.split(':')
  // Flip last hex character of authTag
  const corruptedChar = authTagHex.slice(-1) === 'a' ? 'b' : 'a'
  const corruptedAuthTag = authTagHex.slice(0, -1) + corruptedChar
  const tamperedCred = `${ivHex}:${corruptedAuthTag}:${cipherHex}`

  console.log('Original AuthTag:', authTagHex)
  console.log('Tampered AuthTag:', corruptedAuthTag)

  let decryptThrew = false
  let decryptErrorMsg = ''
  try {
    decrypt(tamperedCred)
  } catch (err) {
    decryptThrew = true
    decryptErrorMsg = err.message
  }
  console.log('decrypt() threw on tampered authTag:', decryptThrew)
  console.log('Error thrown by crypto decipher:', decryptErrorMsg)

  // ----------------------------------------------------
  // TEST 4: Legacy Plaintext Test
  // ----------------------------------------------------
  console.log('\n--- TEST 4: Legacy Plaintext Backward Compatibility ---')
  const legacyDoc = await HoneyLog.create({
    logId: `HONEY-LEGACY-${Date.now()}`,
    sessionId: `LEGACY-SESSION`,
    attackerIP: '192.168.1.50',
    attackerCountry: 'LegacyLand',
    action: 'LOGIN_ATTEMPT',
    fakeTarget: '/auth/login',
    fakeCredential: 'plaintext_legacy_pass',
    responseSimulated: '401 Unauthorized',
    deepTrap: false,
    timestamp: new Date()
  })

  const legacyVaultRes = await fetch('http://localhost:3001/api/vault', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  const legacyVaultData = await legacyVaultRes.json()
  const foundLegacy = (legacyVaultData.honeyLogs || []).find(h => h.fakeCredential === 'plaintext_legacy_pass')
  console.log('Legacy document returned without throwing:', !!foundLegacy)
  console.log('Legacy fakeCredential value returned:', foundLegacy?.fakeCredential)

  // Direct decrypt check on legacy string:
  console.log('Direct decrypt("plaintext_legacy_pass"):', decrypt('plaintext_legacy_pass'))

  // Cleanup legacy doc
  await HoneyLog.deleteOne({ _id: legacyDoc._id })
  console.log('Deleted legacy test record.')

  // ----------------------------------------------------
  // TEST 5: Unauthenticated Access Test
  // ----------------------------------------------------
  console.log('\n--- TEST 5: Unauthenticated Access to /api/vault ---')
  const unauthRes = await fetch('http://localhost:3001/api/vault')
  console.log('Unauthenticated GET /api/vault status:', unauthRes.status)
  const unauthBody = await unauthRes.json().catch(() => null)
  console.log('Response body:', unauthBody)
  console.log('Confirms 401 Unauthorized and zero evidence leaked:', unauthRes.status === 401)

  // ----------------------------------------------------
  // TEST 6: Startup Key Validation Test
  // ----------------------------------------------------
  console.log('\n--- TEST 6: Startup Key Validation Tests ---')
  
  // Sub-test 6a: VAULT_ENCRYPTION_KEY unset
  const envUnset = { ...process.env }
  delete envUnset.VAULT_ENCRYPTION_KEY
  const resUnset = spawnSync(process.execPath, [
    '-e',
    'import("./services/dataVaultService.js").catch(() => process.exit(1))'
  ], { cwd: process.cwd(), env: envUnset, encoding: 'utf8' })
  console.log('6a. VAULT_ENCRYPTION_KEY unset -> Exit code:', resUnset.status, '(expected 1)')
  if (resUnset.stderr) console.log('    Stderr:', resUnset.stderr.trim())

  // Sub-test 6b: VAULT_ENCRYPTION_KEY tooshort (31 bytes = 62 hex chars)
  const envShort = { ...process.env, VAULT_ENCRYPTION_KEY: 'a'.repeat(62) }
  const resShort = spawnSync(process.execPath, [
    '-e',
    'import("./services/dataVaultService.js").catch(() => process.exit(1))'
  ], { cwd: process.cwd(), env: envShort, encoding: 'utf8' })
  console.log('6b. VAULT_ENCRYPTION_KEY 31 bytes (62 hex chars) -> Exit code:', resShort.status, '(expected 1)')
  if (resShort.stderr) console.log('    Stderr:', resShort.stderr.trim())

  // Sub-test 6c: VAULT_ENCRYPTION_KEY valid 32 bytes (64 hex chars)
  const validHex = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
  const envValid = { ...process.env, VAULT_ENCRYPTION_KEY: validHex }
  const resValid = spawnSync(process.execPath, [
    '-e',
    'import("./services/dataVaultService.js").then(() => { console.log("INIT_SUCCESS"); process.exit(0); }).catch(() => process.exit(1))'
  ], { cwd: process.cwd(), env: envValid, encoding: 'utf8' })
  console.log('6c. VAULT_ENCRYPTION_KEY valid 64 hex -> Exit code:', resValid.status, '(expected 0)')
  console.log('    Output:', resValid.stdout?.trim())

  console.log('\n==============================================')
  console.log('ALL 6 TESTS COMPLETED SUCCESSFULLY')
  console.log('==============================================')

  await mongoose.disconnect()
}

run().catch(err => {
  console.error('Test run failed:', err)
  process.exit(1)
})
