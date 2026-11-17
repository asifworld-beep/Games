import assert from 'node:assert/strict'
import test from 'node:test'
import { CHANTS, RANI_CALLS, prepareSpeechVoices, selectChantVoice, speakChant, speakPhase, speakRoleLine } from './chantVoiceEngine.js'
import { LANGUAGES } from './i18n/translations.js'

test('every supported language has a chant and selects its regional voice', () => {
  for (const { id } of LANGUAGES) {
    const [locale, text] = CHANTS[id]
    assert.ok(text)
    assert.ok(RANI_CALLS[id])
    const voice = { lang: locale }
    assert.equal(selectChantVoice([voice], id), voice)
  }
  assert.equal(selectChantVoice([{ lang: 'en-US' }], 'ta'), undefined)
})

test('phase speech completes only when the utterance finishes', async () => {
  let spoken
  globalThis.window = {
    SpeechSynthesisUtterance: class { constructor(text) { this.text = text } },
    speechSynthesis: { getVoices: () => [{ lang: 'en-IN' }], speak: (utterance) => { spoken = utterance } },
  }
  try {
    let finished = false
    const done = speakPhase('Mera Sipahi Kaun?', 'en', 0.5, () => {}).then(() => { finished = true })
    await Promise.resolve()
    assert.equal(finished, false)
    spoken.onend()
    await done
    assert.equal(finished, true)
    assert.equal(speakPhase('chant', 'ta', 0.5, () => {}), null)
  } finally {
    delete globalThis.window
  }
})

test('phase speech reports playback errors without treating cancellation as a failure', async () => {
  let spoken
  const errors = []
  globalThis.window = {
    SpeechSynthesisUtterance: class {},
    speechSynthesis: { getVoices: () => [{ lang: 'en-IN' }], speak: (utterance) => { spoken = utterance } },
  }
  try {
    const failed = speakPhase('call', 'en', 0.5, (error) => errors.push(error))
    spoken.onerror({ error: 'audio-busy' })
    await failed
    const cancelled = speakPhase('call', 'en', 0.5, (error) => errors.push(error))
    spoken.onerror({ error: 'canceled' })
    await cancelled
    assert.deepEqual(errors, ['audio-busy'])
  } finally {
    delete globalThis.window
  }
})

test('missing speech support requests the audio fallback', () => {
  globalThis.window = {}
  try {
    assert.equal(speakChant('hi', 0.5, () => {}), false)
  } finally {
    delete globalThis.window
  }
})

test('speech uses the matching language, volume and pacing', () => {
  let spoken
  const voice = { lang: 'bn-IN' }
  globalThis.SpeechSynthesisUtterance = class {
    constructor(text) { this.text = text }
  }
  globalThis.window = {
    SpeechSynthesisUtterance: globalThis.SpeechSynthesisUtterance,
    speechSynthesis: { getVoices: () => [voice], speak: (utterance) => { spoken = utterance } },
  }
  try {
    assert.equal(speakChant('bn', 0.4, () => {}), true)
    assert.equal(spoken.voice, voice)
    assert.equal(spoken.lang, 'bn-IN')
    assert.equal(spoken.text, CHANTS.bn[1])
    assert.equal(spoken.volume, 0.4)
    assert.equal(spoken.rate, 0.95)
    assert.equal(spoken.pitch, 1.05)
    assert.equal(speakChant('ta', 0.4, () => {}), false)
  } finally {
    delete globalThis.window
    delete globalThis.SpeechSynthesisUtterance
  }
})

test('Rani prefers a matching female voice and never selects a male fallback', () => {
  const male = { lang: 'hi-IN', name: 'Male Ravi' }
  const female = { lang: 'hi-IN', name: 'Lekha' }
  assert.equal(selectChantVoice([male, female], 'hi', 'rani'), female)
  assert.equal(selectChantVoice([male], 'hi', 'rani'), undefined)
  assert.equal(selectChantVoice([female, male], 'hi', 'raja'), male)
  const fallback = { lang: 'en-US', name: 'Samantha' }
  assert.equal(selectChantVoice([male, fallback], 'hi', 'rani'), fallback)
})

test('voices loaded asynchronously are used for the localized Rani call', async () => {
  let voices = []
  let changed
  let spoken
  globalThis.window = {
    SpeechSynthesisUtterance: class {},
    speechSynthesis: {
      getVoices: () => voices,
      addEventListener: (_, listener) => { changed = listener },
      speak: (utterance) => { spoken = utterance },
    },
  }
  try {
    prepareSpeechVoices()
    voices = [{ lang: 'hi-IN', name: 'Female Kalpana' }]
    changed()
    const done = speakRoleLine({ role: 'RANI', text: RANI_CALLS.hi, lang: 'hi', volume: 0.5, onError: () => {} })
    assert.equal(spoken.voice, voices[0])
    assert.equal(spoken.pitch, 1.32)
    assert.equal(spoken.rate, 0.95)
    spoken.onend()
    await done
  } finally {
    delete globalThis.window
  }
})
