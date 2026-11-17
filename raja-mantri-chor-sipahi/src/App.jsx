import { lazy, Suspense, useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowUpRight,
  CircleHelp,
  Crown,
  RotateCcw,
  Settings,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react'
import {
  chooseBotGuess,
  createGame,
  dealRoles,
  gameReducer,
  getLeaderboard,
  getRoleForPlayer,
  PLAYER_DEFS,
  ROLE,
} from './game.js'
import { THEMES } from './config/themes.js'
import HowToPlay from './components/HowToPlay.jsx'
import LobbyPanel from './components/LobbyPanel.jsx'
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

function PlayerSeat({ player, role, active, isGuessed, emote, nervous }) {
  return (
    <motion.div
      layout
      className={`player-seat seat-${player.seat}${active ? ' is-active' : ''}${nervous ? ' is-nervous' : ''}`}
      animate={{ scale: active ? 1.06 : 1, y: active ? -3 : 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
    >
      {emote && <motion.span className="seat-emote" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: -8 }} exit={{ opacity: 0 }}>{emote}</motion.span>}
      <span className="seat-avatar" style={{ '--seat-color': player.color }}>
        {player.crest === 'Peacock' ? 'P' : player.crest === 'Lotus' ? 'L' : player.crest === 'Sun' ? 'S' : player.initials}
      </span>
      <span className="seat-label-group">
        <span className="seat-name">{player.name}</span>
        <AnimatePresence mode="wait">
          {role && (
            <motion.span
              key={role.name}
              className="seat-role"
              initial={{ opacity: 0, rotateX: -80, height: 0 }}
              animate={{ opacity: 1, rotateX: 0, height: 'auto' }}
              exit={{ opacity: 0, rotateX: 80, height: 0 }}
              transition={{ duration: 0.28 }}
            >
              {role.name}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      {isGuessed && <span className="guess-marker">?</span>}
      {nervous && <span className="nervous-drop">!</span>}
    </motion.div>
  )
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
  const isHumanKing = game.phase === 'reveal-king' && kingId === currentPlayerId
  const isHumanMinister = (game.phase === 'reveal-minister' || game.phase === 'guess') && ministerId === currentPlayerId
  const candidates = game.phase === 'guess'
    ? game.players.filter((player) => player.id !== kingId && player.id !== ministerId)
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
        {!isHumanKing && kingId && <div className="royal-callout">{t('kingCallout')}</div>}
      </div>
    )
  }

  if (game.phase === 'reveal-minister') {
    return (
      <div className="action-card">
        <p className="eyebrow">{t('royalCall')}</p>
        <h3>{isHumanMinister ? (localPrivacy ? t('privateChitReady') : `${t('youAre')} ${translateRole(game.language, ROLE.MANTRI)}.`) : t('ministerStepForward')}</h3>
        <p>{isHumanMinister ? t('revealThenChoose') : t('courtWaitsMinister')}</p>
        {isHumanMinister && <button className="primary-button" type="button" onClick={onReveal}>{localPrivacy ? t('hideAndPass') : t('reveal')} <ArrowUpRight size={15} /></button>}
      </div>
    )
  }

  if (game.phase === 'guess') {
    if (isHumanMinister) {
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
        <h3>{t('mantriThinking')}</h3>
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
    volume: state.volume,
    ambientMusic: state.ambientMusic,
    haptics: state.haptics,
    graphics: state.graphics,
    rounds: state.rounds,
    timer: state.timer,
    mode: state.mode,
    localNames: state.localNames,
    updateSetting: state.updateSetting,
  })))
  const updateSetting = useGameStore((state) => state.updateSetting)
  const [game, dispatch] = useReducer(gameReducer, undefined, createGame)
  const [remoteGame, setRemoteGame] = useState(null)
  const [muted, setMuted] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
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
  const displayGame = remoteGame ?? game
  const isRemoteClient = Boolean(remoteGame) && settings.mode === 'online' && !roomInfo?.isHost
  const ministerId = displayGame.roles?.[ROLE.MANTRI]
  const kingId = displayGame.roles?.[ROLE.RAJA]
  const currentPlayerId = settings.mode === 'solo' ? 'you'
    : settings.mode === 'local'
      ? displayGame.phase === 'private-peek' ? displayGame.privatePeekQueue?.[0]
        : displayGame.phase === 'reveal-king' ? kingId
        : ['reveal-minister', 'guess'].includes(displayGame.phase) ? ministerId : 'local-0'
      : localPeerId
  const rolesByPlayer = displayGame.roles
    ? Object.fromEntries(Object.entries(displayGame.roles).map(([role, playerId]) => [playerId, role]))
    : {}
  const focusPlayerId = displayGame.phase === 'reveal-king'
    ? kingId
    : ['reveal-minister', 'guess'].includes(displayGame.phase) ? ministerId : null
  const revealPlayerId = displayGame.phase === 'reveal-king' && kingId === currentPlayerId
    ? kingId
    : displayGame.phase === 'reveal-minister' && ministerId === currentPlayerId ? ministerId : null
  const guessablePlayerIds = displayGame.phase === 'guess' && ministerId === currentPlayerId
    ? displayGame.players
      .map(({ id }) => id)
      .filter((id) => id !== kingId && id !== ministerId)
    : []
  const activeRevealPlayer = displayGame.phase === 'reveal-king'
    ? kingId : displayGame.phase === 'reveal-minister' ? ministerId
      : displayGame.phase === 'private-peek' ? displayGame.privatePeekQueue?.[0] : null
  const privacyCurtainNeeded = settings.mode === 'local'
    && ['private-peek', 'reveal-king', 'reveal-minister'].includes(displayGame.phase)
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
      setRemoteGame(data.game)
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
      } else if (data.action?.type === 'REVEAL_MINISTER' && state.phase === 'reveal-minister' && state.roles?.[ROLE.MANTRI] === senderId) {
        dispatchRef.current(data.action)
      } else if (data.action?.type === 'GUESS' && state.phase === 'guess' && state.roles?.[ROLE.MANTRI] === senderId) {
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
  }, [handleNetworkMessage])

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
    if (hostMayAutomate && game.phase === 'reveal-king' && !game.players.find(({ id }) => id === kingId)?.human) {
      timer = window.setTimeout(() => dispatch({ type: 'REVEAL_KING' }), 1250)
    } else if (hostMayAutomate && game.phase === 'reveal-minister' && !game.players.find(({ id }) => id === ministerId)?.human) {
      timer = window.setTimeout(() => dispatch({ type: 'REVEAL_MINISTER' }), 900)
    } else if (hostMayAutomate && game.phase === 'guess' && !game.players.find(({ id }) => id === ministerId)?.human) {
      timer = window.setTimeout(() => {
        const guess = chooseBotGuess(game)
        if (guess) dispatch({ type: 'GUESS', playerId: guess })
      }, 1100)
    }
    return () => window.clearTimeout(timer)
  }, [game, kingId, ministerId, roomInfo, settings.mode])

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
    if (displayGame.phase !== 'guess' || !settings.timer) return undefined
    const startTimer = window.setTimeout(() => setTimerStartedAt(Date.now()), 0)
    const interval = window.setInterval(() => setClockTick(Date.now()), 250)
    const timeout = window.setTimeout(() => {
      const chorId = displayGame.roles?.[ROLE.CHOR]
      const candidates = displayGame.players
        .map(({ id }) => id)
        .filter((id) => id !== displayGame.roles?.[ROLE.RAJA] && id !== displayGame.roles?.[ROLE.MANTRI])
      const guess = chorId && Math.random() < 0.65
        ? chorId
        : candidates.find((id) => id !== chorId) ?? candidates[0]
      if (guess) submitActionRef.current({ type: 'GUESS', playerId: guess })
    }, settings.timer * 1000)
    return () => {
      window.clearTimeout(startTimer)
      window.clearInterval(interval)
      window.clearTimeout(timeout)
    }
  }, [displayGame.phase, displayGame.roundNumber, displayGame.roles, displayGame.players, settings.timer])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (displayGame.phase === 'reveal-king') playSound('reveal')
      else if (displayGame.phase === 'reveal-minister') playSound('king-call')
      else if (displayGame.phase === 'guess') playSound('scroll')
      else if (displayGame.phase === 'result') playSound(displayGame.guessWasCorrect ? 'caught' : 'coins')
    }, 0)
    return () => window.clearTimeout(timer)
  }, [displayGame.phase, displayGame.guessWasCorrect, displayGame.roundNumber, playSound])

  useEffect(() => () => {
    window.clearTimeout(shuffleTimer.current)
    Object.values(emoteTimers.current).forEach(window.clearTimeout)
    Object.values(chatBubbleTimers.current).forEach(window.clearTimeout)
    window.clearTimeout(botReplyTimer.current)
  }, [])

  const makePlayerDefs = useCallback(() => {
    const theme = THEMES[settings.theme] ?? THEMES.sandstone
    if (settings.mode === 'local') {
      return settings.localNames.map((name, index) => ({
        id: `local-${index}`,
        name: name.trim() || `Player ${index + 1}`,
        initials: (name.trim() || `P${index + 1}`).slice(0, 1).toUpperCase(),
        color: index === 0 ? settings.avatarColor : theme.colors[index],
        seat: PLAYER_DEFS[index].seat,
        human: true,
        crest: index === 0 ? settings.crest : 'Crown',
      }))
    }
    if (settings.mode === 'online') {
      const roster = roomInfo?.players ?? []
      const withBots = [...roster]
      let botNumber = 1
      while (withBots.length < 4) {
        withBots.push({ id: `bot-${botNumber}`, name: `Palace Bot ${botNumber}`, human: false })
        botNumber += 1
      }
      return withBots.slice(0, 4).map((player, index) => ({
        ...player,
        initials: player.name.slice(0, 1).toUpperCase(),
        color: player.id === localPeerId ? settings.avatarColor : player.color ?? theme.colors[index],
        seat: PLAYER_DEFS[index].seat,
        crest: player.id === localPeerId ? settings.crest : 'Crown',
        score: 0,
      }))
    }
    return PLAYER_DEFS.map((player, index) => ({
      ...player,
      name: player.id === 'you' ? (settings.nickname.trim() || 'You') : player.name,
      initials: player.id === 'you' ? (settings.nickname.trim() || 'You').slice(0, 1).toUpperCase() : player.initials,
      color: player.id === 'you' ? settings.avatarColor : theme.colors[index],
      crest: player.id === 'you' ? settings.crest : 'Crown',
    }))
  }, [
    settings.mode,
    settings.localNames,
    settings.avatarColor,
    settings.theme,
    settings.crest,
    settings.nickname,
    roomInfo?.players,
    localPeerId,
  ])

  const submitAction = useCallback((action) => {
    if (settings.mode === 'online' && !roomInfo?.isHost) {
      managerRef.current?.send({ type: 'action', action })
    } else {
      dispatch(action)
      vibrate()
    }
    if (action.type === 'REVEAL_KING' || action.type === 'REVEAL_MINISTER') playSound('rustle')
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

  const addRoomBots = useCallback(() => managerRef.current?.addBots(), [])

  const dispatchOnlineAction = (action) => submitAction(action)

  const restartGame = () => {
    resetChat()
    setRemoteGame(null)
    setPeekedPlayerId(null)
    setShuffleActive(false)
    if (settings.mode === 'online' && !roomInfo?.isHost) {
      managerRef.current?.close()
      setRoomInfo(null)
      setLocalPeerId(null)
      updateSetting('mode', 'solo')
    } else if (settings.mode === 'online' && roomInfo?.isHost) {
      const freshGame = createGame(makePlayerDefs(), { mode: settings.mode, roundLimit: settings.rounds })
      managerRef.current?.publishGame({ ...freshGame, language: settings.language })
    }
    dispatch({ type: 'RESTART' })
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
    'reveal-minister': t('ministerStatus'),
    guess: ministerId === currentPlayerId ? t('guessStatus') : t('botStatus'),
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
    canStartOnline: roomInfo?.isHost,
    isRemoteClient,
  }

  return (
    <main className="game-shell" dir={direction} style={{ '--theme-bg': (THEMES[settings.theme] ?? THEMES.sandstone).background }}>
      <header className="topbar">
        <a className="brand" href="/" aria-label="Raja Mantri home">
          <span className="brand-mark"><Crown size={18} strokeWidth={1.8} /></span>
          <span>COURTYARD <b>GAMES</b></span>
        </a>
        <div className="topbar-meta"><span className="live-dot" /> {t('tableForFour')}</div>
        <div className="header-actions">
          <button className="icon-button" type="button" onClick={() => { activateAudio(); setMuted((value) => !value) }} aria-label={muted ? t('unmute') : t('mute')}>
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <button className="icon-button" type="button" onClick={() => setGuideOpen(true)} aria-label={t('guide')} title={t('guide')}><CircleHelp size={17} /></button>
          <button className="icon-button" type="button" onClick={() => setSettingsOpen(true)} aria-label={t('settings')} title={t('settings')}><Settings size={16} /></button>
          <button className="icon-button" type="button" onClick={restartGame} aria-label={t('freshGame')} title={t('freshGame')}><RotateCcw size={15} /></button>
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
                roundNumber={displayGame.roundNumber}
                focusPlayerId={focusPlayerId}
                players={displayPlayers}
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
                  mantri: translateRole(settings.language, ROLE.MANTRI),
                  chor: translateRole(settings.language, ROLE.CHOR),
                  sipahi: translateRole(settings.language, ROLE.SIPAHI),
                }}
                onReveal={() => dispatchOnlineAction({
                  type: displayGame.phase === 'reveal-king' ? 'REVEAL_KING' : 'REVEAL_MINISTER',
                })}
                onGuess={(playerId) => dispatchOnlineAction({ type: 'GUESS', playerId })}
              />
            </Suspense>
            {displayPlayers.map((player) => (
              <PlayerSeat
                key={player.seat}
                player={player}
                role={getRoleForPlayer(displayGame, player.id)
                  ? { ...getRoleForPlayer(displayGame, player.id), name: translateRole(settings.language, rolesByPlayer[player.id]) }
                  : null}
                active={player.id === kingId && displayGame.phase === 'reveal-king'
                  || player.id === ministerId && ['reveal-minister', 'guess'].includes(displayGame.phase)}
                isGuessed={displayGame.phase === 'result' && player.id === displayGame.guessedPlayerId}
                emote={emotes[player.id]}
                nervous={displayGame.phase === 'guess' && nervousPlayerIds.includes(player.id)}
              />
            ))}
            <div className="table-caption"><span>✦</span> {displayGame.phase === 'lobby' ? t('courtyard') : displayGame.phase === 'guess' ? t('whoIsChor') : displayGame.phase === 'result' ? t('rolesRevealed') : t('privatePeekStatus')} <span>✦</span></div>
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
            <div><p className="eyebrow">{displayGame.phase === 'result' ? t('finalStandings') : t('yourCourt')}</p><h2>{t('players')} <span>04</span></h2></div>
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
                canGuess={displayGame.phase === 'guess' && ministerId === currentPlayerId
                  && player.id !== kingId && player.id !== ministerId}
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
                  type: displayGame.phase === 'private-peek' ? 'PEEK_PRIVATE'
                    : displayGame.phase === 'reveal-king' ? 'REVEAL_KING' : 'REVEAL_MINISTER',
                  playerId: displayGame.privatePeekQueue?.[0],
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
