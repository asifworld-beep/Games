import Peer from 'peerjs'
import { createChatId, createChatRecord } from '../chat/chatUtils.js'
import { INVESTIGATOR_ROLE, SUSPECT_ROLES } from '../game.js'

const ROOM_PREFIX = 'rmcs-'

function safePlayerIdentity(player, id) {
  const name = typeof player?.name === 'string' ? player.name.trim().slice(0, 32) : ''
  const color = typeof player?.color === 'string' && /^#[\da-f]{6}$/i.test(player.color)
    ? player.color
    : '#e8b85b'
  const characterStyle = ['prince', 'princess', 'scholar', 'guard', 'trickster'].includes(player?.characterStyle)
    ? player.characterStyle : 'prince'
  const skinTone = typeof player?.skinTone === 'string' && /^#[\da-f]{6}$/i.test(player.skinTone)
    ? player.skinTone : '#bd805e'
  return { id, name: name || 'Player', color, characterStyle, skinTone, human: true }
}

export class MultiplayerManager {
  constructor({ onRoomUpdate = () => {}, onMessage = () => {}, onStatus = () => {} } = {}) {
    this.onRoomUpdate = onRoomUpdate
    this.onMessage = onMessage
    this.onStatus = onStatus
    this.connections = new Map()
    this.lastChatAt = new Map()
    this.players = []
    this.peer = null
    this.roomCode = null
    this.isHost = false
    this.localPlayer = null
    this.closed = false
    this.maxPlayers = 4
  }

  setMaxPlayers(count) {
    this.maxPlayers = count === 5 ? 5 : 4
    if (this.isHost && this.roomCode) {
      this.broadcast({ type: 'room', roomCode: this.roomCode, players: this.players, playerCount: this.maxPlayers })
      this.notifyRoom()
    }
  }

  async createRoom(player) {
    await this.close()
    this.closed = false
    this.roomCode = Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, '0')
    this.isHost = true
    this.localPlayer = safePlayerIdentity(player, this.roomCode)
    this.players = [this.localPlayer]
    this.peer = new Peer(`${ROOM_PREFIX}${this.roomCode.toLowerCase()}`)
    this.peer.on('connection', (connection) => this.acceptConnection(connection))
    await this.waitForOpen(this.peer)
    this.notifyRoom()
    this.onStatus('hosting')
    return this.roomCode
  }

  async joinRoom(code, player) {
    await this.close()
    this.closed = false
    this.roomCode = code.toUpperCase()
    this.isHost = false
    this.peer = new Peer()
    await this.waitForOpen(this.peer)
    const connection = this.peer.connect(`${ROOM_PREFIX}${this.roomCode.toLowerCase()}`, { reliable: true })
    await this.waitForConnection(connection)
    this.bindConnection(connection, false)
    this.connections.set('host', connection)
    this.localPlayer = safePlayerIdentity(player, this.peer.id)
    connection.send({ type: 'join', player: this.localPlayer })
    this.onStatus('connected')
    return this.roomCode
  }

  waitForOpen(peer) {
    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('PeerJS connection timed out. Check your internet connection.')), 12000)
      peer.once('open', () => {
        window.clearTimeout(timeout)
        resolve()
      })
      peer.once('error', (error) => {
        window.clearTimeout(timeout)
        reject(error)
      })
    })
  }

  waitForConnection(connection) {
    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('Could not connect to that room. Check the code and try again.')), 12000)
      connection.once('open', () => {
        window.clearTimeout(timeout)
        resolve()
      })
      connection.once('error', (error) => {
        window.clearTimeout(timeout)
        reject(error)
      })
    })
  }

  acceptConnection(connection) {
    connection.once('open', () => {
      this.bindConnection(connection, true)
      connection.send({
        type: 'room',
        roomCode: this.roomCode,
        players: this.players,
        playerCount: this.maxPlayers,
      })
    })
  }

  bindConnection(connection, hostSide) {
    connection.on('data', (data) => {
      if (!data || typeof data !== 'object') return
      if (hostSide && data.type === 'join') {
        if (this.players.length < this.maxPlayers && !this.players.some(({ id }) => id === connection.peer)) {
          this.players = [...this.players, safePlayerIdentity(data.player, connection.peer)]
        }
        this.broadcast({ type: 'room', roomCode: this.roomCode, players: this.players, playerCount: this.maxPlayers })
        this.notifyRoom()
        return
      }
      if (hostSide && data.type === 'chat') {
        const sender = this.players.find(({ id, human }) => id === connection.peer && human !== false)
        if (!sender) return
        const now = Date.now()
        const previousMessageAt = this.lastChatAt.get(sender.id)
        if (previousMessageAt !== undefined && now - previousMessageAt < 1500) return
        const message = createChatRecord({
          id: createChatId(),
          playerId: sender.id,
          playerName: sender.name,
          avatarColor: sender.color,
          text: data.message?.text,
          createdAt: now,
        })
        if (!message.text) return
        this.lastChatAt.set(sender.id, now)
        const safeMessage = { type: 'chat', message }
        this.broadcast(safeMessage, connection.peer)
        this.onMessage(safeMessage, connection.peer)
        return
      }
      if (hostSide && data.type === 'leave') {
        this.players = this.players.filter(({ id }) => id !== connection.peer)
        this.connections.delete(connection.peer)
        this.broadcast({ type: 'room', roomCode: this.roomCode, players: this.players, playerCount: this.maxPlayers })
        this.notifyRoom()
        return
      }
      if (!hostSide && data.type === 'room') {
        this.roomCode = data.roomCode
        this.players = data.players ?? []
        this.setMaxPlayers(data.playerCount)
        this.notifyRoom()
        return
      }
      if (hostSide) this.broadcast(data, connection.peer)
      this.onMessage(data, connection.peer)
    })
    connection.on('close', () => {
      this.connections.delete(connection.peer)
      if (hostSide) {
        this.players = this.players.filter(({ id }) => id !== connection.peer)
        this.broadcast({ type: 'room', roomCode: this.roomCode, players: this.players, playerCount: this.maxPlayers })
        this.notifyRoom()
      } else {
        this.onStatus('disconnected')
      }
    })
    connection.on('error', (error) => {
      console.error('Multiplayer data connection failed.', error)
      this.connections.delete(connection.peer)
      if (hostSide) {
        this.players = this.players.filter(({ id }) => id !== connection.peer)
        this.broadcast({ type: 'room', roomCode: this.roomCode, players: this.players, playerCount: this.maxPlayers })
        this.notifyRoom()
      } else {
        this.onStatus('disconnected')
      }
    })
    this.connections.set(connection.peer, connection)
  }

  send(message) {
    if (this.isHost) {
      this.broadcast(message)
      this.onMessage(message)
    } else {
      this.connections.get('host')?.send(message)
    }
  }

  sendTo(peerId, message) {
    if (peerId === this.localPlayer?.id) {
      this.onMessage(message, peerId)
      return
    }
    const connection = this.connections.get(peerId)
    if (connection?.open) connection.send(message)
  }

  publishGame(game) {
    if (!this.isHost) return
    for (const player of this.players) {
      if (player.id === this.localPlayer?.id || !player.human) continue
      const privateRole = Object.keys(game.roles ?? {}).find((role) => game.roles[role] === player.id)
      const safeRoles = Object.fromEntries(
        Object.entries(game.roles ?? {}).filter(([role, playerId]) => (
          game.phase === 'result' || game.revealedPlayers.includes(playerId) || role === privateRole
        )),
      )
      this.sendTo(player.id, {
        type: 'game-state',
        game: {
          ...game,
          roles: safeRoles,
          investigatorRole: INVESTIGATOR_ROLE,
          suspectRoles: [...SUSPECT_ROLES],
        },
        actorId: player.id,
      })
    }
  }

  broadcast(message, exceptPeerId = null) {
    for (const [peerId, connection] of this.connections) {
      if (peerId !== exceptPeerId && connection.open) connection.send(message)
    }
  }

  addBots(count = this.maxPlayers) {
    this.setMaxPlayers(count)
    while (this.players.length < this.maxPlayers) {
      const index = this.players.length + 1
      this.players.push({ id: `bot-${index}`, name: `Palace Bot ${index}`, human: false })
    }
    this.broadcast({ type: 'room', roomCode: this.roomCode, players: this.players, playerCount: this.maxPlayers })
    this.notifyRoom()
  }

  notifyRoom() {
    this.onRoomUpdate({
      roomCode: this.roomCode,
      players: [...this.players],
      isHost: this.isHost,
      playerCount: this.maxPlayers,
    })
  }

  async close() {
    if (this.closed) return
    this.closed = true
    for (const connection of this.connections.values()) connection.close()
    this.connections.clear()
    if (this.peer && !this.peer.destroyed) this.peer.destroy()
    this.peer = null
    this.players = []
    this.lastChatAt.clear()
    this.roomCode = null
    this.onStatus('closed')
  }
}
