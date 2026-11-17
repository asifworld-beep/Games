import { MathUtils } from 'three'

export function getDealerIndex(roundNumber, playerCount) {
  if (!Number.isInteger(playerCount) || playerCount < 1) throw new Error('A dealer requires at least one player.')
  return (Math.max(1, roundNumber) - 1) % playerCount
}

export function getTossPose(elapsedSeconds, index, dealerPosition, destination, yaw) {
  const elapsed = MathUtils.clamp(elapsedSeconds, 0, 3.5)
  const angle = index * Math.PI * 2 / 5
  const mixX = Math.cos(angle) * 0.5
  const mixZ = Math.sin(angle) * 0.5
  let x, y, z
  if (elapsed < 0.7) {
    const t = elapsed / 0.7
    x = MathUtils.lerp(dealerPosition[0] * 0.82, mixX, t)
    z = MathUtils.lerp(dealerPosition[2] * 0.82, mixZ, t)
    y = MathUtils.lerp(0.9, 1.8, t) + Math.sin(t * Math.PI) * 0.25
  } else if (elapsed < 2.5) {
    const t = (elapsed - 0.7) / 1.8
    const flutter = Math.sin(t * Math.PI)
    x = mixX + Math.sin(t * Math.PI * 4 + angle) * 0.65 * flutter
    z = mixZ + Math.cos(t * Math.PI * 4 + angle) * 0.65 * flutter
    y = 1.8 + 0.28 * flutter + Math.sin(t * Math.PI * 6 + angle) * 0.1 * flutter
  } else {
    const t = MathUtils.smoothstep(elapsed, 2.5, 3.5)
    x = MathUtils.lerp(mixX, destination[0], t)
    z = MathUtils.lerp(mixZ, destination[2], t)
    y = MathUtils.lerp(1.8, destination[1], t) + Math.sin(t * Math.PI) * 0.25
  }
  const spin = Math.sin(elapsed / 3.5 * Math.PI)
  return {
    position: [x, y, z],
    rotation: [Math.PI + Math.sin(elapsed * 8 + angle) * spin * 1.2, yaw + Math.sin(elapsed * 6 + angle) * spin * 2, Math.cos(elapsed * 7 + angle) * spin * 0.7],
  }
}
