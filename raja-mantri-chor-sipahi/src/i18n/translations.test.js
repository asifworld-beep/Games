import assert from 'node:assert/strict'
import test from 'node:test'
import { getDirection, LANGUAGES, translate, translateRole } from './translations.js'

test('exposes all requested Indian languages and RTL direction for Urdu', () => {
  assert.equal(LANGUAGES.length, 14)
  assert.ok(LANGUAGES.some(({ id }) => id === 'bho'))
  assert.notEqual(translateRole('bho', 'raja'), translateRole('en', 'raja'))
  assert.equal(getDirection('ur'), 'rtl')
  assert.equal(getDirection('hi'), 'ltr')
})

test('localizes a required guide label and all four role names in each language', () => {
  for (const { id } of LANGUAGES) {
    assert.ok(translate(id, 'guide'))
    for (const role of ['raja', 'mantri', 'chor', 'sipahi']) {
      assert.ok(translateRole(id, role))
    }
  }
})

test('localizes core lobby, privacy, and accessibility text in every language', () => {
  for (const { id } of LANGUAGES) {
    if (id === 'en') continue
    for (const key of ['soloDescription', 'privacy', 'mute', 'unmute', 'preparing', 'privateChitReady', 'tapToPeek']) {
      assert.notEqual(translate(id, key), translate('en', key), `${id} should translate ${key}`)
    }
  }
})
