import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { BoxGeometry, CanvasTexture, Color, CylinderGeometry, MathUtils, MeshStandardMaterial, Object3D, SphereGeometry, SRGBColorSpace, TorusGeometry, TOUCH, Vector3 } from 'three'
import PlayerTotem from './components/PlayerTotem.jsx'
import { Mashal, RoyalTable, SightlineGroup, WorldBackdrop } from './components/RoyalWorld.jsx'
import NatureWorld from './components/NatureWorld.jsx'
import { THEMES } from './config/themes.js'
import { getDealerIndex, getTossPose } from './chitAnimation.js'
import { getNameplatePosition } from './seatLayout.js'

const ROLE_COLORS = {
  raja: '#d8b970',
  rani: '#d99b9d',
  mantri: '#86a58c',
  chor: '#cf8063',
  sipahi: '#8e88ba',
}

const CAMERA_POSES = {
  overview: { position: new Vector3(3.2, 8.3, 8.4), target: new Vector3(0, 0.35, 0) },
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
  south: { position: [0, 0.84, 1.22], yaw: 0 },
  west: { position: [-1.22, 0.84, 0], yaw: Math.PI / 2 },
  north: { position: [0, 0.84, -1.22], yaw: Math.PI },
  east: { position: [1.22, 0.84, 0], yaw: -Math.PI / 2 },
  northeast: { position: [1.17, 0.84, -0.38], yaw: -Math.PI * 0.7 },
  southeast: { position: [0.72, 0.84, 0.98], yaw: -Math.PI * 0.3 },
  southwest: { position: [-0.72, 0.84, 0.98], yaw: Math.PI * 0.3 },
  northwest: { position: [-1.17, 0.84, -0.38], yaw: Math.PI * 0.7 },
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

function Chit({ role, roleLabel, fontFamily, fontsReady, revealed, index, seat, dealerPosition, shuffleActive, interactive = false, onClick }) {
  const group = useRef(null)
  const shuffleStart = useRef(null)
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
    if (shuffleActive && shuffleStart.current === null) shuffleStart.current = clock.elapsedTime
    if (!shuffleActive) shuffleStart.current = null
    if (shuffleActive) {
      const toss = getTossPose(clock.elapsedTime - shuffleStart.current, index, dealerPosition, pose.position, pose.yaw)
      group.current.position.set(...toss.position)
      group.current.rotation.set(...toss.rotation)
    } else {
      group.current.position.x = MathUtils.damp(group.current.position.x, pose.position[0], 5, delta)
      group.current.position.y = MathUtils.damp(group.current.position.y, pose.position[1], 8, delta)
      group.current.position.z = MathUtils.damp(group.current.position.z, pose.position[2], 5, delta)
      group.current.rotation.x = MathUtils.damp(group.current.rotation.x, revealed ? 0 : Math.PI, 7, delta)
      group.current.rotation.y = MathUtils.damp(group.current.rotation.y, pose.yaw, 6, delta)
      group.current.rotation.z = MathUtils.damp(group.current.rotation.z, 0, 8, delta)
    }
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

function CameraTransition({ phase, focusSeat, homeSeat, playerCount, resetKey }) {
  const responsivePosition = useRef(new Vector3())
  const responsiveTarget = useRef(new Vector3())
  const controls = useRef(null)
  const manual = useRef(false)
  const framing = useRef(true)
  const [interacting, setInteracting] = useState(false)
  const [settledResetKey, setSettledResetKey] = useState(0)
  const resetFocus = useRef(false)
  const interactionTimer = useRef(null)
  const spinning = phase === 'lobby' && !interacting && resetKey === settledResetKey

  useEffect(() => { manual.current = false; framing.current = true; resetFocus.current = false }, [phase, focusSeat, playerCount])
  useEffect(() => () => window.clearTimeout(interactionTimer.current), [])
  useEffect(() => {
    if (!resetKey) return undefined
    manual.current = false
    framing.current = true
    resetFocus.current = true
    const timer = window.setTimeout(() => setSettledResetKey(resetKey), 3000)
    return () => window.clearTimeout(timer)
  }, [resetKey])

  useFrame(({ camera, size }, delta) => {
    const aspect = size.width / size.height
    const fov = aspect < 0.8 ? Math.min(72, 38 + (0.8 - aspect) * 110) : 38
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }
    if (manual.current) {
      if (controls.current) controls.current.autoRotate = spinning
      return
    }
    if (controls.current) controls.current.autoRotate = false
    const position = responsivePosition.current
    const target = responsiveTarget.current
    const pose = resetFocus.current && homeSeat
      ? SEAT_POSES[homeSeat] ?? CAMERA_POSES.overview
      : CAMERA_POSES.overview
    target.set(0, 0.35, 0)
    position.copy(CAMERA_POSES.overview.position)
    if (pose !== CAMERA_POSES.overview) {
      const direction = Math.atan2(pose.position.x, pose.position.z)
      position.applyAxisAngle(UP, direction)
    }
    const narrowArena = aspect < 0.8
    const wideArena = aspect > 2.4
    const distanceScale = (playerCount === 5 ? 1.08 : 1)
      * (narrowArena ? Math.max(1.08, 0.82 / aspect) : 1)
      * (wideArena ? 0.85 : 1)
    position.sub(target).multiplyScalar(distanceScale).clampLength(6, 14.5).add(target)
    camera.position.lerp(position, 1 - Math.exp(-delta * 1.65))
    camera.lookAt(target)
    if (controls.current) controls.current.target.copy(target)
    if (spinning && framing.current && camera.position.distanceTo(position) < 0.06) {
      framing.current = false
      manual.current = true
    }
  })
  return (
    <OrbitControls
      ref={controls}
      enableRotate
      enableZoom
      enablePan={false}
      target={[0, 0.35, 0]}
      touches={{ ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_ROTATE }}
      enableDamping
      dampingFactor={0.06}
      autoRotate={false}
      autoRotateSpeed={0.4}
      minDistance={6}
      maxDistance={14.5}
      minPolarAngle={Math.PI / 6}
      maxPolarAngle={Math.PI / 2.6}
      rotateSpeed={0.75}
      zoomSpeed={0.8}
      onStart={() => {
        window.clearTimeout(interactionTimer.current)
        manual.current = true
        resetFocus.current = false
        setInteracting(true)
      }}
      onEnd={() => {
        interactionTimer.current = window.setTimeout(() => setInteracting(false), 4000)
      }}
    />
  )
}

function SeatAnchorProjector({ players, seatAnchorRefs, nameplateRefs }) {
  const position = useMemo(() => new Vector3(), [])
  useFrame(({ camera, size }) => {
    if (!size.width || !size.height) return
    players.forEach((player) => {
      const anchor = seatAnchorRefs.current.get(player.id)
      const target = nameplateRefs.current.get(player.id)
      if (!anchor || !target) return
      target.getWorldPosition(position).project(camera)
      const projectedX = (position.x + 1) * 0.5 * size.width
      const projectedY = (1 - position.y) * 0.5 * size.height
      const visible = position.z >= -1 && position.z <= 1
        && Math.abs(position.x) <= 1.15 && Math.abs(position.y) <= 1.15
      anchor.style.visibility = visible ? 'visible' : 'hidden'
      if (!visible) return
      const { x, y } = getNameplatePosition(projectedX, projectedY, size.width, size.height, anchor.offsetWidth, anchor.offsetHeight)
      anchor.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -100%)`
      anchor.style.setProperty('--callout-offset', `${Math.max(80 - x, Math.min(0, size.width - 80 - x))}px`)
      anchor.style.setProperty('--callout-bottom', y < 85 ? 'auto' : 'calc(100% + 5px)')
      anchor.style.setProperty('--callout-top', y < 85 ? 'calc(100% + 5px)' : 'auto')
    })
  })

  return null
}

function InspectBeam({ from, to, sweepTo }) {
  const beam = useRef(null)
  const start = useMemo(() => new Vector3(), [])
  const end = useMemo(() => new Vector3(), [])
  const direction = useMemo(() => new Vector3(), [])
  const midpoint = useMemo(() => new Vector3(), [])
  const sweepEnd = useMemo(() => new Vector3(), [])
  const startedAt = useRef(null)

  useFrame(({ clock }) => {
    if (!beam.current) return
    if (startedAt.current === null) startedAt.current = clock.elapsedTime
    start.set(from[0], from[1], from[2])
    end.set(to[0], to[1], to[2])
    if (sweepTo) {
      const progress = clock.elapsedTime - startedAt.current
      const sweep = (1 - Math.cos(progress * Math.PI * 2 / 3.5)) / 2
      end.lerp(sweepEnd.set(...sweepTo), sweep)
    }
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

function PalaceBackdrop({ theme, quality }) {
  const resources = useMemo(() => ({
    column: new CylinderGeometry(0.13, 0.18, 2.4, 6),
    beam: new BoxGeometry(1.7, 0.18, 0.28),
    arch: new TorusGeometry(0.7, 0.12, 6, 12, Math.PI),
    wall: new BoxGeometry(0.7, 0.8, 0.26),
    roof: new CylinderGeometry(0.18, 1.2, 0.7, 8),
    dome: new SphereGeometry(0.55, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    slit: new BoxGeometry(0.12, 0.45, 0.08),
    stone: new MeshStandardMaterial({ color: theme.tableTop, roughness: 1 }),
    trim: new MeshStandardMaterial({ color: theme.table, roughness: 1 }),
    glow: new MeshStandardMaterial({ color: theme.isNight ? theme.lantern : theme.tableTop, emissive: theme.lantern, emissiveIntensity: theme.isNight ? 0.32 : 0 }),
  }), [theme])
  useEffect(() => () => Object.values(resources).forEach((resource) => resource.dispose()), [resources])

  return (
    <group>
      {Array.from({ length: 10 }, (_, index) => {
        const angle = index * Math.PI * 2 / 10
        return (
          <SightlineGroup key={index} appearance={theme} quality={quality} position={[Math.sin(angle) * 8.4, -0.15, Math.cos(angle) * 8.4]} rotation={[0, angle, 0]}>
            {[-0.72, 0.72].map((x) => <mesh key={x} position={[x, 1.2, 0]} geometry={resources.column} material={resources.stone} />)}
            {[-1.2, 1.2].map((x) => <mesh key={x} position={[x, 0.4, 0]} geometry={resources.wall} material={resources.stone} />)}
            <mesh position={[0, 1.5, 0]} geometry={resources.arch} material={resources.trim} />
            <mesh position={[0, 2.38, 0]} geometry={resources.beam} material={resources.trim} />
            <mesh position={[0, 2.7, 0]} geometry={resources.roof} material={resources.stone} />
            <mesh position={[0, 1.25, -0.15]} geometry={resources.slit} material={resources.glow} />
            {index % 2 === 0 && <mesh position={[0, 3.05, 0]} geometry={resources.dome} material={resources.trim} />}
            {index % 3 === 0 && <Mashal isNight={theme.isNight} quality={quality} position={[0.72, 1.65, 0.3]} />}
          </SightlineGroup>
        )
      })}
    </group>
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

function Courtyard({ theme, themeId, quality, tableStyle }) {
  const lantern = useRef(null)
  useFrame(({ clock }) => {
    if (lantern.current) lantern.current.intensity = theme.isNight ? theme.lanternIntensity + Math.sin(clock.elapsedTime * 1.3) * 2 : 0
  })

  return (
    <>
      <color attach="background" args={[theme.background]} />
      <fog attach="fog" args={[theme.fog, 18, 65]} />
      <ambientLight intensity={theme.isNight ? theme.ambient : 0.9} />
      <hemisphereLight args={['#fff2d6', theme.ground, theme.isNight ? 1.1 : 0.7]} />
      <directionalLight position={[4, 8, 3]} color="#ffe4ba" intensity={theme.isNight ? theme.directional : 2} castShadow={quality === 'high'} />
      <pointLight position={[0, 4, 0]} color="#ffe1a5" intensity={theme.isNight ? 1.5 : 0.6} distance={12} />
      <pointLight ref={lantern} position={[-4, 3, -3]} intensity={theme.lanternIntensity} color={theme.lantern} distance={12} />
      <WorldBackdrop theme={theme} quality={quality} />
      <NatureWorld theme={theme} themeId={themeId} quality={quality} />
      <PalaceBackdrop theme={theme} quality={quality} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.22, 0]} receiveShadow>
        <circleGeometry args={[6.3, 64]} />
        <meshStandardMaterial color={theme.ground} roughness={0.94} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
        <ringGeometry args={[4.62, 4.69, 64]} />
        <meshBasicMaterial color={theme.trim} transparent opacity={0.5} />
      </mesh>
      {[-1, 1].flatMap((side) =>
        [-1, 1].map((depth) => (
          <SightlineGroup key={`${side}-${depth}`} appearance={theme} quality={quality} position={[side * 4.4, 0, depth * 3.2]}>
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
            <Mashal isNight={theme.isNight} quality={quality} castShadow={side === -1 && depth === -1} position={[0, 2.35, 0]} />
          </SightlineGroup>
        )),
      )}
      <RoyalTable styleId={tableStyle} />
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
  homePlayerId,
  cameraResetKey = 0,
  players,
  seatAnchorRefs,
  playerCount = players.length,
  rolesByPlayer,
  revealedPlayers,
  shuffleActive,
  rankByPlayer = {},
  guessWasCorrect = false,
  themeId = 'sandstone',
  tableStyle = 'teak',
  quality = 'high',
  celebrate = false,
  winnerSeat = 'south',
  revealPlayerId = null,
  canGuess = false,
  guessablePlayerIds = [],
  suspectPlayerIds = [],
  guessedPlayerId = null,
  targetedPlayerId = null,
  roleLabels = {},
  onReveal,
  onGuess,
}) {
  const theme = THEMES[themeId] ?? THEMES.sandstone
  const dealer = players[getDealerIndex(roundNumber, players.length)]
  const dealerPosition = SEAT_POSITIONS[dealer?.seat] ?? SEAT_POSITIONS.south
  const [hoveredPlayerId, setHoveredPlayerId] = useState(null)
  const nameplateRefs = useRef(new Map())
  const rajaPlayer = players.find(({ id }) => rolesByPlayer[id] === 'raja')
  const sipahiPlayer = players.find(({ id }) => rolesByPlayer[id] === 'sipahi')
  const hoveredPlayer = players.find(({ id }) => id === hoveredPlayerId)
  const targetedPlayer = players.find(({ id }) => id === targetedPlayerId)
  const botCandidates = suspectPlayerIds.map((id) => players.find((player) => player.id === id)).filter(Boolean)
  const botThinking = phase === 'guess' && sipahiPlayer && !sipahiPlayer.human && botCandidates.length === 2
  const rajaPosition = rajaPlayer ? SEAT_POSITIONS[rajaPlayer.seat] : null
  const outcomePhase = ['reveal-accused', 'reveal-remaining', 'result'].includes(phase)
  const steal = outcomePhase && !guessWasCorrect
  const chorPlayer = players.find(({ id }) => rolesByPlayer[id] === 'chor')
    ?? (steal ? players.find(({ id }) => suspectPlayerIds.includes(id) && id !== guessedPlayerId) : null)
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
      camera={{ position: [3.2, 8.3, 8.4], fov: 38, near: 0.1, far: 150 }}
      gl={{ antialias: true, alpha: false }}
    >
      <CameraTransition
        phase={phase}
        focusSeat={players.find(({ id }) => id === focusPlayerId)?.seat}
        homeSeat={players.find(({ id }) => id === homePlayerId)?.seat ?? 'south'}
        playerCount={playerCount}
        resetKey={cameraResetKey}
      />
      <SeatAnchorProjector
        players={players}
        seatAnchorRefs={seatAnchorRefs}
        nameplateRefs={nameplateRefs}
      />
      <Courtyard theme={theme} themeId={themeId} quality={quality} tableStyle={tableStyle} />
      {players.map((player) => {
        const seatPosition = SEAT_POSITIONS[player.seat] ?? SEAT_POSITIONS.south
        const publiclyRevealed = phase === 'result' || revealedPlayers.includes(player.id)
        const role = publiclyRevealed ? rolesByPlayer[player.id] : null
        const rank = rankByPlayer[player.id]
        const rankLift = phase === 'result' ? rankElevation(rank) : 0
        const kingLift = role === 'raja' && publiclyRevealed ? 0.45 : 0
        const queenLift = role === 'rani' && publiclyRevealed ? 0.28 : 0
        const elevation = rankLift + kingLift + queenLift
        const outcome = outcomePhase && role === 'chor'
          ? guessWasCorrect ? 'caught' : 'escaped'
          : null
        const interactive = canGuess && guessablePlayerIds.includes(player.id)
        return (
          <group key={player.id} position={seatPosition} rotation={[0, Math.atan2(-seatPosition[0], -seatPosition[2]), 0]}>
            <PlayerTotem
              key={`${player.id}-${roundNumber}`}
              position={[0, 0, 0]}
              color={player.color}
              skinTone={player.skinTone}
              characterStyle={player.characterStyle}
              dealing={shuffleActive && player.id === dealer?.id}
              role={role}
              revealed={publiclyRevealed}
              elevation={elevation}
              phase={phase}
              outcome={outcome}
              outcomeKey={outcome ? `${roundNumber}-${guessWasCorrect}` : ''}
              interactive={interactive}
              onClick={() => onGuess?.(player.id)}
              onInspect={(active) => setHoveredPlayerId(active ? player.id : null)}
              nameplateRef={(node) => {
                if (node) nameplateRefs.current.set(player.id, node)
                else nameplateRefs.current.delete(player.id)
              }}
            />
          </group>
        )
      })}
      {phase !== 'lobby' && players.map((player, index) => {
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
            dealerPosition={dealerPosition}
            shuffleActive={shuffleActive}
            interactive={player.id === revealPlayerId}
            onClick={onReveal}
          />
        )
      })}
      {phase === 'guess' && sipahiPosition && (hoveredPlayer || targetedPlayer) && (
        <InspectBeam
          from={[sipahiPosition[0], 1.65, sipahiPosition[2]]}
          to={[SEAT_POSITIONS[(hoveredPlayer || targetedPlayer).seat][0], 1.2, SEAT_POSITIONS[(hoveredPlayer || targetedPlayer).seat][2]]}
        />
      )}
      {botThinking && sipahiPosition && (
        <InspectBeam
          from={[sipahiPosition[0], 1.65, sipahiPosition[2]]}
          to={[SEAT_POSITIONS[botCandidates[0].seat][0], 1.2, SEAT_POSITIONS[botCandidates[0].seat][2]]}
          sweepTo={[SEAT_POSITIONS[botCandidates[1].seat][0], 1.2, SEAT_POSITIONS[botCandidates[1].seat][2]]}
        />
      )}
      {phase === 'reveal-accused' && sipahiPosition && players.find(({ id }) => id === guessedPlayerId) && (
        <InspectBeam
          from={[sipahiPosition[0], 1.65, sipahiPosition[2]]}
          to={(() => {
            const position = SEAT_POSITIONS[players.find(({ id }) => id === guessedPlayerId).seat]
            return [position[0], 1.2, position[2]]
          })()}
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
