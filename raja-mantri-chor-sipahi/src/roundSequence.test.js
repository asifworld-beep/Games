import assert from 'node:assert/strict'
import test from 'node:test'
import { createRoundSequence } from './roundSequence.js'

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

test('phase waits for both its hold and speech plus the requested tail', async () => {
  const sequence = createRoundSequence()
  let endSpeech
  const speech = new Promise((resolve) => { endSpeech = resolve })
  let advanced = false
  const completion = sequence.advancePhaseAfterDelay(20, () => { advanced = true }, speech, 20)
  await delay(30)
  assert.equal(advanced, false)
  endSpeech()
  await delay(5)
  assert.equal(advanced, false)
  await completion
  assert.equal(advanced, true)
})

test('cancellation prevents old phase callbacks even when speech ends later', async () => {
  const sequence = createRoundSequence()
  let endSpeech
  const speech = new Promise((resolve) => { endSpeech = resolve })
  let advanced = false
  const completion = sequence.advancePhaseAfterDelay(50, () => { advanced = true }, speech)
  sequence.cancelRoundSequence()
  await completion
  assert.equal(advanced, false)
  endSpeech()
  await sequence.advancePhaseAfterDelay(0, () => { advanced = true })
  assert.equal(advanced, true)
})
