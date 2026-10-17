import express from 'express'
import mongoose from 'mongoose'
import { sendAlert } from '../services/alertService.js'
import logger from '../middleware/logger.js'
import Setting from '../models/Setting.js'

const router = express.Router()

// In-memory settings store (with MongoDB persistence)
let alertSettings = {
  slackWebhook: process.env.SLACK_WEBHOOK_URL || '',
  discordWebhook: process.env.DISCORD_WEBHOOK_URL || '',
  telegramToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
  emailTo: process.env.ALERT_EMAIL_TO || '',
  alertLevels: {
    honey_trap: true,
    vpn_block: true,
    brute_force_high: true,
    manual_block: false,
  }
}

// Function to load persisted settings from MongoDB into memory & process.env
export const loadSettingsFromDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      const doc = await Setting.findOne({ key: 'alert_settings' })
      if (doc && doc.value) {
        alertSettings = {
          ...alertSettings,
          ...doc.value,
          alertLevels: {
            ...alertSettings.alertLevels,
            ...(doc.value.alertLevels || {})
          }
        }
        if (alertSettings.slackWebhook) process.env.SLACK_WEBHOOK_URL = alertSettings.slackWebhook
        if (alertSettings.discordWebhook) process.env.DISCORD_WEBHOOK_URL = alertSettings.discordWebhook
        if (alertSettings.telegramToken) process.env.TELEGRAM_BOT_TOKEN = alertSettings.telegramToken
        if (alertSettings.telegramChatId) process.env.TELEGRAM_CHAT_ID = alertSettings.telegramChatId
        if (alertSettings.emailTo) process.env.ALERT_EMAIL_TO = alertSettings.emailTo
        logger.info('[SETTINGS] Alert settings loaded from MongoDB')
      }
    }
  } catch (err) {
    logger.warn(`[SETTINGS] Failed to load alert settings from MongoDB: ${err.message}`)
  }
}

// POST /api/settings/alerts — save settings
router.post('/alerts', async (req, res) => {
  try {
    const incoming = req.body || {}

    // Only overwrite webhooks if they are not the masked string
    if (incoming.slackWebhook !== undefined && incoming.slackWebhook !== '***configured***') {
      alertSettings.slackWebhook = incoming.slackWebhook
      process.env.SLACK_WEBHOOK_URL = incoming.slackWebhook
    }
    if (incoming.discordWebhook !== undefined && incoming.discordWebhook !== '***configured***') {
      alertSettings.discordWebhook = incoming.discordWebhook
      process.env.DISCORD_WEBHOOK_URL = incoming.discordWebhook
    }
    if (incoming.telegramToken !== undefined && incoming.telegramToken !== '***configured***') {
      alertSettings.telegramToken = incoming.telegramToken
      process.env.TELEGRAM_BOT_TOKEN = incoming.telegramToken
    }
    if (incoming.telegramChatId !== undefined) {
      alertSettings.telegramChatId = incoming.telegramChatId
      process.env.TELEGRAM_CHAT_ID = incoming.telegramChatId
    }
    if (incoming.emailTo !== undefined) {
      alertSettings.emailTo = incoming.emailTo
      process.env.ALERT_EMAIL_TO = incoming.emailTo
    }
    if (incoming.alertLevels !== undefined) {
      alertSettings.alertLevels = {
        ...alertSettings.alertLevels,
        ...incoming.alertLevels
      }
    }

    // Persist to MongoDB
    if (mongoose.connection.readyState === 1) {
      try {
        await Setting.findOneAndUpdate(
          { key: 'alert_settings' },
          { key: 'alert_settings', value: alertSettings, updatedAt: new Date() },
          { upsert: true, new: true }
        )
      } catch (dbErr) {
        logger.warn(`[SETTINGS DB] Failed to save alert settings to DB: ${dbErr.message}`)
      }
    }

    logger.info('[SETTINGS] Alert settings updated and saved')
    res.json({ success: true })
  } catch (err) {
    logger.error(`[SETTINGS ERROR] ${err.message}`)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/settings/alerts — get current settings (masked)
router.get('/alerts', (req, res) => {
  res.json({
    slackWebhook: alertSettings.slackWebhook ? '***configured***' : '',
    discordWebhook: alertSettings.discordWebhook ? '***configured***' : '',
    telegramToken: alertSettings.telegramToken ? '***configured***' : '',
    telegramChatId: alertSettings.telegramChatId || '',
    emailTo: alertSettings.emailTo || '',
    alertLevels: alertSettings.alertLevels
  })
})

// POST /api/settings/test-alert — send test alert to verify webhook
router.post('/test-alert', async (req, res) => {
  const { channel, config } = req.body
  try {
    // If inline config was sent from the frontend test button, apply it immediately
    if (config?.slackWebhook && config.slackWebhook !== '***configured***') {
      process.env.SLACK_WEBHOOK_URL = config.slackWebhook
      alertSettings.slackWebhook = config.slackWebhook
    }
    if (config?.discordWebhook && config.discordWebhook !== '***configured***') {
      process.env.DISCORD_WEBHOOK_URL = config.discordWebhook
      alertSettings.discordWebhook = config.discordWebhook
    }
    if (config?.telegramToken && config.telegramToken !== '***configured***') {
      process.env.TELEGRAM_BOT_TOKEN = config.telegramToken
      alertSettings.telegramToken = config.telegramToken
    }
    if (config?.telegramChatId) {
      process.env.TELEGRAM_CHAT_ID = config.telegramChatId
      alertSettings.telegramChatId = config.telegramChatId
    }
    if (config?.emailTo) {
      process.env.ALERT_EMAIL_TO = config.emailTo
      alertSettings.emailTo = config.emailTo
    }

    const testEvent = {
      type: 'TEST_ALERT',
      severity: 'LOW',
      ip: '1.2.3.4',
      username: 'test.user',
      country: 'India',
      city: 'Vadodara',
      message: `This is a test alert from HoneyShield v2. Your ${channel} integration is working correctly.`,
      sessionId: 'TEST-SESSION-001',
      attemptNumber: 3,
      timestamp: new Date().toISOString()
    }

    const result = await sendAlert(testEvent)
    logger.info(`[TEST ALERT] Sent test alert to ${channel}`)
    res.json({ success: true, message: `Test alert sent to ${channel}`, result })
  } catch (err) {
    logger.error(`[TEST ALERT ERROR] ${err.message}`)
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
