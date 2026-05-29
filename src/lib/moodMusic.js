export const MOODS = [
  {
    id: 'energetic',
    emoji: '\u26A1',
    label: 'Energetic',
    description: 'Pumped up & hyped',
    gradient: 'from-orange-500 to-red-600',
    bgGradient: 'via-orange-900/20',
    glowColor: 'rgba(249,115,22,0.15)',
    borderColor: 'border-orange-500/30',
    textColor: 'text-orange-400',
    audio: {
      masterVolume: 0.08,
      layers: [
        { type: 'sawtooth', freq: 220, volume: 0.04, detune: 5, filterFreq: 1200 },
        { type: 'square', freq: 330, volume: 0.03, detune: -3, filterFreq: 800 },
        { type: 'sine', freq: 440, volume: 0.02, modRate: 4, modDepth: 30 },
      ],
      rhythmBpm: 140,
    },
  },
  {
    id: 'calm',
    emoji: '\uD83C\uDF0A',
    label: 'Calm',
    description: 'Chill & relaxed vibes',
    gradient: 'from-cyan-500 to-blue-600',
    bgGradient: 'via-cyan-900/20',
    glowColor: 'rgba(6,182,212,0.15)',
    borderColor: 'border-cyan-500/30',
    textColor: 'text-cyan-400',
    audio: {
      masterVolume: 0.07,
      layers: [
        { type: 'sine', freq: 110, volume: 0.04, modRate: 0.3, modDepth: 20 },
        { type: 'sine', freq: 165, volume: 0.03, modRate: 0.5, modDepth: 10 },
        { type: 'sine', freq: 220, volume: 0.02, modRate: 0.2, modDepth: 15 },
      ],
      noiseVolume: 0.02,
      noiseFilterFreq: 800,
    },
  },
  {
    id: 'happy',
    emoji: '\uD83D\uDE0A',
    label: 'Happy',
    description: 'Joyful & bright',
    gradient: 'from-yellow-400 to-amber-500',
    bgGradient: 'via-yellow-900/20',
    glowColor: 'rgba(250,204,21,0.15)',
    borderColor: 'border-yellow-500/30',
    textColor: 'text-yellow-400',
    audio: {
      masterVolume: 0.06,
      layers: [
        { type: 'triangle', freq: 262, volume: 0.03, modRate: 3, modDepth: 8 },
        { type: 'triangle', freq: 330, volume: 0.025, modRate: 3.5, modDepth: 6 },
        { type: 'sine', freq: 524, volume: 0.02, modRate: 2, modDepth: 10 },
      ],
      rhythmBpm: 120,
    },
  },
  {
    id: 'melancholic',
    emoji: '\uD83C\uDF27\uFE0F',
    label: 'Melancholic',
    description: 'Deep & thoughtful',
    gradient: 'from-purple-600 to-indigo-800',
    bgGradient: 'via-purple-900/20',
    glowColor: 'rgba(147,51,234,0.15)',
    borderColor: 'border-purple-500/30',
    textColor: 'text-purple-400',
    audio: {
      masterVolume: 0.07,
      layers: [
        { type: 'sine', freq: 98, volume: 0.04, modRate: 0.2, modDepth: 25 },
        { type: 'sine', freq: 147, volume: 0.03, modRate: 0.4, modDepth: 15 },
        { type: 'triangle', freq: 196, volume: 0.02, modRate: 0.3, modDepth: 12 },
      ],
      noiseVolume: 0.015,
      noiseFilterFreq: 400,
    },
  },
  {
    id: 'focused',
    emoji: '\uD83C\uDFAF',
    label: 'Focused',
    description: 'Deep work mode',
    gradient: 'from-emerald-500 to-teal-600',
    bgGradient: 'via-emerald-900/20',
    glowColor: 'rgba(16,185,129,0.15)',
    borderColor: 'border-emerald-500/30',
    textColor: 'text-emerald-400',
    audio: {
      masterVolume: 0.05,
      layers: [
        { type: 'sine', freq: 220, volume: 0.03, modRate: 0.8, modDepth: 5 },
        { type: 'sine', freq: 440, volume: 0.02, modRate: 0.6, modDepth: 3 },
        { type: 'sine', freq: 660, volume: 0.015, modRate: 0.4, modDepth: 2 },
      ],
    },
  },
  {
    id: 'night',
    emoji: '\uD83C\uDF19',
    label: 'Night Owl',
    description: 'Dark & mysterious',
    gradient: 'from-indigo-600 to-violet-800',
    bgGradient: 'via-indigo-900/20',
    glowColor: 'rgba(99,102,241,0.15)',
    borderColor: 'border-indigo-500/30',
    textColor: 'text-indigo-400',
    audio: {
      masterVolume: 0.06,
      layers: [
        { type: 'sine', freq: 65, volume: 0.04, modRate: 0.15, modDepth: 30 },
        { type: 'sine', freq: 98, volume: 0.03, modRate: 0.25, modDepth: 20 },
        { type: 'triangle', freq: 130, volume: 0.02, modRate: 0.1, modDepth: 25 },
      ],
      noiseVolume: 0.01,
      noiseFilterFreq: 200,
    },
  },
]

class MoodMusicEngine {
  constructor() {
    this.ctx = null
    this.nodes = []
    this.gains = []
    this.lfos = []
    this.noiseNode = null
    this.noiseGain = null
    this.noiseFilter = null
    this.active = false
    this.currentMoodId = null
    this.rhythmInterval = null
    this.rhythmGain = null
  }

  ensureContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)()
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  findMood(id) {
    return MOODS.find(m => m.id === id) || MOODS[0]
  }

  start(id) {
    this.ensureContext()
    this.stop()
    this.currentMoodId = id
    this.active = true

    const mood = this.findMood(id)
    const config = mood.audio
    const masterGain = this.ctx.createGain()
    masterGain.gain.value = config.masterVolume
    masterGain.connect(this.ctx.destination)
    this.gains.push(masterGain)

    config.layers.forEach((layer, i) => {
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      const filter = this.ctx.createBiquadFilter()

      osc.type = layer.type
      osc.frequency.value = layer.freq
      if (layer.detune) osc.detune.value = layer.detune

      filter.type = 'lowpass'
      filter.frequency.value = layer.filterFreq || 2000
      filter.Q.value = 0.5

      gain.gain.value = layer.volume

      if (layer.modRate) {
        const lfo = this.ctx.createOscillator()
        const lfoGain = this.ctx.createGain()
        lfo.type = 'sine'
        lfo.frequency.value = layer.modRate
        lfoGain.gain.value = layer.modDepth
        lfo.connect(lfoGain)
        lfoGain.connect(osc.frequency)
        lfo.start()
        this.lfos.push({ osc: lfo, gain: lfoGain })
      }

      osc.connect(filter)
      filter.connect(gain)
      gain.connect(masterGain)
      osc.start()

      this.nodes.push({ osc, filter })
      this.gains.push(gain)
    })

    if (config.noiseVolume && config.noiseVolume > 0) {
      this.startNoise(config.noiseVolume, config.noiseFilterFreq, masterGain)
    }

    if (config.rhythmBpm) {
      this.startRhythm(config.rhythmBpm, masterGain)
    }
  }

  startNoise(volume, filterFreq, dest) {
    const bufferSize = this.ctx.sampleRate * 2
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    this.noiseNode = this.ctx.createBufferSource()
    this.noiseNode.buffer = buffer
    this.noiseNode.loop = true

    this.noiseFilter = this.ctx.createBiquadFilter()
    this.noiseFilter.type = 'lowpass'
    this.noiseFilter.frequency.value = filterFreq || 800

    this.noiseGain = this.ctx.createGain()
    this.noiseGain.gain.value = 0

    this.noiseNode.connect(this.noiseFilter)
    this.noiseFilter.connect(this.noiseGain)
    this.noiseGain.connect(dest)
    this.noiseNode.start()

    this.noiseGain.gain.setValueAtTime(0, this.ctx.currentTime)
    this.noiseGain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + 2)
  }

  startRhythm(bpm, dest) {
    const interval = 60 / bpm
    const rhythmGain = this.ctx.createGain()
    rhythmGain.gain.value = 0.03
    rhythmGain.connect(dest)
    this.rhythmGain = rhythmGain

    let beat = 0
    const tick = () => {
      if (!this.active) return
      const freq = this.currentMoodId === 'energetic'
        ? 800 + Math.random() * 400
        : 500 + Math.random() * 200
      const osc = this.ctx.createOscillator()
      const g = this.ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      g.gain.setValueAtTime(0.03, this.ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08)
      osc.connect(g)
      g.connect(rhythmGain)
      osc.start(this.ctx.currentTime)
      osc.stop(this.ctx.currentTime + 0.08)

      beat++
      this.rhythmInterval = setTimeout(tick, interval * 1000)
    }
    this.rhythmInterval = setTimeout(tick, 500)
  }

  stop() {
    this.active = false

    if (this.rhythmInterval) {
      clearTimeout(this.rhythmInterval)
      this.rhythmInterval = null
    }

    this.nodes.forEach(n => {
      try { n.osc.stop() } catch {}
      try { n.osc.disconnect() } catch {}
      try { n.filter.disconnect() } catch {}
    })
    this.nodes = []

    this.gains.forEach(g => {
      try { g.disconnect() } catch {}
    })
    this.gains = []

    this.lfos.forEach(l => {
      try { l.osc.stop() } catch {}
      try { l.osc.disconnect() } catch {}
      try { l.gain.disconnect() } catch {}
    })
    this.lfos = []

    if (this.noiseNode) {
      try { this.noiseNode.stop() } catch {}
      try { this.noiseNode.disconnect() } catch {}
      try { this.noiseFilter.disconnect() } catch {}
      try { this.noiseGain.disconnect() } catch {}
      this.noiseNode = null
      this.noiseFilter = null
      this.noiseGain = null
    }

    this.rhythmGain = null
    this.currentMoodId = null
  }

  isActive() {
    return this.active
  }

  getCurrentMoodId() {
    return this.currentMoodId
  }
}

export const moodEngine = new MoodMusicEngine()

export function getMoodById(id) {
  return MOODS.find(m => m.id === id) || MOODS[0]
}
