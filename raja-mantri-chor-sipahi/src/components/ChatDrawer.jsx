import { useEffect, useRef, useState } from 'react'
import { MessageCircle, Send, Volume2, VolumeX, X } from 'lucide-react'
import { getChatCopy } from '../i18n/chatTranslations.js'
import { getDirection, translate } from '../i18n/translations.js'
import { filterChatText } from '../chat/chatUtils.js'

export default function ChatDrawer({
  messages,
  currentPlayerId,
  language,
  muted,
  onToggleMute,
  onSend,
  botTyping,
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [unread, setUnread] = useState(0)
  const [cooldownLeft, setCooldownLeft] = useState(0)
  const lastSeenMessageId = useRef(messages.at(-1)?.id)
  const cooldownUntil = useRef(0)
  const messageList = useRef(null)
  const copy = getChatCopy(language)
  const direction = getDirection(language)
  const closeLabel = translate(language, 'close')

  useEffect(() => {
    const latestMessageId = messages.at(-1)?.id
    if (open || (lastSeenMessageId.current && !messages.some(({ id }) => id === lastSeenMessageId.current))) {
      lastSeenMessageId.current = latestMessageId
      setUnread(0)
      return
    }
    if (!muted && latestMessageId && latestMessageId !== lastSeenMessageId.current) {
      const previousIndex = messages.findIndex(({ id }) => id === lastSeenMessageId.current)
      setUnread((count) => count + (previousIndex < 0 ? 1 : messages.length - previousIndex - 1))
    }
    lastSeenMessageId.current = latestMessageId
  }, [messages, muted, open])

  useEffect(() => {
    if (messageList.current) messageList.current.scrollTop = messageList.current.scrollHeight
  }, [messages.length, open, botTyping])

  useEffect(() => {
    if (!cooldownLeft) return undefined
    const timer = window.setTimeout(() => {
      const remaining = Math.max(0, cooldownUntil.current - Date.now())
      setCooldownLeft(remaining)
    }, Math.min(100, cooldownLeft))
    return () => window.clearTimeout(timer)
  }, [cooldownLeft])

  const sendMessage = (value) => {
    if (Date.now() < cooldownUntil.current) return
    const text = filterChatText(value)
    if (!text) return
    onSend(text)
    setDraft('')
    cooldownUntil.current = Date.now() + 1500
    setCooldownLeft(1500)
  }

  return (
    <div className={`chat-drawer${open ? ' is-open' : ''}${unread && !muted ? ' has-unread' : ''}`} dir={direction}>
      {open && (
        <section className="chat-panel" aria-label={copy.title}>
          <header className="chat-header">
            <div className="chat-title">
              <MessageCircle size={16} />
              <strong>{copy.title}</strong>
              {muted && <span className="chat-muted-status">{copy.muted}</span>}
            </div>
            <div className="chat-header-actions">
              <button
                type="button"
                className="chat-icon-button"
                aria-label={muted ? copy.unmute : copy.mute}
                title={muted ? copy.unmute : copy.mute}
                onClick={onToggleMute}
              >
                {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
              <button type="button" className="chat-icon-button" aria-label={closeLabel} onClick={() => setOpen(false)}>
                <X size={15} />
              </button>
            </div>
          </header>

          <div className="chat-messages" ref={messageList} role="log" aria-live="polite" aria-relevant="additions text">
            {messages.length === 0 && <p className="chat-empty">{copy.empty}</p>}
            {messages.slice(-40).map((message) => (
              <article
                key={message.id}
                className={`chat-message${message.playerId === currentPlayerId ? ' is-mine' : ''}`}
              >
                <span className="chat-avatar" style={{ '--chat-avatar': message.avatarColor }}>
                  {message.playerName.slice(0, 1).toUpperCase()}
                </span>
                <div className="chat-message-body">
                  <div className="chat-message-meta">
                    <strong>{message.playerName}</strong>
                    <time dateTime={new Date(message.createdAt).toISOString()}>
                      {new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </time>
                  </div>
                  <p>{message.text}</p>
                </div>
              </article>
            ))}
            {botTyping && <p className="chat-typing"><span className="typing-dots"><i /><i /><i /></span>{copy.typing}</p>}
          </div>

          <div className="chat-composer">
            <p className="chat-quick-label">{copy.quickTitle}</p>
            <div className="chat-quick-chips" aria-label={copy.quickTitle}>
              {copy.quick.map((text) => (
                <button key={text} type="button" onClick={() => sendMessage(text)} disabled={cooldownLeft > 0}>
                  {text}
                </button>
              ))}
            </div>
            <form
              className="chat-input-row"
              onSubmit={(event) => {
                event.preventDefault()
                sendMessage(draft)
              }}
            >
              <input
                value={draft}
                maxLength={240}
                placeholder={copy.placeholder}
                aria-label={copy.placeholder}
                onChange={(event) => setDraft(event.target.value)}
              />
              <button type="submit" aria-label={copy.send} title={copy.send} disabled={!filterChatText(draft) || cooldownLeft > 0}>
                <Send size={15} />
              </button>
            </form>
          </div>
        </section>
      )}

      <button
        type="button"
        className="chat-toggle"
        aria-label={open ? closeLabel : copy.title}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <MessageCircle size={19} />
        {unread > 0 && !muted && <span className="chat-unread-badge">{unread > 99 ? '99+' : unread}</span>}
      </button>
    </div>
  )
}
