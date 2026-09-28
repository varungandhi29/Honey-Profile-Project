/**
 * HoneyBus — Cross-Tab & Cross-Window Real-Time Telemetry Event Bus
 * Uses native BroadcastChannel with fallback to localStorage storage events.
 * Guarantees that attacks executed in one tab/window are IMMEDIATELY detected
 * and displayed on the Admin SOC dashboard in another tab/window.
 */

class HoneyBus {
  constructor() {
    this.channel = null
    this.listeners = new Set()
    
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('honeyshield_telemetry_bus')
        this.channel.onmessage = (event) => {
          if (event?.data) {
            this.notify(event.data)
          }
        }
      } catch (e) {
        console.warn('[HoneyBus] BroadcastChannel error:', e)
      }
    }

    // Storage event fallback (guarantees cross-tab sync across all browsers)
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'honeyshield_bus_event' && e.newValue) {
          try {
            const data = JSON.parse(e.newValue)
            this.notify(data)
          } catch {}
        }
      })
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
      senderId: typeof window !== 'undefined' ? window.__honeyTabId || (window.__honeyTabId = Math.random().toString(36).substring(2, 9)) : 'srv'
    }

    // 1. Notify local in-memory listeners
    this.notify(event)

    // 2. Broadcast via BroadcastChannel
    if (this.channel) {
      try {
        this.channel.postMessage(event)
      } catch {}
    }

    // 3. Trigger localStorage storage event for cross-tab sync
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('honeyshield_bus_event', JSON.stringify(event))
      } catch {}
    }
  }
}

export const honeyBus = new HoneyBus()
