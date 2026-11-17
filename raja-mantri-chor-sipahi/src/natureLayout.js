const TAU = Math.PI * 2
const radial = (radius, angle) => [Math.sin(angle) * radius, Math.cos(angle) * radius]
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])

export const VILLAGE_HOUSES = Array.from({ length: 10 }, (_, index) => {
  const angle = index * TAU / 10
  const radius = 12 + index % 3
  return { index, angle, position: radial(radius, angle) }
})

export const VILLAGE_FOOTPRINTS = VILLAGE_HOUSES.flatMap(({ index, angle, position }) => {
  const footprints = [{ position, radius: 2 }]
  const add = (x, z, radius) => footprints.push({
    position: [position[0] + x * Math.cos(angle) + z * Math.sin(angle), position[1] - x * Math.sin(angle) + z * Math.cos(angle)],
    radius,
  })
  if (index % 4 === 0) add(-2.8, 0, 0.9)
  if (index % 4 === 1) add(2.4, 0, 1)
  if (index % 3 === 0) add(1.45, 0.3, 0.4)
  return footprints
})

export const POND = { position: radial(17.8, 5.97), radius: 2 }
export const RIVER = { inner: 22.5, outer: 25.5, start: 0.15, arc: 1.5 }
export const TREE_RADIUS = 1.4

export const TREE_LAYOUT = Array.from({ length: 20 }, (_, index) => {
  const angle = (index + 0.5) * TAU / 20
  const radius = index % 2 ? 19.4 : 20.5
  return { index, position: radial(radius, angle), type: index % 3 }
}).filter(({ position }) => (
  distance(position, POND.position) >= POND.radius + TREE_RADIUS + 0.5
  && VILLAGE_FOOTPRINTS.every((feature) => distance(position, feature.position) >= feature.radius + TREE_RADIUS + 0.5)
))
