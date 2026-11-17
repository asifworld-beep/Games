export const CHANTS = {
  en: ['en-IN', 'Soldier, Soldier, catch the Thief!'],
  hinglish: ['en-IN', 'Sipahi, Sipahi, Chor ko pakdo!'],
  hi: ['hi-IN', 'सिपाही, सिपाही, चोर को पकड़ो!'],
  bn: ['bn-IN', 'সিপাহী, সিপাহী, চোরকে ধরো!'],
  te: ['te-IN', 'సిపాయి, సిపాయి, దొంగను పట్టుకో!'],
  mr: ['mr-IN', 'शिपाई, शिपाई, चोराला पकडा!'],
  ta: ['ta-IN', 'சிப்பாய், சிப்பாய், திருடனைப் பிடி!'],
  gu: ['gu-IN', 'સિપાહી, સિપાહી, ચોરને પકડો!'],
  kn: ['kn-IN', 'ಸಿಪಾಯಿ, ಸಿಪಾಯಿ, ಕಳ್ಳನನ್ನು ಹಿಡಿ!'],
  ml: ['ml-IN', 'ശിപായി, ശിപായി, കള്ളനെ പിടിക്കൂ!'],
  pa: ['pa-IN', 'ਸਿਪਾਹੀ, ਸਿਪਾਹੀ, ਚੋਰ ਨੂੰ ਫੜੋ!'],
  or: ['or-IN', 'ସିପାହୀ, ସିପାହୀ, ଚୋରକୁ ଧର!'],
  ur: ['ur-IN', 'سپاہی، سپاہی، چور کو پکڑو!'],
  bho: ['hi-IN', 'सिपाही, सिपाही, चोर के पकड़ो!'],
}

export const RANI_CALLS = {
  en: 'Yes, Your Majesty! Where is my soldier?',
  hinglish: 'Ji Maharaj! Mera Sipahi Kaun?',
  hi: 'जी महाराज! मेरा सिपाही कौन है?',
  bn: 'জি মহারাজ! আমার সিপাহী কে?',
  te: 'అలాగే మహారాజా! నా సిపాయి ఎవరు?',
  mr: 'जी महाराज! माझा शिपाई कोण आहे?',
  ta: 'சரி மகாராஜா! என் சிப்பாய் யார்?',
  gu: 'જી મહારાજ! મારો સિપાહી કોણ છે?',
  kn: 'ಆಯಿತು ಮಹಾರಾಜರೇ! ನನ್ನ ಸಿಪಾಯಿ ಯಾರು?',
  ml: 'ശരി മഹാരാജാവേ! എന്റെ ശിപായി ആരാണ്?',
  pa: 'ਜੀ ਮਹਾਰਾਜ! ਮੇਰਾ ਸਿਪਾਹੀ ਕੌਣ ਹੈ?',
  or: 'ଆଜ୍ଞା ମହାରାଜ! ମୋ ସିପାହୀ କିଏ?',
  ur: 'جی مہاراج! میرا سپاہی کون ہے؟',
  bho: 'जी महाराज! हमार सिपाही के ह?',
}

const FEMALE = /female|woman|lekha|veena|kalpana|heera|priya|swara|neerja|aditi|raveena|zira|samantha|victoria|karen|moira|tessa|google हिन्दी/i
const MALE = /\bmale\b|\bman\b|ravi|hemant|madhur|daniel|david|alex|fred|rishi/i
const voiceCaches = new WeakMap()
const unlockedSyntheses = new WeakSet()
let pendingSpeech = null

function availableVoices(synthesis) {
  if (!voiceCaches.has(synthesis)) {
    const cache = { voices: synthesis.getVoices() }
    const refresh = () => { cache.voices = synthesis.getVoices() }
    if (synthesis.addEventListener) synthesis.addEventListener('voiceschanged', refresh)
    else {
      const previous = synthesis.onvoiceschanged
      synthesis.onvoiceschanged = (event) => {
        previous?.call(synthesis, event)
        refresh()
      }
    }
    voiceCaches.set(synthesis, cache)
  }
  const cache = voiceCaches.get(synthesis)
  const voices = synthesis.getVoices()
  if (voices.length) cache.voices = voices
  return cache.voices
}

export function prepareSpeechVoices() {
  if (window.speechSynthesis) availableVoices(window.speechSynthesis)
}

export function unlockSpeech() {
  const synthesis = window.speechSynthesis
  if (!synthesis || !window.SpeechSynthesisUtterance || unlockedSyntheses.has(synthesis)) return
  if (window.navigator?.userActivation && !window.navigator.userActivation.isActive) return
  const utterance = new window.SpeechSynthesisUtterance(' ')
  utterance.volume = 0
  utterance.onerror = (event) => {
    if (event.error !== 'canceled' && event.error !== 'interrupted') {
      unlockedSyntheses.delete(synthesis)
      console.error('Unable to unlock speech audio:', event.error)
    }
  }
  synthesis.speak(utterance)
  unlockedSyntheses.add(synthesis)
}

export function selectChantVoice(voices, language, role) {
  const locale = CHANTS[language]?.[0] ?? (language?.includes('-') ? language : CHANTS.en[0])
  const base = locale.split('-')[0].toLowerCase()
  const matching = voices.filter((voice) => voice.lang.toLowerCase().split('-')[0] === base)
  const preferred = role === 'rani' ? FEMALE : ['raja', 'sipahi', 'chant'].includes(role) ? MALE : null
  const candidates = preferred ? matching.filter((voice) => preferred.test(`${voice.name ?? ''} ${voice.voiceURI ?? ''}`)) : matching
  if (role === 'rani' && !candidates.length) {
    const english = voices.filter((voice) => /^en-(in|gb|us)$/i.test(voice.lang) && FEMALE.test(`${voice.name ?? ''} ${voice.voiceURI ?? ''}`))
    return english.find((voice) => /^en-in$/i.test(voice.lang)) ?? english[0]
  }
  if (preferred && role !== 'rani' && !candidates.length) {
    return voices.find((voice) => /^en-(in|gb|us)$/i.test(voice.lang) && MALE.test(`${voice.name ?? ''} ${voice.voiceURI ?? ''}`))
  }
  const choices = candidates.length ? candidates : matching
  return choices.find((voice) => voice.lang.toLowerCase() === locale.toLowerCase()) ?? choices[0]
}

export function speakChant(language, volume, onError) {
  const synthesis = window.speechSynthesis
  if (!synthesis || !window.SpeechSynthesisUtterance) return false
  const voice = selectChantVoice(synthesis.getVoices(), language)
  if (!voice) return false
  const [locale, text] = CHANTS[language] ?? CHANTS.en
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.voice = voice
  utterance.lang = locale
  utterance.pitch = 1.05
  utterance.rate = 0.95
  utterance.volume = volume
  utterance.onerror = (event) => {
    if (event.error !== 'canceled' && event.error !== 'interrupted') onError(event.error)
  }
  synthesis.speak(utterance)
  return true
}

export function stopChantVoice() {
  pendingSpeech?.cancel()
  window.speechSynthesis?.cancel()
}

export function speakPhase(text, language, volume, onError, role) {
  const synthesis = window.speechSynthesis
  if (!synthesis || !window.SpeechSynthesisUtterance) return null
  const voice = selectChantVoice(availableVoices(synthesis), language, role)
  if (!voice) return null
  const utterance = new window.SpeechSynthesisUtterance(text)
  utterance.voice = voice
  utterance.lang = voice.lang
  utterance.pitch = role === 'rani' ? 1.32 : role === 'raja' ? 0.85 : role === 'sipahi' ? 0.95 : 1.05
  utterance.rate = role === 'rani' ? 0.95 : role === 'raja' ? 0.92 : role === 'sipahi' ? 1 : 0.95
  utterance.volume = volume
  let cancel
  const done = new Promise((resolve) => {
    let finished = false
    let timer
    const finish = (error) => {
      if (finished) return
      finished = true
      clearTimeout(timer)
      if (pendingSpeech?.cancel === cancel) pendingSpeech = null
      if (error === 'speech-start-timeout' || error === 'speech-timeout') synthesis.cancel()
      if (error) onError(error)
      resolve()
    }
    cancel = () => finish()
    utterance.onstart = () => {
      clearTimeout(timer)
      timer = setTimeout(() => finish('speech-timeout'), 20000)
    }
    utterance.onend = () => finish()
    utterance.onerror = (event) => {
      finish(event.error !== 'canceled' && event.error !== 'interrupted' ? event.error : null)
    }
    timer = setTimeout(() => finish('speech-start-timeout'), 2500)
  })
  pendingSpeech = { cancel }
  try {
    synthesis.speak(utterance)
  } catch (error) {
    cancel()
    throw error
  }
  return done
}

export function speakRoleLine({ role, text, lang, volume, onError }) {
  return speakPhase(text, lang, volume, onError, role.toLowerCase())
}
