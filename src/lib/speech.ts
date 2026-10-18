// Aussprache: zuerst fertige Sprachaufnahmen (natürliche britische Stimme, vorab erzeugt),
// sonst die Sprachausgabe des Geräts als Rückfall (z. B. für per Foto importierte Wörter).
import { AUDIO } from '../data/audio-manifest'

let voice: SpeechSynthesisVoice | null = null

// Bessere Gerätestimmen bevorzugen (Google/Samsung/Amazon-Polly-Stimmen klingen deutlich natürlicher)
const GOOD = /natural|neural|enhanced|premium|google|samsung|polly|amy|emma|brian|serena|kate|daniel/i

function pickVoice() {
  if (typeof speechSynthesis === 'undefined') return null
  const voices = speechSynthesis.getVoices()
  const gb = voices.filter((v) => v.lang.replace('_', '-').toLowerCase() === 'en-gb')
  const en = voices.filter((v) => v.lang.toLowerCase().startsWith('en'))
  voice = gb.find((v) => GOOD.test(v.name)) ?? gb.find((v) => !v.localService) ?? gb[0] ?? en.find((v) => GOOD.test(v.name)) ?? en[0] ?? null
  return voice
}

if (typeof speechSynthesis !== 'undefined') {
  pickVoice()
  speechSynthesis.addEventListener?.('voiceschanged', pickVoice)
}

export function speakable(text: string) {
  return text
    .replace(/\(\*\)/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Schlüssel für die Aufnahme eines Textes (FNV-1a, 32 Bit). Gleiche Funktion nutzt scripts/speech-texts.ts.
export function audioKey(text: string) {
  const s = speakable(text).toLowerCase()
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

let current: HTMLAudioElement | null = null

function deviceSpeak(text: string, rate: number) {
  if (typeof speechSynthesis === 'undefined') return
  try {
    speechSynthesis.cancel()
    const t = speakable(text)
    // Einzelwörter mit Punkt: viele Stimmen betonen sie dann vollständig statt abgehackt
    const u = new SpeechSynthesisUtterance(/[.!?]$/.test(t) ? t : `${t}.`)
    u.lang = 'en-GB'
    u.rate = t.includes(' ') ? rate : Math.min(rate, 0.8)
    const v = voice ?? pickVoice()
    if (v) u.voice = v
    speechSynthesis.speak(u)
  } catch {
    /* Sprachausgabe nicht verfügbar */
  }
}

export function speak(text: string, rate = 0.9) {
  const key = audioKey(text)
  try {
    current?.pause()
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
  } catch {
    /* ignorieren */
  }
  if (!AUDIO.has(key) || typeof Audio === 'undefined') return deviceSpeak(text, rate)
  const a = new Audio(`/audio/${key}.mp3`)
  current = a
  a.play().catch(() => deviceSpeak(text, rate))
}

// Deutsche Aussprache (Lernwörter): zuerst feste Aufnahmen (deutsche Stimme), sonst die Gerätestimme.
// Wichtig: Manche Geräte (z. B. Fire-Tablets) haben nur eine englische Stimme – die würde Deutsch falsch vorlesen.
export const audioKeyDe = (text: string) => audioKey(`de:${text}`)
export const syllableText = (syllables: string[]) => syllables.join(' - ')

let deVoice: SpeechSynthesisVoice | null = null
function pickDeVoice() {
  if (typeof speechSynthesis === 'undefined') return null
  const de = speechSynthesis.getVoices().filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith('de'))
  deVoice = de.find((v) => GOOD.test(v.name)) ?? de.find((v) => !v.localService) ?? de[0] ?? null
  return deVoice
}
if (typeof speechSynthesis !== 'undefined') speechSynthesis.addEventListener?.('voiceschanged', pickDeVoice)

function deviceSpeakDe(text: string, slow: boolean) {
  if (typeof speechSynthesis === 'undefined') return
  const v = deVoice ?? pickDeVoice()
  if (!v) return // keine deutsche Stimme auf dem Gerät: lieber still als falsch (englisch) vorlesen
  try {
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'de-DE'
    u.rate = slow ? 0.6 : 0.85
    u.voice = v
    speechSynthesis.speak(u)
  } catch {
    /* Sprachausgabe nicht verfügbar */
  }
}

// Ein deutsches Wort vorlesen; mit syllables langsam in Silben ("Ha – se")
export function speakDe(text: string, syllables?: string[]) {
  const t = syllables && syllables.length > 1 ? syllableText(syllables) : text
  const key = audioKeyDe(t)
  try {
    current?.pause()
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
  } catch {
    /* ignorieren */
  }
  if (!AUDIO.has(key) || typeof Audio === 'undefined') return deviceSpeakDe(t, !!syllables)
  const a = new Audio(`/audio/${key}.mp3`)
  current = a
  a.play().catch(() => deviceSpeakDe(t, !!syllables))
}
