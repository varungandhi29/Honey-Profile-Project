import mongoose from 'mongoose'

const blockedIPSchema = new mongoose.Schema({
  ip:          { type: String, required: true, unique: true, index: true },
  blockedBy:   { type: String, required: true },
  reason:      { type: String, default: 'Manual block by admin' },
  attackCount: { type: Number, default: 0 },
  country:     { type: String, default: 'Unknown' },
  city:        { type: String, default: 'Unknown' },
  blockedAt:   { type: Date, default: Date.now, index: true },
  expiresAt:   { type: Date, default: null },
  permanent:   { type: Boolean, default: true },
  lastAttempt: { type: Date, default: null },
  attemptCount:{ type: Number, default: 0 },
  fingerprint: { type: String, default: null, index: true }
}, { timestamps: true })

export default mongoose.model('BlockedIP', blockedIPSchema)
