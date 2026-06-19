import mongoose from 'mongoose'
const attackSchema = new mongoose.Schema({
  attackId:      { type: String, required: true, unique: true },
  type:          { type: String, required: true, index: true },
  severity:      { type: String, enum: ['LOW','MEDIUM','HIGH','CRITICAL'], required: true, index: true },
  sourceIP:      { type: String, required: true, index: true },
  sourceCountry: { type: String, default: 'Unknown', index: true },
  sourceCity:    { type: String, default: 'Unknown' },
  targetArea:    { type: String, required: true },
  riskDelta:     { type: Number, required: true },
  sessionId:     { type: String, required: true, index: true },
  correlationId: { type: String, default: '' },
  aiPrediction:  { type: String, default: null },
  aiConfidence:  { type: Number, default: null },
  timestamp:     { type: Date, default: Date.now, index: true }
}, { timestamps: true })
attackSchema.index({ timestamp: -1 })
export default mongoose.model('Attack', attackSchema)
