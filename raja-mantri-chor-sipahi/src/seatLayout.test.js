import test from 'node:test'
import assert from 'node:assert/strict'
import { getNameplatePosition } from './seatLayout.js'

test('nameplates remain centered directly above their projected character', () => {
  assert.deepEqual(getNameplatePosition(160, 140, 360, 240, 80, 30), { x: 160, y: 134 })
  assert.deepEqual(getNameplatePosition(161, 142, 360, 240, 80, 30), { x: 161, y: 136 })
})

test('nameplates stay inside viewport edges without changing seats', () => {
  assert.deepEqual(getNameplatePosition(8, 10, 360, 240, 80, 30), { x: 40, y: 30 })
  assert.deepEqual(getNameplatePosition(355, 260, 360, 240, 80, 30), { x: 320, y: 240 })
})
