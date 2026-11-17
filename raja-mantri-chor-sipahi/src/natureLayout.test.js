import test from 'node:test'
import assert from 'node:assert/strict'
import { POND, RIVER, TREE_LAYOUT, TREE_RADIUS, VILLAGE_FOOTPRINTS } from './natureLayout.js'

const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])

test('nature features keep clearance from the court, village, river and each other', () => {
  assert.ok(TREE_LAYOUT.length >= 8)
  assert.ok(Math.hypot(...POND.position) - POND.radius > 14)
  assert.ok(Math.hypot(...POND.position) + POND.radius < RIVER.inner)
  assert.ok(RIVER.outer + 0.5 < 35 - 4.2)
  assert.ok(VILLAGE_FOOTPRINTS.every((feature) => distance(POND.position, feature.position) >= POND.radius + feature.radius + 0.5))
  for (const [index, tree] of TREE_LAYOUT.entries()) {
    const radius = Math.hypot(...tree.position)
    assert.ok(radius - TREE_RADIUS > 14)
    assert.ok(radius + TREE_RADIUS < RIVER.inner)
    assert.ok(distance(tree.position, POND.position) >= POND.radius + TREE_RADIUS + 0.5)
    assert.ok(VILLAGE_FOOTPRINTS.every((feature) => distance(tree.position, feature.position) >= feature.radius + TREE_RADIUS + 0.5))
    for (const other of TREE_LAYOUT.slice(index + 1)) {
      assert.ok(distance(tree.position, other.position) >= 2 * TREE_RADIUS + 0.5)
    }
  }
})
