export function createRoundSequence() {
  let controller = new AbortController()

  function cancelRoundSequence() {
    controller.abort()
    controller = new AbortController()
  }

  function wait(ms, signal) {
    return new Promise((resolve) => {
      if (signal.aborted) {
        resolve()
        return
      }
      const timer = setTimeout(finish, ms)
      function finish() {
        clearTimeout(timer)
        signal.removeEventListener('abort', finish)
        resolve()
      }
      signal.addEventListener('abort', finish, { once: true })
    })
  }

  async function advancePhaseAfterDelay(ms, action, speech = Promise.resolve(), speechTail = 0) {
    const signal = controller.signal
    let onAbort
    const cancelled = new Promise((resolve) => {
      onAbort = resolve
      if (signal.aborted) resolve()
      else signal.addEventListener('abort', onAbort, { once: true })
    })
    await Promise.race([
      Promise.all([wait(ms, signal), speech.then(() => wait(speechTail, signal))]),
      cancelled,
    ])
    signal.removeEventListener('abort', onAbort)
    if (!signal.aborted) action()
  }

  return { advancePhaseAfterDelay, cancelRoundSequence }
}
