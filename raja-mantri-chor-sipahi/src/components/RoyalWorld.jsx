import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CanvasTexture, MathUtils, SRGBColorSpace } from 'three'
import { TABLE_STYLES } from '../config/themes.js'
import { VILLAGE_HOUSES } from '../natureLayout.js'
import { sightlineOpacity } from '../sightline.js'

function applySightlineOpacity(entries, opacity) {
  for (const entry of entries) {
    const fading = opacity < 0.995
    entry.material.opacity = entry.opacity * opacity
    entry.material.transparent = entry.transparent || fading
    entry.material.depthWrite = entry.depthWrite && !fading
  }
}

export function SightlineGroup({ position, rotation, appearance, quality, children }) {
  const group = useRef(null)
  const materials = useRef([])
  const opacity = useRef(1)

  useLayoutEffect(() => {
    const originals = []
    const clones = new Map()
    group.current.traverse((object) => {
      if (!object.isMesh && !object.isPoints) return
      object.frustumCulled = false
      const original = object.material
      const clone = (material) => {
        if (!clones.has(material)) clones.set(material, material.clone())
        return clones.get(material)
      }
      originals.push([object, original])
      object.material = Array.isArray(original) ? original.map(clone) : clone(original)
    })
    materials.current = [...clones.values()].map((material) => ({
      material, opacity: material.opacity, transparent: material.transparent, depthWrite: material.depthWrite,
    }))
    return () => {
      originals.forEach(([object, material]) => { object.material = material })
      clones.forEach((material) => material.dispose())
      materials.current = []
    }
  }, [appearance, quality])

  useFrame(({ camera }, delta) => {
    if (group.current) {
      opacity.current = MathUtils.damp(opacity.current, sightlineOpacity(position, camera.position), 8, delta)
      applySightlineOpacity(materials.current, opacity.current)
    }
  })
  return <group ref={group} position={position} rotation={rotation}>{children}</group>
}

function createTableTexture(styleId) {
  const style = TABLE_STYLES[styleId] ?? TABLE_STYLES.teak
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 1024
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Unable to create the royal table texture.')
  ctx.fillStyle = style.top
  ctx.fillRect(0, 0, 1024, 1024)
  ctx.strokeStyle = style.ink
  ctx.globalAlpha = 0.6
  for (const radius of [455, 430, 250, 210]) {
    ctx.beginPath()
    ctx.arc(512, 512, radius, 0, Math.PI * 2)
    ctx.lineWidth = radius > 400 ? 5 : 2
    ctx.stroke()
  }
  for (let index = 0; index < 16; index += 1) {
    const angle = index * Math.PI / 8
    ctx.save()
    ctx.translate(512 + Math.cos(angle) * 340, 512 + Math.sin(angle) * 340)
    ctx.rotate(angle)
    ctx.beginPath()
    ctx.ellipse(0, 0, styleId === 'marble' ? 31 : 21, 12, 0, 0, Math.PI * 2)
    ctx.stroke()
    if (styleId === 'marble') {
      ctx.fillStyle = index % 2 ? '#38846b' : '#a14d53'
      ctx.globalAlpha = 0.65
      ctx.fill()
    }
    ctx.restore()
  }
  if (styleId === 'bronze') {
    for (let index = 0; index < 24; index += 1) {
      const angle = index * Math.PI / 12
      ctx.beginPath()
      ctx.moveTo(512 + Math.cos(angle) * 90, 512 + Math.sin(angle) * 90)
      ctx.lineTo(512 + Math.cos(angle) * 200, 512 + Math.sin(angle) * 200)
      ctx.stroke()
    }
  } else if (styleId === 'sandalwood') {
    for (let index = 0; index < 24; index += 1) {
      const angle = index * Math.PI / 12
      ctx.save()
      ctx.translate(512 + Math.cos(angle) * 390, 512 + Math.sin(angle) * 390)
      ctx.rotate(angle)
      ctx.strokeRect(-12, -12, 24, 24)
      ctx.restore()
    }
  } else if (styleId === 'teak') {
    ctx.globalAlpha = 0.12
    for (let y = 100; y < 1024; y += 42) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.bezierCurveTo(300, y - 25, 700, y + 25, 1024, y)
      ctx.stroke()
    }
  }
  ctx.globalAlpha = 0.8
  ctx.fillStyle = style.ink
  ctx.textAlign = 'center'
  ctx.font = 'bold 34px "Noto Sans Devanagari", sans-serif'
  ctx.fillText('सत्यमेव जयते • न्याय और बुद्धि', 512, 170, 660)
  ctx.font = 'bold 25px Georgia, serif'
  ctx.fillText('TRUTH & WIT PREVAIL', 512, 870, 620)
  ctx.font = 'bold 94px Georgia, serif'
  ctx.fillText('✦', 512, 547)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

export function RoyalTable({ styleId = 'teak' }) {
  const style = TABLE_STYLES[styleId] ?? TABLE_STYLES.teak
  const texture = useMemo(() => createTableTexture(styleId), [styleId])
  useEffect(() => () => texture.dispose(), [texture])
  return (
    <group>
      <mesh position={[0, 0.44, 0]} castShadow receiveShadow>
        {styleId === 'sandalwood'
          ? <boxGeometry args={[2.9, 0.42, 2.9]} />
          : <cylinderGeometry args={[1.58, 1.7, 0.42, styleId === 'bronze' ? 12 : 8]} />}
        <meshStandardMaterial color={style.base} roughness={0.78} />
      </mesh>
      <mesh position={[0, 0.68, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.68, 1.58, 0.16, 8]} />
        <meshStandardMaterial color={style.trim} metalness={styleId === 'bronze' ? 0.68 : 0.3} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.78, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.47, 1.47, 0.05, 8]} />
        <meshStandardMaterial color={style.top} roughness={styleId === 'marble' ? 0.3 : 0.72} />
      </mesh>
      <mesh position={[0, 0.812, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.46, 8]} />
        <meshStandardMaterial map={texture} roughness={styleId === 'marble' ? 0.3 : 0.75} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
      </mesh>
    </group>
  )
}

export function Mashal({ isNight, position = [0, 0, 0], quality = 'high', castShadow = false }) {
  const flame = useRef(null)
  const light = useRef(null)
  const sparks = useRef(null)
  useFrame(({ clock }) => {
    const time = clock.elapsedTime
    if (flame.current) {
      flame.current.scale.set(0.9 + Math.sin(time * 8) * 0.1, 0.9 + Math.sin(time * 11) * 0.16, 0.9)
      flame.current.rotation.z = Math.sin(time * 6) * 0.12
    }
    if (light.current) light.current.intensity = (quality === 'high' ? 4 : 2) + Math.sin(time * 8) * 0.6 + Math.sin(time * 13) * 0.35
    if (sparks.current) sparks.current.position.y = (time * 0.2) % 0.25
  })
  return (
    <group position={position}>
      <mesh position={[0, -0.16, 0]}><cylinderGeometry args={[0.035, 0.04, 0.42, 6]} /><meshStandardMaterial color="#4d4634" metalness={0.65} /></mesh>
      <mesh><cylinderGeometry args={[0.2, 0.09, 0.16, 8]} /><meshStandardMaterial color="#9b7940" metalness={0.65} roughness={0.4} /></mesh>
      {isNight ? (
        <>
          <group ref={flame} position={[0, 0.16, 0]}>
            <mesh><coneGeometry args={[0.13, 0.38, 7]} /><meshBasicMaterial color="#ff9d29" /></mesh>
            <mesh position={[0, -0.05, 0]}><coneGeometry args={[0.075, 0.22, 7]} /><meshBasicMaterial color="#ffe098" /></mesh>
          </group>
          <points ref={sparks} position={[0, 0.3, 0]}>
            <bufferGeometry><bufferAttribute attach="attributes-position" args={[new Float32Array([-0.1, 0.1, 0, 0.08, 0.3, 0.03, -0.02, 0.45, -0.04]), 3]} /></bufferGeometry>
            <pointsMaterial color="#ffc169" size={0.06} transparent opacity={0.8} depthWrite={false} />
          </points>
          <pointLight ref={light} position={[0, 0.2, 0]} color="#ff9b37" intensity={4} distance={5} decay={2} castShadow={castShadow && quality === 'high'} />
        </>
      ) : (
        <>
          <mesh position={[0, 0.08, 0]}><sphereGeometry args={[0.12, 8, 6]} /><meshStandardMaterial color="#393832" roughness={1} /></mesh>
          <mesh position={[0.02, 0.27, 0]} scale={[0.6, 1.4, 0.6]}><sphereGeometry args={[0.1, 6, 5]} /><meshBasicMaterial color="#d5d4c3" transparent opacity={0.12} depthWrite={false} /></mesh>
        </>
      )}
    </group>
  )
}

export function WorldBackdrop({ theme, quality }) {
  const muted = theme.isNight
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.28, 0]} receiveShadow>
        <circleGeometry args={[42, 64]} /><meshStandardMaterial color={theme.ground} roughness={1} />
      </mesh>
      {VILLAGE_HOUSES.map(({ index, angle, position }) => {
        return (
          <SightlineGroup key={index} appearance={theme} quality={quality} position={[position[0], 0, position[1]]} rotation={[0, angle, 0]}>
            <mesh position={[0, 0.7, 0]}><boxGeometry args={[2, 1.4, 1.5]} /><meshStandardMaterial color={muted ? '#665447' : '#ad8d6a'} roughness={1} /></mesh>
            <mesh position={[0, 1.65, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[1.65, 0.9, 4]} /><meshStandardMaterial color={muted ? '#63493d' : '#a85e42'} roughness={1} /></mesh>
            <mesh position={[0, 0.5, 0.76]}><boxGeometry args={[0.42, 1, 0.03]} /><meshStandardMaterial color="#493a30" /></mesh>
            {index % 2 === 1 && (
              <group position={[0, 1.65, 0]}>
                <mesh position={[0, 0.35, 0]}><boxGeometry args={[1.3, 0.7, 1.1]} /><meshStandardMaterial color={muted ? '#776253' : '#c19c77'} /></mesh>
                <mesh position={[0, 0.1, 0.66]}><boxGeometry args={[1.15, 0.1, 0.5]} /><meshStandardMaterial color={muted ? '#8b7357' : '#d0b38c'} /></mesh>
                {[-0.38, 0, 0.38].map((x) => <mesh key={x} position={[x, 0.4, 0.57]}><boxGeometry args={[0.15, 0.35, 0.04]} /><meshStandardMaterial color="#554735" /></mesh>)}
              </group>
            )}
            {index % 2 === 0 && <Mashal isNight={theme.isNight} quality={quality} position={[0.8, 1.15, 0.85]} />}
            {index % 3 === 0 && <mesh position={[1.45, 0.24, 0.3]}><sphereGeometry args={[0.3, 8, 6]} /><meshStandardMaterial color="#996449" roughness={1} /></mesh>}
            {index % 4 === 0 && (
              <group position={[-2.8, 0, 0]}>
                {[1.2, 0.85, 0.5].map((size, step) => (
                  <mesh key={size} position={[0, 0.06 + step * 0.09, 0]}>
                    <boxGeometry args={[size, 0.15, size]} /><meshStandardMaterial color={step === 2 ? '#4d665e' : '#928773'} roughness={1} />
                  </mesh>
                ))}
              </group>
            )}
            {index % 4 === 1 && (
              <group position={[2.4, 0, 0]}>
                {[-0.65, 0.65].map((x) => <mesh key={x} position={[x, 0.8, 0]}><boxGeometry args={[0.22, 1.6, 0.3]} /><meshStandardMaterial color={muted ? '#796657' : '#c8a47f'} /></mesh>)}
                <mesh position={[0, 1.38, 0]}><torusGeometry args={[0.65, 0.11, 6, 12, Math.PI]} /><meshStandardMaterial color={muted ? '#796657' : '#c8a47f'} /></mesh>
              </group>
            )}
          </SightlineGroup>
        )
      })}
      {Array.from({ length: 12 }, (_, index) => {
        const angle = index * Math.PI * 2 / 12
        const height = 4.5 + index % 4
        return (
          <SightlineGroup key={`mountain-${index}`} appearance={theme} quality={quality} position={[Math.sin(angle) * 35, 0, Math.cos(angle) * 35]}>
            <mesh position={[0, height / 2 - 0.5, 0]} rotation={[0, angle, 0]}>
              <coneGeometry args={[4.2, height, 5]} /><meshStandardMaterial color={muted ? '#49504d' : '#879b91'} roughness={1} />
            </mesh>
            {index % 3 === 0 && (
              <group position={[0, height - 1, 0]}>
                <mesh><cylinderGeometry args={[0.45, 0.55, 1.1, 6]} /><meshStandardMaterial color={muted ? '#6e6557' : '#b5a58b'} /></mesh>
                <mesh position={[0, 0.8, 0]}><coneGeometry args={[0.55, 0.6, 6]} /><meshStandardMaterial color={muted ? '#655648' : '#a6886c'} /></mesh>
                <mesh position={[1.1, -0.3, 0]}><boxGeometry args={[1.5, 0.35, 0.25]} /><meshStandardMaterial color={muted ? '#6e6557' : '#b5a58b'} /></mesh>
              </group>
            )}
          </SightlineGroup>
        )
      })}
    </group>
  )
}
