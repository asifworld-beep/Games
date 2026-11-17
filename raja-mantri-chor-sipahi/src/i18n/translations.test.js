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

test('localizes a required guide label and all five role names in each language', () => {
  for (const { id } of LANGUAGES) {
    assert.ok(translate(id, 'guide'))
    for (const role of ['raja', 'rani', 'mantri', 'chor', 'sipahi']) {
      assert.ok(translateRole(id, role))
    }
  }
})

test('all languages describe Sipahi investigating the hidden Mantri and Chor', () => {
  for (const { id } of LANGUAGES) {
    assert.ok(translate(id, 'step3Body'))
    assert.ok(translate(id, 'step4Body'))
    assert.equal(translate(id, 'kingCallout'), '“Mera Sipahi Kaun?”')
    assert.equal(translate(id, 'chant'), '“Sipahi, Sipahi, Chor ko pakdo!”')
    assert.ok(translate(id, 'fivePlayers'))
  }
})

test('localizes core lobby, privacy, and accessibility text in every language', () => {
  for (const { id } of LANGUAGES) {
    if (id === 'en') continue
    for (const key of ['soloDescription', 'privacy', 'mute', 'unmute', 'preparing', 'privateChitReady', 'tapToPeek', 'arrestSuspect', 'memorizing']) {
      assert.notEqual(translate(id, key), translate('en', key), `${id} should translate ${key}`)
    }
  }
})

test('all supported languages have labels for the five courtyard themes', () => {
  for (const { id } of LANGUAGES) {
    for (const key of ['dawn', 'himalayan', 'emerald', 'sandstone', 'sapphire']) {
      assert.notEqual(translate(id, key), key, `${id} is missing ${key}`)
      if (id !== 'en' && id !== 'hinglish') assert.notEqual(translate(id, key), translate('en', key))
    }
  }
})
