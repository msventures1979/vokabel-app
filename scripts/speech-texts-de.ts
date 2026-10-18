// Listet alle deutschen Texte (Lernwörter, Leserakete, Silben) mit Schlüssel als JSON.
// Aufruf: npx tsx scripts/speech-texts-de.ts > texts-de.json   (danach scripts/audio-bestof-de.py)
import { germanSheets } from '../src/data/german'
import { reimWoerter } from '../src/data/reime'
import { audioKeyDe, syllableText } from '../src/lib/speech'

const out = new Map<string, { key: string; text: string; say: string; kind: 'word' | 'syl' }>()
for (const { words } of germanSheets)
  for (const w of words) {
    out.set(audioKeyDe(w.en), { key: audioKeyDe(w.en), text: w.en, say: w.en, kind: 'word' })
    if ((w.syllables?.length ?? 1) > 1) {
      const t = syllableText(w.syllables!)
      out.set(audioKeyDe(t), { key: audioKeyDe(t), text: w.en, say: w.syllables!.join(', '), kind: 'syl' })
    }
  }
for (const w of reimWoerter()) if (!out.has(audioKeyDe(w))) out.set(audioKeyDe(w), { key: audioKeyDe(w), text: w, say: w, kind: 'word' })
console.log(JSON.stringify([...out.values()], null, 1))
