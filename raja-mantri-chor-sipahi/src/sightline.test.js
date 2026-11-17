import test from 'node:test'
import assert from 'node:assert/strict'
import { sightlineOpacity } from './sightline.js'

test('only structures between the camera and table fade smoothly in the sightline', () => {
  const camera = { x: 0, z: 10 }
  assert.ok(Math.abs(sightlineOpacity([0, 0, 5], camera) - 0.15) < 1e-10)
  assert.equal(sightlineOpacity([0, 0, -5], camera), 1)
  assert.equal(sightlineOpacity([0, 0, 15], camera), 1)
  assert.equal(sightlineOpacity([5, 0, 5], camera), 1)
  const edge = sightlineOpacity([3, 0, 5], camera)
  assert.ok(edge > 0.15 && edge < 1)
  assert.ok(Math.abs(sightlineOpacity([5, 0, 0], { x: 10, z: 0 }) - 0.15) < 1e-10)
})
