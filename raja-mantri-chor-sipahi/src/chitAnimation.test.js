import assert from 'node:assert/strict'
import test from 'node:test'
import { getDealerIndex, getTossPose } from './chitAnimation.js'

test('dealer rotates through all seats in four- and five-player games', () => {
  for (const count of [4, 5]) {
    assert.deepEqual(Array.from({ length: count + 1 }, (_, index) => getDealerIndex(index + 1, count)), [
      ...Array.from({ length: count }, (_, index) => index), 0,
    ])
  }
  assert.throws(() => getDealerIndex(1, 0))
})

test('chits travel continuously from dealer to table after the full mid-air mix', () => {
  const dealer = [0, 0, 2.7]
  const destination = [1.17, 0.84, -0.38]
  for (let index = 0; index < 5; index += 1) {
    const pose = (time) => getTossPose(time, index, dealer, destination, 0)
    assert.deepEqual(pose(0).position, [0, 0.9, dealer[2] * 0.82])
    assert.deepEqual(pose(3.5).position, destination)
    for (let time = 0.7; time < 2.5; time += 0.05) {
      assert.ok(pose(time).position[1] >= 1.8 && pose(time).position[1] <= 2.2)
    }
    for (const boundary of [0.7, 2.5]) {
      const before = pose(boundary - 0.00001).position
      const after = pose(boundary + 0.00001).position
      assert.ok(before.every((value, axis) => Math.abs(value - after[axis]) < 0.001))
    }
  }
})
