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

export function selectChantVoice(voices, language) {
  const [locale] = CHANTS[language] ?? CHANTS.en
  const base = locale.split('-')[0].toLowerCase()
  return voices.find((voice) => voice.lang.toLowerCase() === locale.toLowerCase())
    ?? voices.find((voice) => voice.lang.toLowerCase().split('-')[0] === base)
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
  window.speechSynthesis?.cancel()
}
