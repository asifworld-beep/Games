import { lazy, Suspense, useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowUpRight,
  CircleHelp,
  Crown,
  RotateCcw,
  Settings,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  X,
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
import LobbyPanel from './components/LobbyPanel.jsx'
import PlayerSeat from './components/PlayerSeat.jsx'
import { AvatarMark } from './components/RoleIcon.jsx'
import ChatDrawer from './components/ChatDrawer.jsx'
import { createChatId, createChatRecord } from './chat/chatUtils.js'
import { getChatCopy } from './i18n/chatTranslations.js'
import { getDirection, translate, translateRole } from './i18n/translations.js'
import { MultiplayerManager } from './network/multiplayerManager.js'
import { useGameStore } from './store/useGameStore.js'
import { SoundEngine } from './soundEngine.js'
import { CHANTS, RANI_CALLS, prepareSpeechVoices, speakPhase, speakRoleLine, stopChantVoice } from './chantVoiceEngine.js'
import { createRoundSequence } from './roundSequence.js'
import { useShallow } from 'zustand/react/shallow'
import './App.css'

const CourtyardScene = lazy(() => import('./CourtyardScene.jsx'))
const SettingsModal = lazy(() => import('./components/SettingsModal.jsx'))
const HowToPlay = lazy(() => import('./components/HowToPlay.jsx'))
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

function PlayerRow({ player, rank, role, hiddenRole, language }) {
  const t = (key) => translate(language, key)
  return (
    <div className="leaderboard-row">
      <span className="leaderboard-rank">#{rank}</span>
      <span className="row-avatar" style={{ '--seat-color': player.color }}><AvatarMark player={player} role={role} hiddenRole={hiddenRole} /></span>
      <span className="row-details">
        <b>{player.name}</b>
        <small>{role?.name ?? t(player.human ? 'playerLabel' : 'guestLabel')}</small>
      </span>
      <span className="leaderboard-points"><small>{t('roundPoints')}</small><b>+{(player.roundPoints ?? 0).toLocaleString()}</b></span>
      <span className="leaderboard-points total"><small>{t('totalScore')}</small><b>{player.score.toLocaleString()}</b></span>
    </div>
  )
}

function ActionMessage({ game, currentPlayerId, onStart, onReveal, onSelect, onGuess, onNext, onRestart, onShowLeaderboard, localPrivacy }) {
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
  const scoreRows = game.phase === 'result' && (
    <div className="round-scores" aria-label="Round scores">
      {game.players.map((player) => <span key={player.id}>{player.name}: +{player.roundPoints ?? 0}</span>)}
    </div>
  )
  const roundScores = game.chatOpen && scoreRows
    ? <details className="compact-round-scores"><summary>{t('roundPoints')} {t('pointsLabel')}</summary>{scoreRows}</details>
    : scoreRows

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

  if (game.phase === 'shuffle') {
    return <div className="action-card"><h3>{t('preparing')}</h3></div>
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
        <h3>{localPrivacy || !game.privatePeekOpen ? t('privateChitReady') : `${t('yourRole')} ${translateRole(game.language, privateRole)}`}</h3>
        <p>{localPrivacy ? t('hideAndPassHelp') : t('keepRoleSecret')}</p>
        {!localPrivacy && !game.privatePeekOpen && <button className="primary-button" type="button" onClick={onReveal}>{t('reveal')} <ArrowUpRight size={15} /></button>}
        {!localPrivacy && game.privatePeekOpen && <><small className="peek-caption">{t('memorizing')}</small><div className="peek-progress" role="progressbar" aria-label={t('memorizing')}><span /></div></>}
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
        {kingId && <div className="royal-callout">{game.playerCount === 5 ? '“Meri Rani Kaun?”' : t('kingCallout')}</div>}
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
        <h3>{(CHANTS[game.language] ?? CHANTS.en)[1]}</h3>
        <p>{t('chantPrompt')}</p>
      </div>
    )
  }

  if (['king-revealed', 'rani-revealed', 'sipahi-revealed', 'reveal-accused', 'reveal-remaining'].includes(game.phase)) {
    const text = game.phase === 'king-revealed' ? (game.playerCount === 5 ? '“Meri Rani Kaun?”' : t('kingCallout'))
      : game.phase === 'rani-revealed' ? t('raniCallout')
        : game.phase === 'sipahi-revealed' ? t(game.playerCount === 5 ? 'sipahiCallout5' : 'sipahiCallout4')
          : accusation
    return <div className="action-card"><p className="eyebrow">{t('royalCall')}</p><h3>{text}</h3></div>
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
              <button type="button" className={`guess-option${game.targetedPlayerId === player.id ? ' selected' : ''}`} key={player.id} aria-pressed={game.targetedPlayerId === player.id} onClick={() => onSelect(player.id)}>
                <span className="row-avatar" style={{ '--seat-color': player.color }}>{player.initials}</span>
                <span>{player.name}</span>
                <ArrowUpRight size={14} />
              </button>
            ))}
          </div>
          <button type="button" className="primary-button" disabled={!game.targetedPlayerId} onClick={() => onGuess(game.targetedPlayerId)}>{t('arrestSuspect')}</button>
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
        <h3>{winner?.name} {game.language === 'en' && winner?.id === currentPlayerId && winner?.name?.toLowerCase() === 'you' ? 'win!' : t('wins')}</h3>
        <p>{winner?.score.toLocaleString()} {t('pointsLabel')} · {t('roundsComplete')}</p>
        {roundScores}
        <button className="secondary-button final-leaderboard" type="button" onClick={onShowLeaderboard}><Trophy size={15} /> {t('leaderboard')}</button>
        <button className="primary-button" type="button" onClick={onRestart}>{t('freshGame')} <RotateCcw size={15} /></button>
      </div>
    )
  }

  return (
    <div className="action-card result-card">
      <p className="eyebrow">{game.guessWasCorrect ? t('correct') : t('wrong')}</p>
      <h3>{game.guessWasCorrect ? t('correct') : t('wrongTitle')}</h3>
      <p>{accusation} {t('rolesRevealed')}</p>
      {roundScores}
      <button className="primary-button" type="button" onClick={onNext}>{t('next')} · {String(game.roundNumber + 1).padStart(2, '0')} <ArrowUpRight size={16} /></button>
    </div>
  )
}

function App() {
  useEffect(() => { prepareSpeechVoices() }, [])
  const settings = useGameStore(useShallow((state) => ({
    nickname: state.nickname,
    avatarColor: state.avatarColor,
    crest: state.crest,
    difficulty: state.difficulty,
    language: state.language,
    theme: state.theme,
    tableStyle: state.tableStyle,
    fontScale: state.fontScale,
    fontStyle: state.fontStyle,
    volume: state.volume,
    ambientMusic: state.ambientMusic,
    musicVolume: state.musicVolume,
    musicTrack: state.musicTrack,
    haptics: state.haptics,
    graphics: state.graphics,
    rounds: state.rounds,
    timer: state.timer,
    characterStyle: state.characterStyle,
    skinTone: state.skinTone,
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
  const [cameraResetKey, setCameraResetKey] = useState(0)
  const [guideOpen, setGuideOpen] = useState(false)
  const [scoreboardOpen, setScoreboardOpen] = useState(false)
  const [readyFontKey, setReadyFontKey] = useState(null)
  const [audioUnavailable, setAudioUnavailable] = useState(false)
  const [roomInfo, setRoomInfo] = useState(null)
  const [localPeerId, setLocalPeerId] = useState(null)
  const [roomStatus, setRoomStatus] = useState('idle')
  const [roomError, setRoomError] = useState('')
  const [emotes, setEmotes] = useState({})
  const [chatMessages, setChatMessages] = useState([])
  const [speechBubbles, setSpeechBubbles] = useState([])
  const [chatOpen, setChatOpen] = useState(false)
  const [botTyping, setBotTyping] = useState(false)
  const [nervousPlayerIds, setNervousPlayerIds] = useState([])
  const [clockTick, setClockTick] = useState(() => Date.now())

  useEffect(() => {
    if (!scoreboardOpen) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setScoreboardOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [scoreboardOpen])
  const audioEngine = useRef(null)
  const seatAnchorRefs = useRef(new Map())
  const managerRef = useRef(null)
  const currentGameRef = useRef(game)
  const dispatchRef = useRef(dispatch)
  const settingsRef = useRef(settings)
  const roomInfoRef = useRef(roomInfo)
  const sequence = useRef(createRoundSequence())
  const voiceGate = useRef(null)
  const voiceAcks = useRef(new Map())
  const mutedRef = useRef(muted)
  const emoteTimers = useRef({})
  const chatBubbleTimers = useRef({})
  const seenChatIds = useRef(new Set())
  const chatOpenRef = useRef(false)
  const botReplyTimer = useRef(null)
  const lastBanterKey = useRef('')
  const autoJoinAttempted = useRef(false)
  const startRoundRef = useRef(() => {})

  useEffect(() => {
    currentGameRef.current = game
    dispatchRef.current = dispatch
    settingsRef.current = settings
    roomInfoRef.current = roomInfo
    mutedRef.current = muted
  }, [game, settings, roomInfo, muted])

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
  const isRemoteClient = settings.mode === 'online' && Boolean(roomInfo) && !roomInfo.isHost
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
  const focusPlayerId = displayGame.phase === 'reveal-accused' ? displayGame.guessedPlayerId
    : displayGame.phase === 'reveal-remaining' ? displayGame.suspectPlayerIds.find((id) => id !== displayGame.guessedPlayerId)
      : ['reveal-king', 'king-revealed'].includes(displayGame.phase)
    ? kingId
    : ['reveal-rani', 'rani-revealed'].includes(displayGame.phase) ? queenId
      : ['reveal-sipahi', 'sipahi-revealed', 'chant', 'guess'].includes(displayGame.phase) ? sipahiId : null
  const revealPlayerId = displayGame.phase === 'private-peek' && !displayGame.privatePeekOpen
    && settings.mode !== 'local' && displayGame.privatePeekQueue?.[0] === currentPlayerId
    ? currentPlayerId : null
  const revealActionType = ({
    'reveal-king': 'REVEAL_KING',
    'reveal-rani': 'REVEAL_RANI',
    'reveal-sipahi': 'REVEAL_SIPAHI',
  })[displayGame.phase]
  const guessablePlayerIds = displayGame.phase === 'guess' && sipahiId === currentPlayerId
    ? displayGame.suspectPlayerIds ?? [ministerId, displayGame.roles?.[ROLE.CHOR]]
    : []
  const activeRevealPlayer = displayGame.phase === 'private-peek' ? displayGame.privatePeekQueue?.[0] : null
  const sipahiIsHuman = displayGame.players.find(({ id }) => id === sipahiId)?.human
  const privacyCurtainNeeded = settings.mode === 'local'
    && displayGame.phase === 'private-peek'
    && displayGame.players.find(({ id }) => id === activeRevealPlayer)?.human
  const displayPlayers = displayGame.players.map((player, index) => {
    const localLobby = settings.mode === 'local' && displayGame.phase === 'lobby'
    const profilePlayer = settings.mode === 'local' ? (localLobby ? index === 0 : player.id === 'local-0') : player.id === currentPlayerId
    const name = localLobby ? settings.localNames[index]?.trim() || `Player ${index + 1}`
      : profilePlayer && settings.mode !== 'local' ? settings.nickname?.trim() || player.name : player.name
    return {
      ...player,
      name,
      initials: name.slice(0, 1).toUpperCase(),
      ...(profilePlayer ? {
        color: settings.avatarColor,
        crest: settings.crest,
        characterStyle: settings.characterStyle,
        skinTone: settings.skinTone,
      } : {}),
    }
  })
  const displayLeaderboard = getLeaderboard(displayPlayers)
  const rankByPlayer = Object.fromEntries(displayLeaderboard.map(({ id, rank }) => [id, rank]))
  const roundTimeLeft = displayGame.investigationStartedAt
    ? Math.min(displayGame.investigationSeconds, Math.max(0, displayGame.investigationSeconds - Math.floor((clockTick - displayGame.investigationStartedAt) / 1000)))
    : displayGame.investigationSeconds
  const seatInfoByPlayerId = Object.fromEntries(displayPlayers.map((player) => {
    const role = getRoleForPlayer(displayGame, player.id)
    return [player.id, {
      role: role ? { ...role, id: rolesByPlayer[player.id], name: translateRole(settings.language, rolesByPlayer[player.id]) } : null,
      hiddenRole: displayGame.phase !== 'lobby' && !role,
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

  const reportAudioError = useCallback((message, error) => {
    console.error(message, error)
    setAudioUnavailable(true)
  }, [])

  const activateAudio = useCallback(async () => {
    try {
      if (!audioEngine.current) audioEngine.current = new SoundEngine()
      const active = await audioEngine.current.activate()
      if (!active) setAudioUnavailable(true)
      else if (settingsRef.current.ambientMusic && !muted) {
        const current = settingsRef.current
        audioEngine.current.startAmbient(current.musicTrack, current.musicVolume, THEMES[current.theme]?.isNight ?? false)
      }
      return active
    } catch (error) {
      reportAudioError('Unable to activate procedural audio.', error)
      return false
    }
  }, [muted, reportAudioError])

  const vibrate = useCallback(() => {
    if (settingsRef.current.haptics && 'vibrate' in navigator) navigator.vibrate(18)
  }, [])

  const playSound = useCallback(async (name) => {
    if (!audioEngine.current || muted) return
    try {
      const active = await audioEngine.current.activate()
      if (active) audioEngine.current.play(name, settingsRef.current.volume)
    } catch (error) {
      reportAudioError('Unable to play the procedural game sound.', error)
    }
  }, [muted, reportAudioError])

  const addChatMessage = useCallback((value) => {
    const message = createChatRecord(value)
    if (!message.text || seenChatIds.current.has(message.id)) return
    seenChatIds.current.add(message.id)
    if (seenChatIds.current.size > 256) {
      seenChatIds.current.delete(seenChatIds.current.values().next().value)
    }
    setChatMessages((current) => [...current.slice(-99), message])
    if (chatOpenRef.current) return
    setSpeechBubbles((current) => [...current.filter(({ playerId }) => playerId !== message.playerId).slice(-3), message])
    window.clearTimeout(chatBubbleTimers.current[message.id])
    chatBubbleTimers.current[message.id] = window.setTimeout(() => {
      setSpeechBubbles((current) => current.filter(({ id }) => id !== message.id))
      delete chatBubbleTimers.current[message.id]
    }, 2500)
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
    if (data.type === 'voice-complete' && senderId && roomInfoRef.current?.isHost) {
      const state = currentGameRef.current
      const key = `${state.sequenceId}:${state.phase}`
      if (data.key !== key || !state.players.some((player) => player.human && player.id === senderId)) return
      const received = voiceAcks.current.get(key) ?? new Set()
      received.add(senderId)
      voiceAcks.current.set(key, received)
      const gate = voiceGate.current
      if (gate?.key === key) {
        gate.pending.delete(senderId)
        if (!gate.pending.size) gate.resolve()
      }
      return
    }
    if (data.type === 'chat' && data.message) {
      addChatMessage(data.message)
      return
    }
    if (data.type === 'game-state') {
      if (data.game.phase === 'lobby') resetChat()
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
      if (data.action?.type === 'OPEN_PRIVATE' && state.phase === 'private-peek' && state.privatePeekQueue[0] === senderId) {
        dispatchRef.current({ type: 'OPEN_PRIVATE', playerId: senderId })
      } else if (data.action?.type === 'GUESS' && state.phase === 'guess' && state.roles?.[ROLE.SIPAHI] === senderId) {
        dispatchRef.current(data.action)
      } else if (data.action?.type === 'SELECT_SUSPECT' && state.phase === 'guess' && state.roles?.[ROLE.SIPAHI] === senderId) {
        dispatchRef.current(data.action)
      } else if (data.action?.type === 'NEXT_ROUND' && state.phase === 'result' && !state.isComplete) {
        startRoundRef.current()
      }
    }
  }, [addChatMessage, resetChat])

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
          const gate = voiceGate.current
          if (gate) {
            for (const id of gate.pending) if (!stillConnected.has(id)) gate.pending.delete(id)
            if (!gate.pending.size) gate.resolve()
          }
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
      const engine = audioEngine.current
      audioEngine.current = null
      if (engine) engine.close()
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
    const phase = displayGame.phase
    const hostMayAutomate = settings.mode !== 'online' || roomInfo?.isHost
    const phaseSequence = sequence.current
    const acknowledgements = voiceAcks.current
    const currentSettings = settingsRef.current
    const calls = {
      'king-revealed': displayPlayerCount === 5 ? 'Meri Rani Kaun?' : 'Mera Sipahi Kaun?',
      'rani-revealed': RANI_CALLS[currentSettings.language] ?? RANI_CALLS.en,
      'sipahi-revealed': displayPlayerCount === 5 ? 'Ji Maharani!' : 'Ji Maharaj!',
      chant: (CHANTS[currentSettings.language] ?? CHANTS.en)[1],
    }
    let active = true
    let speech = null
    if (calls[phase] && !mutedRef.current && currentSettings.volume > 0) {
      try {
        if (phase === 'chant') audioEngine.current?.music?.duck()
        const onVoiceError = (error) => {
          console.error('Unable to speak the royal call:', error)
          if (active && phase === 'chant') audioEngine.current?.playChant(currentSettings.volume, true)
        }
        if (phase === 'rani-revealed') {
          audioEngine.current?.playRaniVoiceChime(currentSettings.volume)
          speech = speakRoleLine({ role: 'RANI', text: calls[phase], lang: currentSettings.language, volume: currentSettings.volume, onError: onVoiceError })
        } else {
          speech = speakPhase(calls[phase], phase === 'chant' ? currentSettings.language : 'en', currentSettings.volume, onVoiceError, ({ 'king-revealed': 'raja', 'sipahi-revealed': 'sipahi' })[phase])
        }
        if (phase === 'rani-revealed' && !speech) {
          console.warn('No matching female voice is available for the Rani.')
          // Surface the browser's missing speech capability.
          // oxlint-disable-next-line react/set-state-in-effect
          setAudioUnavailable(true)
        }
        if (phase === 'chant') audioEngine.current?.playChant(currentSettings.volume, !speech)
      } catch (error) {
        console.error('Unable to start the royal call.', error)
        if (phase === 'chant') audioEngine.current?.playChant(currentSettings.volume, true)
      }
    }
    const key = `${displayGame.sequenceId}:${phase}`
    let remoteSpeech = Promise.resolve()
    if (calls[phase] && settings.mode === 'online') {
      if (roomInfo?.isHost) {
        const received = acknowledgements.get(key) ?? new Set()
        const pending = new Set(currentGameRef.current.players
          .filter((player) => player.human && player.id !== managerRef.current?.localPlayer?.id && !received.has(player.id))
          .map(({ id }) => id))
        if (pending.size) {
          remoteSpeech = new Promise((resolve) => { voiceGate.current = { key, pending, resolve } })
        }
      } else {
        phaseSequence.advancePhaseAfterDelay(0, () => managerRef.current?.send({ type: 'voice-complete', key }), speech ?? Promise.resolve())
      }
    }
    if (hostMayAutomate) {
      const advance = (delay, action, tail = 0) => {
        phaseSequence.advancePhaseAfterDelay(delay, action, Promise.all([speech ?? Promise.resolve(), remoteSpeech]), tail)
      }
      if (phase === 'shuffle') advance(3500, () => dispatch({ type: 'FINISH_SHUFFLE' }))
      else if (phase === 'private-peek' && displayGame.privatePeekOpen) {
        const playerId = activeRevealPlayer
        advance(4000, () => dispatch({ type: 'PEEK_PRIVATE', playerId }))
      } else if (phase === 'reveal-king') advance(0, () => dispatch({ type: 'REVEAL_KING' }))
      else if (phase === 'reveal-rani') advance(0, () => dispatch({ type: 'REVEAL_RANI' }))
      else if (phase === 'reveal-sipahi') advance(0, () => dispatch({ type: 'REVEAL_SIPAHI' }))
      else if (['king-revealed', 'rani-revealed', 'sipahi-revealed', 'reveal-accused'].includes(phase)) {
        advance(4500, () => dispatch({ type: 'ADVANCE_REVEAL' }))
      } else if (phase === 'reveal-remaining') advance(4000, () => dispatch({ type: 'ADVANCE_REVEAL' }))
      else if (phase === 'chant') advance(6000, () => dispatch({ type: 'BEGIN_INVESTIGATION', startedAt: Date.now() }), 1200)
      else if (phase === 'guess') {
        const state = currentGameRef.current
        const sipahi = state.players.find(({ id }) => id === state.roles?.[ROLE.SIPAHI])
        const delay = sipahi?.human ? state.investigationSeconds * 1000 : 10000 + Math.floor(Math.random() * 4001)
        advance(delay, () => {
          const current = currentGameRef.current
          const playerId = sipahi?.human
            ? current.targetedPlayerId ?? current.suspectPlayerIds[Math.floor(Math.random() * current.suspectPlayerIds.length)]
            : chooseBotGuess(current)
          if (playerId) dispatch({ type: 'GUESS', playerId })
        })
      }
    }
    return () => {
      active = false
      phaseSequence.cancelRoundSequence()
      if (voiceGate.current?.key === key) {
        voiceGate.current.resolve()
        voiceGate.current = null
      }
      acknowledgements.delete(key)
      stopChantVoice()
      audioEngine.current?.stopChant()
    }
  }, [displayGame.phase, displayGame.roundNumber, displayGame.sequenceId, displayGame.privatePeekOpen, activeRevealPlayer, displayPlayerCount, sipahiIsHuman, settings.mode, roomInfo?.isHost])

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
    try {
      if (settings.ambientMusic && audioEngine.current && !muted) {
        audioEngine.current.startAmbient(settings.musicTrack, settings.musicVolume, THEMES[settings.theme]?.isNight ?? false)
      } else {
        audioEngine.current?.stopAmbient()
      }
    } catch (error) {
      // Audio graph failures must be surfaced to the player.
      // oxlint-disable-next-line react/set-state-in-effect
      reportAudioError('Unable to update procedural music.', error)
    }
  }, [settings.ambientMusic, settings.musicTrack, settings.musicVolume, settings.theme, muted, reportAudioError])

  useEffect(() => {
    if (displayGame.phase !== 'guess') return undefined
    const interval = window.setInterval(() => setClockTick(Date.now()), 250)
    return () => window.clearInterval(interval)
  }, [displayGame.phase, displayGame.investigationStartedAt])

  useEffect(() => {
    if (displayGame.phase === 'guess' && roundTimeLeft > 0 && roundTimeLeft <= 5
      && displayGame.players.find(({ id }) => id === sipahiId)?.human) {
      const timer = window.setTimeout(() => playSound('tick'), 0)
      return () => window.clearTimeout(timer)
    }
    return undefined
  }, [displayGame.phase, displayGame.players, roundTimeLeft, sipahiId, playSound])

  useEffect(() => {
    if (displayGame.phase !== 'shuffle') return undefined
    const timers = [0, 900, 2450].map((delay) => window.setTimeout(() => playSound('rustle'), delay))
    return () => timers.forEach(window.clearTimeout)
  }, [displayGame.phase, displayGame.roundNumber, playSound])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (displayGame.phase === 'reveal-king') playSound('reveal')
      else if (['king-revealed', 'rani-revealed', 'sipahi-revealed'].includes(displayGame.phase)) playSound('king-call')
      else if (displayGame.phase === 'guess') playSound('scroll')
      else if (displayGame.phase === 'reveal-accused') playSound(displayGame.guessWasCorrect ? 'cage' : 'coins')
    }, 0)
    return () => window.clearTimeout(timer)
  }, [displayGame.phase, displayGame.guessWasCorrect, displayGame.roundNumber, playSound])

  useEffect(() => () => {
    sequence.current.cancelRoundSequence()
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
        crest: index === 0 ? settings.crest : undefined,
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
        characterStyle: player.human ? player.characterStyle : PLAYER_DEFS[index].characterStyle,
        skinTone: player.human ? player.skinTone : PLAYER_DEFS[index].skinTone,
        seat: getPlayerSeat(index, playerCount),
        crest: player.id === localPeerId ? settings.crest : player.crest,
        score: 0,
      }))
    }
    return PLAYER_DEFS.slice(0, playerCount).map((player, index) => ({
      ...player,
      name: player.id === 'you' ? (settings.nickname.trim() || 'You') : player.name,
      initials: player.id === 'you' ? (settings.nickname.trim() || 'You').slice(0, 1).toUpperCase() : player.initials,
      color: player.id === 'you' ? settings.avatarColor : theme.colors[index] ?? player.color,
      seat: getPlayerSeat(index, playerCount),
      crest: player.id === 'you' ? settings.crest : undefined,
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
      investigationSeconds: settings.timer,
      sequenceId: createChatId(),
    })
  }, [
    activateAudio,
    vibrate,
    settings.mode,
    settings.rounds,
    settings.timer,
    settings.difficulty,
    game.phase,
    game.players,
    roomInfo?.isHost,
    makePlayerDefs,
  ])
  useEffect(() => {
    startRoundRef.current = startRound
  }, [startRound])

  const updateLobbySetting = useCallback((key, value) => {
    if (key === 'mode' && value !== settingsRef.current.mode) {
      sequence.current.cancelRoundSequence()
      voiceGate.current?.resolve()
      voiceGate.current = null
      voiceAcks.current.clear()
      stopChantVoice()
      audioEngine.current?.stopChant()
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
    activateAudio()
    resetChat()
    setRoomError('')
    setRoomStatus('connecting')
    try {
      await managerRef.current.createRoom({ name: settings.nickname.trim() || 'Host', color: settings.avatarColor, characterStyle: settings.characterStyle, skinTone: settings.skinTone })
      setRoomStatus('hosting')
    } catch (error) {
      console.error('Unable to create the multiplayer room.', error)
      setRoomStatus('idle')
      setRoomError(error.message || 'Could not create a room. Try again.')
    }
  }, [activateAudio, settings.nickname, settings.avatarColor, settings.characterStyle, settings.skinTone, resetChat])

  const joinRoom = useCallback(async (code) => {
    activateAudio()
    resetChat()
    setRoomError('')
    setRoomStatus('connecting')
    try {
      await managerRef.current.joinRoom(code, { name: settings.nickname.trim() || 'Guest', color: settings.avatarColor, characterStyle: settings.characterStyle, skinTone: settings.skinTone })
      setRoomStatus('connected')
    } catch (error) {
      console.error('Unable to join the multiplayer room.', error)
      setRoomStatus('idle')
      setRoomError(error.message || 'Could not join that room. Check the code.')
    }
  }, [activateAudio, settings.nickname, settings.avatarColor, settings.characterStyle, settings.skinTone, resetChat])

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
    sequence.current.cancelRoundSequence()
    Object.values(emoteTimers.current).forEach(window.clearTimeout)
    emoteTimers.current = {}
    stopChantVoice()
    audioEngine.current?.stopChant()
    if (playerCount !== settings.playerCount) updateSetting('playerCount', playerCount)
    resetChat()
    setScoreboardOpen(false)
    setRemoteGame(null)
    setEmotes({})
    setNervousPlayerIds([])
    lastBanterKey.current = ''
    const leavingRoom = settings.mode === 'online' && !roomInfo?.isHost
    if (leavingRoom) {
      managerRef.current?.close()
      setRoomInfo(null)
      setLocalPeerId(null)
      updateSetting('mode', 'solo')
    } else if (settings.mode === 'online' && roomInfo?.isHost) {
      const freshGame = createGame(makePlayerDefs(playerCount), { mode: settings.mode, roundLimit: settings.rounds })
      managerRef.current?.publishGame({ ...freshGame, language: settings.language })
    }
    dispatch({
      type: 'RESTART',
      players: leavingRoom ? PLAYER_DEFS.slice(0, playerCount) : makePlayerDefs(playerCount),
      mode: leavingRoom ? 'solo' : settings.mode,
      roundLimit: settings.rounds,
      difficulty: settings.difficulty,
    })
  }

  const selectPlayerCount = (playerCount) => {
    if (playerCount === settings.playerCount) return
    if (isRemoteClient || (settings.mode === 'online' && roomInfo?.isHost && roomInfo.players.length > playerCount)) return
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

  const messageGame = {
    ...displayGame,
    chatOpen,
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

  const actionMessage = (
    <ActionMessage
      game={messageGame}
      currentPlayerId={currentPlayerId}
      localPrivacy={settings.mode === 'local'}
      onStart={startRound}
      onReveal={() => submitAction({
        type: displayGame.phase === 'private-peek' ? 'OPEN_PRIVATE' : revealActionType,
        playerId: displayGame.phase === 'private-peek' ? displayGame.privatePeekQueue?.[0] : undefined,
      })}
      onSelect={(playerId) => submitAction({ type: 'SELECT_SUSPECT', playerId })}
      onGuess={(playerId) => submitAction({ type: 'GUESS', playerId })}
      onNext={startRound}
      onRestart={() => restartGame()}
      onShowLeaderboard={() => setScoreboardOpen(true)}
    />
  )

  return (
    <main
      className={`game-shell${displayGame.phase !== 'lobby' ? ' has-action-dock' : ` lobby-mode-${settings.mode}`}${scoreboardOpen ? ' mobile-scoreboard-open' : ''}${chatOpen ? ' chat-open' : ''}`}
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
          <strong>{String(Math.max(1, displayGame.roundNumber)).padStart(2, '0')} / {String(displayGame.phase === 'lobby' ? settings.rounds : displayGame.roundLimit).padStart(2, '0')}</strong>
          <b>{displayPlayerCount}P</b>
        </div>
        <div className="header-actions">
          <button
            className={`icon-button leaderboard-toggle${scoreboardOpen ? ' selected' : ''}`}
            type="button"
            onClick={() => setScoreboardOpen((open) => !open)}
            aria-label={t('leaderboard')}
            aria-expanded={scoreboardOpen}
            aria-controls="leaderboard-dialog"
            title={t('leaderboard')}
          >
            <Trophy size={17} />
          </button>
          <button className="icon-button" type="button" onClick={() => { activateAudio(); if (!muted) { stopChantVoice(); audioEngine.current?.stopChant() } setMuted((value) => !value) }} aria-label={muted ? t('unmute') : t('mute')}>
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <button className="icon-button" type="button" onClick={() => setGuideOpen(true)} aria-label={t('guide')} title={t('guide')}><CircleHelp size={17} /></button>
          <button className="icon-button" type="button" onClick={() => setSettingsOpen(true)} aria-label={t('settings')} title={t('settings')}><Settings size={16} /></button>
          <button className="icon-button restart-button" type="button" onClick={() => restartGame()} aria-label={t('freshGame')} title={t('freshGame')}><RotateCcw size={15} /></button>
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
                fontFamily={chitFontFamily}
                fontsReady={fontsReady}
                roundNumber={displayGame.roundNumber}
                focusPlayerId={focusPlayerId}
                homePlayerId={currentPlayerId ?? displayPlayers.find(({ human }) => human)?.id}
                cameraResetKey={cameraResetKey}
                players={displayPlayers}
                playerCount={displayPlayerCount}
                seatAnchorRefs={seatAnchorRefs}
                rolesByPlayer={rolesByPlayer}
                revealedPlayers={displayGame.revealedPlayers}
                rankByPlayer={rankByPlayer}
                guessWasCorrect={displayGame.guessWasCorrect}
                shuffleActive={displayGame.phase === 'shuffle'}
                themeId={settings.theme}
                tableStyle={settings.tableStyle}
                quality={settings.graphics}
                celebrate={Boolean(displayGame.isComplete)}
                winnerSeat={displayLeaderboard[0]?.seat}
                revealPlayerId={revealPlayerId}
                canGuess={guessablePlayerIds.length > 0}
                guessablePlayerIds={guessablePlayerIds}
                suspectPlayerIds={displayGame.suspectPlayerIds}
                guessedPlayerId={displayGame.guessedPlayerId}
                targetedPlayerId={displayGame.targetedPlayerId}
                roleLabels={{
                  raja: translateRole(settings.language, ROLE.RAJA),
                  rani: translateRole(settings.language, ROLE.RANI),
                  mantri: translateRole(settings.language, ROLE.MANTRI),
                  chor: translateRole(settings.language, ROLE.CHOR),
                  sipahi: translateRole(settings.language, ROLE.SIPAHI),
                }}
                onReveal={() => dispatchOnlineAction({ type: 'OPEN_PRIVATE', playerId: currentPlayerId })}
                onGuess={(playerId) => dispatchOnlineAction({ type: 'SELECT_SUSPECT', playerId })}
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
            <div className="realm-signature">A Realm by Asif</div>
            {displayGame.phase === 'guess' && (
              <div className={`investigation-clock${roundTimeLeft <= 5 ? ' timer-warning' : ''}`} aria-label={`${t('timer')}: ${roundTimeLeft}s`}>
                <span aria-hidden="true">◷</span> {roundTimeLeft}s
              </div>
            )}
            {chatOpen && displayGame.phase !== 'lobby' && <div className={`chat-action-strip${displayGame.phase === 'guess' ? ' below-clock' : ''}`}>{actionMessage}</div>}
          </div>
        </div>

        <aside className="side-panel">
          {!chatOpen && <div className="chat-toast-slot" aria-live="polite">
            {speechBubbles.filter((message) => message.playerId !== currentPlayerId).slice(-1).map((message) => (
              <div className="chat-toast" key={message.id}><strong>{message.playerName}</strong> {message.text}</div>
            ))}
          </div>}
          <ChatDrawer
            messages={chatMessages}
            currentPlayerId={currentPlayerId}
            language={settings.language}
            onSend={sendChatMessage}
            botTyping={botTyping}
            open={chatOpen}
            onOpenChange={(open) => {
              chatOpenRef.current = open
              setChatOpen(open)
              if (open) setSpeechBubbles([])
            }}
            onReaction={triggerEmote}
          />
            {(!chatOpen || displayGame.phase === 'lobby') && <div className="action-message">{actionMessage}</div>}
          {audioUnavailable && <p className="audio-error" role="status">{t('audioUnavailable')}</p>}
        </aside>
      </section>
      <footer className="footer-line"><span>AN OLD INDIAN COURTYARD GAME</span><span>✦ &nbsp; MAY THE WISEST WIN &nbsp; ✦</span><span>EST. SINCE FOREVER</span></footer>

      <Suspense fallback={null}>
        {settingsOpen && <SettingsModal open onClose={() => setSettingsOpen(false)} settings={settings} updateSetting={updateSetting} onPlayerCountChange={selectPlayerCount} playerCountDisabled={isRemoteClient} minimumPlayerCount={settings.mode === 'online' && roomInfo?.isHost ? roomInfo.players.length : 0} onActivateAudio={activateAudio} onResetCamera={() => setCameraResetKey((value) => value + 1)} onModeChange={(mode) => updateLobbySetting('mode', mode)} modeDisabled={displayGame.phase !== 'lobby'} />}
        {guideOpen && <HowToPlay open onClose={() => setGuideOpen(false)} language={settings.language} />}
      </Suspense>
      {scoreboardOpen && (
        <div className="leaderboard-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setScoreboardOpen(false) }}>
          <section id="leaderboard-dialog" className="scoreboard-panel" role="dialog" aria-modal="true" aria-labelledby="leaderboard-title">
            <header className="leaderboard-heading">
              <div><span className="leaderboard-kicker"><Trophy size={15} /> {t('yourCourt')}</span><h2 id="leaderboard-title">{t('leaderboard')}</h2></div>
              <button className="icon-button" type="button" onClick={() => setScoreboardOpen(false)} aria-label={t('close')} autoFocus><X size={17} /></button>
            </header>
            <div className="leaderboard-list">
              {displayLeaderboard.map((player) => (
                <PlayerRow
                  key={player.id}
                  player={player}
                  rank={player.rank}
                  role={getRoleForPlayer(displayGame, player.id)
                    ? { ...getRoleForPlayer(displayGame, player.id), id: rolesByPlayer[player.id], name: translateRole(settings.language, rolesByPlayer[player.id]) }
                    : null}
                  hiddenRole={displayGame.phase !== 'lobby' && !getRoleForPlayer(displayGame, player.id)}
                  language={settings.language}
                />
              ))}
            </div>
          </section>
        </div>
      )}

      <AnimatePresence>
        {privacyCurtainNeeded && (
          <motion.div className="privacy-curtain" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="curtain-card">
              <span className="curtain-crown"><Crown size={22} /></span>
              <p className="eyebrow">{t('privateChit')}</p>
              <h2>{displayGame.privatePeekOpen
                ? translateRole(settings.language, rolesByPlayer[activeRevealPlayer]) ?? 'Your secret role'
                : `${t('passTo')} ${displayGame.players.find(({ id }) => id === activeRevealPlayer)?.name}`}</h2>
              <p>{displayGame.privatePeekOpen ? t('keepRoleSecret') : t('tapToPeek')}</p>
              {displayGame.privatePeekOpen ? <><small className="peek-caption">{t('memorizing')}</small><div className="peek-progress" role="progressbar" aria-label={t('memorizing')}><span /></div></> : <button
                className="primary-button"
                type="button"
                onClick={() => {
                  submitAction({ type: 'OPEN_PRIVATE', playerId: activeRevealPlayer })
                  playSound('rustle')
                }}
              >
                {t('tapToPeek')} <ArrowUpRight size={16} />
              </button>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}

export default App
