// Eigene Sprachaufnahmen der Eltern für deutsche Lernwörter.
// Aufnahme mit dem Mikrofon, Stille am Anfang/Ende abschneiden, Lautstärke angleichen und als kleine MP3
// (Mono, 22 kHz, 40 kbit/s, ca. 10 KB pro Wort) speichern. MP3 spielt auf allen Geräten, auch iPhone/iPad.

const RATE = 22050

// Leise Ränder abschneiden (mit etwas Luft), dann auf gleiche Lautstärke bringen
export function trimAndNormalize(samples: Float32Array, rate: number, threshold = 0.03): Float32Array {
  let peak = 0
  for (const v of samples) peak = Math.max(peak, Math.abs(v))
  if (peak < 0.005) return new Float32Array(0) // nichts gesagt
  const limit = Math.max(threshold * peak, 0.008)
  let start = 0
  let end = samples.length - 1
  while (start < samples.length && Math.abs(samples[start]) < limit) start++
  while (end > start && Math.abs(samples[end]) < limit) end--
  const pad = Math.round(rate * 0.08)
  const from = Math.max(0, start - pad)
  const to = Math.min(samples.length, end + pad * 2)
  const out = samples.slice(from, to)
  const gain = 0.9 / peak
  for (let i = 0; i < out.length; i++) out[i] *= gain
  // weich ein- und ausblenden, damit es nicht knackt
  const fade = Math.min(Math.round(rate * 0.01), Math.floor(out.length / 2))
  for (let i = 0; i < fade; i++) {
    out[i] *= i / fade
    out[out.length - 1 - i] *= i / fade
  }
  return out
}

export function toInt16(samples: Float32Array): Int16Array {
  const out = new Int16Array(samples.length)
  for (let i = 0; i < samples.length; i++) out[i] = Math.max(-1, Math.min(1, samples[i])) * 0x7fff
  return out
}

async function encodeMp3(samples: Float32Array): Promise<Uint8Array> {
  const { Mp3Encoder } = await import('@breezystack/lamejs')
  const enc = new Mp3Encoder(1, RATE, 40)
  const pcm = toInt16(samples)
  const parts: Uint8Array[] = []
  for (let i = 0; i < pcm.length; i += 1152) parts.push(enc.encodeBuffer(pcm.subarray(i, i + 1152)))
  parts.push(enc.flush())
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

function toDataUrl(bytes: Uint8Array, mime: string): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return `data:${mime};base64,${btoa(bin)}`
}

// Aufnahme (beliebiges Browser-Format) → MP3 als data:-URL; null, wenn nichts zu hören war
export async function blobToVoice(blob: Blob): Promise<string | null> {
  const ctx = new AudioContext()
  try {
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer())
    const length = Math.ceil(decoded.duration * RATE)
    const off = new OfflineAudioContext(1, Math.max(1, length), RATE)
    const src = off.createBufferSource()
    src.buffer = decoded
    src.connect(off.destination)
    src.start()
    const mono = (await off.startRendering()).getChannelData(0)
    const clean = trimAndNormalize(mono, RATE)
    if (clean.length < RATE * 0.15) return null
    return toDataUrl(await encodeMp3(clean), 'audio/mpeg')
  } finally {
    void ctx.close()
  }
}

export interface Recording {
  stop: () => Promise<Blob>
  cancel: () => void
}

// Mikrofon starten; stop() liefert die Aufnahme
export async function startRecording(): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } })
  const rec = new MediaRecorder(stream)
  const chunks: Blob[] = []
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
  rec.start()
  const release = () => stream.getTracks().forEach((t) => t.stop())
  return {
    stop: () =>
      new Promise<Blob>((resolve) => {
        rec.onstop = () => {
          release()
          resolve(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }))
        }
        if (rec.state !== 'inactive') rec.stop()
        else rec.onstop(new Event('stop'))
      }),
    cancel: () => {
      if (rec.state !== 'inactive') rec.stop()
      release()
    },
  }
}
