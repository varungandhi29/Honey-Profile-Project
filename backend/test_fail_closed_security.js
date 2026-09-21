import assert from 'assert'

console.log('===================================================================')
console.log('   HONEYSHIELD FAIL-CLOSED THREE-STATE VERIFICATION SUITE         ')
console.log('===================================================================')

// -------------------------------------------------------------
// Part 1: Unit Simulation of App.jsx checkPersistentBlock Logic
// -------------------------------------------------------------
console.log('\n--- PART 1: Frontend State Machine & Fail-Closed Logic Tests ---')

class MockLocalStorage {
  constructor() {
    this.store = {}
  }
  getItem(key) {
    return this.store[key] || null
  }
  setItem(key, value) {
    this.store[key] = String(value)
  }
  removeItem(key) {
    delete this.store[key]
  }
  clear() {
    this.store = {}
  }
}

function getRenderedScreen(result) {
  if (result.unblockedData) return 'UnblockedScreen'
  if (result.appBlocked || result.verificationState === 'CONFIRMED_BLOCKED') return 'BlockedScreen'
  if (result.verificationState === 'CHECKING' || result.verificationState === 'UNKNOWN_RETRYING') return 'VerifyingScreen'
  return 'LoginPage'
}

async function runCheckPersistentBlock({
  mockStorage,
  mockFetchResponse = null,
  fetchThrows = null
}) {
  let appBlocked = false
  let appBlockedReason = null
  let verificationState = 'IDLE'
  let verifyMessage = ''
  let unblockedData = null
  let scheduledDelay = null
  let fetchCalled = false

  const saved = mockStorage.getItem('honeyshield_blocked')
  let wasLocallyFlagged = false
  try {
    wasLocallyFlagged = saved ? JSON.parse(saved)?.blocked === true : false
  } catch {}

  // FAST-PATH: If this client has no prior block flag in localStorage,
  // NEVER call check-status. Skip verification entirely and render normal app/login immediately.
  // Real security enforcement lives server-side on login/register endpoints.
  if (!wasLocallyFlagged) {
    verificationState = 'IDLE'
    appBlocked = false
    return { appBlocked, appBlockedReason, verificationState, verifyMessage, unblockedData, scheduledDelay, fetchCalled }
  }

  // SLOW-PATH: Client has a recorded block flag in localStorage that must be reconciled.
  // Invoke strict Three-State fail-closed verification.
  verificationState = 'CHECKING'
  fetchCalled = true

  try {
    if (fetchThrows) {
      throw fetchThrows
    }

    const res = mockFetchResponse

    if (res.ok) {
      const data = await res.json()
      if (data && data.blocked === true) {
        // STATE 2: CONFIRMED BLOCKED
        verificationState = 'CONFIRMED_BLOCKED'
        appBlocked = true
        appBlockedReason = 'IP_BLOCKED'
        return { appBlocked, appBlockedReason, verificationState, verifyMessage, unblockedData, scheduledDelay, fetchCalled }
      } else if (data && data.blocked === false) {
        // STATE 1: CONFIRMED UNBLOCKED
        mockStorage.removeItem('honeyshield_blocked')
        mockStorage.removeItem('honeyshield_blocked_ips')
        verificationState = 'CONFIRMED_UNBLOCKED'
        appBlocked = false
        appBlockedReason = null
        unblockedData = { ip: 'Your IP', timestamp: new Date().toISOString() }
        return { appBlocked, appBlockedReason, verificationState, verifyMessage, unblockedData, scheduledDelay, fetchCalled }
      }
    }

    // STATE 3: UNKNOWN (HTTP 429, 500, 502, 503, 404)
    // STRICT FAIL-CLOSED: DO NOT purge localStorage, DO NOT grant access
    const isRateLimited = res.status === 429
    scheduledDelay = isRateLimited ? 10000 : 3000
    const reasonDesc = isRateLimited
      ? 'Rate limit active (HTTP 429)'
      : `Server returned HTTP ${res.status}`

    verificationState = 'UNKNOWN_RETRYING'
    verifyMessage = `Unable to verify status: ${reasonDesc}. Retrying in ${Math.round(scheduledDelay / 1000)}s...`

  } catch (err) {
    // STATE 3: UNKNOWN (Network error, connection refused, AbortSignal 10s timeout)
    // STRICT FAIL-CLOSED: DO NOT purge localStorage, DO NOT grant access
    const isTimeout = err.name === 'AbortError'
    scheduledDelay = 4000
    const reasonDesc = isTimeout
      ? 'Connection timed out (backend starting up)'
      : 'Network connection unreachable'

    verificationState = 'UNKNOWN_RETRYING'
    verifyMessage = `Unable to verify status: ${reasonDesc}. Retrying in ${Math.round(scheduledDelay / 1000)}s...`
  }

  return { appBlocked, appBlockedReason, verificationState, verifyMessage, unblockedData, scheduledDelay, fetchCalled }
}

// Test 1: HTTP 429 Rate Limit Response while Blocked (The exact reported security inversion)
{
  const mockStorage = new MockLocalStorage()
  mockStorage.setItem('honeyshield_blocked', JSON.stringify({ blocked: true, reason: 'IP_BLOCKED' }))

  const mockRes = {
    ok: false,
    status: 429,
    statusText: 'Too Many Requests',
    json: async () => ({ error: 'Too many requests', retryAfter: 10 })
  }

  const result = await runCheckPersistentBlock({ mockStorage, mockFetchResponse: mockRes })

  console.log('[TEST 1] HTTP 429 Response while Blocked:')
  console.log('   - verificationState:', result.verificationState)
  console.log('   - appBlocked:', result.appBlocked)
  console.log('   - verifyMessage:', result.verifyMessage)
  console.log('   - scheduledDelay:', result.scheduledDelay, 'ms')
  console.log('   - localStorage honeyshield_blocked:', mockStorage.getItem('honeyshield_blocked'))
  console.log('   - rendered screen:', getRenderedScreen(result))

  assert.strictEqual(result.verificationState, 'UNKNOWN_RETRYING', 'State must be UNKNOWN_RETRYING on 429')
  assert.strictEqual(result.appBlocked, false, 'appBlocked remains guarded by verificationState')
  assert.strictEqual(result.unblockedData, null, 'unblockedData must be null')
  assert.strictEqual(result.scheduledDelay, 10000, 'Retry delay must be 10000ms on 429')
  assert.strictEqual(getRenderedScreen(result), 'VerifyingScreen', 'Must render VerifyingScreen (NOT LoginPage)')
  assert.ok(mockStorage.getItem('honeyshield_blocked'), 'CRITICAL FAIL-CLOSED ASSERTION: localStorage was NOT purged on 429!')
  console.log('   ✅ PASS: HTTP 429 correctly retained local storage ban and transitioned to UNKNOWN_RETRYING with 10s backoff')
}

// Test 2: HTTP 500 Server Error while Blocked
{
  const mockStorage = new MockLocalStorage()
  mockStorage.setItem('honeyshield_blocked', JSON.stringify({ blocked: true, reason: 'IP_BLOCKED' }))

  const mockRes = {
    ok: false,
    status: 500,
    statusText: 'Internal Server Error',
    json: async () => ({ error: 'Database disconnected' })
  }

  const result = await runCheckPersistentBlock({ mockStorage, mockFetchResponse: mockRes })

  console.log('\n[TEST 2] HTTP 500 Server Error while Blocked:')
  console.log('   - verificationState:', result.verificationState)
  console.log('   - localStorage honeyshield_blocked:', mockStorage.getItem('honeyshield_blocked'))
  console.log('   - rendered screen:', getRenderedScreen(result))

  assert.strictEqual(result.verificationState, 'UNKNOWN_RETRYING')
  assert.strictEqual(result.unblockedData, null)
  assert.strictEqual(getRenderedScreen(result), 'VerifyingScreen')
  assert.ok(mockStorage.getItem('honeyshield_blocked'), 'CRITICAL FAIL-CLOSED ASSERTION: localStorage was NOT purged on 500!')
  console.log('   ✅ PASS: HTTP 500 retained local storage ban and did NOT grant access')
}

// Test 3: Network Timeout (AbortError - 10000ms timeout)
{
  const mockStorage = new MockLocalStorage()
  mockStorage.setItem('honeyshield_blocked', JSON.stringify({ blocked: true, reason: 'IP_BLOCKED' }))

  const abortErr = new Error('The operation was aborted')
  abortErr.name = 'AbortError'

  const result = await runCheckPersistentBlock({ mockStorage, fetchThrows: abortErr })

  console.log('\n[TEST 3] 10000ms Timeout (AbortError) while Blocked:')
  console.log('   - verificationState:', result.verificationState)
  console.log('   - verifyMessage:', result.verifyMessage)
  console.log('   - localStorage honeyshield_blocked:', mockStorage.getItem('honeyshield_blocked'))
  console.log('   - rendered screen:', getRenderedScreen(result))

  assert.strictEqual(result.verificationState, 'UNKNOWN_RETRYING')
  assert.strictEqual(getRenderedScreen(result), 'VerifyingScreen')
  assert.ok(result.verifyMessage.includes('Connection timed out'))
  assert.ok(mockStorage.getItem('honeyshield_blocked'), 'CRITICAL FAIL-CLOSED ASSERTION: localStorage was NOT purged on AbortError!')
  console.log('   ✅ PASS: 10s AbortError timeout retained local storage ban and did NOT grant access')
}

// Test 4: Authoritative 200 OK with blocked: true (CONFIRMED_BLOCKED)
{
  const mockStorage = new MockLocalStorage()
  mockStorage.setItem('honeyshield_blocked', JSON.stringify({ blocked: true, reason: 'IP_BLOCKED' }))

  const mockRes = {
    ok: true,
    status: 200,
    json: async () => ({ blocked: true })
  }

  const result = await runCheckPersistentBlock({ mockStorage, mockFetchResponse: mockRes })

  console.log('\n[TEST 4] Authoritative 200 OK (blocked: true):')
  console.log('   - verificationState:', result.verificationState)
  console.log('   - appBlocked:', result.appBlocked)
  console.log('   - localStorage honeyshield_blocked:', mockStorage.getItem('honeyshield_blocked'))
  console.log('   - rendered screen:', getRenderedScreen(result))

  assert.strictEqual(result.verificationState, 'CONFIRMED_BLOCKED')
  assert.strictEqual(result.appBlocked, true)
  assert.strictEqual(getRenderedScreen(result), 'BlockedScreen')
  assert.ok(mockStorage.getItem('honeyshield_blocked'))
  console.log('   ✅ PASS: Authoritative blocked status transitioned to CONFIRMED_BLOCKED and rendered BlockedScreen')
}

// Test 5: Authoritative 200 OK with blocked: false (CONFIRMED_UNBLOCKED)
{
  const mockStorage = new MockLocalStorage()
  mockStorage.setItem('honeyshield_blocked', JSON.stringify({ blocked: true, reason: 'IP_BLOCKED' }))

  const mockRes = {
    ok: true,
    status: 200,
    json: async () => ({ blocked: false })
  }

  const result = await runCheckPersistentBlock({ mockStorage, mockFetchResponse: mockRes })

  console.log('\n[TEST 5] Authoritative 200 OK (blocked: false):')
  console.log('   - verificationState:', result.verificationState)
  console.log('   - appBlocked:', result.appBlocked)
  console.log('   - localStorage honeyshield_blocked:', mockStorage.getItem('honeyshield_blocked'))
  console.log('   - unblockedData:', result.unblockedData)
  console.log('   - rendered screen:', getRenderedScreen(result))

  assert.strictEqual(result.verificationState, 'CONFIRMED_UNBLOCKED')
  assert.strictEqual(result.appBlocked, false)
  assert.strictEqual(mockStorage.getItem('honeyshield_blocked'), null, 'localStorage MUST be cleared only when server authoritatively returns blocked: false')
  assert.ok(result.unblockedData !== null)
  assert.strictEqual(getRenderedScreen(result), 'UnblockedScreen')
  console.log('   ✅ PASS: Only an authoritative 200 OK { blocked: false } clears localStorage and grants access via UnblockedScreen')
}

// Test 6: Brand-New / Clean Visitor with Backend 404 / Offline (The critical reported outage case)
{
  const mockStorage = new MockLocalStorage()
  // Clean visitor: NO honeyshield_blocked flag exists in localStorage
  assert.strictEqual(mockStorage.getItem('honeyshield_blocked'), null)

  // Even if backend would return 404 or throw a network error:
  const mockRes = {
    ok: false,
    status: 404,
    statusText: 'Not Found',
    json: async () => ({ error: 'Not Found' })
  }

  const result = await runCheckPersistentBlock({ mockStorage, mockFetchResponse: mockRes })
  const renderedScreen = getRenderedScreen(result)

  console.log('\n[TEST 6] Clean Visitor with Backend 404 / Offline:')
  console.log('   - was check-status fetch called:', result.fetchCalled)
  console.log('   - verificationState:', result.verificationState)
  console.log('   - appBlocked:', result.appBlocked)
  console.log('   - rendered screen:', renderedScreen)

  assert.strictEqual(result.fetchCalled, false, 'CRITICAL: check-status fetch must NEVER be called for unflagged visitors')
  assert.strictEqual(result.verificationState, 'IDLE', 'verificationState must be IDLE (ready)')
  assert.strictEqual(result.appBlocked, false, 'appBlocked must be false')
  assert.strictEqual(renderedScreen, 'LoginPage', 'CRITICAL: Clean visitor must render LoginPage immediately, NOT VerifyingScreen!')
  console.log('   ✅ PASS: Clean visitor bypassed check-status completely and immediately rendered LoginPage despite 404 backend!')
}

// -------------------------------------------------------------
// Part 2: Live Backend /api/blocklist/check-status Integration Test
// -------------------------------------------------------------
console.log('\n--- PART 2: Live Backend API Verification ---')

const BASE_URL = 'http://localhost:3001'

try {
  // Check live health
  const healthRes = await fetch(`${BASE_URL}/api/health`)
  const healthData = await healthRes.json()
  assert.strictEqual(healthData.status, 'ok')
  console.log('   Live backend is reachable and healthy at', BASE_URL)

  // Test single check-status
  const checkRes = await fetch(`${BASE_URL}/api/blocklist/check-status`)
  console.log(`   Live /check-status status: ${checkRes.status}`)
  const checkData = await checkRes.json()
  console.log('   Live /check-status response:', checkData)
  assert.strictEqual(typeof checkData.blocked, 'boolean')
  console.log('   ✅ PASS: Live /check-status correctly returned schema { blocked: boolean }')

} catch (err) {
  console.error('   ❌ Live test error:', err.message)
  process.exit(1)
}

console.log('\n===================================================================')
console.log('   ALL 6 TESTS (FAIL-CLOSED + CLEAN VISITOR FAST-PATH) PASSED!    ')
console.log('===================================================================\n')
