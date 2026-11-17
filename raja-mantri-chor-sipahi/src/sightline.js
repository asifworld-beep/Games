import { MathUtils } from 'three'

export function sightlineOpacity(position, camera) {
  const distance = Math.hypot(camera.x, camera.z)
  if (!distance) return 1
  const depth = (position[0] * camera.x + position[2] * camera.z) / distance
  const lateral = Math.abs(position[0] * camera.z - position[2] * camera.x) / distance
  const cone = 1 - MathUtils.smoothstep(lateral, 2.3, 4)
  const between = MathUtils.smoothstep(depth, 1.5, 2.5) * MathUtils.smoothstep(distance - depth, -1.5, 0.5)
  return 1 - 0.85 * cone * between
}
