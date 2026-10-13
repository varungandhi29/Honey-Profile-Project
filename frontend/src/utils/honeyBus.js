/**
 * HoneyShield Global HoneyBus — Cross-Device & Cross-Browser Real-Time Telemetry Bus
 * 
 * 1. Global Cloud Mesh Relay: Transmits attacks, sessions, and block commands across
 *    different PCs and devices globally via low-latency encrypted HTTP/SSE sync stream.
 * 2. Native BroadcastChannel: Instant sub-millisecond sync across local tabs.
 * 3. LocalStorage Event Stream: Fallback sync for multi-window / private browsing modes.
 */

const CLOUD_SYNC_TOPIC = 'honeyshield_soc_live_sync_viva_2026'
const CLOUD_SYNC_URL = `https://ntfy.sh/${CLOUD_SYNC_TOPIC}`

class HoneyBus {
  constructor() {
    this.channel = null
    this.listeners = new Set()
    this.eventSource = null
    this.isReconnecting = false
    this.processedMessageIds = new Set()

    if (typeof window !== 'undefined') {
      this.myTabId = window.__honeyTabId || (window.__honeyTabId = 'cl_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now())
    } else {
      this.myTabId = 'srv_' + Date.now()
    }

    // 1. Native BroadcastChannel (instant local tab sync)
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('honeyshield_telemetry_bus')
        this.channel.onmessage = (event) => {
          if (event?.data && event.data.senderId !== this.myTabId) {
            this.notify(event.data)
          }
        }
      } catch (e) {
        console.warn('[HoneyBus] BroadcastChannel warning:', e)
      }
    }

    // 2. Storage event fallback (cross-window local sync)
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'honeyshield_bus_event' && e.newValue) {
          try {
            const data = JSON.parse(e.newValue)
            if (data && data.senderId !== this.myTabId) {
              this.notify(data)
            }
          } catch {}
        }
      })
    }

    // 3. Connect to Global Cloud Relay (cross-PC & cross-device internet sync)
    if (typeof window !== 'undefined') {
      this.initCloudRelay()
    }
  }

  initCloudRelay() {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return

    // Quick initial catch-up poll for past 10 minutes (catches past blocks / active sessions)
    try {
      fetch(`${CLOUD_SYNC_URL}/json?poll=1&since=10m`)
        .then(res => res.text())
        .then(text => {
          if (!text) return
          const lines = text.trim().split('\n')
          lines.forEach(line => {
            try {
              const item = JSON.parse(line)
              if (item.event === 'message' && item.message) {
                const parsed = JSON.parse(item.message)
                if (parsed && parsed.senderId !== this.myTabId) {
                  this.notify(parsed)
                }
              }
            } catch {}
          })
        })
        .catch(() => {})
    } catch {}

    // Persistent live SSE subscription for instant cross-device delivery
    this.connectSSE()
  }

  connectSSE() {
    try {
      if (this.eventSource) {
        this.eventSource.close()
        this.eventSource = null
      }

      this.eventSource = new EventSource(`${CLOUD_SYNC_URL}/sse`)
      
      this.eventSource.onmessage = (e) => {
        if (!e?.data) return
        try {
          const wrapper = JSON.parse(e.data)
          if (wrapper.id && this.processedMessageIds.has(wrapper.id)) return
          if (wrapper.id) {
            this.processedMessageIds.add(wrapper.id)
            if (this.processedMessageIds.size > 200) {
              const first = this.processedMessageIds.values().next().value
              this.processedMessageIds.delete(first)
            }
          }

          if (wrapper.event === 'message' && wrapper.message) {
            const eventData = JSON.parse(wrapper.message)
            if (eventData && eventData.senderId !== this.myTabId) {
              this.notify(eventData)
            }
          }
        } catch {
          try {
            const direct = JSON.parse(e.data)
            if (direct && direct.senderId !== this.myTabId) {
              this.notify(direct)
            }
          } catch {}
        }
      }

      this.eventSource.onerror = () => {
        if (this.isReconnecting) return
        this.isReconnecting = true
        if (this.eventSource) {
          try { this.eventSource.close() } catch {}
          this.eventSource = null
        }
        setTimeout(() => {
          this.isReconnecting = false
          this.connectSSE()
        }, 3000)
      }
    } catch (err) {
      console.warn('[HoneyBus] Cloud SSE initialization error:', err)
    }
  }

  subscribe(callback) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  notify(event) {
    this.listeners.forEach(cb => {
      try { cb(event) } catch (err) { console.error('[HoneyBus] Listener error:', err) }
    })
  }

  publish(type, payload) {
    const event = {
      type,
      payload,
      timestamp: Date.now(),
      senderId: this.myTabId
    }

    // 1. Notify local listeners immediately
    this.notify(event)

    // 2. Broadcast via native BroadcastChannel
    if (this.channel) {
      try {
        this.channel.postMessage(event)
      } catch {}
    }

    // 3. Set localStorage storage event
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('honeyshield_bus_event', JSON.stringify(event))
      } catch {}
    }

    // 4. Broadcast to Global Cloud Relay (transmits to other PCs/laptops on deployed web)
    if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
      try {
        fetch(CLOUD_SYNC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event)
        }).catch(() => {})
      } catch {}
    }
  }
}

export const honeyBus = new HoneyBus()
