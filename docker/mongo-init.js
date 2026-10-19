// Initialize HoneyShield MongoDB collections and indexes
db = db.getSiblingDB('honeyshield')

// Create collections with indexes for performance
db.createCollection('sessions')
db.sessions.createIndex({ ip: 1 })
db.sessions.createIndex({ sessionId: 1 }, { unique: true })
db.sessions.createIndex({ loginTime: -1 })
db.sessions.createIndex({ isActive: 1 })

db.createCollection('blockedips')
db.blockedips.createIndex({ ip: 1 }, { unique: true })
db.blockedips.createIndex({ blockedAt: -1 })

db.createCollection('blockedfingerprints')
db.blockedfingerprints.createIndex({ fingerprint: 1 }, { unique: true })

db.createCollection('attacks')
db.attacks.createIndex({ sessionId: 1 })
db.attacks.createIndex({ timestamp: -1 })

db.createCollection('honeylogs')
db.honeylogs.createIndex({ sessionId: 1 })
db.honeylogs.createIndex({ timestamp: -1 })

db.createCollection('settings')
db.settings.createIndex({ key: 1 }, { unique: true })

print('HoneyShield MongoDB initialized successfully')
