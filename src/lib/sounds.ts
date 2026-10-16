// Spielgeräusche, direkt im Gerät erzeugt (Web Audio, keine Dateien nötig):
// Treffer, Knapp, Daneben, Abpfiff, Applaus, Stadionjubel, neue Karte.
// Ein-/Ausschalter pro Gerät (localStorage).

let ctx: AudioContext | null = null

const KEY = 'vokabel.sound'
export function soundOn(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}
export function setSoundOn(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    /* ignorieren */
  }
}

function ac(): AudioContext | null {
  if (!soundOn()) return null
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx ??= new AC()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

let noiseBuf: AudioBuffer | null = null
function noise(c: AudioContext) {
  if (noiseBuf && noiseBuf.sampleRate === c.sampleRate) return noiseBuf
  const b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate)
  const d = b.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  noiseBuf = b
  return b
}

function master(c: AudioContext, gain = 0.5) {
  const g = c.createGain()
  g.gain.value = gain
  const comp = c.createDynamicsCompressor()
  g.connect(comp).connect(c.destination)
  return g
}

function tone(c: AudioContext, out: AudioNode, freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.6) {
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.value = freq
  g.gain.setValueAtTime(0.0001, start)
  g.gain.exponentialRampToValueAtTime(vol, start + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  o.connect(g).connect(out)
  o.start(start)
  o.stop(start + dur + 0.05)
}

// Ein einzelnes Klatschen: kurzes, gefiltertes Rauschen
function clap(c: AudioContext, out: AudioNode, t: number, vol: number) {
  const src = c.createBufferSource()
  src.buffer = noise(c)
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 900 + Math.random() * 1600
  bp.Q.value = 0.9 + Math.random()
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.002)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05 + Math.random() * 0.05)
  src.connect(bp).connect(g).connect(out)
  src.start(t, Math.random() * 1.5)
  src.stop(t + 0.12)
}

// Applaus: viele Klatscher, die anschwellen und ausklingen
function applause(c: AudioContext, out: AudioNode, t0: number, seconds: number, people = 14) {
  for (let p = 0; p < people; p++) {
    const rate = 3.5 + Math.random() * 2.5 // Klatscher pro Sekunde je Person
    let t = t0 + Math.random() * 0.4
    while (t < t0 + seconds) {
      const x = (t - t0) / seconds
      const env = Math.min(1, x * 5) * Math.min(1, (1 - x) * 2.5)
      if (env > 0.02) clap(c, out, t, 0.35 * env * (0.6 + Math.random() * 0.4))
      t += (1 / rate) * (0.8 + Math.random() * 0.4)
    }
  }
}

// Stadionjubel: breites Rauschen, das anschwillt (Menge) + Applaus
function crowd(c: AudioContext, out: AudioNode, t0: number, seconds: number, vol = 0.35) {
  const src = c.createBufferSource()
  src.buffer = noise(c)
  src.loop = true
  const lp = c.createBiquadFilter()
  lp.type = 'bandpass'
  lp.frequency.value = 700
  lp.Q.value = 0.5
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.35)
  g.gain.setValueAtTime(vol, t0 + seconds * 0.55)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds)
  // leichtes Wogen der Menge
  const lfo = c.createOscillator()
  const lg = c.createGain()
  lfo.frequency.value = 0.9
  lg.gain.value = 180
  lfo.connect(lg).connect(lp.frequency)
  src.connect(lp).connect(g).connect(out)
  src.start(t0)
  lfo.start(t0)
  src.stop(t0 + seconds + 0.1)
  lfo.stop(t0 + seconds + 0.1)
}

// Dumpfes Geräusch: tiefer Ton, der schnell nach unten fällt, plus gedämpftes Rauschen
function thud(c: AudioContext, out: AudioNode, t: number) {
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = 'sine'
  o.frequency.setValueAtTime(150, t)
  o.frequency.exponentialRampToValueAtTime(48, t + 0.25)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.9, t + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35)
  o.connect(g).connect(out)
  o.start(t)
  o.stop(t + 0.4)
  const n = c.createBufferSource()
  n.buffer = noise(c)
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 320
  const ng = c.createGain()
  ng.gain.setValueAtTime(0.0001, t)
  ng.gain.exponentialRampToValueAtTime(0.5, t + 0.005)
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.12)
  n.connect(lp).connect(ng).connect(out)
  n.start(t)
  n.stop(t + 0.15)
}

// Schiedsrichterpfiff (Triller)
function whistle(c: AudioContext, out: AudioNode, t: number, dur: number) {
  const o = c.createOscillator()
  const trill = c.createOscillator()
  const tg = c.createGain()
  const g = c.createGain()
  o.type = 'sine'
  o.frequency.value = 2900
  trill.frequency.value = 28
  tg.gain.value = 120
  trill.connect(tg).connect(o.frequency)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.22, t + 0.02)
  g.gain.setValueAtTime(0.22, t + dur - 0.05)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(out)
  o.start(t)
  trill.start(t)
  o.stop(t + dur + 0.05)
  trill.stop(t + dur + 0.05)
}

export type Sound = 'correct' | 'almost' | 'wrong' | 'round' | 'trainingDay' | 'card' | 'tap'

export function play(sound: Sound) {
  const c = ac()
  if (!c) return
  const t = c.currentTime + 0.02
  const out = master(c)
  switch (sound) {
    case 'correct': // fröhliches Ding-Ding
      tone(c, out, 880, t, 0.18, 'triangle', 0.5)
      tone(c, out, 1318.5, t + 0.09, 0.32, 'triangle', 0.5)
      break
    case 'almost':
      tone(c, out, 660, t, 0.25, 'triangle', 0.4)
      break
    case 'wrong': // dumpfer Schlag (wie ein Ball gegen die Latte, ohne Tor)
      thud(c, out, t)
      break
    case 'tap':
      tone(c, out, 1200, t, 0.05, 'sine', 0.15)
      break
    case 'round': // Abpfiff + Applaus
      whistle(c, out, t, 0.28)
      whistle(c, out, t + 0.38, 0.28)
      whistle(c, out, t + 0.76, 0.7)
      applause(c, out, t + 1.0, 3.2)
      break
    case 'trainingDay': // Tor! Jubel, Applaus und Fanfare
      crowd(c, out, t, 4.5)
      applause(c, out, t + 0.2, 4.2, 22)
      ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(c, out, f, t + 0.1 + i * 0.12, i === 3 ? 0.7 : 0.25, 'square', 0.12))
      break
    case 'card': // Glitzer-Arpeggio + kurzer Applaus
      ;[1046.5, 1318.5, 1568, 2093].forEach((f, i) => tone(c, out, f, t + i * 0.07, 0.4, 'triangle', 0.3))
      applause(c, out, t + 0.3, 2.2, 10)
      break
  }
}

// Englisches Lob mit Namen (vorab aufgenommen), z. B. "Milan, you are so smart!"
const PRAISE = { card: 5, day: 3, club: 2 } as const
const NAMED = ['milan', 'marlon']
let praiseAudio: HTMLAudioElement | null = null
export function praise(kind: keyof typeof PRAISE, childId: string, delayMs = 0) {
  if (!soundOn() || !NAMED.includes(childId) || typeof Audio === 'undefined') return
  const i = Math.floor(Math.random() * PRAISE[kind])
  setTimeout(() => {
    try {
      praiseAudio?.pause()
      praiseAudio = new Audio(`/audio/praise/${kind}-${childId}-${i}.mp3`)
      void praiseAudio.play().catch(() => {})
    } catch {
      /* ignorieren */
    }
  }, delayMs)
}
