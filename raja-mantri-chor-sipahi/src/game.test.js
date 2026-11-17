import assert from 'node:assert/strict'
import test from 'node:test'
import {
  chooseBotGuess,
  createGame,
  dealRoles,
  gameReducer,
  getLeaderboard,
  getRoleForPlayer,
  ROLE,
} from './game.js'

const fixedRoles = {
  [ROLE.RAJA]: 'you',
  [ROLE.MANTRI]: 'mira',
  [ROLE.CHOR]: 'asha',
  [ROLE.SIPAHI]: 'kabir',
}

function reachGuessPhase(roles = fixedRoles) {
  let state = gameReducer(createGame(), { type: 'START_ROUND', roles })
  state = gameReducer(state, { type: 'PEEK_PRIVATE', playerId: 'you' })
  state = gameReducer(state, { type: 'REVEAL_KING' })
  return gameReducer(state, { type: 'REVEAL_MINISTER' })
}

test('deals one unique role to each of the four players', () => {
  const roles = dealRoles(() => 0)
  assert.equal(Object.keys(roles).length, 4)
  assert.equal(new Set(Object.values(roles)).size, 4)
  assert.deepEqual(new Set(Object.values(roles)), new Set(['you', 'mira', 'kabir', 'asha']))
})

test('keeps roles hidden until their reveal and only exposes Raja then Mantri', () => {
  let state = gameReducer(createGame(), { type: 'START_ROUND', roles: fixedRoles })
  assert.equal(state.phase, 'private-peek')
  assert.equal(getRoleForPlayer(state, 'you'), null)

  state = gameReducer(state, { type: 'PEEK_PRIVATE', playerId: 'you' })
  assert.equal(state.phase, 'reveal-king')
  assert.equal(getRoleForPlayer(state, 'you'), null)
  state = gameReducer(state, { type: 'REVEAL_KING' })
  assert.equal(state.phase, 'reveal-minister')
  assert.equal(getRoleForPlayer(state, 'you').name, 'Raja')
  assert.equal(getRoleForPlayer(state, 'mira'), null)

  state = gameReducer(state, { type: 'REVEAL_MINISTER' })
  assert.equal(state.phase, 'guess')
  assert.equal(getRoleForPlayer(state, 'mira').name, 'Mantri')
  assert.equal(getRoleForPlayer(state, 'asha'), null)
})

test('local players must privately pass through each chit before public roles are revealed', () => {
  const players = createGame().players.map((player) => ({ ...player, human: true }))
  let state = gameReducer(createGame(), { type: 'CONFIGURE_GAME', players, roundLimit: 3, mode: 'local' })
  state = gameReducer(state, { type: 'START_ROUND', roles: fixedRoles })
  assert.deepEqual(state.privatePeekQueue, ['you', 'mira', 'kabir', 'asha'])
  assert.equal(gameReducer(state, { type: 'PEEK_PRIVATE', playerId: 'mira' }), state)

  for (const playerId of ['you', 'mira', 'kabir']) {
    state = gameReducer(state, { type: 'PEEK_PRIVATE', playerId })
    assert.equal(state.phase, 'private-peek')
  }
  state = gameReducer(state, { type: 'PEEK_PRIVATE', playerId: 'asha' })
  assert.equal(state.phase, 'reveal-king')
  assert.deepEqual(state.revealedPlayers, [])
})

test('awards round points for a correct Mantri guess', () => {
  let state = reachGuessPhase()
  state = gameReducer(state, { type: 'GUESS', playerId: 'asha' })
  assert.equal(state.phase, 'result')
  assert.equal(state.guessWasCorrect, true)
  assert.deepEqual(
    Object.fromEntries(state.players.map(({ id, score }) => [id, score])),
    { you: 1000, mira: 800, kabir: 500, asha: 0 },
  )
  assert.equal(getRoleForPlayer(state, 'asha').name, 'Chor')
})

test('awards the Chor points for a wrong guess and ignores duplicate actions', () => {
  let state = reachGuessPhase()
  const guessPhase = state
  state = gameReducer(state, { type: 'GUESS', playerId: 'kabir' })
  const result = state
  assert.equal(result.guessWasCorrect, false)
  assert.equal(result.players.find(({ id }) => id === 'mira').score, 0)
  assert.equal(result.players.find(({ id }) => id === 'asha').score, 800)
  assert.equal(gameReducer(guessPhase, { type: 'GUESS', playerId: 'you' }), guessPhase)
  assert.equal(gameReducer(result, { type: 'GUESS', playerId: 'asha' }), result)
  assert.equal(gameReducer(result, { type: 'REVEAL_KING' }), result)
})

test('bot guessing only selects an eligible player', () => {
  const state = reachGuessPhase({
    [ROLE.RAJA]: 'mira',
    [ROLE.MANTRI]: 'asha',
    [ROLE.CHOR]: 'you',
    [ROLE.SIPAHI]: 'kabir',
  })
  assert.equal(chooseBotGuess(state, () => 0), 'you')
  assert.equal(chooseBotGuess(state, () => 0.99), 'kabir')
})

test('leaderboard shares ranks for ties and restart clears all game state', () => {
  const players = createGame().players.map((player, index) => ({
    ...player,
    score: index < 2 ? 10 : 0,
  }))
  const ranks = getLeaderboard(players).map(({ id, rank }) => [id, rank])
  assert.deepEqual(ranks, [['you', 1], ['mira', 1], ['kabir', 3], ['asha', 3]])

  const finished = gameReducer(reachGuessPhase(), { type: 'GUESS', playerId: 'asha' })
  const restarted = gameReducer(finished, { type: 'RESTART' })
  assert.equal(restarted.phase, 'lobby')
  assert.equal(restarted.roundNumber, 0)
  assert.equal(restarted.roles, null)
  assert.ok(restarted.players.every(({ score }) => score === 0))
})

test('supports custom round counts and changes disconnected players to bots', () => {
  const players = createGame().players.map((player) => ({ ...player, human: player.id === 'mira' }))
  let state = gameReducer(createGame(), {
    type: 'CONFIGURE_GAME',
    players,
    roundLimit: 3,
    mode: 'solo',
    difficulty: 'mastermind',
  })
  assert.equal(state.roundLimit, 3)
  assert.equal(state.difficulty, 'mastermind')
  state = gameReducer(state, { type: 'REPLACE_DISCONNECTED_PLAYER', playerId: 'mira' })
  assert.equal(state.players.find(({ id }) => id === 'mira').human, false)
  assert.match(state.players.find(({ id }) => id === 'mira').name, /\(Bot\)$/)
})
