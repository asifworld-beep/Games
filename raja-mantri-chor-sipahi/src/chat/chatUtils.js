const PROFANITY = [
  'fuck', 'fucker', 'fucking', 'shit', 'shitty', 'bitch', 'bastard', 'asshole',
  'madarchod', 'bhenchod', 'behenchod', 'chutiya', 'gaanduu', 'gandu',
  'मादरचोद', 'भेनचोद', 'बहनचोद', 'चूतिया',
]

const CHAT_LIMIT = 240

export function filterChatText(value) {
  if (typeof value !== 'string') return ''
  const text = value.replace(/\s+/g, ' ').trim().slice(0, CHAT_LIMIT)
  if (!text) return ''

  const words = PROFANITY.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])(${words})(?=$|[^\\p{L}\\p{N}])`, 'giu')
  return text.replace(pattern, '$1•••')
}

export function createChatId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function createChatRecord({
  id,
  playerId,
  playerName,
  avatarColor,
  text,
  createdAt,
}) {
  const safeId = typeof id === 'string' && /^[a-z\d:_-]{1,96}$/i.test(id) ? id : createChatId()
  const safePlayerId = typeof playerId === 'string' ? playerId.slice(0, 96) : 'unknown'
  const safeName = typeof playerName === 'string' ? playerName.trim().slice(0, 32) : 'Player'
  const safeColor = typeof avatarColor === 'string' && /^#[\da-f]{6}$/i.test(avatarColor)
    ? avatarColor
    : '#e8b85b'

  return {
    id: safeId,
    playerId: safePlayerId,
    playerName: safeName || 'Player',
    avatarColor: safeColor,
    text: filterChatText(text),
    createdAt: Number.isFinite(createdAt) && Math.abs(createdAt) <= 8.64e15 ? createdAt : Date.now(),
  }
}
