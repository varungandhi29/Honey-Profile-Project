class AlertEngine {
  constructor() {
    this.audioCtx = null
    this.enabled = true
    this.volume = 1.0
    this.lastAlertTime = 0
    this.minInterval = 1000
    this.continuousAlertInterval = null
    this.continuousAlertActive = false
    this.sirenNodes = []
  }

  init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume()
    }
    return this
  }

  setEnabled(enabled) { this.enabled = enabled }
  setVolume(volume) { this.volume = Math.max(0, Math.min(1, volume)) }
  isAlertActive() { return this.continuousAlertActive }

  canPlay() {
    if (!this.enabled) return false
    const now = Date.now()
    if (now - this.lastAlertTime < this.minInterval) return false
    this.lastAlertTime = now
    return true
  }

  // POLICE SIREN — wailing up and down like a real police car
  playPoliceSiren(durationSeconds = 3) {
    this.init()
    const ctx = this.audioCtx
    const now = ctx.currentTime

    // Create two oscillators for richer sound
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    const gain2 = ctx.createGain()
    const masterGain = ctx.createGain()

    osc1.connect(gain1)
    osc2.connect(gain2)
    gain1.connect(masterGain)
    gain2.connect(masterGain)
    masterGain.connect(ctx.destination)

    masterGain.gain.setValueAtTime(this.volume * 0.9, now)

    osc1.type = 'sawtooth'
    osc2.type = 'square'

    // Wailing pattern — sweep up then down repeatedly
    const sweepTime = 0.8
    const cycles = Math.floor(durationSeconds / sweepTime)

    for (let i = 0; i < cycles; i++) {
      const t = now + (i * sweepTime)
      // Low frequency
      osc1.frequency.setValueAtTime(600, t)
      osc2.frequency.setValueAtTime(580, t)
      // Sweep up
      osc1.frequency.linearRampToValueAtTime(1200, t + sweepTime * 0.5)
      osc2.frequency.linearRampToValueAtTime(1180, t + sweepTime * 0.5)
      // Sweep down
      osc1.frequency.linearRampToValueAtTime(600, t + sweepTime)
      osc2.frequency.linearRampToValueAtTime(580, t + sweepTime)
    }

    // Volume pulsing for urgency
    for (let i = 0; i < durationSeconds * 4; i++) {
      const t = now + (i * 0.25)
      gain1.gain.setValueAtTime(this.volume * (i % 2 === 0 ? 1.0 : 0.7), t)
      gain2.gain.setValueAtTime(this.volume * (i % 2 === 0 ? 0.5 : 0.8), t)
    }

    osc1.start(now)
    osc2.start(now)
    osc1.stop(now + durationSeconds)
    osc2.stop(now + durationSeconds)

    this.sirenNodes = [osc1, osc2, gain1, gain2, masterGain]
  }

  // CRITICAL — full police siren 4 seconds
  playCritical() {
    if (!this.canPlay()) return
    this.playPoliceSiren(4)
  }

  // HIGH — police siren 2 seconds
  playHigh() {
    if (!this.canPlay()) return
    this.playPoliceSiren(2)
  }

  // MEDIUM — short siren burst
  playMedium() {
    if (!this.canPlay()) return
    this.init()
    const ctx = this.audioCtx
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(600, ctx.currentTime)
    osc.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.4)
    osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.8)
    gain.gain.setValueAtTime(this.volume * 0.6, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.9)
  }

  // HONEY TRAP — distinct from siren, rising alarm
  playHoneyTrap() {
    if (!this.canPlay()) return
    this.init()
    const ctx = this.audioCtx
    // Three rising beeps then siren
    ;[0, 0.2, 0.4].forEach((t, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'square'
      osc.frequency.value = 440 + (i * 220)
      gain.gain.setValueAtTime(this.volume * 0.8, ctx.currentTime + t)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.18)
      osc.start(ctx.currentTime + t)
      osc.stop(ctx.currentTime + t + 0.18)
    })
    // Then siren
    setTimeout(() => this.playPoliceSiren(2), 700)
  }

  // VPN DETECTED — long aggressive siren
  playVPNDetected() {
    if (!this.canPlay()) return
    this.playPoliceSiren(5)
  }

  // IP BLOCKED — descending confirmation
  playBlocked() {
    if (!this.canPlay()) return
    this.init()
    const ctx = this.audioCtx
    ;[880, 660, 440].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      osc.type = 'sine'
      gain.gain.setValueAtTime(this.volume * 0.7, ctx.currentTime + i * 0.15)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.12)
      osc.start(ctx.currentTime + i * 0.15)
      osc.stop(ctx.currentTime + i * 0.15 + 0.12)
    })
  }

  playBySeverity(severity) {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL': this.playCritical(); break
      case 'HIGH':     this.playHigh(); break
      case 'MEDIUM':   this.playMedium(); break
      default: break
    }
  }

  // Continuous siren — repeats every intervalMs
  startContinuousAlert(severity = 'HIGH', intervalMs = 8000) {
    if (this.continuousAlertActive) {
      this.stopContinuousAlert()
    }
    this.continuousAlertActive = true

    // Play immediately
    this.minInterval = 0
    this.playBySeverity(severity)
    this.minInterval = 1000

    this.continuousAlertInterval = setInterval(() => {
      if (this.continuousAlertActive) {
        this.minInterval = 0
        this.playBySeverity(severity)
        this.minInterval = 1000
      }
    }, intervalMs)
  }

  stopContinuousAlert() {
    if (this.continuousAlertInterval) {
      clearInterval(this.continuousAlertInterval)
      this.continuousAlertInterval = null
    }
    this.continuousAlertActive = false
    // Stop any currently playing siren nodes
    try {
      this.sirenNodes.forEach(node => {
        try { node.stop?.() } catch {}
        try { node.disconnect?.() } catch {}
      })
    } catch {}
    this.sirenNodes = []
  }
}

export const alertEngine = new AlertEngine()
