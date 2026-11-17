import test from 'node:test'
import assert from 'node:assert/strict'
import { BGMPlayer, SoundEngine } from './soundEngine.js'

class Param {
  constructor(value = 0) { this.value = value; this.events = [] }
  setValueAtTime(value, time) { this.value = value; this.events.push(['set', value, time]) }
  setTargetAtTime(value, time, duration) { this.events.push(['target', value, time, duration]) }
  exponentialRampToValueAtTime(value, time) { this.events.push(['ramp', value, time]) }
  cancelAndHoldAtTime(time) { this.events.push(['hold', time]) }
}

class Node {
  constructor() {
    this.gain = new Param(1)
    this.frequency = new Param()
    this.stops = []
    this.connections = []
  }
  connect(node) { this.connections.push(node) }
  disconnect() {}
  start() {}
  stop(time) { this.stops.push(time) }
}

class Context {
  constructor() { this.currentTime = 0; this.sampleRate = 100; this.destination = {}; this.state = 'running' }
  createGain() { return new Node() }
  createOscillator() { return new Node() }
  createBufferSource() { return new Node() }
  createBiquadFilter() { return new Node() }
  createBuffer() { return { getChannelData: () => new Float32Array(200) } }
  close() { this.state = 'closed'; return Promise.resolve() }
}

test('music track switching and stopping clean up scheduled nodes and timers', () => {
  const previousWindow = globalThis.window
  const timers = new Map()
  let nextTimer = 0
  globalThis.window = {
    setInterval: (callback) => { const id = ++nextTimer; timers.set(id, callback); return id },
    clearInterval: (id) => timers.delete(id),
  }
  try {
    const context = new Context()
    const music = new BGMPlayer(context)
    for (const track of ['darbar', 'moonlit', 'temple', 'courtyard']) {
      const previousNodes = [...music.nodes]
      music.start(track, 0.4, true)
      assert.equal(music.track, track)
      assert.equal(timers.size, 1)
      assert.ok(music.nodes.size > 0)
      for (const node of previousNodes) assert.ok(node.stops.length)
    }
    const nodes = [...music.nodes]
    music.stop()
    assert.equal(timers.size, 0)
    assert.equal(music.nodes.size, 0)
    for (const node of nodes) assert.ok(node.stops.length)
    assert.throws(() => music.start('unknown', 0.4, false), /Unknown music track/)
    music.close()
  } finally {
    globalThis.window = previousWindow
  }
})

test('music volume and ducking are independent of effects and restore the latest volume', async () => {
  const previousWindow = globalThis.window
  globalThis.window = { AudioContext: Context, setInterval: () => 1, clearInterval: () => {} }
  try {
    const engine = new SoundEngine()
    engine.startAmbient('darbar', 0.5, false)
    engine.play('reveal', 0.8)
    assert.ok(engine.master.gain.events.some((event) => event[1] === 0.8))
    assert.ok(engine.music.output.gain.events.some((event) => event[1] === 0.3))
    engine.context.currentTime = 1
    engine.music.setVolume(0.7)
    assert.ok(engine.music.output.gain.events.some((event) => event[1] === 0.42 && event[2] === 1))
    assert.ok(engine.music.output.gain.events.some((event) => event[1] === 0.7 && event[2] === 4))
    await engine.close()
  } finally {
    globalThis.window = previousWindow
  }
})
