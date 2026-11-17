export class SoundEngine {
  constructor() {
    const AudioContextClass = window.AudioContext
    this.context = AudioContextClass ? new AudioContextClass() : null
    this.master = this.context?.createGain() ?? null
    if (this.master && this.context) {
      this.master.gain.value = 0.55
      this.master.connect(this.context.destination)
    }
    this.ambientNodes = []
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
    const sounds = {
      correct: { notes: [523.25, 659.25, 783.99], type: 'sine', spacing: 0.12, duration: 0.32, gain: 0.08 },
      suspense: { notes: [440, 392], type: 'sine', spacing: 0.12, duration: 0.32, gain: 0.08 },
      rustle: { notes: [920, 740, 610], type: 'triangle', spacing: 0.035, duration: 0.12, gain: 0.025 },
      'king-call': { notes: [392, 523.25, 659.25, 392, 261.63], type: 'triangle', spacing: 0.085, duration: 0.24, gain: 0.055, comic: true },
      scroll: { notes: [1080, 860, 620], type: 'triangle', spacing: 0.045, duration: 0.2, gain: 0.03, slide: true },
      caught: { notes: [740, 294, 196, 146.83], type: 'square', spacing: 0.055, duration: 0.22, gain: 0.035 },
      coins: { notes: [987.77, 1318.51, 1567.98, 1174.66, 1760], type: 'sine', spacing: 0.07, duration: 0.18, gain: 0.04 },
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

  startAmbient(volume = 0.55) {
    if (!this.context || !this.master || this.ambientNodes.length) return
    this.setVolume(volume)
    const now = this.context.currentTime
    ;[110, 165].forEach((frequency) => {
      const oscillator = this.context.createOscillator()
      const gain = this.context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = frequency
      gain.gain.value = 0.012
      oscillator.connect(gain)
      gain.connect(this.master)
      oscillator.start(now)
      this.ambientNodes.push(oscillator, gain)
    })
  }

  stopAmbient() {
    for (const node of this.ambientNodes) {
      if (typeof node.stop === 'function') node.stop()
      node.disconnect()
    }
    this.ambientNodes = []
  }

  async close() {
    if (!this.context) return
    this.stopAmbient()
    await this.context.close()
  }
}
