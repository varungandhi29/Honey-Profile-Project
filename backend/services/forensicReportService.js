import logger from '../middleware/logger.js'

/**
 * Forensic Report Service
 * Generates structured incident forensic reports for security events.
 */
export const generateForensicReport = async (event = {}) => {
  try {
    return {
      reportId: `FOR-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      type: event.type || 'UNKNOWN',
      severity: event.severity || 'HIGH',
      ip: event.ip,
      location: [event.city, event.country].filter(Boolean).join(', ') || 'Unknown',
      timestamp: event.timestamp || new Date().toISOString(),
      details: event.message || ''
    }
  } catch (err) {
    logger.warn(`[FORENSIC] Report generation error: ${err.message}`)
    return null
  }
}

export default { generateForensicReport }
