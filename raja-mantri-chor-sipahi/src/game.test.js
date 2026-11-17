import assert from 'node:assert/strict'
import test from 'node:test'
import {
  chooseBotGuess,
  createGame,
  dealRoles,
  gameReducer,
  getLeaderboard,
  getPlayerSeat,
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
  state = gameReducer(state, { type: 'ADVANCE_REVEAL' })
  state = gameReducer(state, { type: 'REVEAL_SIPAHI' })
  state = gameReducer(state, { type: 'ADVANCE_REVEAL' })
  state = gameReducer(state, { type: 'BEGIN_INVESTIGATION' })
  return state
}

function reachFivePlayerGuessPhase(guessPlayerId) {
  const players = [
    ...createGame().players.map((player) => ({ ...player, human: false })),
    { id: 'neel', name: 'Neel', initials: 'N', color: '#d5a566', seat: 'southwest', human: false },
  ]
  const roles = {
    [ROLE.RAJA]: 'you',
    [ROLE.RANI]: 'mira',
    [ROLE.MANTRI]: 'kabir',
    [ROLE.CHOR]: 'asha',
    [ROLE.SIPAHI]: 'neel',
  }
  let state = gameReducer(createGame(players), { type: 'START_ROUND', roles })
  state = gameReducer(state, { type: 'REVEAL_KING' })
  state = gameReducer(state, { type: 'ADVANCE_REVEAL' })
  state = gameReducer(state, { type: 'REVEAL_RANI' })
  state = gameReducer(state, { type: 'ADVANCE_REVEAL' })
  state = gameReducer(state, { type: 'REVEAL_SIPAHI' })
  state = gameReducer(state, { type: 'ADVANCE_REVEAL' })
  state = gameReducer(state, { type: 'BEGIN_INVESTIGATION' })
  state = gameReducer(state, { type: 'GUESS', playerId: guessPlayerId })
  state = gameReducer(state, { type: 'ADVANCE_REVEAL' })
  return gameReducer(state, { type: 'ADVANCE_REVEAL' })
}

test('deals one unique role to each of the four players', () => {
  const roles = dealRoles(() => 0)
  assert.equal(Object.keys(roles).length, 4)
  assert.equal(new Set(Object.values(roles)).size, 4)
  assert.deepEqual(new Set(Object.values(roles)), new Set(['you', 'mira', 'kabir', 'asha']))
  assert.equal(roles[ROLE.RANI], undefined)
})

test('deals the Rani role only in five-player games', () => {
  const players = [...createGame().players, { ...createGame().players[0], id: 'neel' }]
  const roles = dealRoles(players, () => 0)
  assert.equal(Object.keys(roles).length, 5)
  assert.equal(new Set(Object.values(roles)).size, 5)
  assert.deepEqual(new Set(Object.keys(roles)), new Set(Object.values(ROLE)))
})

test('arranges five seats symmetrically and keeps the four-player layout', () => {
  assert.deepEqual(
    Array.from({ length: 4 }, (_, index) => getPlayerSeat(index, 4)),
    ['south', 'west', 'north', 'east'],
  )
  const fivePlayers = [...createGame().players, { ...createGame().players[0], id: 'neel' }]
  assert.deepEqual(
    createGame(fivePlayers).players.map(({ seat }) => seat),
    ['north', 'northeast', 'southeast', 'southwest', 'northwest'],
  )
})

test('keeps Mantri and Chor hidden while Raja and Sipahi reveal in four-player mode', () => {
  let state = gameReducer(createGame(), { type: 'START_ROUND', roles: fixedRoles })
  assert.equal(state.phase, 'private-peek')
  assert.equal(state.investigatorRole, 'SIPAHI')
  assert.deepEqual(state.suspectRoles, ['MANTRI', 'CHOR'])
  assert.equal(getRoleForPlayer(state, 'you'), null)

  state = gameReducer(state, { type: 'PEEK_PRIVATE', playerId: 'you' })
  assert.equal(state.phase, 'reveal-king')
  assert.equal(getRoleForPlayer(state, 'you'), null)
  state = gameReducer(state, { type: 'REVEAL_KING' })
  assert.equal(state.phase, 'king-revealed')
  state = gameReducer(state, { type: 'ADVANCE_REVEAL' })
  assert.equal(state.phase, 'reveal-sipahi')
  assert.equal(getRoleForPlayer(state, 'you').name, 'Raja')
  assert.equal(getRoleForPlayer(state, 'mira'), null)

  state = gameReducer(state, { type: 'REVEAL_SIPAHI' })
  assert.equal(state.phase, 'sipahi-revealed')
  state = gameReducer(state, { type: 'ADVANCE_REVEAL' })
  assert.equal(state.phase, 'chant')
  assert.equal(getRoleForPlayer(state, 'kabir').name, 'Sipahi')
  assert.equal(getRoleForPlayer(state, 'mira'), null)
  assert.equal(getRoleForPlayer(state, 'asha'), null)
  state = gameReducer(state, { type: 'BEGIN_INVESTIGATION' })
  assert.equal(state.phase, 'guess')
  assert.equal(gameReducer(state, { type: 'GUESS', playerId: 'you' }), state)
})

test('five-player reveal sequence calls Rani before Sipahi', () => {
  const fivePlayerDefs = [...createGame().players, { ...createGame().players[0], id: 'neel', human: false }]
  const roles = {
    [ROLE.RAJA]: 'you',
    [ROLE.RANI]: 'mira',
    [ROLE.MANTRI]: 'kabir',
    [ROLE.CHOR]: 'asha',
    [ROLE.SIPAHI]: 'neel',
  }
  let state = gameReducer(createGame(fivePlayerDefs), { type: 'START_ROUND', roles })
  state = gameReducer(state, { type: 'PEEK_PRIVATE', playerId: 'you' })
  state = gameReducer(state, { type: 'REVEAL_KING' })
  state = gameReducer(state, { type: 'ADVANCE_REVEAL' })
  assert.equal(state.phase, 'reveal-rani')
  state = gameReducer(state, { type: 'REVEAL_RANI' })
  assert.equal(state.phase, 'rani-revealed')
  state = gameReducer(state, { type: 'ADVANCE_REVEAL' })
  assert.equal(state.phase, 'reveal-sipahi')
  state = gameReducer(state, { type: 'REVEAL_SIPAHI' })
  state = gameReducer(state, { type: 'ADVANCE_REVEAL' })
  assert.equal(state.phase, 'chant')
  assert.deepEqual(new Set(state.revealedPlayers), new Set(['you', 'mira', 'neel']))
  assert.equal(getRoleForPlayer(state, 'kabir'), null)
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

test('awards role points when Sipahi correctly arrests Chor', () => {
  let state = reachGuessPhase()
  state = gameReducer(state, { type: 'GUESS', playerId: 'asha' })
  assert.equal(state.phase, 'reveal-accused')
  assert.equal(getRoleForPlayer(state, 'asha').name, 'Chor')
  assert.equal(getRoleForPlayer(state, 'mira'), null)
  assert.ok(state.players.every(({ score }) => score === 0))
  state = gameReducer(state, { type: 'ADVANCE_REVEAL' })
  assert.equal(state.phase, 'reveal-remaining')
  assert.equal(getRoleForPlayer(state, 'mira').name, 'Mantri')
  state = gameReducer(state, { type: 'ADVANCE_REVEAL' })
  assert.equal(state.phase, 'result')
  assert.equal(state.guessWasCorrect, true)
  assert.deepEqual(
    Object.fromEntries(state.players.map(({ id, score }) => [id, score])),
    { you: 1000, mira: 800, kabir: 500, asha: 0 },
  )
  assert.equal(getRoleForPlayer(state, 'asha').name, 'Chor')
})

test('transfers only Sipahi points to Chor after a wrong arrest', () => {
  let state = reachGuessPhase()
  const guessPhase = state
  state = gameReducer(state, { type: 'GUESS', playerId: 'mira' })
  assert.equal(getRoleForPlayer(state, 'asha'), null)
  state = gameReducer(state, { type: 'ADVANCE_REVEAL' })
  state = gameReducer(state, { type: 'ADVANCE_REVEAL' })
  const result = state
  assert.equal(result.guessWasCorrect, false)
  assert.equal(result.players.find(({ id }) => id === 'mira').score, 800)
  assert.equal(result.players.find(({ id }) => id === 'kabir').score, 0)
  assert.equal(result.players.find(({ id }) => id === 'asha').score, 500)
  assert.equal(gameReducer(guessPhase, { type: 'GUESS', playerId: 'you' }), guessPhase)
  assert.equal(gameReducer(result, { type: 'GUESS', playerId: 'asha' }), result)
  assert.equal(gameReducer(result, { type: 'REVEAL_KING' }), result)
})

test('five-player scoring preserves Rani and Mantri points and transfers Sipahi points only', () => {
  const correct = reachFivePlayerGuessPhase('asha')
  assert.deepEqual(
    Object.fromEntries(correct.players.map(({ id, score }) => [id, score])),
    { you: 1000, mira: 900, kabir: 800, asha: 0, neel: 500 },
  )

  const wrong = reachFivePlayerGuessPhase('kabir')
  assert.deepEqual(
    Object.fromEntries(wrong.players.map(({ id, score }) => [id, score])),
    { you: 1000, mira: 900, kabir: 800, asha: 500, neel: 0 },
  )
})

test('bot guessing only selects an eligible player', () => {
  const state = reachGuessPhase({
    [ROLE.RAJA]: 'mira',
    [ROLE.MANTRI]: 'kabir',
    [ROLE.CHOR]: 'asha',
    [ROLE.SIPAHI]: 'you',
  })
  assert.equal(chooseBotGuess(state, () => 0), null)

  const botInvestigator = reachGuessPhase({
    [ROLE.RAJA]: 'mira',
    [ROLE.MANTRI]: 'asha',
    [ROLE.CHOR]: 'you',
    [ROLE.SIPAHI]: 'kabir',
  })
  assert.equal(chooseBotGuess(botInvestigator, () => 0), 'you')
  assert.equal(chooseBotGuess(botInvestigator, () => 0.99), 'asha')
})

test('leaderboard shares ranks for ties and restart clears all game state', () => {
  const players = createGame().players.map((player, index) => ({
    ...player,
    score: index < 2 ? 10 : 0,
  }))
  const ranks = getLeaderboard(players).map(({ id, rank }) => [id, rank])
  assert.deepEqual(ranks, [['you', 1], ['mira', 1], ['kabir', 3], ['asha', 3]])

  const finished = gameReducer(reachGuessPhase(), { type: 'GUESS', playerId: 'asha' })
  const restarted = gameReducer(finished, { type: 'RESTART', players, roundLimit: 3, mode: 'local' })
  assert.equal(restarted.phase, 'lobby')
  assert.equal(restarted.roundNumber, 0)
  assert.equal(restarted.roles, null)
  assert.equal(restarted.roundLimit, 3)
  assert.equal(restarted.mode, 'local')
  assert.deepEqual(restarted.revealedPlayers, [])
  assert.equal(restarted.guessedPlayerId, null)
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
