export const MUSIC_TRACKS = [
  { id: 'darbar', name: 'Royal Darbar · Tabla & Shehnai' },
  { id: 'moonlit', name: 'Moonlit Sarod & Flute' },
  { id: 'temple', name: 'Sacred Temple · Tanpura & Bells' },
  { id: 'courtyard', name: 'Silent Courtyard · Nature' },
]

export class BGMPlayer {
  constructor(context) {
    this.context = context
    this.output = context.createGain()
    this.output.gain.value = 0.45
    this.output.connect(context.destination)
    this.nodes = new Set()
    this.track = null
    this.timer = null
    this.volume = 0.45
    this.duckUntil = 0
  }

  setVolume(volume) {
    this.volume = volume
    const now = this.context.currentTime
    const gain = this.output.gain
    if (gain.cancelAndHoldAtTime) gain.cancelAndHoldAtTime(now)
    else {
      gain.cancelScheduledValues(now)
      gain.setValueAtTime(gain.value, now)
    }
    gain.setTargetAtTime(now < this.duckUntil ? volume * 0.6 : volume, now, 0.08)
    if (now < this.duckUntil) gain.setTargetAtTime(volume, this.duckUntil, 0.4)
  }

  duck(seconds = 4) {
    const now = this.context.currentTime
    this.duckUntil = now + seconds
    const gain = this.output.gain
    if (gain.cancelAndHoldAtTime) gain.cancelAndHoldAtTime(now)
    else {
      gain.cancelScheduledValues(now)
      gain.setValueAtTime(gain.value, now)
    }
    gain.setTargetAtTime(this.volume * 0.6, now, 0.08)
    gain.setTargetAtTime(this.volume, this.duckUntil, 0.4)
  }

  tone(frequency, at, duration, level, type = 'sine', endFrequency = frequency, vibrato = false) {
    const oscillator = this.context.createOscillator()
    const envelope = this.context.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, at)
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, at + duration)
    envelope.gain.setValueAtTime(0.0001, at)
    envelope.gain.exponentialRampToValueAtTime(level, at + Math.min(0.08, duration / 4))
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration)
    oscillator.connect(envelope)
    envelope.connect(this.output)
    this.nodes.add(oscillator)
    oscillator.onended = () => {
      this.nodes.delete(oscillator)
      oscillator.disconnect()
      envelope.disconnect()
    }
    if (vibrato) {
      const lfo = this.context.createOscillator()
      const depth = this.context.createGain()
      lfo.frequency.value = 5
      depth.gain.value = frequency * 0.012
      lfo.connect(depth)
      depth.connect(oscillator.frequency)
      this.nodes.add(lfo)
      lfo.onended = () => { this.nodes.delete(lfo); lfo.disconnect(); depth.disconnect() }
      lfo.start(at)
      lfo.stop(at + duration)
    }
    oscillator.start(at)
    oscillator.stop(at + duration + 0.02)
  }

  scheduleBeat(at, beat) {
    if (this.track === 'darbar') {
      const melody = [392, 440, 493.88, 587.33, 659.25, 587.33, 493.88, 440]
      if (beat % 2 === 0) {
        const note = melody[(beat / 2) % melody.length]
        this.tone(note * 0.97, at, 0.74, 0.026, 'triangle', note, true)
        this.tone(note * 2, at, 0.65, 0.006, 'sine', note * 2, true)
      }
      const bass = beat % 4 === 0 || beat % 8 === 6
      this.tone(bass ? 145 : 390, at, bass ? 0.24 : 0.13, bass ? 0.035 : 0.018, 'sine', bass ? 65 : 265)
    } else if (this.track === 'moonlit') {
      const notes = [293.66, 329.63, 392, 440, 493.88, 440, 392, 329.63]
      const note = notes[beat % notes.length]
      if (beat % 2 === 0) this.tone(note, at, 1.15, 0.024, 'sine', note * 1.005, true)
      this.tone(note / 2, at, 0.35, 0.018, 'triangle', note / 2)
    } else if (this.track === 'temple') {
      if (beat % 8 === 0) {
        this.tone(659.25, at, 2.4, 0.018)
        this.tone(1318.5, at, 1.5, 0.009)
        this.tone(1977.75, at, 0.9, 0.004)
      }
    } else if (beat % 6 === 0) {
      const note = this.isNight ? 2900 : 1250
      this.tone(note, at, 0.13, 0.008, 'sine', this.isNight ? note : note * 1.35)
      this.tone(note * 1.02, at + 0.18, 0.1, 0.006)
    }
  }

  start(track, volume, isNight) {
    if (!MUSIC_TRACKS.some(({ id }) => id === track)) throw new Error(`Unknown music track: ${track}`)
    this.setVolume(volume)
    if (this.track === track && (track !== 'courtyard' || this.isNight === isNight)) return
    this.stop()
    this.track = track
    this.isNight = isNight
    const now = this.context.currentTime
    if (track !== 'courtyard') {
      for (const [frequency, level] of [[110, 0.012], [165, 0.006], [220, 0.004]]) {
        const oscillator = this.context.createOscillator()
        const gain = this.context.createGain()
        oscillator.frequency.value = frequency
        gain.gain.value = level
        oscillator.connect(gain)
        gain.connect(this.output)
        this.nodes.add(oscillator)
        oscillator.onended = () => { this.nodes.delete(oscillator); oscillator.disconnect(); gain.disconnect() }
        oscillator.start(now)
      }
    } else {
      const buffer = this.context.createBuffer(1, this.context.sampleRate * 2, this.context.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1
      const noise = this.context.createBufferSource()
      const filter = this.context.createBiquadFilter()
      const gain = this.context.createGain()
      noise.buffer = buffer
      noise.loop = true
      filter.type = 'lowpass'
      filter.frequency.value = 360
      gain.gain.value = 0.018
      noise.connect(filter)
      filter.connect(gain)
      gain.connect(this.output)
      this.nodes.add(noise)
      noise.onended = () => { this.nodes.delete(noise); noise.disconnect(); filter.disconnect(); gain.disconnect() }
      noise.start(now)
    }
    let beat = 0
    let next = now + 0.05
    const spacing = track === 'darbar' ? 0.42 : track === 'moonlit' ? 0.6 : 0.75
    const schedule = () => {
      if (next < this.context.currentTime) next = this.context.currentTime + 0.02
      while (next < this.context.currentTime + 0.3) {
        this.scheduleBeat(next, beat++)
        next += spacing
      }
    }
    schedule()
    this.timer = window.setInterval(schedule, 150)
  }

  stop() {
    if (this.timer !== null) window.clearInterval(this.timer)
    this.timer = null
    for (const node of this.nodes) node.stop()
    this.nodes.clear()
    this.track = null
  }

  close() {
    this.stop()
    this.output.disconnect()
  }
}

export class SoundEngine {
  constructor() {
    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext
    this.context = AudioContextClass ? new AudioContextClass() : null
    this.master = this.context?.createGain() ?? null
    if (this.master && this.context) {
      this.master.gain.value = 0.55
      this.master.connect(this.context.destination)
    }
    this.music = this.context ? new BGMPlayer(this.context) : null
    this.chantNodes = []
  }

  async activate() {
    if (!this.context) return false
    if (this.context.state === 'suspended') await this.context.resume()
    return true
  }

  setVolume(volume) {
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(volume, this.context.currentTime, 0.04)
    }
  }

  play(name, volume = 0.55) {
    if (!this.context || !this.master) return
    this.setVolume(volume)
    if (name === 'reveal' || name === 'king-call') this.music?.duck()
    const sounds = {
      correct: { notes: [523.25, 659.25, 783.99], type: 'sine', spacing: 0.12, duration: 0.32, gain: 0.08 },
      suspense: { notes: [440, 392], type: 'sine', spacing: 0.12, duration: 0.32, gain: 0.08 },
      reveal: { notes: [523.25, 659.25, 783.99], type: 'sine', spacing: 0.12, duration: 0.32, gain: 0.08 },
      rustle: { notes: [920, 740, 610], type: 'triangle', spacing: 0.035, duration: 0.12, gain: 0.025 },
      'king-call': { notes: [392, 523.25, 659.25, 392, 261.63], type: 'triangle', spacing: 0.085, duration: 0.24, gain: 0.055, comic: true },
      scroll: { notes: [1080, 860, 620], type: 'triangle', spacing: 0.045, duration: 0.2, gain: 0.03, slide: true },
      caught: { notes: [740, 294, 196, 146.83], type: 'square', spacing: 0.055, duration: 0.22, gain: 0.035 },
      cage: { notes: [392, 196, 146.83, 110], type: 'triangle', spacing: 0.035, duration: 0.42, gain: 0.065 },
      coins: { notes: [987.77, 1318.51, 1567.98, 1174.66, 1760], type: 'sine', spacing: 0.07, duration: 0.18, gain: 0.04 },
      tick: { notes: [680], type: 'sine', spacing: 0, duration: 0.08, gain: 0.018 },
      'rani-chime': { notes: [1046.5, 1318.5, 1568], type: 'sine', spacing: 0.08, duration: 0.35, gain: 0.015 },
    }

    const sound = sounds[name] ?? sounds.correct
    const start = this.context.currentTime
    sound.notes.forEach((frequency, index) => {
      const oscillator = this.context.createOscillator()
      const envelope = this.context.createGain()
      const at = start + index * sound.spacing
      oscillator.type = sound.type
      oscillator.frequency.setValueAtTime(frequency, at)
      if (sound.comic) {
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(80, frequency * 0.72), at + sound.duration * 0.7)
      } else if (sound.slide) {
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(90, frequency * 0.68), at + sound.duration * 0.8)
      }
      envelope.gain.setValueAtTime(0.0001, at)
      envelope.gain.exponentialRampToValueAtTime(sound.gain, at + 0.025)
      envelope.gain.exponentialRampToValueAtTime(0.0001, at + sound.duration)
      oscillator.connect(envelope)
      envelope.connect(this.master)
      oscillator.start(at)
      oscillator.stop(at + sound.duration + 0.02)
    })
  }

  playRaniVoiceChime(volume) {
    this.play('rani-chime', volume)
  }

  playChant(volume = 0.55, fallback = false) {
    if (!this.context || !this.master) return
    this.music?.duck()
    this.stopChant()
    this.setVolume(volume)
    const now = this.context.currentTime
    const notes = fallback
      ? [[0, 130], [0.24, 185], [0.48, 130], [0.72, 185], [0.96, 330], [1.24, 440], [1.52, 660]]
      : [[0, 130], [0.24, 185], [0.48, 130], [0.72, 185], [1.0, 130], [1.24, 185], [1.5, 130]]
    notes.forEach(([offset, frequency]) => {
      const oscillator = this.context.createOscillator()
      const gain = this.context.createGain()
      const at = now + offset
      oscillator.type = frequency > 200 ? 'triangle' : 'sine'
      oscillator.frequency.setValueAtTime(frequency, at)
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.65, at + 0.16)
      gain.gain.setValueAtTime(0.0001, at)
      gain.gain.exponentialRampToValueAtTime(0.08, at + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.2)
      oscillator.connect(gain)
      gain.connect(this.master)
      oscillator.start(at)
      oscillator.stop(at + 0.22)
      this.chantNodes.push({ oscillator, gain })
    })
  }

  stopChant() {
    this.chantNodes.forEach(({ oscillator, gain }) => {
      oscillator.disconnect()
      gain.disconnect()
    })
    this.chantNodes = []
  }

  startAmbient(track = 'darbar', volume = 0.45, isNight = false) {
    this.music?.start(track, volume, isNight)
  }

  stopAmbient() {
    this.music?.stop()
  }

  async close() {
    if (!this.context || this.context.state === 'closed') return
    this.music?.close()
    this.stopChant()
    await this.context.close()
  }
}
