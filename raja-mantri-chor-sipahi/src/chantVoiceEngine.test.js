import assert from 'node:assert/strict'
import test from 'node:test'
import { CHANTS, selectChantVoice, speakChant } from './chantVoiceEngine.js'
import { LANGUAGES } from './i18n/translations.js'

test('every supported language has a chant and selects its regional voice', () => {
  for (const { id } of LANGUAGES) {
    const [locale, text] = CHANTS[id]
    assert.ok(text)
    const voice = { lang: locale }
    assert.equal(selectChantVoice([voice], id), voice)
  }
  assert.equal(selectChantVoice([{ lang: 'en-US' }], 'ta'), undefined)
})

test('missing speech support requests the audio fallback', () => {
  globalThis.window = {}
  try {
    assert.equal(speakChant('hi', 0.5, () => {}), false)
  } finally {
    delete globalThis.window
  }
})
