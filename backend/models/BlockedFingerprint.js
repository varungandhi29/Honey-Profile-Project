import mongoose from 'mongoose'

const blockedFingerprintSchema = new mongoose.Schema({
  fingerprint:  { type: String, required: true, unique: true, index: true },
  blockedBy:    { type: String, required: true },
  reason:       { type: String, default: 'Blocked by admin' },
  associatedIPs:{ type: [String], default: [] },
  blockedAt:    { type: Date, default: Date.now },
  attemptCount: { type: Number, default: 0 },
  lastAttempt:  { type: Date, default: null }
}, { timestamps: true })

export default mongoose.model('BlockedFingerprint', blockedFingerprintSchema)
