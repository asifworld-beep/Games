import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { CanvasTexture, Color, MathUtils, Object3D, SRGBColorSpace, Vector3 } from 'three'
import PlayerTotem from './components/PlayerTotem.jsx'
import { THEMES } from './config/themes.js'

const ROLE_COLORS = {
  raja: '#d8b970',
  rani: '#d99b9d',
  mantri: '#86a58c',
  chor: '#cf8063',
  sipahi: '#8e88ba',
}

const CAMERA_POSES = {
  overview: { position: new Vector3(0, 7.5, 9.5), target: new Vector3(0, 0.4, 0) },
  you: { position: new Vector3(0, 7.2, 11.2), target: new Vector3(0, 0.5, -0.35) },
  mira: { position: new Vector3(-11.2, 7.2, 0), target: new Vector3(0.35, 0.5, 0) },
  kabir: { position: new Vector3(0, 7.2, -11.2), target: new Vector3(0, 0.5, 0.35) },
  asha: { position: new Vector3(11.2, 7.2, 0), target: new Vector3(-0.35, 0.5, 0) },
  northeast: { position: new Vector3(8.2, 7.2, -8.2), target: new Vector3(-0.45, 0.5, 0.45) },
  southeast: { position: new Vector3(8.2, 7.2, 8.2), target: new Vector3(-0.45, 0.5, -0.45) },
  southwest: { position: new Vector3(-8.2, 7.2, 8.2), target: new Vector3(0.45, 0.5, -0.45) },
  northwest: { position: new Vector3(-8.2, 7.2, -8.2), target: new Vector3(0.45, 0.5, 0.45) },
}
const SEAT_POSES = {
  south: CAMERA_POSES.you,
  west: CAMERA_POSES.mira,
  north: CAMERA_POSES.kabir,
  east: CAMERA_POSES.asha,
  northeast: CAMERA_POSES.northeast,
  southeast: CAMERA_POSES.southeast,
  southwest: CAMERA_POSES.southwest,
  northwest: CAMERA_POSES.northwest,
}
const SEAT_POSITIONS = {
  south: [0, 0, 2.7],
  west: [-2.8, 0, 0],
  north: [0, 0, -2.7],
  east: [2.8, 0, 0],
  northeast: [2.99, 0, -0.97],
  southeast: [1.85, 0, 2.55],
  southwest: [-1.85, 0, 2.55],
  northwest: [-2.99, 0, -0.97],
}
const CHIT_POSES = {
  south: { position: [0, 0.94, 1.94], yaw: 0 },
  west: { position: [-1.94, 0.94, 0], yaw: Math.PI / 2 },
  north: { position: [0, 0.94, -1.94], yaw: Math.PI },
  east: { position: [1.94, 0.94, 0], yaw: -Math.PI / 2 },
  northeast: { position: [1.85, 0.94, -0.6], yaw: -Math.PI * 0.7 },
  southeast: { position: [1.15, 0.94, 1.56], yaw: -Math.PI * 0.3 },
  southwest: { position: [-1.15, 0.94, 1.56], yaw: Math.PI * 0.3 },
  northwest: { position: [-1.85, 0.94, -0.6], yaw: Math.PI * 0.7 },
}
const UP = new Vector3(0, 1, 0)

function rankElevation(rank) {
  return ({ 1: 0.38, 2: 0.24, 3: 0.12 })[rank] ?? 0
}

const DUST_POSITIONS = new Float32Array(
  Array.from({ length: 60 }, (_, index) => {
    const angle = index * 2.39996
    const radius = 1.1 + (index % 9) * 0.38
    return [
      Math.cos(angle) * radius,
      0.35 + (index % 7) * 0.28,
      Math.sin(angle) * radius,
    ]
  }).flat(),
)

function Chit({ role, roleLabel, fontFamily, fontsReady, revealed, index, seat, shuffleActive, interactive = false, onClick }) {
  const group = useRef(null)
  const color = useMemo(() => new Color(ROLE_COLORS[role] ?? '#655338'), [role])
  const labelTexture = useMemo(() => {
    if (!revealed || !roleLabel) return null
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 256
    const context = canvas.getContext('2d')
    if (!context) return null
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#4c3824'
    context.font = `bold 68px ${fontsReady ? fontFamily : 'system-ui, sans-serif'}`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(roleLabel, canvas.width / 2, canvas.height / 2)
    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    return texture
  }, [fontFamily, fontsReady, revealed, roleLabel])
  const pose = CHIT_POSES[seat] ?? CHIT_POSES.south

  useEffect(() => () => labelTexture?.dispose(), [labelTexture])

  useFrame(({ clock }, delta) => {
    if (!group.current) return
    const wobble = clock.elapsedTime * 8 + index * Math.PI / 2
    const shuffle = shuffleActive ? 1 : 0
    const targetX = shuffle ? Math.cos(wobble) * 0.92 : pose.position[0]
    const targetZ = shuffle ? Math.sin(wobble) * 0.92 : pose.position[2]
    group.current.position.x = MathUtils.damp(group.current.position.x, targetX, shuffle ? 8 : 5, delta)
    group.current.position.y = MathUtils.damp(
      group.current.position.y,
      0.94 + Math.abs(Math.sin(wobble)) * 0.16 * shuffle,
      8,
      delta,
    )
    group.current.position.z = MathUtils.damp(group.current.position.z, targetZ, shuffle ? 8 : 5, delta)
    group.current.rotation.z = MathUtils.damp(
      group.current.rotation.z,
      Math.sin(wobble) * 0.1 * shuffle,
      8,
      delta,
    )
    group.current.rotation.y = MathUtils.damp(
      group.current.rotation.y,
      shuffle ? wobble : pose.yaw,
      6,
      delta,
    )
    group.current.rotation.x = MathUtils.damp(
      group.current.rotation.x,
      revealed ? 0 : Math.PI,
      7,
      delta,
    )
    group.current.scale.x = MathUtils.damp(group.current.scale.x, revealed ? 1 : 0.9, 8, delta)
    group.current.scale.z = MathUtils.damp(group.current.scale.z, revealed ? 1 : 0.78, 8, delta)
  })

  return (
    <group
      ref={group}
      position={pose.position}
      onClick={interactive ? (event) => {
        event.stopPropagation()
        onClick()
      } : undefined}
      onPointerOver={interactive ? (event) => {
        event.stopPropagation()
        document.body.style.cursor = 'pointer'
      } : undefined}
      onPointerOut={interactive ? () => {
        document.body.style.cursor = ''
      } : undefined}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.46, 0.045, 0.3]} />
        <meshStandardMaterial attach="material-0" color="#59472e" roughness={0.72} />
        <meshStandardMaterial attach="material-1" color="#59472e" roughness={0.72} />
        <meshStandardMaterial attach="material-2" color={color} roughness={0.62} />
        <meshStandardMaterial attach="material-3" color="#2a2a23" roughness={0.82} />
        <meshStandardMaterial attach="material-4" color="#86704b" roughness={0.72} />
        <meshStandardMaterial attach="material-5" color="#86704b" roughness={0.72} />
      </mesh>
      {labelTexture && (
        <mesh position={[0, 0.026, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.4, 0.24]} />
          <meshBasicMaterial map={labelTexture} transparent depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}

function CameraTransition({ phase, focusSeat, cue, playerCount }) {
  const punch = useRef(0)
  const previousCue = useRef('')
  const responsivePosition = useRef(new Vector3())
  const responsiveTarget = useRef(new Vector3())

  useEffect(() => {
    if (cue && cue !== previousCue.current) punch.current = 1
    previousCue.current = cue
  }, [cue])

  useFrame(({ camera, clock, size }, delta) => {
    const position = responsivePosition.current
    const target = responsiveTarget.current
    const shouldFocus = ['reveal-king', 'reveal-rani', 'reveal-sipahi', 'chant', 'guess'].includes(phase)
    const pose = shouldFocus && focusSeat
      ? SEAT_POSES[focusSeat] ?? CAMERA_POSES.overview
      : CAMERA_POSES.overview
    target.copy(pose.target)
    position.copy(pose.position)
    const aspect = size.width / size.height
    const narrowArena = aspect < 0.8
    const wideArena = aspect > 2.4
    const distanceScale = (playerCount === 5 ? 1.08 : 1)
      * (narrowArena ? 1.08 : 1)
      * (wideArena ? 0.85 : 1)
    position.sub(pose.target).multiplyScalar(distanceScale).add(pose.target)
    if (narrowArena) {
      target.y += 0.28
    }
    camera.position.lerp(position, 1 - Math.exp(-delta * 1.65))
    if (punch.current > 0.001) camera.position.lerp(target, punch.current * 0.075)
    camera.position.x += Math.sin(clock.elapsedTime * 42) * punch.current * 0.018
    camera.position.y += Math.cos(clock.elapsedTime * 36) * punch.current * 0.012
    punch.current = MathUtils.damp(punch.current, 0, 4.5, delta)
    camera.lookAt(target)
  })
  return null
}

function SeatAnchorProjector({ players, seatAnchorRefs, phase, rolesByPlayer, revealedPlayers, rankByPlayer }) {
  const position = useMemo(() => new Vector3(), [])

  useFrame(({ camera, size }) => {
    if (!size.width || !size.height) return
    players.forEach((player) => {
      const anchor = seatAnchorRefs.current.get(player.id)
      if (!anchor) return
      const seatPosition = SEAT_POSITIONS[player.seat] ?? SEAT_POSITIONS.south
      const publicRole = phase === 'result' || revealedPlayers.includes(player.id)
        ? rolesByPlayer[player.id]
        : null
      const elevation = (phase === 'result' ? rankElevation(rankByPlayer[player.id]) : 0)
        + (publicRole === 'raja' ? 0.45 : 0)
        + (publicRole === 'rani' ? 0.28 : 0)
      position.set(seatPosition[0], 2.02 + elevation, seatPosition[2]).project(camera)
      const x = (position.x + 1) * 0.5 * size.width
      const y = (1 - position.y) * 0.5 * size.height
      const visible = position.z >= -1 && position.z <= 1
        && Math.abs(position.x) <= 1.12
        && Math.abs(position.y) <= 1.12
      anchor.style.visibility = visible ? 'visible' : 'hidden'
      anchor.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`
    })
  })

  return null
}

function InspectBeam({ from, to }) {
  const beam = useRef(null)
  const start = useMemo(() => new Vector3(), [])
  const end = useMemo(() => new Vector3(), [])
  const direction = useMemo(() => new Vector3(), [])
  const midpoint = useMemo(() => new Vector3(), [])

  useFrame(() => {
    if (!beam.current) return
    start.set(from[0], from[1], from[2])
    end.set(to[0], to[1], to[2])
    direction.subVectors(end, start)
    const length = direction.length()
    midpoint.addVectors(start, end).multiplyScalar(0.5)
    beam.current.position.copy(midpoint)
    beam.current.scale.y = length
    beam.current.quaternion.setFromUnitVectors(UP, direction.normalize())
  })

  return (
    <mesh ref={beam}>
      <cylinderGeometry args={[0.018, 0.018, 1, 8]} />
      <meshBasicMaterial color="#ffd47a" transparent opacity={0.46} depthWrite={false} />
    </mesh>
  )
}

function RoyalSpotlight({ from, to }) {
  const target = useMemo(() => new Object3D(), [])
  return (
    <>
      <primitive object={target} position={[to[0], 1.2, to[2]]} />
      <spotLight
        position={[from[0], 2.8, from[2]]}
        target={target}
        color="#ffd878"
        angle={0.28}
        penumbra={0.7}
        distance={9}
        intensity={11}
      />
    </>
  )
}

function CoinTransfer({ active, from, to }) {
  const coins = useRef([])
  const startedAt = useRef(null)
  useFrame(({ clock }, delta) => {
    if (!active) {
      startedAt.current = null
      coins.current.forEach((coin) => {
        if (coin) coin.visible = false
      })
      return
    }
    if (startedAt.current === null) startedAt.current = clock.elapsedTime
    const elapsed = clock.elapsedTime - startedAt.current
    coins.current.forEach((coin, index) => {
      if (!coin) return
      const progress = (elapsed - index * 0.12) / 1.25
      coin.visible = progress >= 0 && progress <= 1
      if (!coin.visible) return
      const t = MathUtils.clamp(progress, 0, 1)
      const arc = Math.sin(t * Math.PI) * (0.8 + index % 3 * 0.12)
      coin.position.set(
        MathUtils.lerp(from[0], to[0], t) + Math.sin(t * Math.PI * 2 + index) * 0.12,
        MathUtils.lerp(from[1], to[1], t) + arc,
        MathUtils.lerp(from[2], to[2], t) + Math.cos(t * Math.PI * 2 + index) * 0.1,
      )
      coin.rotation.z += delta * (5 + index)
      coin.rotation.x = Math.PI / 2 + Math.sin(t * Math.PI) * 0.4
    })
  })

  return (
    <group>
      {Array.from({ length: 7 }, (_, index) => (
        <mesh key={index} ref={(node) => { coins.current[index] = node }} visible={false}>
          <cylinderGeometry args={[0.075, 0.075, 0.025, 12]} />
          <meshStandardMaterial color="#f0c65e" emissive="#a66b11" emissiveIntensity={0.6} metalness={0.75} roughness={0.23} />
        </mesh>
      ))}
    </group>
  )
}

function VictoryConfetti({ seat, enabled, color }) {
  const burst = useRef(null)
  const origin = useMemo(() => {
    const originBySeat = {
      south: [0, 1, 2.4],
      west: [-2.4, 1, 0],
      north: [0, 1, -2.4],
      east: [2.4, 1, 0],
    }
    return originBySeat[seat] ?? originBySeat.south
  }, [seat])
  const pieces = useMemo(() => Array.from({ length: 28 }, (_, index) => {
    const angle = index * 2.39996
    const radius = 0.28 + (index % 7) * 0.12
    return {
      x: Math.cos(angle) * radius,
      y: (index % 5) * 0.12,
      z: Math.sin(angle) * radius,
      size: 0.045 + (index % 3) * 0.014,
    }
  }), [])

  useFrame(({ clock }, delta) => {
    if (!burst.current) return
    const targetScale = enabled ? 1 : 0
    burst.current.scale.lerp({ x: targetScale, y: targetScale, z: targetScale }, 1 - Math.exp(-delta * 5))
    burst.current.position.y = origin[1] + Math.sin(clock.elapsedTime * 2.4) * 0.1
    burst.current.rotation.y += delta * 0.4
  })

  return (
    <group ref={burst} position={origin} scale={0}>
      {pieces.map((piece, index) => (
        <mesh key={index} position={[piece.x, piece.y, piece.z]} rotation={[index, index * 0.7, index * 0.3]}>
          <icosahedronGeometry args={[piece.size, 0]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.45} roughness={0.4} />
        </mesh>
      ))}
    </group>
  )
}

function FloatingDust({ color, enabled }) {
  const particles = useRef(null)
  useFrame(({ clock }, delta) => {
    if (particles.current && enabled) particles.current.rotation.y += delta * 0.018
    if (particles.current?.material) {
      particles.current.material.opacity = 0.22 + (Math.sin(clock.elapsedTime * 0.8) + 1) * 0.08
    }
  })
  return (
    <points ref={particles}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[DUST_POSITIONS, 3]} />
      </bufferGeometry>
      <pointsMaterial color={color} size={0.045} transparent opacity={0.3} sizeAttenuation />
    </points>
  )
}

function Courtyard({ theme, quality }) {
  const lantern = useRef(null)
  useFrame(({ clock }) => {
    if (lantern.current) lantern.current.intensity = theme.lanternIntensity + Math.sin(clock.elapsedTime * 1.3) * 2
  })

  return (
    <>
      <color attach="background" args={[theme.background]} />
      <fog attach="fog" args={[theme.fog, 9, 20]} />
      <ambientLight intensity={theme.ambient} />
      <directionalLight position={[4, 8, 3]} intensity={theme.directional} castShadow={quality === 'high'} />
      <pointLight ref={lantern} position={[-4, 3, -3]} intensity={theme.lanternIntensity} color={theme.lantern} distance={12} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.22, 0]} receiveShadow>
        <circleGeometry args={[6.3, 64]} />
        <meshStandardMaterial color={theme.ground} roughness={0.94} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
        <ringGeometry args={[4.7, 4.77, 64]} />
        <meshBasicMaterial color={theme.trim} transparent opacity={0.5} />
      </mesh>
      {[-1, 1].flatMap((side) =>
        [-1, 1].map((depth) => (
          <group key={`${side}-${depth}`} position={[side * 4.4, 0, depth * 3.2]}>
            <mesh position={[0, 1, 0]} castShadow>
              <cylinderGeometry args={[0.25, 0.32, 2, 8]} />
              <meshStandardMaterial color={theme.tableTop} roughness={0.86} />
            </mesh>
            <mesh position={[0, 2.08, 0]}>
              <cylinderGeometry args={[0.43, 0.43, 0.18, 8]} />
              <meshStandardMaterial color={theme.table} roughness={0.8} />
            </mesh>
            <mesh position={[0, 2.2, 0]}>
              <sphereGeometry args={[0.2, 8, 8]} />
              <meshStandardMaterial color={theme.trim} metalness={0.4} roughness={0.4} />
            </mesh>
          </group>
        )),
      )}
      <mesh position={[0, 0.44, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.58, 1.7, 0.42, 12]} />
        <meshStandardMaterial color={theme.tableTop} roughness={0.77} />
      </mesh>
      <mesh position={[0, 0.68, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.68, 1.58, 0.16, 12]} />
        <meshStandardMaterial color={theme.table} roughness={0.54} />
      </mesh>
      <mesh position={[0, 0.78, 0]} castShadow>
        <cylinderGeometry args={[1.47, 1.47, 0.05, 12]} />
        <meshStandardMaterial color={theme.tableTop} roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.83, 0]} castShadow>
        <cylinderGeometry args={[0.34, 0.34, 0.06, 8]} />
        <meshStandardMaterial color={theme.trim} metalness={0.35} roughness={0.4} />
      </mesh>
      <FloatingDust color={theme.dust} enabled={quality === 'high'} />
    </>
  )
}

export default function CourtyardScene({
  phase,
  fontFamily = 'system-ui, sans-serif',
  fontsReady = false,
  roundNumber = 0,
  focusPlayerId,
  players,
  seatAnchorRefs,
  playerCount = players.length,
  rolesByPlayer,
  revealedPlayers,
  shuffleActive,
  rankByPlayer = {},
  guessWasCorrect = false,
  themeId = 'sandstone',
  quality = 'high',
  celebrate = false,
  winnerSeat = 'south',
  revealPlayerId = null,
  speechBubbles = [],
  canGuess = false,
  guessablePlayerIds = [],
  roleLabels = {},
  onReveal,
  onGuess,
}) {
  const theme = THEMES[themeId] ?? THEMES.sandstone
  const [hoveredPlayerId, setHoveredPlayerId] = useState(null)
  const cameraCue = phase === 'result'
    ? `result-${roundNumber}-${guessWasCorrect}`
    : ['reveal-king', 'reveal-rani', 'reveal-sipahi', 'chant'].includes(phase) ? `${phase}-${roundNumber}` : ''
  const rajaPlayer = players.find(({ id }) => rolesByPlayer[id] === 'raja')
  const sipahiPlayer = players.find(({ id }) => rolesByPlayer[id] === 'sipahi')
  const hoveredPlayer = players.find(({ id }) => id === hoveredPlayerId)
  const rajaPosition = rajaPlayer ? SEAT_POSITIONS[rajaPlayer.seat] : null
  const steal = phase === 'result' && !guessWasCorrect
  const chorPlayer = players.find(({ id }) => rolesByPlayer[id] === 'chor')
  const sipahiPosition = sipahiPlayer ? SEAT_POSITIONS[sipahiPlayer.seat] : null
  const chorPosition = chorPlayer ? SEAT_POSITIONS[chorPlayer.seat] : null
  const coinStart = sipahiPosition
    ? [sipahiPosition[0], 1.3 + rankElevation(rankByPlayer[sipahiPlayer.id]), sipahiPosition[2]]
    : [0, 1, 0]
  const coinEnd = chorPosition
    ? [chorPosition[0], 1.4 + rankElevation(rankByPlayer[chorPlayer.id]), chorPosition[2]]
    : [0, 1, 0]

  return (
    <Canvas
      shadows={quality === 'high' ? 'percentage' : false}
      dpr={quality === 'high' ? [1, 1.5] : [0.65, 1]}
      camera={{ position: [0, 7.5, 9.5], fov: 46 }}
      gl={{ antialias: true, alpha: false }}
    >
      <CameraTransition
        phase={phase}
        focusSeat={players.find(({ id }) => id === focusPlayerId)?.seat}
        cue={cameraCue}
        playerCount={playerCount}
      />
      <SeatAnchorProjector
        players={players}
        seatAnchorRefs={seatAnchorRefs}
        phase={phase}
        rolesByPlayer={rolesByPlayer}
        revealedPlayers={revealedPlayers}
        rankByPlayer={rankByPlayer}
      />
      <Courtyard theme={theme} quality={quality} />
      {players.map((player) => {
        const seatPosition = SEAT_POSITIONS[player.seat] ?? SEAT_POSITIONS.south
        const height = player.seat === 'west' ? 0.88 : player.seat === 'north' ? 1.04 : player.seat === 'east' ? 0.93 : 1
        const publiclyRevealed = phase === 'result' || revealedPlayers.includes(player.id)
        const role = publiclyRevealed ? rolesByPlayer[player.id] : null
        const rank = rankByPlayer[player.id]
        const rankLift = phase === 'result' ? rankElevation(rank) : 0
        const kingLift = role === 'raja' && publiclyRevealed ? 0.45 : 0
        const queenLift = role === 'rani' && publiclyRevealed ? 0.28 : 0
        const elevation = rankLift + kingLift + queenLift
        const bubble = speechBubbles.find(({ playerId }) => playerId === player.id)
        const outcome = phase === 'result' && role === 'chor'
          ? guessWasCorrect ? 'caught' : 'escaped'
          : null
        const interactive = canGuess && guessablePlayerIds.includes(player.id)
        return (
          <group key={player.id} position={seatPosition}>
            <PlayerTotem
              key={`${player.id}-${roundNumber}`}
              position={[0, 0, 0]}
              color={player.color}
              height={height}
              role={role}
              revealed={publiclyRevealed}
              elevation={elevation}
              phase={phase}
              outcome={outcome}
              outcomeKey={phase === 'result' ? `${roundNumber}-${guessWasCorrect}` : ''}
              interactive={interactive}
              onClick={() => onGuess?.(player.id)}
              onInspect={(id) => setHoveredPlayerId(id === player.id ? player.id : null)}
            />
            {bubble && (
              <Html position={[0, 2.35 + elevation, 0]} center transform={false} zIndexRange={[8, 0]}>
                <div key={bubble.id} className="speech-bubble">{bubble.text}</div>
              </Html>
            )}
          </group>
        )
      })}
      {players.map((player, index) => {
        const role = rolesByPlayer[player.id]
        const revealed = phase === 'result' || revealedPlayers.includes(player.id)
        return (
          <Chit
            key={player.id}
            role={revealed ? role : null}
            roleLabel={revealed ? roleLabels[role] : null}
            fontFamily={fontFamily}
            fontsReady={fontsReady}
            revealed={revealed}
            index={index}
            seat={player.seat}
            shuffleActive={shuffleActive}
            interactive={player.id === revealPlayerId}
            onClick={onReveal}
          />
        )
      })}
      {phase === 'guess' && sipahiPosition && hoveredPlayer && (
        <InspectBeam
          from={[sipahiPosition[0], 1.65, sipahiPosition[2]]}
          to={[SEAT_POSITIONS[hoveredPlayer.seat][0], 1.2, SEAT_POSITIONS[hoveredPlayer.seat][2]]}
        />
      )}
      {phase === 'chant' && rajaPosition && sipahiPosition && (
        <RoyalSpotlight
          from={rajaPosition}
          to={[sipahiPosition[0], 1.2, sipahiPosition[2]]}
        />
      )}
      <CoinTransfer active={steal} from={coinStart} to={coinEnd} />
      <VictoryConfetti seat={winnerSeat} enabled={celebrate} color={theme.dust} />
      {quality === 'high' && (
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.38} luminanceThreshold={0.82} luminanceSmoothing={0.24} />
          <Vignette eskil={false} offset={0.18} darkness={0.55} />
        </EffectComposer>
      )}
    </Canvas>
  )
}
