import assert from 'node:assert/strict'
import test from 'node:test'
import { createChatRecord, filterChatText } from './chatUtils.js'
import { getChatCopy } from '../i18n/chatTranslations.js'
import { LANGUAGES } from '../i18n/translations.js'

test('trims, normalizes whitespace, and masks common profanity by whole word', () => {
  assert.equal(filterChatText('  That SHIT   was strange  '), 'That ••• was strange')
  assert.equal(filterChatText('A classic play'), 'A classic play')
  assert.equal(filterChatText(''), '')
})

test('limits chat length and rejects non-text values', () => {
  assert.equal(filterChatText('x'.repeat(300)).length, 240)
  assert.equal(filterChatText(null), '')
})

test('chat records only keep public message fields', () => {
  const record = createChatRecord({
    id: 'm1',
    playerId: 'player-1',
    playerName: 'Player One',
    avatarColor: '#739b88',
    text: 'I am not the Chor',
    createdAt: 123,
    role: 'chor',
    roles: { chor: 'player-1' },
  })

  assert.deepEqual(Object.keys(record), [
    'id', 'playerId', 'playerName', 'avatarColor', 'text', 'createdAt',
  ])
  assert.equal(record.text, 'I am not the Chor')
})

test('chat messages sanitize timestamps that cannot be represented as dates', () => {
  const record = createChatRecord({
    text: 'Hello',
    createdAt: Number.MAX_VALUE,
  })

  assert.ok(Number.isFinite(record.createdAt))
  assert.doesNotThrow(() => new Date(record.createdAt).toISOString())
})

test('chat copy contains six quick messages and bot replies for every language', () => {
  for (const { id } of LANGUAGES) {
    const copy = getChatCopy(id)
    assert.equal(copy.quick.length, 6, `${id} quick messages`)
    assert.ok(copy.replyChor, `${id} Chor reply`)
    assert.ok(copy.replySipahi, `${id} Sipahi reply`)
  }
})
