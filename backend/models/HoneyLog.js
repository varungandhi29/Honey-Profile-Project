import mongoose from 'mongoose'
const honeyLogSchema = new mongoose.Schema({
  logId:             { type: String, required: true, unique: true },
  sessionId:         { type: String, required: true, index: true },
  attackerIP:        { type: String, required: true },
  attackerCountry:   { type: String, default: 'Unknown' },
  action:            { type: String, enum: ['READ','WRITE','DELETE','EXEC','LOGIN_ATTEMPT','DOWNLOAD'], required: true },
  fakeTarget:        { type: String, required: true },
  fakeCredential:    { type: String, default: null },
  responseSimulated: { type: String, default: '200 OK' },
  responseTime:      { type: Number, default: 0 },
  deepTrap:          { type: Boolean, default: false },
  timestamp:         { type: Date, default: Date.now, index: true }
}, { timestamps: true })
export default mongoose.model('HoneyLog', honeyLogSchema)
