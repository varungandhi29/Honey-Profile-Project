import mongoose from 'mongoose'
const alertSchema = new mongoose.Schema({
  alertId:     { type: String, required: true, unique: true },
  severity:    { type: String, enum: ['LOW','MEDIUM','HIGH','CRITICAL'], required: true, index: true },
  title:       { type: String, required: true },
  description: { type: String, required: true },
  sessionId:   { type: String, required: true, index: true },
  sourceIP:    { type: String, default: 'Unknown' },
  attackType:  { type: String, default: null },
  status:      { type: String, enum: ['New','Acknowledged','Dismissed','Resolved'], default: 'New', index: true },
  acknowledgedBy: { type: String, default: null },
  acknowledgedAt: { type: Date, default: null },
  autoResponse:   { type: Boolean, default: false },
  autoAction:     { type: String, default: null },
  timestamp:   { type: Date, default: Date.now, index: true }
}, { timestamps: true })
alertSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 * 30 })
export default mongoose.model('Alert', alertSchema)
