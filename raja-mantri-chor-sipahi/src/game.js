export const PLAYER_DEFS = [
  { id: 'you', name: 'You', initials: 'Y', color: '#e8b85b', seat: 'south', human: true },
  { id: 'mira', name: 'Mira', initials: 'M', color: '#d78162', seat: 'west', human: false },
  { id: 'kabir', name: 'Kabir', initials: 'K', color: '#739b88', seat: 'north', human: false },
  { id: 'asha', name: 'Asha', initials: 'A', color: '#8b81bc', seat: 'east', human: false },
]

export const ROLE = {
  RAJA: 'raja',
  MANTRI: 'mantri',
  CHOR: 'chor',
  SIPAHI: 'sipahi',
}

export const ROLE_INFO = {
  [ROLE.RAJA]: { name: 'Raja', points: 1000 },
  [ROLE.MANTRI]: { name: 'Mantri', points: 800 },
  [ROLE.CHOR]: { name: 'Chor', points: 800 },
  [ROLE.SIPAHI]: { name: 'Sipahi', points: 500 },
}

const ROLE_IDS = Object.values(ROLE)

export function createGame(playerDefs = PLAYER_DEFS, options = {}) {
  return {
    phase: 'lobby',
    roundNumber: 0,
    roundLimit: options.roundLimit ?? 10,
    mode: options.mode ?? 'solo',
    players: playerDefs.map((player) => ({ ...player, score: 0 })),
    roles: null,
    revealedPlayers: [],
    privatePeekQueue: [],
    guessedPlayerId: null,
    guessWasCorrect: null,
  }
}

export function dealRoles(playerDefs = PLAYER_DEFS, random = Math.random) {
  if (typeof playerDefs === 'function') {
    random = playerDefs
    playerDefs = PLAYER_DEFS
  }
  const shuffled = [...ROLE_IDS]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const value = random()
    const swapIndex = Math.floor(Math.max(0, Math.min(0.999999999, value)) * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }
  return Object.fromEntries(shuffled.map((role, index) => [role, playerDefs[index].id]))
}

function isValidRoleAssignment(roles, playerIds) {
  return roles
    && ROLE_IDS.every((role) => playerIds.includes(roles[role]))
    && new Set(ROLE_IDS.map((role) => roles[role])).size === playerIds.length
}

function revealRole(state, phase, role, nextPhase) {
  if (state.phase !== phase || !state.roles) return state
  const playerId = state.roles[role]
  return {
    ...state,
    phase: nextPhase,
    revealedPlayers: [...state.revealedPlayers, playerId],
  }
}

function finishGuess(state, playerId) {
  const chorId = state.roles[ROLE.CHOR]
  const wasCorrect = playerId === chorId
  const updatedPlayers = state.players.map((player) => {
    let points = 0
    if (player.id === state.roles[ROLE.RAJA]) points = ROLE_INFO[ROLE.RAJA].points
    if (player.id === state.roles[ROLE.SIPAHI]) points = ROLE_INFO[ROLE.SIPAHI].points
    if (wasCorrect && player.id === state.roles[ROLE.MANTRI]) points = ROLE_INFO[ROLE.MANTRI].points
    if (!wasCorrect && player.id === chorId) points = ROLE_INFO[ROLE.CHOR].points
    return { ...player, score: player.score + points }
  })

  const isFinalRound = state.roundNumber >= state.roundLimit
  return {
    ...state,
    phase: 'result',
    isComplete: isFinalRound,
    players: updatedPlayers,
    revealedPlayers: state.players.map(({ id }) => id),
    guessedPlayerId: playerId,
    guessWasCorrect: wasCorrect,
  }
}

export function gameReducer(state, action) {
  switch (action.type) {
    case 'CONFIGURE_GAME': {
      if (state.phase !== 'lobby') return state
      return {
        ...createGame(action.players, { roundLimit: action.roundLimit, mode: action.mode }),
        difficulty: action.difficulty ?? 'clever',
      }
    }
    case 'START_ROUND': {
      if (state.phase !== 'lobby' && state.phase !== 'result') return state
      if (!isValidRoleAssignment(action.roles, state.players.map(({ id }) => id))) {
        throw new Error('A round requires each player to receive one unique role.')
      }
      if (state.roundNumber >= state.roundLimit) return state
      return {
        ...state,
        phase: state.players.some(({ human }) => human) ? 'private-peek' : 'reveal-king',
        roundNumber: state.roundNumber + 1,
        roles: action.roles,
        revealedPlayers: [],
        privatePeekQueue: state.players.filter(({ human }) => human).map(({ id }) => id),
        guessedPlayerId: null,
        guessWasCorrect: null,
      }
    }
    case 'PEEK_PRIVATE': {
      if (state.phase !== 'private-peek' || state.privatePeekQueue[0] !== action.playerId) return state
      const privatePeekQueue = state.privatePeekQueue.slice(1)
      return {
        ...state,
        phase: privatePeekQueue.length ? 'private-peek' : 'reveal-king',
        privatePeekQueue,
      }
    }
    case 'REVEAL_KING':
      return revealRole(state, 'reveal-king', ROLE.RAJA, 'reveal-minister')
    case 'REVEAL_MINISTER':
      return revealRole(state, 'reveal-minister', ROLE.MANTRI, 'guess')
    case 'GUESS': {
      if (state.phase !== 'guess' || !state.roles) return state
      const eligibleIds = state.players.map(({ id }) => id).filter(
        (id) => id !== state.roles[ROLE.RAJA] && id !== state.roles[ROLE.MANTRI],
      )
      if (!eligibleIds.includes(action.playerId)) return state
      return finishGuess(state, action.playerId)
    }
    case 'REPLACE_DISCONNECTED_PLAYER': {
      const disconnected = state.players.find((player) => player.id === action.playerId)
      if (!disconnected?.human) return state
      const privatePeekQueue = state.privatePeekQueue.filter((id) => id !== action.playerId)
      return {
        ...state,
        privatePeekQueue,
        phase: state.phase === 'private-peek' && privatePeekQueue.length === 0 ? 'reveal-king' : state.phase,
        players: state.players.map((player) => player.id === action.playerId
          ? { ...player, name: `${player.name} (Bot)`, human: false }
          : player),
      }
    }
    case 'RESTART':
      return createGame()
    default:
      return state
  }
}

export function chooseBotGuess(state, random = Math.random) {
  if (state.phase !== 'guess' || !state.roles) {
    return null
  }
  const minister = state.players.find(({ id }) => id === state.roles[ROLE.MANTRI])
  if (!minister || minister.human) {
    return null
  }
  const candidates = state.players.map(({ id }) => id).filter(
    (id) => id !== state.roles[ROLE.RAJA] && id !== state.roles[ROLE.MANTRI],
  )
  const chorId = state.roles[ROLE.CHOR]
  const difficulty = state.difficulty ?? 'clever'
  const accuracy = { casual: 0.35, clever: 0.6, mastermind: 0.82 }[difficulty]
  const value = random()
  return value < accuracy
    ? chorId
    : candidates.find((candidate) => candidate !== chorId)
}

export function getRoleForPlayer(state, playerId) {
  if (!state.roles) return null
  if (state.phase !== 'result' && !state.revealedPlayers.includes(playerId)) return null
  const role = Object.keys(state.roles).find((key) => state.roles[key] === playerId)
  return role ? ROLE_INFO[role] : null
}

export function getLeaderboard(players) {
  const sorted = [...players].sort((first, second) => second.score - first.score)
  let rank = 0
  let previousScore = null
  return sorted.map((player, index) => {
    if (player.score !== previousScore) rank = index + 1
    previousScore = player.score
    return { ...player, rank }
  })
}
