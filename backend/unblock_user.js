import mongoose from 'mongoose'
import axios from 'axios'

async function checkAndUnblock() {
  let uri = 'mongodb://127.0.0.1:27017/honeysield'
  try {
    const health = await axios.get('http://localhost:3001/api/health')
    console.log('Backend health status:', health.data.status, 'uptime:', health.data.uptime)
    if (health.data.mongoUri) uri = health.data.mongoUri
  } catch (e) {
    console.log('Could not query /api/health:', e.message)
  }

  console.log('Connecting to MongoDB at:', uri)
  await mongoose.connect(uri)

  const BlockedIP = mongoose.model('BlockedIP', new mongoose.Schema({}, { strict: false }))
  const BlockedFingerprint = mongoose.model('BlockedFingerprint', new mongoose.Schema({}, { strict: false }))
  const Session = mongoose.model('Session', new mongoose.Schema({}, { strict: false }))

  const blockedIPs = await BlockedIP.find()
  console.log('Current Blocked IPs count:', blockedIPs.length)
  blockedIPs.forEach(b => console.log(' -> IP:', b.get('ip'), '| Reason:', b.get('reason'), '| Subnet:', b.get('subnetPrefix'), '| HW:', b.get('hardwareHash')))

  const blockedFPs = await BlockedFingerprint.find()
  console.log('Current Blocked FPs count:', blockedFPs.length)
  blockedFPs.forEach(f => console.log(' -> FP:', f.get('fingerprint'), '| HW:', f.get('hardwareFingerprint')))

  // Unblock IP: 2405:201:201a:d8ca:f5f2:c43a:e2cb:6699 and subnet 2405:201:201a:d8ca
  // Hardware Hash: b33892bb5100b25b64
  const targetIP = '2405:201:201a:d8ca:f5f2:c43a:e2cb:6699'
  const delIP = await BlockedIP.deleteMany({
    $or: [
      { ip: { $regex: '2405:201:201a', $options: 'i' } },
      { subnetPrefix: { $regex: '2405:201:201a', $options: 'i' } },
      { hardwareHash: { $regex: '^b33892bb', $options: 'i' } }
    ]
  })
  console.log('Removed blocked IPs:', delIP.deletedCount)

  const delFP = await BlockedFingerprint.deleteMany({
    $or: [
      { hardwareFingerprint: { $regex: '^b33892bb', $options: 'i' } },
      { fingerprint: { $regex: '^b33892bb', $options: 'i' } },
      { associatedIPs: { $regex: '2405:201:201a', $options: 'i' } }
    ]
  })
  console.log('Removed blocked Fingerprints:', delFP.deletedCount)

  const unblockSess = await Session.updateMany(
    {
      $or: [
        { ip: { $regex: '2405:201:201a', $options: 'i' } },
        { hardwareFingerprint: { $regex: '^b33892bb', $options: 'i' } },
        { isBlocked: true }
      ]
    },
    { isBlocked: false, isActive: true }
  )
  console.log('Unblocked sessions:', unblockSess.modifiedCount)

  // Clear cache in backend via test-cache-del if available or DELETE /api/blocklist/:ip
  try {
    await axios.delete(`http://localhost:3001/api/blocklist/${encodeURIComponent(targetIP)}`)
    console.log('API unblock call completed for target IP')
  } catch (err) {
    console.log('API unblock call status:', err.response?.status || err.message)
  }

  // Also check production railway if accessible
  const PROD_URL = 'https://honey-profile-project-production.up.railway.app'
  try {
    const prodHealth = await axios.get(`${PROD_URL}/api/health`, { timeout: 3000 })
    console.log('Production Backend is reachable. Status:', prodHealth.data.status)
  } catch (e) {
    console.log('Production Backend unreachable or sleeping:', e.message)
  }

  await mongoose.disconnect()
}

checkAndUnblock().catch(console.error)
