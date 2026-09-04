import mongoose from 'mongoose'

const employeeSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, required: true },
  dept: { type: String, required: true },
  email: { type: String, required: true },
  isRandom: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  // Trap statistics
  loginAttempts: { type: Number, default: 0 },
  successfulTraps: { type: Number, default: 0 },
  lastAttempt: { type: Date, default: null },
  lastTrapTime: { type: Date, default: null },
}, { timestamps: true })

export default mongoose.model('Employee', employeeSchema)
