import bcrypt from 'bcryptjs'
import Employee from '../models/Employee.js'
import { ALL_EMPLOYEES } from '../data/employees.js'
import logger from '../middleware/logger.js'

export const seedEmployees = async () => {
  try {
    const count = await Employee.countDocuments()
    if (count > 0) {
      logger.info(`[EMPLOYEES] ${count} decoy employees already seeded`)
      return
    }
    for (const emp of ALL_EMPLOYEES) {
      const passwordHash = await bcrypt.hash(emp.password, 10)
      await Employee.create({ ...emp, passwordHash })
    }
    logger.info(`[EMPLOYEES] Seeded ${ALL_EMPLOYEES.length} decoy employee accounts`)
  } catch (err) {
    logger.error(`[EMPLOYEES] Seed error: ${err.message}`)
  }
}

export const validateEmployee = async (username, password) => {
  if (!username || !password) return { valid: false, employee: null }
  const employee = await Employee.findOne({ username: username.toLowerCase(), isActive: true })
  if (!employee) return { valid: false, employee: null }

  const valid = await bcrypt.compare(password, employee.passwordHash)

  await Employee.findByIdAndUpdate(employee._id, {
    $inc: { loginAttempts: 1, ...(valid ? { successfulTraps: 1 } : {}) },
    lastAttempt: new Date(),
    ...(valid ? { lastTrapTime: new Date() } : {})
  })

  return { valid, employee: valid ? employee : null }
}

export const getEmployeeList = async () => {
  return Employee.find({ isActive: true }).select('username name role dept email loginAttempts successfulTraps lastAttempt')
}
