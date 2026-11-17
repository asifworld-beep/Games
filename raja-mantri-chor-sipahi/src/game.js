export const PLAYER_DEFS = [
  { id: 'you', name: 'You', initials: 'Y', color: '#e8b85b', seat: 'south', human: true },
  { id: 'mira', name: 'Mira', initials: 'M', color: '#d78162', seat: 'west', human: false },
  { id: 'kabir', name: 'Kabir', initials: 'K', color: '#739b88', seat: 'north', human: false },
  { id: 'asha', name: 'Asha', initials: 'A', color: '#8b81bc', seat: 'east', human: false },
  { id: 'neel', name: 'Neel', initials: 'N', color: '#d5a566', seat: 'southwest', human: false },
]
const PLAYER_SEAT_LAYOUTS = {
  4: ['south', 'west', 'north', 'east'],
  5: ['north', 'northeast', 'southeast', 'southwest', 'northwest'],
}
const DEFAULT_PLAYER_DEFS = PLAYER_DEFS.slice(0, 4)

export function getPlayerSeat(index, playerCount) {
  return PLAYER_SEAT_LAYOUTS[playerCount]?.[index] ?? PLAYER_DEFS[index]?.seat ?? 'south'
}

export const ROLE = {
  RAJA: 'raja',
  RANI: 'rani',
  MANTRI: 'mantri',
  CHOR: 'chor',
  SIPAHI: 'sipahi',
}

export const ROLE_INFO = {
  [ROLE.RAJA]: { name: 'Raja', points: 1000 },
  [ROLE.RANI]: { name: 'Rani', points: 900 },
  [ROLE.MANTRI]: { name: 'Mantri', points: 800 },
  [ROLE.CHOR]: { name: 'Chor', points: 0 },
  [ROLE.SIPAHI]: { name: 'Sipahi', points: 500 },
}

export const INVESTIGATOR_ROLE = 'SIPAHI'
export const SUSPECT_ROLES = ['MANTRI', 'CHOR']
const FOUR_PLAYER_ROLES = [ROLE.RAJA, ROLE.MANTRI, ROLE.CHOR, ROLE.SIPAHI]
const FIVE_PLAYER_ROLES = [ROLE.RAJA, ROLE.RANI, ROLE.MANTRI, ROLE.CHOR, ROLE.SIPAHI]

export function createGame(playerDefs = DEFAULT_PLAYER_DEFS, options = {}) {
  return {
    phase: 'lobby',
    roundNumber: 0,
    roundLimit: options.roundLimit ?? 10,
    mode: options.mode ?? 'solo',
    players: playerDefs.map((player, index) => ({
      ...player,
      seat: getPlayerSeat(index, playerDefs.length),
      score: 0,
    })),
    playerCount: playerDefs.length,
    investigatorRole: INVESTIGATOR_ROLE,
    suspectRoles: [...SUSPECT_ROLES],
    suspectPlayerIds: [],
    roles: null,
    revealedPlayers: [],
    privatePeekQueue: [],
    guessedPlayerId: null,
    guessWasCorrect: null,
    isComplete: false,
  }
}

export function dealRoles(playerDefs = DEFAULT_PLAYER_DEFS, random = Math.random) {
  if (typeof playerDefs === 'function') {
    random = playerDefs
    playerDefs = DEFAULT_PLAYER_DEFS
  }
  const availableRoles = playerDefs.length === 5 ? FIVE_PLAYER_ROLES : FOUR_PLAYER_ROLES
  if (playerDefs.length !== 4 && playerDefs.length !== 5) {
    throw new Error('A round requires four or five players.')
  }
  const shuffled = [...availableRoles]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const value = random()
    const swapIndex = Math.floor(Math.max(0, Math.min(0.999999999, value)) * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }
  return Object.fromEntries(shuffled.map((role, index) => [role, playerDefs[index].id]))
}

function isValidRoleAssignment(roles, playerIds) {
  const expectedRoles = playerIds.length === 5 ? FIVE_PLAYER_ROLES : FOUR_PLAYER_ROLES
  return (playerIds.length === 4 || playerIds.length === 5)
    && roles
    && expectedRoles.every((role) => playerIds.includes(roles[role]))
    && Object.keys(roles).length === expectedRoles.length
    && new Set(expectedRoles.map((role) => roles[role])).size === playerIds.length
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
  return {
    ...state,
    phase: 'reveal-accused',
    revealedPlayers: [...state.revealedPlayers, playerId],
    guessedPlayerId: playerId,
    guessWasCorrect: playerId === state.roles[ROLE.CHOR],
  }
}

function scoreGuess(state) {
  const chorId = state.roles[ROLE.CHOR]
  const wasCorrect = state.guessWasCorrect
  const sipahiId = state.roles[ROLE.SIPAHI]
  const updatedPlayers = state.players.map((player) => {
    const role = Object.keys(state.roles).find((key) => state.roles[key] === player.id)
    let points = ROLE_INFO[role]?.points ?? 0
    if (!wasCorrect && player.id === sipahiId) points = 0
    if (!wasCorrect && player.id === chorId) points += ROLE_INFO[ROLE.SIPAHI].points
    return { ...player, score: player.score + points }
  })

  const isFinalRound = state.roundNumber >= state.roundLimit
  return {
    ...state,
    phase: 'result',
    isComplete: isFinalRound,
    players: updatedPlayers,
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
        playerCount: state.players.length,
        investigatorRole: INVESTIGATOR_ROLE,
        suspectRoles: [...SUSPECT_ROLES],
        suspectPlayerIds: [action.roles[ROLE.MANTRI], action.roles[ROLE.CHOR]],
        roles: action.roles,
        revealedPlayers: [],
        privatePeekQueue: state.players.filter(({ human }) => human).map(({ id }) => id),
        guessedPlayerId: null,
        guessWasCorrect: null,
        isComplete: false,
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
      return revealRole(state, 'reveal-king', ROLE.RAJA, 'king-revealed')
    case 'REVEAL_RANI':
      return revealRole(state, 'reveal-rani', ROLE.RANI, 'rani-revealed')
    case 'REVEAL_SIPAHI':
      return revealRole(state, 'reveal-sipahi', ROLE.SIPAHI, 'sipahi-revealed')
    case 'ADVANCE_REVEAL':
      if (state.phase === 'king-revealed') return { ...state, phase: state.roles?.[ROLE.RANI] ? 'reveal-rani' : 'reveal-sipahi' }
      if (state.phase === 'rani-revealed') return { ...state, phase: 'reveal-sipahi' }
      if (state.phase === 'sipahi-revealed') return { ...state, phase: 'chant' }
      if (state.phase === 'reveal-accused') {
        return { ...state, phase: 'reveal-remaining', revealedPlayers: state.players.map(({ id }) => id) }
      }
      if (state.phase === 'reveal-remaining') return scoreGuess(state)
      return state
    case 'BEGIN_INVESTIGATION':
      return state.phase === 'chant' ? { ...state, phase: 'guess' } : state
    case 'GUESS': {
      if (state.phase !== 'guess' || !state.roles) return state
      const eligibleIds = [state.roles[ROLE.MANTRI], state.roles[ROLE.CHOR]]
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
      return {
        ...createGame(action.players ?? state.players, { roundLimit: action.roundLimit ?? state.roundLimit, mode: action.mode ?? state.mode }),
        difficulty: action.difficulty ?? state.difficulty,
      }
    default:
      return state
  }
}

export function chooseBotGuess(state, random = Math.random) {
  if (state.phase !== 'guess' || !state.roles) {
    return null
  }
  const sipahi = state.players.find(({ id }) => id === state.roles[ROLE.SIPAHI])
  if (!sipahi || sipahi.human) {
    return null
  }
  const candidates = [state.roles[ROLE.MANTRI], state.roles[ROLE.CHOR]]
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
