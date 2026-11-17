import { useState } from 'react'
import { Bot, Copy, Crown, Link } from 'lucide-react'
import { translate } from '../i18n/translations.js'
import ModeSelector from './ModeSelector.jsx'

export default function LobbyPanel({
  settings,
  updateSetting,
  onStart,
  roomInfo,
  roomStatus,
  roomError,
  onCreateRoom,
  onJoinRoom,
  onFillBots,
  canStartOnline,
  isRemoteClient,
}) {
  const [roomCodeInput, setRoomCodeInput] = useState('')
  const [copied, setCopied] = useState(false)
  const t = (key) => translate(settings.language, key)
  const setName = (index, value) => updateSetting('localNames', Array.from({ length: 5 }, (_, current) => (
    current === index ? value : settings.localNames[current] ?? `Player ${current + 1}`
  )))
  const playerCount = settings.playerCount === 5 ? 5 : 4

  const copyRoomLink = async () => {
    const url = new URL(window.location.href)
    url.searchParams.set('room', roomInfo.roomCode)
    try {
      await navigator.clipboard.writeText(url.toString())
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch (error) {
      console.error('Unable to copy the room invite link.', error)
    }
  }

  return (
    <div className="lobby-setup">
      <p className="eyebrow">{t('selectMode')}</p>
      {settings.mode === 'solo' && (
        <div className="mode-description">
          <span className="mode-icon"><Bot size={17} /></span>
          <p>{t('soloDescription')}</p>
        </div>
      )}

      {settings.mode === 'local' && (
        <div className="local-player-fields" role="group" aria-label={t('players')}>
          {Array.from({ length: playerCount }, (_, index) => settings.localNames[index] ?? `Player ${index + 1}`).map((name, index) => (
            <label key={index} className="field-with-seat">
              <span>{index + 1}</span>
              <input
                className="text-input"
                maxLength={18}
                aria-label={`${t('enterName')} ${index + 1}`}
                value={name}
                onChange={(event) => setName(index, event.target.value)}
              />
            </label>
          ))}
        </div>
      )}

      {settings.mode === 'online' && (
        <div className="online-room-panel">
          <p className="online-notice">{t('onlineNotice')}</p>
          {!roomInfo && !isRemoteClient && (
            <>
              <button className="secondary-button" type="button" onClick={onCreateRoom}><Link size={15} /> {t('createRoom')}</button>
              <div className="join-room-row">
                <input
                  className="text-input"
                  aria-label={t('roomCode')}
                  placeholder={t('roomCode')}
                  maxLength={6}
                  value={roomCodeInput}
                  onChange={(event) => setRoomCodeInput(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                />
                <button className="secondary-button" type="button" disabled={roomCodeInput.length !== 6} onClick={() => onJoinRoom(roomCodeInput)}>{t('joinRoom')}</button>
              </div>
            </>
          )}
          {roomInfo && (
            <div className="room-details">
              <div className="room-code-header"><span>{t('roomCode')}</span><strong>{roomInfo.roomCode}</strong></div>
              <button type="button" className="secondary-button" onClick={copyRoomLink}><Copy size={14} /> {copied ? t('copied') : t('copyLink')}</button>
              <div className="room-player-list">
                {roomInfo.players.map((player) => (
                  <span key={player.id} className="room-player"><i />{player.name}{player.id === roomInfo.roomCode && <small>{t('host')}</small>}</span>
                ))}
                {Array.from({ length: Math.max(0, playerCount - roomInfo.players.length) }, (_, index) => (
                  <span key={`empty-${index}`} className="room-player empty"><i />{t('waiting')}</span>
                ))}
              </div>
              {roomInfo.isHost && roomInfo.players.length < playerCount && (
                <button className="quiet-button fill-bots-button" type="button" onClick={onFillBots}><Bot size={14} /> {t('fillBots')}</button>
              )}
            </div>
          )}
          {roomError && <p className="form-error" role="alert">{roomError}</p>}
          {roomStatus === 'connecting' && <p className="connection-status">{t('waiting')}</p>}
          {roomInfo && !roomInfo.isHost && <p className="connection-status">{t('waiting')}</p>}
          {roomStatus === 'disconnected' && <p className="form-error" role="alert">{t('connectionLost')}</p>}
        </div>
      )}

      {isRemoteClient && <p className="privacy-caption">{t('hostWillStart')}</p>}
      <div className="lobby-controls">
        <ModeSelector mode={settings.mode} language={settings.language} onChange={(mode) => updateSetting('mode', mode)} popover />
        {(settings.mode !== 'online' || canStartOnline) && (
          <button className="primary-button lobby-start" type="button" onClick={onStart}>{t('gather')} <Crown size={15} /></button>
        )}
      </div>
    </div>
  )
}
