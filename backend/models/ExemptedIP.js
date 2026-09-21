import mongoose from 'mongoose'

const exemptedIPSchema = new mongoose.Schema({
  ip: { type: String, required: true, unique: true, index: true },
  exemptedBy: { type: String, required: true },
  reason: { type: String, default: 'Admin exemption from automatic VPN/datacenter block' },
  originalReason: { type: String, default: 'Datacenter/VPN IP' },
  exemptedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } }
}, { timestamps: true })

export default mongoose.model('ExemptedIP', exemptedIPSchema)
