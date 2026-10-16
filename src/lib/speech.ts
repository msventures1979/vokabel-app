// Aussprache über die Sprachausgabe des Geräts (britisches Englisch).
// Später: einmalig erzeugte Audiodateien vom Server, mit dieser Funktion als Rückfall.

let voice: SpeechSynthesisVoice | null = null

function pickVoice() {
  if (typeof speechSynthesis === 'undefined') return null
  const voices = speechSynthesis.getVoices()
  voice =
    voices.find((v) => v.lang === 'en-GB' && /female|google|serena|kate/i.test(v.name)) ??
    voices.find((v) => v.lang === 'en-GB') ??
    voices.find((v) => v.lang.startsWith('en')) ??
    null
  return voice
}

if (typeof speechSynthesis !== 'undefined') {
  pickVoice()
  speechSynthesis.addEventListener?.('voiceschanged', pickVoice)
}

export function canSpeak() {
  return typeof speechSynthesis !== 'undefined'
}

export function speakable(text: string) {
  return text.replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim()
}

export function speak(text: string, rate = 0.9) {
  if (!canSpeak()) return
  try {
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(speakable(text))
    u.lang = 'en-GB'
    u.rate = rate
    const v = voice ?? pickVoice()
    if (v) u.voice = v
    speechSynthesis.speak(u)
  } catch {
    /* Sprachausgabe nicht verfügbar */
  }
}
