import mongoose from 'mongoose'

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: ['BLOCK_IP', 'UNBLOCK_IP', 'BLOCK_FP', 'UNBLOCK_FP', 'UNBLOCK_CLIENT', 'FAILED_ADMIN_LOGIN'],
    index: true
  },
  target: { type: String, required: true, index: true },
  targetType: {
    type: String,
    required: true,
    enum: ['IP', 'FINGERPRINT', 'CLIENT', 'USER', 'AUTH'],
    index: true
  },
  admin: { type: String, required: true, index: true },
  reason: { type: String, default: 'Security management action' },
  details: { type: Object, default: {} },
  timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: true })

export default mongoose.model('AuditLog', auditLogSchema)
