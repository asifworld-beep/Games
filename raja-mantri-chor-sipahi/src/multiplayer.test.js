import assert from 'node:assert/strict'
import test from 'node:test'
import { createGame, gameReducer, ROLE } from './game.js'
import { MultiplayerManager } from './network/multiplayerManager.js'

test('multiplayer reveals only the accused before the remaining suspect', () => {
  const roles = { [ROLE.RAJA]: 'you', [ROLE.MANTRI]: 'mira', [ROLE.CHOR]: 'asha', [ROLE.SIPAHI]: 'kabir' }
  let game = gameReducer(createGame(), { type: 'START_ROUND', roles })
  for (const action of [
    { type: 'FINISH_SHUFFLE' },
    { type: 'OPEN_PRIVATE', playerId: 'you' },
    { type: 'PEEK_PRIVATE', playerId: 'you' },
    { type: 'REVEAL_KING' }, { type: 'ADVANCE_REVEAL' },
    { type: 'REVEAL_SIPAHI' }, { type: 'ADVANCE_REVEAL' },
    { type: 'BEGIN_INVESTIGATION' }, { type: 'GUESS', playerId: 'mira' },
  ]) game = gameReducer(game, action)

  const manager = new MultiplayerManager()
  manager.isHost = true
  manager.localPlayer = { id: 'host' }
  manager.players = [{ id: 'you', human: true }]
  let message
  manager.sendTo = (_, data) => { message = data }
  manager.publishGame(game)
  assert.equal(message.game.roles.mantri, 'mira')
  assert.equal(message.game.roles.chor, undefined)
  assert.ok(message.game.players.every(({ score }) => score === 0))
  assert.ok(message.game.players.every(({ roundPoints }) => roundPoints === 0))

  game = gameReducer(game, { type: 'ADVANCE_REVEAL' })
  manager.publishGame(game)
  assert.equal(message.game.roles.chor, 'asha')
  assert.ok(message.game.players.every(({ roundPoints }) => roundPoints === 0))
  game = gameReducer(game, { type: 'ADVANCE_REVEAL' })
  manager.publishGame(game)
  assert.deepEqual(Object.fromEntries(message.game.players.map(({ id, roundPoints }) => [id, roundPoints])), {
    you: 1000, mira: 800, kabir: 0, asha: 500,
  })
  game = gameReducer(game, { type: 'RESTART' })
  manager.publishGame(game)
  assert.deepEqual(message.game.roles, {})
  assert.equal(message.game.phase, 'lobby')
  assert.ok(message.game.players.every(({ score, roundPoints }) => score === 0 && roundPoints === 0))
})
