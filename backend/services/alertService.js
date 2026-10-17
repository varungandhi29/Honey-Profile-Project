import axios from 'axios'
import crypto from 'crypto'
import logger from '../middleware/logger.js'
import Alert from '../models/Alert.js'
import { cache } from './cacheService.js'
import { broadcastAlert } from './broadcastService.js'
import { generateForensicReport } from './forensicReportService.js'

// Alert severity levels
export const SEVERITY = {
  LOW: { color: '#3B82F6', emoji: '📝', label: 'LOW' },
  MEDIUM: { color: '#F59E0B', emoji: '⚠️', label: 'MEDIUM' },
  HIGH: { color: '#F97316', emoji: '🚨', label: 'HIGH' },
  CRITICAL: { color: '#EF4444', emoji: '🔴', label: 'CRITICAL' },
}

// Secret for HMAC quick-block token
const BLOCK_TOKEN_SECRET = process.env.BLOCK_TOKEN_SECRET || 'honeyshield-block-secret-2024'

// Generate secure one-click block token (valid for 1 hour)
export const generateQuickBlockToken = (ip) => {
  const secret = process.env.BLOCK_TOKEN_SECRET || BLOCK_TOKEN_SECRET
  const expires = Date.now() + 3600000 // 1 hour
  const data = `${ip}:${expires}`
  const hash = crypto.createHmac('sha256', secret).update(data).digest('hex')
  return `${hash}.${expires}`
}

// Verify quick block token
export const verifyQuickBlockToken = (ip, token) => {
  try {
    const secret = process.env.BLOCK_TOKEN_SECRET || BLOCK_TOKEN_SECRET
    const [hash, expires] = token.split('.')
    if (!hash || !expires) return false
    if (Date.now() > parseInt(expires, 10)) return false
    const data = `${ip}:${expires}`
    const expected = crypto.createHmac('sha256', secret).update(data).digest('hex')
    const hashBuf = Buffer.from(hash)
    const expBuf = Buffer.from(expected)
    if (hashBuf.length !== expBuf.length) return false
    return crypto.timingSafeEqual(hashBuf, expBuf)
  } catch {
    return false
  }
}

// SLACK ALERT
const sendSlackAlert = async ({ type, sev, ip, username, location, message, time, blockUrl, dashboardUrl, attemptNumber, sessionId }) => {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) return

  const payload = {
    username: 'HoneyShield SOC',
    icon_emoji: ':shield:',
    attachments: [{
      color: sev.color,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: `${sev.emoji} ${sev.label}: ${type.replace(/_/g, ' ')}` }
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*IP Address:*\n\`${ip}\`` },
            { type: 'mrkdwn', text: `*Username:*\n${username || 'Unknown'}` },
            { type: 'mrkdwn', text: `*Location:*\n${location}` },
            { type: 'mrkdwn', text: `*Time (IST):*\n${time}` },
            attemptNumber ? { type: 'mrkdwn', text: `*Attempt:*\n${attemptNumber}` } : null,
            sessionId ? { type: 'mrkdwn', text: `*Session:*\n\`${sessionId.slice(0, 20)}...\`` } : null,
          ].filter(Boolean)
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*Details:* ${message}` }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: '🚫 Block IP Now' },
              style: 'danger',
              url: blockUrl,
              action_id: 'block_ip'
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: '📊 Open Dashboard' },
              url: dashboardUrl,
              action_id: 'open_dashboard'
            }
          ]
        }
      ]
    }]
  }

  await axios.post(webhookUrl, payload, { timeout: 5000 })
  logger.info(`[ALERT] Slack sent: ${type} for ${ip}`)
}

// DISCORD ALERT
const sendDiscordAlert = async ({ type, sev, ip, username, location, message, time, blockUrl, dashboardUrl, attemptNumber }) => {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL
  if (!webhookUrl) return

  const colorHex = parseInt(sev.color.replace('#', ''), 16)

  const embed = {
    title: `${sev.emoji} ${sev.label} — ${type.replace(/_/g, ' ')}`,
    color: colorHex,
    description: message,
    fields: [
      { name: '🌐 IP Address', value: `\`${ip}\``, inline: true },
      { name: '👤 Username', value: username || 'Unknown', inline: true },
      { name: '📍 Location', value: location, inline: true },
      { name: '🕐 Time (IST)', value: time, inline: true },
      attemptNumber ? { name: '🔢 Attempt', value: String(attemptNumber), inline: true } : null,
      { name: '⚡ Quick Actions', value: `[🚫 **Block IP Now**](${blockUrl}) • [📊 **Open Dashboard**](${dashboardUrl})`, inline: false }
    ].filter(Boolean),
    footer: { text: 'HoneyShield v2 — Active Cyber Deception Platform' },
    timestamp: new Date().toISOString()
  }

  const payloadWithComponents = {
    username: 'HoneyShield SOC',
    avatar_url: 'https://honeyprofile.vercel.app/favicon.ico',
    embeds: [embed],
    components: [{
      type: 1,
      components: [
        {
          type: 2, // Button
          style: 5, // Link button
          label: '🚫 Block IP Now',
          url: blockUrl
        },
        {
          type: 2, // Button
          style: 5, // Link button
          label: '📊 Open Dashboard',
          url: dashboardUrl
        }
      ]
    }]
  }

  try {
    await axios.post(webhookUrl, payloadWithComponents, { timeout: 5000 })
    logger.info(`[ALERT] Discord sent: ${type} for ${ip}`)
  } catch (err) {
    // If webhook does not support interactive components, fallback to embed with markdown buttons
    if (err.response?.status === 400) {
      await axios.post(webhookUrl, {
        username: 'HoneyShield SOC',
        avatar_url: 'https://honeyprofile.vercel.app/favicon.ico',
        embeds: [embed]
      }, { timeout: 5000 })
      logger.info(`[ALERT] Discord sent (embed fallback): ${type} for ${ip}`)
    } else {
      throw err
    }
  }
}

// TELEGRAM ALERT
const sendTelegramAlert = async ({ type, sev, ip, username, location, message, time, blockUrl, dashboardUrl, attemptNumber }) => {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return

  const text = `${sev.emoji} *${sev.label}: ${type.replace(/_/g, ' ')}*\n\n` +
    `🌐 *IP:* \`${ip}\`\n` +
    `👤 *User:* ${username || 'Unknown'}\n` +
    `📍 *Location:* ${location}\n` +
    `🕐 *Time:* ${time}\n` +
    (attemptNumber ? `🔢 *Attempt:* ${attemptNumber}\n` : '') +
    `\n📋 ${message}`

  const payload = {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[
        { text: '🚫 Block IP', url: blockUrl },
        { text: '📊 Dashboard', url: dashboardUrl }
      ]]
    }
  }

  await axios.post(
    `https://api.telegram.org/bot${token}/sendMessage`,
    payload,
    { timeout: 5000 }
  )
  logger.info(`[ALERT] Telegram sent: ${type} for ${ip}`)
}

// EMAIL ALERT (via Resend — only for CRITICAL events)
const sendEmailAlert = async ({ type, sev, ip, username, location, message, time, dashboardUrl, sessionId, blockUrl }) => {
  const apiKey = process.env.RESEND_API_KEY
  const emailTo = process.env.ALERT_EMAIL_TO
  const emailFrom = process.env.ALERT_EMAIL_FROM || 'HoneyShield <alerts@honeyshield.io>'
  if (!apiKey || !emailTo) return

  const html = `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#0A0E1A;color:#F1F5F9;border-radius:12px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#7F1D1D,#0A0E1A);padding:28px;text-align:center">
        <h1 style="color:#EF4444;font-size:22px;margin:0">${sev.emoji} HoneyShield CRITICAL ALERT</h1>
        <p style="color:#94A3B8;margin:8px 0 0;font-size:13px">Active Cyber Deception Platform — Incident Report</p>
      </div>
      <div style="padding:28px">
        <h2 style="color:#F1F5F9;font-size:18px;margin:0 0 20px">${type.replace(/_/g, ' ')}</h2>
        <div style="background:#111827;border:1px solid #1E2D45;border-radius:8px;padding:20px;margin-bottom:20px">
          <table style="width:100%;border-collapse:collapse">
            ${[
              ['IP Address', ip],
              ['Username', username || 'Unknown'],
              ['Location', location],
              ['Time (IST)', time],
              ['Session ID', sessionId || 'N/A'],
            ].map(([k, v]) => `<tr><td style="color:#94A3B8;font-size:13px;padding:6px 0;width:40%">${k}</td><td style="color:#F1F5F9;font-size:13px;padding:6px 0;font-weight:600">${v}</td></tr>`).join('')}
          </table>
        </div>
        <p style="color:#94A3B8;font-size:14px;line-height:1.6">${message}</p>
        <div style="text-align:center;margin:24px 0">
          ${blockUrl ? `<a href="${blockUrl}" style="display:inline-block;padding:12px 24px;background:#EF4444;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;margin-right:10px">🚫 Block IP Now</a>` : ''}
          <a href="${dashboardUrl}" style="display:inline-block;padding:12px 24px;background:#3B82F6;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">
            📊 Open SOC Dashboard
          </a>
        </div>
      </div>
      <div style="padding:16px 28px;border-top:1px solid #1E2D45;text-align:center">
        <p style="color:#475569;font-size:11px;margin:0">HoneyShield v2 — Active Cyber Deception Platform</p>
      </div>
    </div>
  `

  await axios.post('https://api.resend.com/emails', {
    from: emailFrom,
    to: [emailTo],
    subject: `🔴 HoneyShield CRITICAL: ${type.replace(/_/g, ' ')} from ${ip}`,
    html
  }, {
    headers: { Authorization: `Bearer ${apiKey}` },
    timeout: 8000
  })
  logger.info(`[ALERT] Email sent: ${type} for ${ip}`)
}

// Main alert dispatcher — sends to all configured channels
export const sendAlert = async (event) => {
  const {
    type,
    severity = 'HIGH',
    ip,
    username,
    country,
    city,
    message,
    sessionId,
    attemptNumber,
    playSiren,
    timestamp = new Date().toISOString()
  } = event

  const sev = SEVERITY[severity] || SEVERITY.HIGH
  const time = new Date(timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
  const location = [city, country].filter(Boolean).join(', ') || 'Unknown'

  const backendUrl = process.env.BACKEND_URL || 'https://honey-profile-project-production.up.railway.app'
  const frontendUrl = process.env.FRONTEND_URL || 'https://honeyprofile.vercel.app'

  // One-click block URL — calls backend directly
  const token = generateQuickBlockToken(ip)
  const blockUrl = `${backendUrl}/api/blocklist/quick-block?ip=${encodeURIComponent(ip)}&reason=${encodeURIComponent(type)}&token=${token}`
  const dashboardUrl = `${frontendUrl}?session=${sessionId || ''}`

  const promises = []
  const isConfigured = (val) => Boolean(val && !val.includes('YOUR') && !val.includes('re_your_') && !val.includes('your@'))

  if (isConfigured(process.env.SLACK_WEBHOOK_URL)) {
    promises.push(sendSlackAlert({ type, sev, ip, username, location, message, time, blockUrl, dashboardUrl, attemptNumber, sessionId }))
  }
  if (isConfigured(process.env.DISCORD_WEBHOOK_URL)) {
    promises.push(sendDiscordAlert({ type, sev, ip, username, location, message, time, blockUrl, dashboardUrl, attemptNumber }))
  }
  if (isConfigured(process.env.TELEGRAM_BOT_TOKEN) && isConfigured(process.env.TELEGRAM_CHAT_ID)) {
    promises.push(sendTelegramAlert({ type, sev, ip, username, location, message, time, blockUrl, dashboardUrl, attemptNumber }))
  }
  if (isConfigured(process.env.RESEND_API_KEY) && isConfigured(process.env.ALERT_EMAIL_TO) && (severity === 'CRITICAL' || type === 'TEST_ALERT')) {
    // Send email for critical events (and test alerts)
    promises.push(sendEmailAlert({ type, sev, ip, username, location, message, time, dashboardUrl, sessionId, blockUrl }))
  }

  const results = await Promise.allSettled(promises)
  results.forEach((r, i) => {
    if (r.status === 'rejected') logger.warn(`[ALERT] Channel ${i} failed: ${r.reason?.message}`)
  })

  return { dispatched: promises.length, results }
}

// Preserve existing createAlert function for backward compatibility
const AUTO_RULES = {
  ZERO_DAY_EXPLOIT: 'BLOCK', COMMAND_INJECTION: 'BLOCK', DDOS: 'BLOCK',
  DATA_EXFILTRATION: 'REDIRECT_HONEY', INSIDER_THREAT: 'FLAG_REVIEW',
  SQL_INJECTION: 'RATE_LIMIT', BRUTE_FORCE: 'RATE_LIMIT'
}

export const createAlert = async (data, io) => {
  try {
    const alert = await Alert.create({
      alertId: `ALERT-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      severity: data.severity, title: data.title, description: data.description,
      sessionId: data.sessionId, sourceIP: data.sourceIP || 'Unknown',
      attackType: data.attackType || null, status: 'New'
    })
    broadcastAlert(alert)
    await cache.increment('unread_alerts', 86400)
    const autoAction = AUTO_RULES[data.attackType]
    if (autoAction && io) {
      io.emit('auto_response', { sessionId: data.sessionId, action: autoAction, reason: data.attackType, timestamp: new Date().toISOString() })
      logger.info(`[AUTO] ${autoAction} triggered for ${data.attackType}`)
    }
    return alert
  } catch (err) {
    logger.error(`Alert creation failed: ${err.message}`)
    return null
  }
}

export default {
  sendAlert,
  createAlert,
  SEVERITY,
  generateQuickBlockToken,
  verifyQuickBlockToken
}
