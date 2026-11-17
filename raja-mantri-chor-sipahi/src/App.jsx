import { lazy, Suspense, useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowUpRight,
  CircleHelp,
  Crown,
  RotateCcw,
  Settings,
  Sparkles,
  UsersRound,
  Volume2,
  VolumeX,
} from 'lucide-react'
import {
  chooseBotGuess,
  createGame,
  dealRoles,
  gameReducer,
  getLeaderboard,
  getPlayerSeat,
  getRoleForPlayer,
  INVESTIGATOR_ROLE,
  PLAYER_DEFS,
  ROLE,
  SUSPECT_ROLES,
} from './game.js'
import { THEMES } from './config/themes.js'
import HowToPlay from './components/HowToPlay.jsx'
import LobbyPanel from './components/LobbyPanel.jsx'
import PlayerSeat from './components/PlayerSeat.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import ChatDrawer from './components/ChatDrawer.jsx'
import { createChatId, createChatRecord } from './chat/chatUtils.js'
import { getChatCopy } from './i18n/chatTranslations.js'
import { getDirection, translate, translateRole } from './i18n/translations.js'
import { MultiplayerManager } from './network/multiplayerManager.js'
import { useGameStore } from './store/useGameStore.js'
import { SoundEngine } from './soundEngine.js'
import { useShallow } from 'zustand/react/shallow'
import './App.css'

const CourtyardScene = lazy(() => import('./CourtyardScene.jsx'))
const EMOTES = ['😅', '🧐', '👑', 'Main Chor Nahi Hoon!']
const SCRIPT_FONTS = {
  hi: 'Noto Sans Devanagari',
  bho: 'Noto Sans Devanagari',
  mr: 'Noto Sans Devanagari',
  bn: 'Noto Sans Bengali',
  te: 'Noto Sans Telugu',
  ta: 'Noto Sans Tamil',
  gu: 'Noto Sans Gujarati',
  kn: 'Noto Sans Kannada',
  ml: 'Noto Sans Malayalam',
  pa: 'Noto Sans Gurmukhi',
  or: 'Noto Sans Oriya',
  ur: 'Noto Sans Arabic',
}
const FONT_PRESETS = {
  royal: {
    display: '"Cinzel", "Playfair Display"',
    body: '"Plus Jakarta Sans"',
    families: ['Cinzel:wght@400;500;600;700', 'Playfair+Display:wght@400;500;600;700', 'Plus+Jakarta+Sans:wght@400;500;600;700'],
  },
  modern: {
    display: '"Inter"',
    body: '"Inter"',
    families: ['Inter:wght@400;500;600;700'],
  },
  playful: {
    display: '"Fredoka"',
    body: '"Plus Jakarta Sans"',
    families: ['Fredoka:wght@400;500;600;700', 'Plus+Jakarta+Sans:wght@400;500;600;700'],
  },
  contrast: {
    display: '"Noto Sans"',
    body: '"Noto Sans"',
    families: ['Noto+Sans:wght@400;500;600;700;800'],
  },
}

function createPlayerChatMessage(player, text) {
  return createChatRecord({
    id: createChatId(),
    playerId: player.id,
    playerName: player.name,
    avatarColor: player.color,
    text,
    createdAt: Date.now(),
  })
}

function chooseBotReply(bots, roleById, phase, language) {
  const responder = phase === 'guess'
    ? bots.find(({ id }) => roleById[id] === ROLE.CHOR)
      ?? bots.find(({ id }) => roleById[id] === ROLE.SIPAHI)
      ?? bots[0]
    : bots[Math.floor(Math.random() * bots.length)]
  const copy = getChatCopy(language)
  const response = roleById[responder.id] === ROLE.CHOR
    ? copy.replyChor
    : roleById[responder.id] === ROLE.SIPAHI ? copy.replySipahi : copy.replyGeneral
  return { responder, response, delay: 1200 + Math.floor(Math.random() * 1301) }
}

function PlayerRow({ player, rank, role, canGuess, onGuess, guessedPlayerId, phase, direction }) {
  const t = (key) => translate(direction, key)
  return (
    <div className={`player-row${canGuess ? ' can-guess' : ''}${guessedPlayerId === player.id ? ' was-guessed' : ''}`}>
      <span className="rank-number">{rank}</span>
      <span className="row-avatar" style={{ '--seat-color': player.color }}>{player.initials}</span>
      <span className="row-details">
        <b>{player.name}</b>
        <small>{role?.name ?? t(player.human ? 'playerLabel' : 'guestLabel')}</small>
      </span>
      {phase === 'result' ? (
        <span className="player-points">{player.score.toLocaleString()} <small>{t('pts')}</small></span>
      ) : canGuess ? (
        <button className="guess-button" type="button" onClick={() => onGuess(player.id)} aria-label={`${t('guess')} ${player.name}`}>
          {t('pick')} <ArrowUpRight size={12} />
        </button>
      ) : (
        <span className="player-points">{player.score ? player.score.toLocaleString() : '—'}</span>
      )}
    </div>
  )
}

function ActionMessage({ game, currentPlayerId, onStart, onReveal, onGuess, onNext, onRestart, localPrivacy }) {
  const t = (key) => translate(game.language, key)
  const ministerId = game.roles?.[ROLE.MANTRI]
  const kingId = game.roles?.[ROLE.RAJA]
  const queenId = game.roles?.[ROLE.RANI]
  const sipahiId = game.roles?.[ROLE.SIPAHI]
  const isHumanKing = game.phase === 'reveal-king' && kingId === currentPlayerId
  const isHumanQueen = game.phase === 'reveal-rani' && queenId === currentPlayerId
  const isHumanSipahi = (game.phase === 'reveal-sipahi' || game.phase === 'guess') && sipahiId === currentPlayerId
  const candidates = game.phase === 'guess'
    ? game.players.filter((player) => (game.suspectPlayerIds ?? [ministerId, game.roles?.[ROLE.CHOR]]).includes(player.id))
    : []
  const privatePlayerId = game.privatePeekQueue?.[0]
  const privateRole = Object.keys(game.roles ?? {}).find((role) => game.roles[role] === privatePlayerId)
  const accusedPlayer = game.players.find((player) => player.id === game.guessedPlayerId)
  const accusation = accusedPlayer?.id === currentPlayerId
    ? t('accusedYou')
    : `${accusedPlayer?.name} ${t('wasAccused')}`

  if (game.phase === 'lobby') {
    return (
      <LobbyPanel
        settings={game.settings}
        updateSetting={game.updateSetting}
        onStart={onStart}
        roomInfo={game.roomInfo}
        roomStatus={game.roomStatus}
        roomError={game.roomError}
        onCreateRoom={game.onCreateRoom}
        onJoinRoom={game.onJoinRoom}
        onFillBots={game.onFillBots}
        canStartOnline={game.canStartOnline}
        isRemoteClient={game.isRemoteClient}
      />
    )
  }

  if (game.phase === 'private-peek') {
    if (privatePlayerId !== currentPlayerId) {
      return (
        <div className="action-card">
          <p className="eyebrow">{t('privateChit')}</p>
          <h3>{`${game.players.find(({ id }) => id === privatePlayerId)?.name}: ${t('privatePeekStatus')}`}</h3>
          <p>{t('waiting')}</p>
          <div className="thinking-dots" aria-label="Waiting for player"><i /><i /><i /></div>
        </div>
      )
    }
    return (
      <div className="action-card">
        <p className="eyebrow">{t('privateChit')}</p>
        <h3>{localPrivacy ? t('privateChitReady') : `${t('yourRole')} ${translateRole(game.language, privateRole)}`}</h3>
        <p>{localPrivacy ? t('hideAndPassHelp') : t('keepRoleSecret')}</p>
        {!localPrivacy && <button className="primary-button" type="button" onClick={onReveal}>{t('hideAndPass')} <ArrowUpRight size={15} /></button>}
      </div>
    )
  }

  if (game.phase === 'reveal-king') {
    return (
      <div className="action-card">
        <p className="eyebrow">{t('royalCall')}</p>
        <h3>{isHumanKing ? (localPrivacy ? t('privateChitReady') : `${t('youAre')} ${translateRole(game.language, ROLE.RAJA)}.`) : t('kingLifting')}</h3>
        <p>{isHumanKing ? t('revealToCall') : t('courtWaitsKing')}</p>
        {isHumanKing && <button className="primary-button" type="button" onClick={onReveal}>{localPrivacy ? t('hideAndPass') : t('reveal')} <Crown size={15} /></button>}
        {kingId && <div className="royal-callout">{t('kingCallout')}</div>}
      </div>
    )
  }

  if (game.phase === 'reveal-rani') {
    return (
      <div className="action-card">
        <p className="eyebrow">{t('royalCall')}</p>
        <h3>{isHumanQueen ? (localPrivacy ? t('privateChitReady') : `${t('youAre')} ${translateRole(game.language, ROLE.RANI)}.`) : t('raniStepForward')}</h3>
        <p>{isHumanQueen ? t('revealToReply') : t('courtWaitsRani')}</p>
        {isHumanQueen && <button className="primary-button" type="button" onClick={onReveal}>{localPrivacy ? t('hideAndPass') : t('reveal')} <ArrowUpRight size={15} /></button>}
        {queenId && <div className="royal-callout">{t('raniCallout')}</div>}
      </div>
    )
  }

  if (game.phase === 'reveal-sipahi') {
    return (
      <div className="action-card">
        <p className="eyebrow">{t('royalCall')}</p>
        <h3>{isHumanSipahi ? (localPrivacy ? t('privateChitReady') : `${t('youAre')} ${translateRole(game.language, ROLE.SIPAHI)}.`) : t('sipahiStepForward')}</h3>
        <p>{isHumanSipahi ? t('revealThenInvestigate') : t('courtWaitsSipahi')}</p>
        {isHumanSipahi && <button className="primary-button" type="button" onClick={onReveal}>{localPrivacy ? t('hideAndPass') : t('reveal')} <ArrowUpRight size={15} /></button>}
        {sipahiId && <div className="royal-callout">{t(game.playerCount === 5 ? 'sipahiCallout5' : 'sipahiCallout4')}</div>}
      </div>
    )
  }

  if (game.phase === 'chant') {
    return (
      <div className="action-card chant-card">
        <p className="eyebrow">{t('royalCall')}</p>
        <h3>{t('chant')}</h3>
        <p>{t('chantPrompt')}</p>
      </div>
    )
  }

  if (game.phase === 'guess') {
    if (isHumanSipahi) {
      return (
        <div className="action-card guess-card">
          <p className="eyebrow">{t('turn')}</p>
          <h3>{t('whoIsChor')}</h3>
          <p>{t('guessPrompt')}</p>
          <div className="guess-options">
            {candidates.map((player) => (
              <button type="button" className="guess-option" key={player.id} onClick={() => onGuess(player.id)}>
                <span className="row-avatar" style={{ '--seat-color': player.color }}>{player.initials}</span>
                <span>{player.name}</span>
                <ArrowUpRight size={14} />
              </button>
            ))}
          </div>
        </div>
      )
    }
    return (
      <div className="action-card">
        <p className="eyebrow">{t('suspense')}</p>
        <h3>{t('investigatorThinking')}</h3>
        <p>{t('botGuessPrompt')}</p>
        <div className="thinking-dots" aria-label="The bot is thinking"><i /><i /><i /></div>
      </div>
    )
  }

  if (game.isComplete) {
    const winner = getLeaderboard(game.players)[0]
    return (
      <div className="action-card result-card">
        <p className="eyebrow">{t('finalStandings')}</p>
        <h3>{winner?.name} {t('wins')}</h3>
        <p>{winner?.score.toLocaleString()} {t('pointsLabel')} · {t('roundsComplete')}</p>
        <button className="primary-button" type="button" onClick={onRestart}>{t('freshGame')} <RotateCcw size={15} /></button>
      </div>
    )
  }

  return (
    <div className="action-card result-card">
      <p className="eyebrow">{game.guessWasCorrect ? t('correct') : t('wrong')}</p>
      <h3>{game.guessWasCorrect ? t('correct') : t('wrongTitle')}</h3>
      <p>{accusation} {t('rolesRevealed')}</p>
      <button className="primary-button" type="button" onClick={onNext}>{t('next')} · {String(game.roundNumber + 1).padStart(2, '0')} <ArrowUpRight size={16} /></button>
    </div>
  )
}

function App() {
  const settings = useGameStore(useShallow((state) => ({
    nickname: state.nickname,
    avatarColor: state.avatarColor,
    crest: state.crest,
    difficulty: state.difficulty,
    language: state.language,
    theme: state.theme,
    fontScale: state.fontScale,
    fontStyle: state.fontStyle,
    volume: state.volume,
    ambientMusic: state.ambientMusic,
    haptics: state.haptics,
    graphics: state.graphics,
    rounds: state.rounds,
    timer: state.timer,
    mode: state.mode,
    playerCount: state.playerCount ?? 4,
    localNames: state.localNames,
    updateSetting: state.updateSetting,
  })))
  const updateSetting = useGameStore((state) => state.updateSetting)
  const [game, dispatch] = useReducer(gameReducer, undefined, createGame)
  const [remoteGame, setRemoteGame] = useState(null)
  const [muted, setMuted] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [scoreboardOpen, setScoreboardOpen] = useState(false)
  const [readyFontKey, setReadyFontKey] = useState(null)
  const [audioUnavailable, setAudioUnavailable] = useState(false)
  const [shuffleActive, setShuffleActive] = useState(false)
  const [roomInfo, setRoomInfo] = useState(null)
  const [localPeerId, setLocalPeerId] = useState(null)
  const [roomStatus, setRoomStatus] = useState('idle')
  const [roomError, setRoomError] = useState('')
  const [emotes, setEmotes] = useState({})
  const [chatMessages, setChatMessages] = useState([])
  const [speechBubbles, setSpeechBubbles] = useState([])
  const [chatMuted, setChatMuted] = useState(false)
  const [botTyping, setBotTyping] = useState(false)
  const [emoteOpen, setEmoteOpen] = useState(false)
  const [peekedPlayerId, setPeekedPlayerId] = useState(null)
  const [passedPlayerId, setPassedPlayerId] = useState(null)
  const [nervousPlayerIds, setNervousPlayerIds] = useState([])
  const [clockTick, setClockTick] = useState(0)
  const [timerStartedAt, setTimerStartedAt] = useState(0)
  const audioEngine = useRef(null)
  const seatAnchorRefs = useRef(new Map())
  const managerRef = useRef(null)
  const currentGameRef = useRef(game)
  const dispatchRef = useRef(dispatch)
  const settingsRef = useRef(settings)
  const roomInfoRef = useRef(roomInfo)
  const shuffleTimer = useRef(null)
  const emoteTimers = useRef({})
  const chatBubbleTimers = useRef({})
  const seenChatIds = useRef(new Set())
  const chatMutedRef = useRef(chatMuted)
  const botReplyTimer = useRef(null)
  const lastBanterKey = useRef('')
  const autoJoinAttempted = useRef(false)
  const submitActionRef = useRef(() => {})
  const startRoundRef = useRef(() => {})

  useEffect(() => {
    currentGameRef.current = game
    dispatchRef.current = dispatch
    settingsRef.current = settings
    roomInfoRef.current = roomInfo
  }, [game, settings, roomInfo])

  const t = (key) => translate(settings.language, key)
  const direction = getDirection(settings.language)
  const fontKey = `${settings.fontStyle ?? 'royal'}:${settings.language}`
  const fontsReady = readyFontKey === fontKey

  useEffect(() => {
    document.documentElement.style.setProperty('--app-font-scale', String(settings.fontScale ?? 1))
  }, [settings.fontScale])

  useEffect(() => {
    const root = document.documentElement
    const selectedFontKey = `${settings.fontStyle ?? 'royal'}:${settings.language}`
    const preset = FONT_PRESETS[settings.fontStyle] ?? FONT_PRESETS.royal
    const scriptFont = SCRIPT_FONTS[settings.language]
    const scriptStack = scriptFont ? `"${scriptFont}", ` : ''
    root.style.setProperty('--font-display', `${preset.display}, ${scriptStack}Georgia, serif`)
    root.style.setProperty('--font-body', `${preset.body}, ${scriptStack}"Noto Sans", ui-sans-serif, system-ui, sans-serif`)
    root.dataset.fontStyle = settings.fontStyle ?? 'royal'

    const fontFamilies = [...preset.families, 'Noto+Sans:wght@400;500;600;700']
    if (scriptFont) fontFamilies.push(`${scriptFont.replaceAll(' ', '+')}:wght@400;500;600;700`)
    const fontLink = document.getElementById('game-google-fonts') ?? document.createElement('link')
    fontLink.id = 'game-google-fonts'
    fontLink.rel = 'stylesheet'
    const fontUrl = `https://fonts.googleapis.com/css2?${fontFamilies.map((family) => `family=${family}`).join('&')}&display=swap`
    fontLink.onload = () => document.fonts.ready.then(() => setReadyFontKey(selectedFontKey))
    fontLink.onerror = () => setReadyFontKey(selectedFontKey)
    fontLink.href = fontUrl
    if (!fontLink.isConnected) document.head.append(fontLink)
  }, [settings.fontStyle, settings.language])

  const displayGame = remoteGame ?? game
  const displayPlayerCount = displayGame.phase === 'lobby' ? settings.playerCount : displayGame.players.length
  const selectedFont = FONT_PRESETS[settings.fontStyle] ?? FONT_PRESETS.royal
  const chitFontFamily = `${selectedFont.body}, "${SCRIPT_FONTS[settings.language] ?? 'Noto Sans'}", sans-serif`
  const isRemoteClient = Boolean(remoteGame) && settings.mode === 'online' && !roomInfo?.isHost
  const ministerId = displayGame.roles?.[ROLE.MANTRI]
  const kingId = displayGame.roles?.[ROLE.RAJA]
  const queenId = displayGame.roles?.[ROLE.RANI]
  const sipahiId = displayGame.roles?.[ROLE.SIPAHI]
  const currentPlayerId = settings.mode === 'solo' ? 'you'
    : settings.mode === 'local'
      ? displayGame.phase === 'private-peek' ? displayGame.privatePeekQueue?.[0]
        : displayGame.phase === 'reveal-king' ? kingId
        : displayGame.phase === 'reveal-rani' ? queenId
          : ['reveal-sipahi', 'chant', 'guess'].includes(displayGame.phase) ? sipahiId : 'local-0'
      : localPeerId
  const rolesByPlayer = displayGame.roles
    ? Object.fromEntries(Object.entries(displayGame.roles).map(([role, playerId]) => [playerId, role]))
    : {}
  const focusPlayerId = displayGame.phase === 'reveal-king'
    ? kingId
    : displayGame.phase === 'reveal-rani' ? queenId
      : ['reveal-sipahi', 'chant', 'guess'].includes(displayGame.phase) ? sipahiId : null
  const revealPlayerId = displayGame.phase === 'reveal-king' && kingId === currentPlayerId
    ? kingId
    : displayGame.phase === 'reveal-rani' && queenId === currentPlayerId ? queenId
      : displayGame.phase === 'reveal-sipahi' && sipahiId === currentPlayerId ? sipahiId : null
  const revealActionType = ({
    'reveal-king': 'REVEAL_KING',
    'reveal-rani': 'REVEAL_RANI',
    'reveal-sipahi': 'REVEAL_SIPAHI',
  })[displayGame.phase]
  const guessablePlayerIds = displayGame.phase === 'guess' && sipahiId === currentPlayerId
    ? displayGame.suspectPlayerIds ?? [ministerId, displayGame.roles?.[ROLE.CHOR]]
    : []
  const activeRevealPlayer = displayGame.phase === 'reveal-king'
    ? kingId
      : displayGame.phase === 'reveal-rani' ? queenId
        : displayGame.phase === 'reveal-sipahi' ? sipahiId
      : displayGame.phase === 'private-peek' ? displayGame.privatePeekQueue?.[0] : null
  const privacyCurtainNeeded = settings.mode === 'local'
    && ['private-peek', 'reveal-king', 'reveal-rani', 'reveal-sipahi'].includes(displayGame.phase)
    && displayGame.players.find(({ id }) => id === activeRevealPlayer)?.human
    && passedPlayerId !== activeRevealPlayer
  const displayPlayers = displayGame.players.map((player, index) => {
    const profilePlayer = settings.mode === 'local' ? player.id === 'local-0' : player.id === currentPlayerId
    const localName = settings.mode === 'local' ? settings.localNames[index] : settings.nickname
    return profilePlayer
      ? {
        ...player,
        name: localName?.trim() || player.name,
        initials: (localName?.trim() || player.name).slice(0, 1).toUpperCase(),
        color: settings.avatarColor,
        crest: settings.crest,
      }
      : player
  })
  const displayLeaderboard = getLeaderboard(displayPlayers)
  const rankByPlayer = Object.fromEntries(displayLeaderboard.map(({ id, rank }) => [id, rank]))
  const seatInfoByPlayerId = Object.fromEntries(displayPlayers.map((player) => {
    const role = getRoleForPlayer(displayGame, player.id)
    return [player.id, {
      role: role ? { ...role, name: translateRole(settings.language, rolesByPlayer[player.id]) } : null,
      active: player.id === kingId && displayGame.phase === 'reveal-king'
        || player.id === queenId && displayGame.phase === 'reveal-rani'
        || player.id === sipahiId && ['reveal-sipahi', 'chant', 'guess'].includes(displayGame.phase),
      isGuessed: displayGame.phase === 'result' && player.id === displayGame.guessedPlayerId,
      emote: emotes[player.id] ?? (
        displayGame.phase === 'result' && !displayGame.guessWasCorrect && player.id === ministerId
          ? '😮‍💨'
          : undefined
      ),
      nervous: displayGame.phase === 'guess' && nervousPlayerIds.includes(player.id),
    }]
  }))

  const roundTimeLeft = settings.timer > 0 && timerStartedAt
    ? Math.max(0, settings.timer - Math.floor((clockTick - timerStartedAt) / 1000))
    : settings.timer

  const activateAudio = useCallback(async () => {
    try {
      if (!audioEngine.current) audioEngine.current = new SoundEngine()
      const active = await audioEngine.current.activate()
      if (!active) setAudioUnavailable(true)
      else if (settingsRef.current.ambientMusic && !muted) audioEngine.current.startAmbient(settingsRef.current.volume)
      return active
    } catch (error) {
      console.error('Unable to activate procedural audio.', error)
      setAudioUnavailable(true)
      return false
    }
  }, [muted])

  const vibrate = useCallback(() => {
    if (settingsRef.current.haptics && 'vibrate' in navigator) navigator.vibrate(18)
  }, [])

  const playSound = useCallback(async (name) => {
    if (!audioEngine.current || muted) return
    try {
      const active = await audioEngine.current.activate()
      if (active) audioEngine.current.play(name, settingsRef.current.volume)
    } catch (error) {
      console.error('Unable to play the procedural game sound.', error)
      setAudioUnavailable(true)
    }
  }, [muted])

  const addChatMessage = useCallback((value) => {
    const message = createChatRecord(value)
    if (!message.text || seenChatIds.current.has(message.id)) return
    seenChatIds.current.add(message.id)
    if (seenChatIds.current.size > 256) {
      seenChatIds.current.delete(seenChatIds.current.values().next().value)
    }
    setChatMessages((current) => [...current.slice(-99), message])
    if (chatMutedRef.current) return
    setSpeechBubbles((current) => [...current.filter(({ playerId }) => playerId !== message.playerId).slice(-3), message])
    window.clearTimeout(chatBubbleTimers.current[message.id])
    chatBubbleTimers.current[message.id] = window.setTimeout(() => {
      setSpeechBubbles((current) => current.filter(({ id }) => id !== message.id))
      delete chatBubbleTimers.current[message.id]
    }, 3500)
  }, [])

  const scheduleBotMessage = useCallback((player, text, delay) => {
    window.clearTimeout(botReplyTimer.current)
    setBotTyping(true)
    botReplyTimer.current = window.setTimeout(() => {
      const message = createPlayerChatMessage(player, text)
      if (settingsRef.current.mode === 'online') {
        managerRef.current?.send({ type: 'chat', message })
      } else {
        addChatMessage(message)
      }
      setBotTyping(false)
      botReplyTimer.current = null
    }, delay)
  }, [addChatMessage])

  const resetChat = useCallback(() => {
    Object.values(chatBubbleTimers.current).forEach(window.clearTimeout)
    chatBubbleTimers.current = {}
    seenChatIds.current.clear()
    setChatMessages([])
    setSpeechBubbles([])
    setBotTyping(false)
    window.clearTimeout(botReplyTimer.current)
    botReplyTimer.current = null
  }, [])

  const handleNetworkMessage = useCallback((data, senderId) => {
    if (data.type === 'chat' && data.message) {
      addChatMessage(data.message)
      return
    }
    if (data.type === 'game-state') {
      setRemoteGame({
        ...data.game,
        investigatorRole: INVESTIGATOR_ROLE,
        suspectRoles: [...SUSPECT_ROLES],
      })
      return
    }
    if (data.type === 'emote' && data.playerId) {
      setEmotes((current) => ({ ...current, [data.playerId]: data.emote }))
      window.clearTimeout(emoteTimers.current[data.playerId])
      emoteTimers.current[data.playerId] = window.setTimeout(
        () => setEmotes((current) => ({ ...current, [data.playerId]: null })),
        2400,
      )
      return
    }
    if (data.type === 'action' && senderId) {
      const state = currentGameRef.current
      if (data.action?.type === 'PEEK_PRIVATE' && state.phase === 'private-peek' && state.privatePeekQueue[0] === senderId) {
        dispatchRef.current(data.action)
      } else if (data.action?.type === 'REVEAL_KING' && state.phase === 'reveal-king' && state.roles?.[ROLE.RAJA] === senderId) {
        dispatchRef.current(data.action)
      } else if (data.action?.type === 'REVEAL_RANI' && state.phase === 'reveal-rani' && state.roles?.[ROLE.RANI] === senderId) {
        dispatchRef.current(data.action)
      } else if (data.action?.type === 'REVEAL_SIPAHI' && state.phase === 'reveal-sipahi' && state.roles?.[ROLE.SIPAHI] === senderId) {
        dispatchRef.current(data.action)
      } else if (data.action?.type === 'GUESS' && state.phase === 'guess' && state.roles?.[ROLE.SIPAHI] === senderId) {
        dispatchRef.current(data.action)
      } else if (data.action?.type === 'NEXT_ROUND' && state.phase === 'result' && !state.isComplete) {
        startRoundRef.current()
      }
    }
  }, [addChatMessage])

  useEffect(() => {
    const manager = new MultiplayerManager({
      onRoomUpdate: (info) => {
        setRoomInfo(info)
        setLocalPeerId(manager.localPlayer?.id ?? null)
        if (!info.isHost && info.playerCount !== settingsRef.current.playerCount) {
          updateSetting('playerCount', info.playerCount)
        }
        const previous = roomInfoRef.current
        if (info.isHost && previous && currentGameRef.current.phase !== 'lobby') {
          const stillConnected = new Set(info.players.map(({ id }) => id))
          currentGameRef.current.players.forEach((player) => {
            if (player.human && player.id !== manager.localPlayer?.id && !stillConnected.has(player.id)) {
              dispatchRef.current({ type: 'REPLACE_DISCONNECTED_PLAYER', playerId: player.id })
            }
          })
        }
      },
      onMessage: handleNetworkMessage,
      onStatus: setRoomStatus,
    })
    managerRef.current = manager

    return () => {
      manager.close()
      managerRef.current = null
      if (audioEngine.current) audioEngine.current.close()
    }
  }, [handleNetworkMessage, updateSetting])

  useEffect(() => {
    managerRef.current?.setMaxPlayers(settings.playerCount)
  }, [settings.playerCount])

  useEffect(() => {
    if (!roomInfo?.isHost || game.phase === 'lobby') return
    managerRef.current?.publishGame({
      ...game,
      language: settings.language,
    })
  }, [game, roomInfo, settings.language])

  useEffect(() => {
    let timer
    const hostMayAutomate = settings.mode !== 'online' || roomInfo?.isHost
    const raniId = game.roles?.[ROLE.RANI]
    const sipahiId = game.roles?.[ROLE.SIPAHI]
    if (hostMayAutomate && game.phase === 'reveal-king' && !game.players.find(({ id }) => id === kingId)?.human) {
      timer = window.setTimeout(() => dispatch({ type: 'REVEAL_KING' }), 1250)
    } else if (hostMayAutomate && game.phase === 'reveal-rani' && !game.players.find(({ id }) => id === raniId)?.human) {
      timer = window.setTimeout(() => dispatch({ type: 'REVEAL_RANI' }), 900)
    } else if (hostMayAutomate && game.phase === 'reveal-sipahi' && !game.players.find(({ id }) => id === sipahiId)?.human) {
      timer = window.setTimeout(() => dispatch({ type: 'REVEAL_SIPAHI' }), 900)
    } else if (hostMayAutomate && game.phase === 'chant') {
      timer = window.setTimeout(() => dispatch({ type: 'BEGIN_INVESTIGATION' }), 1800)
    } else if (hostMayAutomate && game.phase === 'guess' && !game.players.find(({ id }) => id === sipahiId)?.human) {
      timer = window.setTimeout(() => {
        const guess = chooseBotGuess(game)
        if (guess) dispatch({ type: 'GUESS', playerId: guess })
      }, 1100)
    }
    return () => window.clearTimeout(timer)
  }, [game, kingId, roomInfo, settings.mode])

  useEffect(() => {
    const chorId = game.roles?.[ROLE.CHOR]
    const chor = game.players.find(({ id }) => id === chorId)
    if (game.phase !== 'guess' || !chor || chor.human) return undefined
    const chance = { casual: 0.38, clever: 0.22, mastermind: 0.08 }[settings.difficulty]
    const interval = window.setInterval(() => {
      setNervousPlayerIds(Math.random() < chance ? [chor.id] : [])
    }, 2800)
    return () => window.clearInterval(interval)
  }, [game.phase, game.roles, game.players, settings.difficulty])

  useEffect(() => {
    const maySpeak = settings.mode === 'solo' || (settings.mode === 'online' && roomInfo?.isHost)
    if (!maySpeak || !['guess', 'result'].includes(displayGame.phase)) return
    const key = `${displayGame.roundNumber}-${displayGame.phase}-${displayGame.guessWasCorrect}`
    if (lastBanterKey.current === key) return
    lastBanterKey.current = key

    const bots = displayGame.players.filter(({ human }) => !human)
    if (bots.length === 0) return
    const copy = getChatCopy(settings.language)
    const chorId = displayGame.roles?.[ROLE.CHOR]
    let speaker
    let text

    if (displayGame.phase === 'guess') {
      if (Math.random() > 0.68) return
      const chor = bots.find(({ id }) => id === chorId)
      const sipahi = bots.find(({ id }) => displayGame.roles?.[ROLE.SIPAHI] === id)
      speaker = chor ?? sipahi ?? bots[0]
      text = speaker.id === chorId ? copy.chorDeflection : copy.sipahiDefense
    } else if (displayGame.guessWasCorrect) {
      speaker = bots.find(({ id }) => id !== chorId) ?? bots[0]
      text = copy.catchReaction
    } else {
      speaker = bots.find(({ id }) => id === chorId) ?? bots[0]
      text = copy.escapeGloat
    }

    const timer = window.setTimeout(
      () => scheduleBotMessage(speaker, text, 1400 + Math.floor(Math.random() * 900)),
      0,
    )
    return () => window.clearTimeout(timer)
  }, [
    displayGame.phase,
    displayGame.roundNumber,
    displayGame.guessWasCorrect,
    displayGame.roles,
    displayGame.players,
    settings.mode,
    settings.language,
    roomInfo?.isHost,
    scheduleBotMessage,
  ])

  useEffect(() => {
    if (settings.ambientMusic && audioEngine.current && !muted) {
      audioEngine.current.startAmbient(settings.volume)
    } else {
      audioEngine.current?.stopAmbient()
    }
  }, [settings.ambientMusic, settings.volume, muted])

  useEffect(() => {
    const mayHandleTimer = settings.mode !== 'online' || roomInfo?.isHost || sipahiId === currentPlayerId
    if (displayGame.phase !== 'guess' || !settings.timer || !mayHandleTimer) return undefined
    const startTimer = window.setTimeout(() => setTimerStartedAt(Date.now()), 0)
    const interval = window.setInterval(() => setClockTick(Date.now()), 250)
    const timeout = window.setTimeout(() => {
      const chorId = displayGame.roles?.[ROLE.CHOR]
      const candidates = displayGame.suspectPlayerIds ?? [displayGame.roles?.[ROLE.MANTRI], chorId]
      const guess = chorId && Math.random() < 0.65
        ? chorId
        : candidates.find((id) => id !== chorId) ?? candidates[Math.floor(Math.random() * candidates.length)]
      if (guess) submitActionRef.current({ type: 'GUESS', playerId: guess })
    }, settings.timer * 1000)
    return () => {
      window.clearTimeout(startTimer)
      window.clearInterval(interval)
      window.clearTimeout(timeout)
    }
  }, [
    displayGame.phase,
    displayGame.roundNumber,
    displayGame.roles,
    displayGame.suspectPlayerIds,
    displayGame.players,
    settings.timer,
    settings.mode,
    roomInfo?.isHost,
    sipahiId,
    currentPlayerId,
  ])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (displayGame.phase === 'reveal-king') playSound('reveal')
      else if (['reveal-rani', 'reveal-sipahi', 'chant'].includes(displayGame.phase)) playSound('king-call')
      else if (displayGame.phase === 'guess') playSound('scroll')
      else if (displayGame.phase === 'result') playSound(displayGame.guessWasCorrect ? 'cage' : 'coins')
    }, 0)
    return () => window.clearTimeout(timer)
  }, [displayGame.phase, displayGame.guessWasCorrect, displayGame.roundNumber, playSound])

  useEffect(() => () => {
    window.clearTimeout(shuffleTimer.current)
    Object.values(emoteTimers.current).forEach(window.clearTimeout)
    Object.values(chatBubbleTimers.current).forEach(window.clearTimeout)
    window.clearTimeout(botReplyTimer.current)
  }, [])

  const makePlayerDefs = useCallback((playerCount = settings.playerCount) => {
    const theme = THEMES[settings.theme] ?? THEMES.sandstone
    if (settings.mode === 'local') {
      return Array.from({ length: playerCount }, (_, index) => ({
        name: settings.localNames[index] ?? `Player ${index + 1}`,
      })).map(({ name }, index) => ({
        id: `local-${index}`,
        name: name.trim() || `Player ${index + 1}`,
        initials: (name.trim() || `P${index + 1}`).slice(0, 1).toUpperCase(),
        color: index === 0 ? settings.avatarColor : theme.colors[index] ?? PLAYER_DEFS[index].color,
        seat: getPlayerSeat(index, playerCount),
        human: true,
        crest: index === 0 ? settings.crest : 'Crown',
      }))
    }
    if (settings.mode === 'online') {
      const roster = roomInfo?.players ?? []
      const withBots = [...roster]
      let botNumber = 1
      while (withBots.length < playerCount) {
        withBots.push({ id: `bot-${botNumber}`, name: `Palace Bot ${botNumber}`, human: false })
        botNumber += 1
      }
      return withBots.slice(0, playerCount).map((player, index) => ({
        ...player,
        initials: player.name.slice(0, 1).toUpperCase(),
        color: player.id === localPeerId ? settings.avatarColor : player.color ?? theme.colors[index] ?? PLAYER_DEFS[index].color,
        seat: getPlayerSeat(index, playerCount),
        crest: player.id === localPeerId ? settings.crest : 'Crown',
        score: 0,
      }))
    }
    return PLAYER_DEFS.slice(0, playerCount).map((player, index) => ({
      ...player,
      name: player.id === 'you' ? (settings.nickname.trim() || 'You') : player.name,
      initials: player.id === 'you' ? (settings.nickname.trim() || 'You').slice(0, 1).toUpperCase() : player.initials,
      color: player.id === 'you' ? settings.avatarColor : theme.colors[index] ?? player.color,
      seat: getPlayerSeat(index, playerCount),
      crest: player.id === 'you' ? settings.crest : 'Crown',
    }))
  }, [
    settings.mode,
    settings.playerCount,
    settings.localNames,
    settings.avatarColor,
    settings.theme,
    settings.crest,
    settings.nickname,
    roomInfo?.players,
    localPeerId,
  ])

  useEffect(() => {
    if (game.phase !== 'lobby' || game.players.length === settings.playerCount) return
    dispatch({
      type: 'CONFIGURE_GAME',
      players: makePlayerDefs(),
      roundLimit: settings.rounds,
      mode: settings.mode,
      difficulty: settings.difficulty,
    })
  }, [game.phase, game.players.length, makePlayerDefs, settings.difficulty, settings.mode, settings.playerCount, settings.rounds])

  const submitAction = useCallback((action) => {
    if (settings.mode === 'online' && !roomInfo?.isHost) {
      managerRef.current?.send({ type: 'action', action })
    } else {
      dispatch(action)
      vibrate()
    }
    if (['REVEAL_KING', 'REVEAL_RANI', 'REVEAL_SIPAHI'].includes(action.type)) playSound('rustle')
  }, [settings.mode, roomInfo?.isHost, vibrate, playSound])

  const startRound = useCallback(() => {
    activateAudio()
    vibrate()
    setPassedPlayerId(null)
    setPeekedPlayerId(null)
    window.clearTimeout(shuffleTimer.current)
    setShuffleActive(true)
    shuffleTimer.current = window.setTimeout(() => setShuffleActive(false), 1350)
    if (settings.mode === 'online' && !roomInfo?.isHost) {
      managerRef.current?.send({ type: 'action', action: { type: 'NEXT_ROUND' } })
      return
    }
    const players = game.phase === 'lobby' ? makePlayerDefs() : game.players
    if (game.phase === 'lobby') {
      dispatch({
        type: 'CONFIGURE_GAME',
        players,
        roundLimit: settings.rounds,
        mode: settings.mode,
        difficulty: settings.difficulty,
      })
    }
    dispatch({
      type: 'START_ROUND',
      roles: dealRoles(players),
    })
  }, [
    activateAudio,
    vibrate,
    settings.mode,
    settings.rounds,
    settings.difficulty,
    game.phase,
    game.players,
    roomInfo?.isHost,
    makePlayerDefs,
  ])
  useEffect(() => {
    startRoundRef.current = startRound
    submitActionRef.current = submitAction
  }, [startRound, submitAction])

  const updateLobbySetting = useCallback((key, value) => {
    if (key === 'mode' && value !== settingsRef.current.mode) {
      resetChat()
      if (value !== 'online' && settingsRef.current.mode === 'online') {
        managerRef.current?.close()
        setRoomInfo(null)
        setRemoteGame(null)
        setLocalPeerId(null)
        setRoomStatus('idle')
      }
    }
    updateSetting(key, value)
  }, [resetChat, updateSetting])

  const createRoom = useCallback(async () => {
    resetChat()
    setRoomError('')
    setRoomStatus('connecting')
    try {
      await managerRef.current.createRoom({ name: settings.nickname.trim() || 'Host', color: settings.avatarColor })
      setRoomStatus('hosting')
    } catch (error) {
      console.error('Unable to create the multiplayer room.', error)
      setRoomStatus('idle')
      setRoomError(error.message || 'Could not create a room. Try again.')
    }
  }, [settings.nickname, settings.avatarColor, resetChat])

  const joinRoom = useCallback(async (code) => {
    resetChat()
    setRoomError('')
    setRoomStatus('connecting')
    try {
      await managerRef.current.joinRoom(code, { name: settings.nickname.trim() || 'Guest', color: settings.avatarColor })
      setRoomStatus('connected')
    } catch (error) {
      console.error('Unable to join the multiplayer room.', error)
      setRoomStatus('idle')
      setRoomError(error.message || 'Could not join that room. Check the code.')
    }
  }, [settings.nickname, settings.avatarColor, resetChat])

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('room')
    if (code && /^[a-z0-9]{6}$/i.test(code) && !autoJoinAttempted.current) {
      autoJoinAttempted.current = true
      updateSetting('mode', 'online')
      joinRoom(code)
    }
  }, [joinRoom, updateSetting])

  const addRoomBots = useCallback(() => managerRef.current?.addBots(settings.playerCount), [settings.playerCount])

  const dispatchOnlineAction = (action) => submitAction(action)

  const restartGame = (playerCount = settings.playerCount) => {
    if (playerCount !== settings.playerCount) updateSetting('playerCount', playerCount)
    resetChat()
    setScoreboardOpen(false)
    setRemoteGame(null)
    setPeekedPlayerId(null)
    setShuffleActive(false)
    if (settings.mode === 'online' && !roomInfo?.isHost) {
      managerRef.current?.close()
      setRoomInfo(null)
      setLocalPeerId(null)
      updateSetting('mode', 'solo')
    } else if (settings.mode === 'online' && roomInfo?.isHost) {
      const freshGame = createGame(makePlayerDefs(playerCount), { mode: settings.mode, roundLimit: settings.rounds })
      managerRef.current?.publishGame({ ...freshGame, language: settings.language })
    }
    dispatch({ type: 'RESTART' })
  }

  const selectPlayerCount = (playerCount) => {
    if (playerCount === settings.playerCount) return
    if (displayGame.phase !== 'lobby') {
      if (!window.confirm(`${t('freshGame')}?`)) return
      restartGame(playerCount)
      return
    }
    updateSetting('playerCount', playerCount)
  }

  const triggerEmote = (emote) => {
    const playerId = currentPlayerId ?? 'you'
    setEmotes((current) => ({ ...current, [playerId]: emote }))
    window.clearTimeout(emoteTimers.current[playerId])
    emoteTimers.current[playerId] = window.setTimeout(
      () => setEmotes((current) => ({ ...current, [playerId]: null })),
      2400,
    )
    if (settings.mode === 'online') managerRef.current?.send({ type: 'emote', playerId, emote })
    setEmoteOpen(false)
  }

  const sendChatMessage = (text) => {
    const player = displayPlayers.find(({ id }) => id === currentPlayerId)
      ?? displayPlayers.find(({ human }) => human)
    if (!player) return
    const message = createPlayerChatMessage(player, text)
    if (!message.text) return

    if (settings.mode === 'online') {
      if (roomInfo?.isHost) {
        managerRef.current?.send({ type: 'chat', message })
      } else {
        addChatMessage(message)
        managerRef.current?.send({
          type: 'chat',
          message: { id: message.id, text: message.text, createdAt: message.createdAt },
        })
      }
    } else {
      addChatMessage(message)
    }

    const mayReply = settings.mode === 'solo' || (settings.mode === 'online' && roomInfo?.isHost)
    const bots = displayGame.players.filter(({ human }) => !human)
    if (!mayReply || bots.length === 0) return
    const roleById = Object.fromEntries(
      Object.entries(displayGame.roles ?? {}).map(([role, playerId]) => [playerId, role]),
    )
    const { responder, response, delay } = chooseBotReply(bots, roleById, displayGame.phase, settings.language)
    scheduleBotMessage(responder, response, delay)
  }

  const toggleChatMute = () => {
    const next = !chatMutedRef.current
    chatMutedRef.current = next
    setChatMuted(next)
    if (next) {
      Object.values(chatBubbleTimers.current).forEach(window.clearTimeout)
      chatBubbleTimers.current = {}
      setSpeechBubbles([])
    }
  }

  const statusText = {
    lobby: t('lobbyStatus'),
    'private-peek': t('privatePeekStatus'),
    'reveal-king': kingId === currentPlayerId ? t('kingReadyStatus') : t('kingBotStatus'),
    'reveal-rani': t('raniStatus'),
    'reveal-sipahi': t('sipahiStatus'),
    chant: t('chantStatus'),
    guess: sipahiId === currentPlayerId ? t('guessStatus') : t('botStatus'),
    result: displayGame.guessWasCorrect ? t('correctStatus') : t('wrongStatus'),
  }[displayGame.phase]

  const messageGame = {
    ...displayGame,
    language: settings.language,
    settings,
    updateSetting: updateLobbySetting,
    roomInfo,
    roomStatus,
    roomError,
    onCreateRoom: createRoom,
    onJoinRoom: joinRoom,
    onFillBots: addRoomBots,
    canStartOnline: Boolean(roomInfo?.isHost && roomInfo.players.length >= settings.playerCount),
    isRemoteClient,
  }

  return (
    <main
      className={`game-shell${displayGame.phase !== 'lobby' ? ' has-action-dock' : ''}${scoreboardOpen ? ' mobile-scoreboard-open' : ''}`}
      dir={direction}
      style={{ '--theme-bg': (THEMES[settings.theme] ?? THEMES.sandstone).background }}
    >
      <header className="topbar">
        <a className="brand" href="/" aria-label="Raja Mantri home">
          <span className="brand-mark"><Crown size={18} strokeWidth={1.8} /></span>
          <span>COURTYARD <b>GAMES</b></span>
        </a>
        <div className="topbar-meta"><span className="live-dot" /> {t(displayPlayerCount === 5 ? 'tableForFive' : 'tableForFour')}</div>
        <div className="topbar-round" aria-label={`${t('roundLabel')} ${Math.max(1, displayGame.roundNumber)} of ${displayGame.phase === 'lobby' ? settings.rounds : displayGame.roundLimit}`}>
          <span>{t('roundLabel')}</span>
          <strong>{String(Math.max(1, displayGame.roundNumber)).padStart(2, '0')} / {displayGame.phase === 'lobby' ? settings.rounds : displayGame.roundLimit}</strong>
          <b>{displayPlayerCount}P</b>
        </div>
        <div className="header-actions">
          <button className="icon-button" type="button" onClick={() => { activateAudio(); setMuted((value) => !value) }} aria-label={muted ? t('unmute') : t('mute')}>
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <button className="icon-button" type="button" onClick={() => setGuideOpen(true)} aria-label={t('guide')} title={t('guide')}><CircleHelp size={17} /></button>
          <button className="icon-button" type="button" onClick={() => setSettingsOpen(true)} aria-label={t('settings')} title={t('settings')}><Settings size={16} /></button>
          {displayGame.phase !== 'lobby' && (
            <button
              className={`icon-button mobile-score-toggle${scoreboardOpen ? ' selected' : ''}`}
              type="button"
              onClick={() => setScoreboardOpen((open) => !open)}
              aria-label={t('players')}
              aria-expanded={scoreboardOpen}
              title={t('players')}
            >
              <UsersRound size={16} />
            </button>
          )}
          <button className="icon-button restart-button" type="button" onClick={restartGame} aria-label={t('freshGame')} title={t('freshGame')}><RotateCcw size={15} /></button>
        </div>
      </header>

      <section className="intro-row">
        <div>
          <p className="eyebrow"><span>✦</span> {t('intro')}</p>
          <h1>Raja Mantri <em>Chor Sipahi</em></h1>
          <p className="intro-copy">{t('guideIntro')}</p>
        </div>
        <div className="round-chip">
          <span>{t('roundLabel')}</span><strong>{String(Math.max(1, displayGame.roundNumber)).padStart(2, '0')}</strong>
          <span>·</span><span>{displayGame.phase === 'lobby' ? settings.rounds : displayGame.roundLimit} {t('totalRounds')} · {t(settings.mode)}</span>
        </div>
      </section>

      <div className="player-count-picker">
        <p className="eyebrow">{t('playerVariant')}</p>
        <div className="player-count-options" role="group" aria-label={t('playerVariant')}>
          {[4, 5].map((count) => (
            <button
              type="button"
              className={`player-count-option${settings.playerCount === count ? ' selected' : ''}`}
              key={count}
              disabled={isRemoteClient || (
                settings.mode === 'online' && roomInfo?.isHost && roomInfo.players.length > count
              )}
              aria-pressed={settings.playerCount === count}
              onClick={() => selectPlayerCount(count)}
            >
              {t(count === 4 ? 'fourPlayers' : 'fivePlayers')}
            </button>
          ))}
        </div>
      </div>

      <section className="game-layout" aria-label={t('gameBoard')}>
        <div className="arena-card">
          <div className="arena-heading">
            <span><span className="live-dot" /> {t('courtyard')}</span>
            <span className="scene-label"><Sparkles size={13} /> {t(settings.theme)}</span>
          </div>
          <div className={`arena phase-${displayGame.phase}`}>
            <Suspense fallback={<div className="arena-loading">{t('preparing')}</div>}>
              <CourtyardScene
                phase={displayGame.phase}
                fontFamily={chitFontFamily}
                fontsReady={fontsReady}
                roundNumber={displayGame.roundNumber}
                focusPlayerId={focusPlayerId}
                players={displayPlayers}
                playerCount={displayPlayerCount}
                seatAnchorRefs={seatAnchorRefs}
                rolesByPlayer={rolesByPlayer}
                revealedPlayers={displayGame.revealedPlayers}
                rankByPlayer={rankByPlayer}
                guessWasCorrect={displayGame.guessWasCorrect}
                shuffleActive={shuffleActive}
                speechBubbles={chatMuted ? [] : speechBubbles}
                themeId={settings.theme}
                quality={settings.graphics}
                celebrate={Boolean(displayGame.isComplete)}
                winnerSeat={displayLeaderboard[0]?.seat}
                revealPlayerId={revealPlayerId}
                canGuess={guessablePlayerIds.length > 0}
                guessablePlayerIds={guessablePlayerIds}
                roleLabels={{
                  raja: translateRole(settings.language, ROLE.RAJA),
                  rani: translateRole(settings.language, ROLE.RANI),
                  mantri: translateRole(settings.language, ROLE.MANTRI),
                  chor: translateRole(settings.language, ROLE.CHOR),
                  sipahi: translateRole(settings.language, ROLE.SIPAHI),
                }}
                onReveal={() => dispatchOnlineAction({ type: revealActionType })}
                onGuess={(playerId) => dispatchOnlineAction({ type: 'GUESS', playerId })}
              />
            </Suspense>
            <div className="seat-overlay-layer">
              {displayPlayers.map((player) => (
                <div
                  key={player.id}
                  className="player-seat-anchor"
                  ref={(node) => {
                    if (node) seatAnchorRefs.current.set(player.id, node)
                    else seatAnchorRefs.current.delete(player.id)
                  }}
                  style={{ visibility: 'hidden' }}
                >
                  <PlayerSeat player={player} {...seatInfoByPlayerId[player.id]} />
                </div>
              ))}
            </div>
            <div className="table-caption"><span>✦</span> {displayGame.phase === 'lobby' ? t('courtyard') : displayGame.phase === 'chant' ? t('chant') : displayGame.phase === 'guess' ? t('whoIsChor') : displayGame.phase === 'result' ? t('rolesRevealed') : t('privatePeekStatus')} <span>✦</span></div>
            {displayGame.phase === 'guess' && settings.timer > 0 && <div className="turn-timer">{roundTimeLeft}s</div>}
            <div className="arena-status"><span className="status-icon"><Crown size={15} /></span>{statusText}</div>
            {displayGame.phase !== 'lobby' && (
              <div className="emote-wrapper">
                {emoteOpen && <div className="emote-wheel">{EMOTES.map((emote) => <button key={emote} type="button" onClick={() => triggerEmote(emote)}>{emote}</button>)}</div>}
                <button className="emote-trigger" type="button" onClick={() => setEmoteOpen((value) => !value)} aria-label="Open reaction emotes">☺</button>
              </div>
            )}
          </div>
        </div>

        <aside className="side-panel">
          <div className="panel-title">
            <div><p className="eyebrow">{displayGame.phase === 'result' ? t('finalStandings') : t('yourCourt')}</p><h2>{t('players')} <span>{String(displayGame.players.length).padStart(2, '0')}</span></h2></div>
            <span className="scoring-label">{displayGame.roundNumber ? `${t('roundShort')} ${displayGame.roundNumber}` : t('lobbyShort')}</span>
          </div>
          <div className="player-list">
            {displayLeaderboard.map((player) => (
              <PlayerRow
                key={player.id}
                player={player}
                rank={player.rank}
                role={getRoleForPlayer(displayGame, player.id)
                  ? { ...getRoleForPlayer(displayGame, player.id), name: translateRole(settings.language, rolesByPlayer[player.id]) }
                  : null}
                canGuess={displayGame.phase === 'guess' && sipahiId === currentPlayerId
                  && (displayGame.suspectPlayerIds ?? [ministerId, displayGame.roles?.[ROLE.CHOR]]).includes(player.id)}
                onGuess={(playerId) => dispatchOnlineAction({ type: 'GUESS', playerId })}
                guessedPlayerId={displayGame.guessedPlayerId}
                phase={displayGame.phase}
                direction={settings.language}
              />
            ))}
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              className="action-message"
              key={`${displayGame.phase}-${isRemoteClient ? 'remote' : 'local'}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <ActionMessage
                game={messageGame}
                currentPlayerId={currentPlayerId}
                localPrivacy={settings.mode === 'local'}
                onStart={startRound}
                onReveal={() => submitAction({
                  type: displayGame.phase === 'private-peek' ? 'PEEK_PRIVATE' : revealActionType,
                  playerId: displayGame.phase === 'private-peek' ? displayGame.privatePeekQueue?.[0] : undefined,
                })}
                onGuess={(playerId) => submitAction({ type: 'GUESS', playerId })}
                onNext={startRound}
                onRestart={restartGame}
              />
            </motion.div>
          </AnimatePresence>
          <p className="privacy-note"><span /> {audioUnavailable ? t('audioUnavailable') : t('privacy')}</p>
        </aside>
      </section>
      <footer className="footer-line"><span>AN OLD INDIAN COURTYARD GAME</span><span>✦ &nbsp; MAY THE WISEST WIN &nbsp; ✦</span><span>EST. SINCE FOREVER</span></footer>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} settings={settings} updateSetting={updateSetting} />
      <HowToPlay open={guideOpen} onClose={() => setGuideOpen(false)} language={settings.language} />
      <ChatDrawer
        messages={chatMessages}
        currentPlayerId={currentPlayerId}
        language={settings.language}
        muted={chatMuted}
        onToggleMute={toggleChatMute}
        onSend={sendChatMessage}
        botTyping={botTyping}
      />

      <AnimatePresence>
        {privacyCurtainNeeded && (
          <motion.div className="privacy-curtain" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="curtain-card">
              <span className="curtain-crown"><Crown size={22} /></span>
              <p className="eyebrow">{t('privateChit')}</p>
              <h2>{peekedPlayerId === activeRevealPlayer
                ? translateRole(settings.language, rolesByPlayer[activeRevealPlayer]) ?? 'Your secret role'
                : `${t('passTo')} ${displayGame.players.find(({ id }) => id === activeRevealPlayer)?.name}`}</h2>
              <p>{peekedPlayerId === activeRevealPlayer ? t('keepRoleSecret') : t('tapToPeek')}</p>
              <button
                className="primary-button"
                type="button"
                onClick={() => {
                  if (peekedPlayerId !== activeRevealPlayer) {
                    setPeekedPlayerId(activeRevealPlayer)
                    playSound('rustle')
                  } else if (displayGame.phase === 'private-peek') {
                    submitAction({ type: 'PEEK_PRIVATE', playerId: activeRevealPlayer })
                    setPeekedPlayerId(null)
                  } else {
                    setPeekedPlayerId(null)
                    setPassedPlayerId(activeRevealPlayer)
                  }
                }}
              >
                {peekedPlayerId === activeRevealPlayer ? t('hideAndPass') : t('tapToPeek')} <ArrowUpRight size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}

export default App
