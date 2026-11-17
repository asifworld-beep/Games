import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, MathUtils, Object3D } from 'three'

const GOLD = '#e8c66f'
const CRIMSON = '#a83232'
const ROYAL_DUST_POSITIONS = new Float32Array([
  -0.55, 0.18, 0.12, -0.34, 0.45, -0.18, 0.4, 0.3, 0.2,
  0.58, 0.52, -0.12, 0.1, 0.66, 0.1, -0.18, 0.12, -0.25,
])

function springStep(state, target, delta, stiffness = 72, damping = 15) {
  const acceleration = (target - state.value) * stiffness - state.velocity * damping
  state.velocity += acceleration * delta
  state.value += state.velocity * delta
  if (Math.abs(target - state.value) < 0.001 && Math.abs(state.velocity) < 0.001) {
    state.value = target
    state.velocity = 0
  }
  return state.value
}

function Crown() {
  return (
    <group>
      <mesh position={[0, 0.07, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.29, 0.12, 12]} />
        <meshStandardMaterial color={GOLD} metalness={0.82} roughness={0.23} />
      </mesh>
      <mesh position={[0, 0.03, 0]}>
        <torusGeometry args={[0.25, 0.025, 8, 24]} />
        <meshStandardMaterial color="#fff0b0" metalness={0.7} roughness={0.2} />
      </mesh>
      {Array.from({ length: 5 }, (_, index) => {
        const angle = (index / 5) * Math.PI * 2
        return (
          <group key={index} position={[Math.cos(angle) * 0.2, 0.21, Math.sin(angle) * 0.2]}>
            <mesh castShadow>
              <coneGeometry args={[0.075, 0.26, 5]} />
              <meshStandardMaterial color={GOLD} metalness={0.78} roughness={0.24} />
            </mesh>
            <mesh position={[0, 0.06, 0]} castShadow>
              <sphereGeometry args={[0.045, 10, 8]} />
              <meshStandardMaterial color={index === 2 ? '#f5e9bb' : '#d65543'} emissive={index === 2 ? '#b88437' : '#6e1515'} emissiveIntensity={0.25} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

function MinisterAccessories({ scrollRef }) {
  return (
    <>
      <group position={[0, 1.46, 0]}>
        <mesh scale={[1, 0.72, 0.95]} castShadow>
          <sphereGeometry args={[0.31, 16, 12]} />
          <meshStandardMaterial color="#c47b39" roughness={0.54} />
        </mesh>
        <mesh position={[0, 0.12, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.23, 0.052, 8, 18]} />
          <meshStandardMaterial color={GOLD} metalness={0.5} roughness={0.36} />
        </mesh>
        <mesh position={[0, 0.06, 0.28]}>
          <sphereGeometry args={[0.07, 10, 8]} />
          <meshStandardMaterial color="#f4d28a" metalness={0.55} roughness={0.25} />
        </mesh>
      </group>
      <group ref={scrollRef}>
        <mesh castShadow>
          <boxGeometry args={[0.32, 0.16, 0.12]} />
          <meshStandardMaterial color="#f0d8a2" emissive="#a66c20" emissiveIntensity={0.18} roughness={0.62} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.17, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.035, 0.035, 0.22, 10]} />
            <meshStandardMaterial color={GOLD} metalness={0.65} roughness={0.32} />
          </mesh>
        ))}
        <mesh position={[0, 0, 0.066]}>
          <planeGeometry args={[0.19, 0.09]} />
          <meshBasicMaterial color="#fff1c8" transparent opacity={0.7} />
        </mesh>
      </group>
    </>
  )
}

function GuardAccessories() {
  return (
    <>
      <group position={[0, 1.44, 0]}>
        <mesh scale={[1.05, 0.84, 1]} castShadow>
          <sphereGeometry args={[0.3, 10, 8]} />
          <meshStandardMaterial color="#8f302b" metalness={0.38} roughness={0.42} />
        </mesh>
        <mesh position={[0, 0.2, 0]}>
          <coneGeometry args={[0.2, 0.25, 6]} />
          <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.28} />
        </mesh>
        <mesh position={[0, 0.12, 0.23]}>
          <sphereGeometry args={[0.065, 10, 8]} />
          <meshStandardMaterial color="#f4d879" emissive="#986018" emissiveIntensity={0.28} />
        </mesh>
      </group>
      <mesh position={[0.53, 0.82, 0.12]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.23, 0.23, 0.1, 8]} />
        <meshStandardMaterial color="#a93832" metalness={0.47} roughness={0.38} />
      </mesh>
      <mesh position={[0.53, 0.82, 0.18]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.19, 0.028, 8, 8]} />
        <meshStandardMaterial color={GOLD} metalness={0.75} roughness={0.24} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[-0.52, 0.95, -0.12]} rotation={[0, 0, side * 0.24]} castShadow>
          <cylinderGeometry args={[0.027, 0.027, 0.94, 8]} />
          <meshStandardMaterial color="#c5a15e" metalness={0.72} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[-0.52, 1.45, -0.12]} castShadow>
        <coneGeometry args={[0.075, 0.2, 7]} />
        <meshStandardMaterial color={GOLD} metalness={0.75} roughness={0.25} />
      </mesh>
    </>
  )
}

function ThiefAccessories() {
  return (
    <>
      <mesh position={[0, 1.34, 0]} scale={[1.15, 1.28, 1.08]} castShadow>
        <sphereGeometry args={[0.32, 12, 10]} />
        <meshStandardMaterial color="#292b4a" roughness={0.75} />
      </mesh>
      <mesh position={[0, 1.33, 0.24]} castShadow>
        <boxGeometry args={[0.52, 0.16, 0.09]} />
        <meshStandardMaterial color="#17192b" roughness={0.62} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.12, 1.34, 0.294]}>
          <sphereGeometry args={[0.035, 8, 6]} />
          <meshBasicMaterial color="#e2bb70" />
        </mesh>
      ))}
      <group position={[0.48, 0.66, 0.08]}>
        <mesh scale={[0.9, 0.78, 0.72]} castShadow>
          <sphereGeometry args={[0.23, 10, 8]} />
          <meshStandardMaterial color="#946027" roughness={0.83} />
        </mesh>
        <mesh position={[0, 0.17, 0]}>
          <sphereGeometry args={[0.08, 8, 6]} />
          <meshStandardMaterial color="#d5aa58" metalness={0.62} roughness={0.28} />
        </mesh>
        <mesh position={[0.08, -0.04, 0.15]}>
          <sphereGeometry args={[0.065, 8, 6]} />
          <meshStandardMaterial color="#e6c46f" metalness={0.72} roughness={0.22} />
        </mesh>
      </group>
    </>
  )
}

function RevealBurst({ color, active }) {
  const burst = useRef(null)
  const start = useRef(null)
  const previousActive = useRef(false)
  const direction = useRef(1)
  const particles = useMemo(() => Array.from({ length: 14 }, (_, index) => {
    const angle = (index / 14) * Math.PI * 2
    return { x: Math.cos(angle), y: 0.3 + (index % 4) * 0.19, z: Math.sin(angle), size: 0.025 + (index % 3) * 0.012 }
  }), [])

  useFrame(({ clock }) => {
    if (!burst.current) return
    if (active !== previousActive.current) {
      previousActive.current = active
      direction.current = active ? 1 : -1
      start.current = clock.elapsedTime
    } else if (start.current === null && active) {
      start.current = clock.elapsedTime
    }
    if (start.current === null) {
      burst.current.visible = false
      return
    }
    const elapsed = clock.elapsedTime - start.current
    burst.current.visible = elapsed < 1.05
    burst.current.children.forEach((particle, index) => {
      const item = particles[index]
      const spread = Math.min(1, elapsed * 1.7)
      particle.position.set(item.x * spread * 0.78, item.y + spread * 0.48, item.z * spread * 0.78)
      particle.scale.setScalar(Math.max(0.001, item.size * (1 - spread * 0.65)))
      particle.material.opacity = Math.max(0, (1 - spread) * (direction.current < 0 ? 0.65 : 1))
    })
  })

  return (
    <group ref={burst}>
      {particles.map((particle, index) => (
        <mesh key={index} scale={0.001}>
          <icosahedronGeometry args={[particle.size, 0]} />
          <meshBasicMaterial color={color} transparent depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

export default function PlayerTotem({
  position,
  color,
  height = 1,
  role,
  revealed = false,
  elevation = 0,
  phase,
  outcome = null,
  outcomeKey = '',
  interactive = false,
  onClick,
  onInspect,
}) {
  const [retainedRole, setRetainedRole] = useState(() => (revealed ? role : null))
  if (role && revealed && retainedRole !== role) setRetainedRole(role)
  const pedestal = useRef(null)
  const body = useRef(null)
  const accessory = useRef(null)
  const scroll = useRef(null)
  const shimmer = useRef(null)
  const shimmerMaterial = useRef(null)
  const crownLight = useRef(null)
  const caughtLight = useRef(null)
  const cage = useRef(null)
  const crownTarget = useMemo(() => new Object3D(), [])
  const dynamics = useRef({
    accessory: { value: 0, velocity: 0 },
    elevation: { value: 0, velocity: 0 },
    scroll: { value: 0, velocity: 0 },
    cage: { value: 0, velocity: 0 },
  })
  const outcomeStart = useRef(null)
  const previousOutcomeKey = useRef('')
  const baseColor = useMemo(() => new Color(color), [color])
  const visible = Boolean(role && revealed)
  const accessoryRole = visible ? role : retainedRole
  const hasCrown = visible && accessoryRole === 'raja'
  const hasMinisterLight = visible && accessoryRole === 'mantri' && phase === 'guess'
  const isCaught = visible && role === 'chor' && outcome === 'caught'
  const isEscapedThief = visible && role === 'chor' && outcome === 'escaped'
  const slumpedMinister = visible && role === 'mantri' && outcome === 'escaped'
  const accessoryColor = accessoryRole === 'raja' ? GOLD : accessoryRole === 'chor' ? '#e6b958' : accessoryRole === 'sipahi' ? '#d24a39' : '#edbe65'

  useEffect(() => {
    if (!revealed && retainedRole) {
      const timer = window.setTimeout(() => setRetainedRole(null), 1100)
      return () => window.clearTimeout(timer)
    }
    return undefined
  }, [revealed, retainedRole])

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05)
    const elevationNow = springStep(dynamics.current.elevation, elevation, dt)
    const accessoryNow = springStep(dynamics.current.accessory, visible ? 1 : 0, dt)
    const scrollNow = springStep(dynamics.current.scroll, visible && role === 'mantri' && outcome !== 'escaped' ? 1 : 0, dt)
    if (body.current) {
      const elapsed = outcomeStart.current === null ? 0 : clock.elapsedTime - outcomeStart.current
      const leap = isEscapedThief && elapsed < 1.8 ? Math.sin(Math.min(1, elapsed / 1.8) * Math.PI) * 0.48 : 0
      const royalHover = hasCrown ? Math.sin(clock.elapsedTime * 1.25) * 0.055 : 0
      const defeat = isCaught || slumpedMinister
      body.current.position.y = elevationNow + leap + royalHover
      body.current.rotation.x = MathUtils.damp(body.current.rotation.x, defeat ? 0.26 : hasCrown ? -0.08 : 0, 5, dt)
      body.current.rotation.z = MathUtils.damp(
        body.current.rotation.z,
        defeat ? Math.sin(clock.elapsedTime * 28) * 0.075 + 0.12 : 0,
        defeat ? 10 : 4,
        dt,
      )
      body.current.rotation.y = isEscapedThief && elapsed < 1.8
        ? MathUtils.damp(body.current.rotation.y, Math.PI * 2.1, 5, dt)
        : MathUtils.damp(body.current.rotation.y, 0, 4, dt)
      body.current.scale.y = 1 + Math.sin(clock.elapsedTime * 1.6) * (hasCrown ? 0.014 : 0.006)
    }
    if (pedestal.current) {
      pedestal.current.scale.y = 0.18 + elevationNow
      pedestal.current.position.y = (0.18 + elevationNow) / 2
    }
    if (accessory.current) {
      accessory.current.scale.setScalar(Math.max(0.001, accessoryNow))
      accessory.current.position.y = accessoryRole === 'raja' ? 1.48 + (1 - accessoryNow) * 1.55 : 0
      accessory.current.rotation.y = Math.sin(clock.elapsedTime * 1.1) * 0.035 * accessoryNow
    }
    if (scroll.current) {
      scroll.current.scale.setScalar(Math.max(0.001, scrollNow))
      scroll.current.position.set(
        0.66 + Math.cos(clock.elapsedTime * 1.15) * 0.13,
        1.08 + Math.sin(clock.elapsedTime * 1.8) * 0.08,
        Math.sin(clock.elapsedTime * 1.15) * 0.14,
      )
      scroll.current.rotation.y = clock.elapsedTime * 0.72
    }
    if (shimmer.current) {
      const pulse = 1 + Math.sin(clock.elapsedTime * 5) * 0.1
      shimmer.current.scale.setScalar(pulse * accessoryNow)
      shimmer.current.rotation.y += dt * 0.7
      if (shimmerMaterial.current) shimmerMaterial.current.opacity = Math.max(0, accessoryNow * 0.65)
    }

    if (outcomeKey !== previousOutcomeKey.current) {
      previousOutcomeKey.current = outcomeKey
      outcomeStart.current = outcome ? clock.elapsedTime : null
    }
    const outcomeAge = outcomeStart.current === null ? Infinity : clock.elapsedTime - outcomeStart.current
    const cageNow = springStep(dynamics.current.cage, isCaught && outcomeAge < 2.05 ? 1 : 0, dt, 85, 16)
    if (cage.current) {
      cage.current.scale.set(Math.max(0.001, cageNow), Math.max(0.001, cageNow), Math.max(0.001, cageNow))
      cage.current.position.y = (1 - cageNow) * 1.45
    }
    if (crownLight.current) {
      crownLight.current.intensity = hasCrown ? 25 * accessoryNow : hasMinisterLight ? 17 * accessoryNow : 0
    }
    if (caughtLight.current) caughtLight.current.intensity = isCaught && outcomeAge < 1.8 ? 24 : 0
  })

  const interactiveProps = interactive
    ? {
      onClick: (event) => {
        event.stopPropagation()
        onClick?.()
      },
      onPointerOver: (event) => {
        event.stopPropagation()
        document.body.style.cursor = 'pointer'
        onInspect?.()
      },
      onPointerOut: () => {
        document.body.style.cursor = ''
        onInspect?.(null)
      },
    }
    : {}

  return (
    <group position={position} {...interactiveProps}>
      <mesh ref={pedestal} position={[0, 0.09, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.5, 0.53, 1, 10]} />
        <meshStandardMaterial color={role === 'raja' && visible ? GOLD : '#9a8054'} metalness={0.58} roughness={0.4} />
      </mesh>
      <group ref={body}>
      <mesh position={[0, 0.12, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.42, 0.5, 0.22, 8]} />
        <meshStandardMaterial color="#c5a36d" roughness={0.75} />
      </mesh>
        <mesh position={[0, 0.55 * height, 0]} castShadow>
          <cylinderGeometry args={[0.24, 0.34, 0.72 * height, 7]} />
          <meshStandardMaterial color={baseColor} roughness={0.5} />
        </mesh>
        <mesh position={[0, 1.08 * height, 0]} castShadow>
          <sphereGeometry args={[0.29, 12, 10]} />
          <meshStandardMaterial color={baseColor} roughness={0.4} />
        </mesh>
        <mesh position={[0, 1.42 * height, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.22, 0.3, 5]} />
          <meshStandardMaterial color="#f0d48d" metalness={0.45} roughness={0.36} />
        </mesh>
        {accessoryRole && <RevealBurst color={accessoryColor} active={visible} />}
        {accessoryRole && (
          <group ref={accessory}>
            {accessoryRole === 'raja' && (
              <>
                <Crown />
                <mesh ref={shimmer} position={[0, -0.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.4, 0.025, 8, 32]} />
                  <meshBasicMaterial ref={shimmerMaterial} color="#ffe9a1" transparent depthWrite={false} opacity={0.6} />
                </mesh>
                <points>
                  <bufferGeometry>
                    <bufferAttribute attach="attributes-position" args={[ROYAL_DUST_POSITIONS, 3]} />
                  </bufferGeometry>
                  <pointsMaterial color="#f6d278" size={0.07} transparent opacity={0.8} sizeAttenuation />
                </points>
              </>
            )}
            {accessoryRole === 'mantri' && <MinisterAccessories scrollRef={scroll} />}
            {accessoryRole === 'sipahi' && <GuardAccessories />}
            {accessoryRole === 'chor' && <ThiefAccessories />}
          </group>
        )}
        {isCaught && (
          <group ref={cage}>
            {Array.from({ length: 8 }, (_, index) => {
              const angle = (index / 8) * Math.PI * 2
              return (
                <mesh key={index} position={[Math.cos(angle) * 0.48, 1.08, Math.sin(angle) * 0.48]} castShadow>
                  <cylinderGeometry args={[0.025, 0.025, 2.15, 6]} />
                  <meshStandardMaterial color="#d3b477" metalness={0.82} roughness={0.3} transparent opacity={0.8} />
                </mesh>
              )
            })}
            {[0.2, 1.95].map((y) => (
              <mesh key={y} position={[0, y, 0]}>
                <torusGeometry args={[0.48, 0.03, 8, 24]} />
                <meshStandardMaterial color={CRIMSON} metalness={0.68} roughness={0.3} />
              </mesh>
            ))}
          </group>
        )}
      </group>
      {visible && (hasCrown || hasMinisterLight || isCaught) && (
        <>
          <primitive object={crownTarget} position={[0, 1.05 + elevation, 0]} />
          <spotLight
            ref={crownLight}
            target={crownTarget}
            position={[0, 4.2 + elevation, 0]}
            color={hasCrown ? '#ffd778' : hasMinisterLight ? '#f2ad50' : CRIMSON}
            angle={0.34}
            penumbra={0.65}
            distance={7}
            intensity={0}
          />
          {(hasCrown || hasMinisterLight) && (
            <mesh position={[0, 2.2 + elevation, 0]}>
              <coneGeometry args={[0.72, 3.2, 24, 1, true]} />
              <meshBasicMaterial
                color={hasCrown ? '#ffd778' : '#f2ad50'}
                transparent
                opacity={hasCrown ? 0.025 : 0.018}
                depthWrite={false}
                side={2}
              />
            </mesh>
          )}
          {isCaught && (
            <spotLight
              ref={caughtLight}
              target={crownTarget}
              position={[0, 3.5 + elevation, 0]}
              color="#f43f46"
              angle={0.43}
              penumbra={0.45}
              distance={6}
              intensity={0}
            />
          )}
        </>
      )}
    </group>
  )
}
