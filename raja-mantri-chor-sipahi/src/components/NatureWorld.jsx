import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'
import { POND, RIVER, TREE_LAYOUT } from '../natureLayout.js'

function waterTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Unable to create the water texture.')
  context.fillStyle = '#b7dfd1'
  context.fillRect(0, 0, 128, 128)
  context.strokeStyle = 'rgba(255,255,255,0.2)'
  context.lineWidth = 2
  for (let y = 8; y < 128; y += 16) {
    context.beginPath()
    context.moveTo(0, y)
    context.bezierCurveTo(32, y - 5, 96, y + 5, 128, y)
    context.stroke()
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.repeat.set(2, 2)
  return texture
}

function Waterways({ night }) {
  const texture = useMemo(() => waterTexture(), [])
  useEffect(() => () => texture.dispose(), [texture])
  useFrame(({ clock }) => { texture.offset.set(clock.elapsedTime * 0.012, clock.elapsedTime * 0.005) })
  const bridgeAngle = RIVER.start + RIVER.arc / 2
  const bridgeRadius = (RIVER.inner + RIVER.outer) / 2
  return (
    <>
      <mesh position={[0, -0.14, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[RIVER.inner, RIVER.outer, 64, 1, RIVER.start, RIVER.arc]} />
        <meshStandardMaterial map={texture} color={night ? '#568e88' : '#74c5b0'} metalness={0.3} roughness={0.28} />
      </mesh>
      {[RIVER.inner, RIVER.outer].map((radius) => (
        <group key={radius} rotation={[0, RIVER.start, 0]}>
          <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <torusGeometry args={[radius, 0.14, 6, 64, RIVER.arc]} />
            <meshStandardMaterial color={night ? '#777b6e' : '#b5aa91'} roughness={0.95} />
          </mesh>
        </group>
      ))}
      <group position={[Math.cos(bridgeAngle) * bridgeRadius, -0.08, -Math.sin(bridgeAngle) * bridgeRadius]} rotation={[0, bridgeAngle, 0]}>
        {Array.from({ length: 10 }, (_, index) => {
          const x = -1.8 + index * 0.4
          const y = Math.sin((index + 0.5) * Math.PI / 10) * 0.4
          return (
            <group key={index} position={[x, y, 0]}>
              <mesh><boxGeometry args={[0.42, 0.14, 1.45]} /><meshStandardMaterial color="#b4a78b" roughness={1} /></mesh>
              {[-0.66, 0.66].map((z) => <mesh key={z} position={[0, 0.3, z]}><boxGeometry args={[0.42, 0.18, 0.12]} /><meshStandardMaterial color="#c6b99b" roughness={1} /></mesh>)}
            </group>
          )
        })}
      </group>
      <group position={[POND.position[0], 0, POND.position[1]]}>
        <mesh position={[0, -0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.75, 32]} />
          <meshStandardMaterial map={texture} color={night ? '#568e88' : '#74c5b0'} metalness={0.3} roughness={0.25} />
        </mesh>
        <mesh position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.82, 0.13, 6, 32]} /><meshStandardMaterial color="#b6a78b" roughness={1} />
        </mesh>
        {[[-0.6, -0.4], [0.55, 0.35], [0.1, -0.9], [-0.85, 0.55], [0.9, -0.5]].map(([x, z], index) => (
          <group key={index} position={[x, -0.06, z]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.24, 8]} /><meshStandardMaterial color="#527e55" roughness={0.7} /></mesh>
            {index % 2 === 0 && <group position={[0, 0.07, 0]}>{Array.from({ length: 5 }, (_, petal) => (
              <mesh key={petal} position={[Math.cos(petal * Math.PI * 2 / 5) * 0.08, 0, Math.sin(petal * Math.PI * 2 / 5) * 0.08]} scale={[0.08, 0.14, 0.08]}>
                <sphereGeometry args={[1, 6, 5]} /><meshStandardMaterial color="#e7a4ae" roughness={0.8} />
              </mesh>
            ))}</group>}
          </group>
        ))}
        {Array.from({ length: 7 }, (_, index) => {
          const angle = index * Math.PI * 2 / 7
          return <mesh key={index} position={[Math.cos(angle) * 1.62, 0.16, Math.sin(angle) * 1.62]} rotation={[0, 0, index % 2 ? 0.12 : -0.12]}>
            <cylinderGeometry args={[0.018, 0.025, 0.55, 5]} /><meshStandardMaterial color="#70855a" />
          </mesh>
        })}
      </group>
    </>
  )
}

function Tree({ position, type, night }) {
  const foliage = night ? ['#466554', '#527458', '#435f50'][type] : ['#60865b', '#779c62', '#547f5e'][type]
  return (
    <group position={[position[0], -0.2, position[1]]}>
      <mesh position={[0, 0.95, 0]}><cylinderGeometry args={[0.17, 0.25, 1.9, 7]} /><meshStandardMaterial color="#765b40" roughness={1} /></mesh>
      {type === 2 ? (
        <mesh position={[0, 2.45, 0]}><coneGeometry args={[0.85, 3.2, 7]} /><meshStandardMaterial color={foliage} roughness={1} /></mesh>
      ) : (
        <>
          <mesh position={[0, 2.55, 0]} scale={[1.1, 0.75, 1.1]}><sphereGeometry args={[1, 7, 5]} /><meshStandardMaterial color={foliage} roughness={1} /></mesh>
          {[-0.65, 0.65].map((x) => <mesh key={x} position={[x, 2.35, 0]} scale={[0.7, 0.62, 0.7]}><sphereGeometry args={[1, 7, 5]} /><meshStandardMaterial color={foliage} roughness={1} /></mesh>)}
          {type === 0 && [-0.65, 0.65].map((x) => <mesh key={x} position={[x, 1.15, 0]}><cylinderGeometry args={[0.035, 0.045, 1.4, 5]} /><meshStandardMaterial color="#8c7351" /></mesh>)}
        </>
      )}
    </group>
  )
}

function Weather({ rainy, night, quality }) {
  const clouds = useRef(null)
  const rain = useRef(null)
  const positions = useMemo(() => {
    const count = quality === 'high' ? 200 : 80
    return new Float32Array(Array.from({ length: count }, (_, index) => {
      const angle = index * 2.39996
      const radius = 17 + (index * 7 % 120) / 10
      return [Math.sin(angle) * radius, 2 + (index * 17 % 105) / 10, Math.cos(angle) * radius]
    }).flat())
  }, [quality])
  const dropTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 32
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Unable to create the rain texture.')
    context.fillStyle = 'rgba(220,235,240,0.8)'
    context.fillRect(14, 3, 4, 26)
    return new CanvasTexture(canvas)
  }, [])
  useEffect(() => () => dropTexture.dispose(), [dropTexture])
  useFrame((_, delta) => {
    if (clouds.current) clouds.current.rotation.y += delta * 0.008
    const attribute = rain.current?.geometry.getAttribute('position')
    if (attribute) {
      for (let index = 1; index < attribute.array.length; index += 3) {
        attribute.array[index] -= Math.min(delta, 0.1) * 3
        if (attribute.array[index] < 0.1) attribute.array[index] += 12.5
      }
      attribute.needsUpdate = true
    }
  })
  return (
    <>
      <group ref={clouds}>
        {Array.from({ length: 7 }, (_, index) => {
          const angle = index * Math.PI * 2 / 7
          return <group key={index} position={[Math.cos(angle) * 28, 12.5 + index % 2, Math.sin(angle) * 28]}>
            {[-1.2, 0, 1.2].map((x) => <mesh key={x} position={[x, x === 0 ? 0.35 : 0, 0]} scale={[1.4, 0.65, 0.8]}>
              <sphereGeometry args={[1, 7, 5]} /><meshStandardMaterial color={rainy ? '#71808b' : night ? '#a4afbb' : '#f3e7d2'} transparent opacity={0.72} depthWrite={false} />
            </mesh>)}
          </group>
        })}
      </group>
      {rainy && <points ref={rain} frustumCulled={false}>
        <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
        <pointsMaterial map={dropTexture} color="#c8dce2" size={0.22} transparent opacity={0.45} depthWrite={false} />
      </points>}
    </>
  )
}

export default function NatureWorld({ theme, themeId, quality }) {
  return (
    <group>
      <Waterways night={theme.isNight} />
      {TREE_LAYOUT.map((tree) => <Tree key={tree.index} {...tree} night={theme.isNight} />)}
      <Weather rainy={themeId === 'emerald' || themeId === 'sandstone'} night={theme.isNight} quality={quality} />
    </group>
  )
}
