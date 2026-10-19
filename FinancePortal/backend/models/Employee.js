import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
  title: { type: String, required: true },
  dept: { type: String, required: true },
  clearance: { type: String, required: true },
  lastLogin: { type: Date, default: null },
  loginCount: { type: Number, default: 0 },
}, { timestamps: true })

export default mongoose.model('Employee', schema)
