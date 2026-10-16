// Listet alle Texte, die die App vorlesen kann (Wörter, Beispielsätze, Sammelkarten), als JSON.
// Aufruf: npx tsx scripts/speech-texts.ts > texts.json   (danach scripts/make-audio.py)
import { unit1Words } from '../src/data/en-unit1'
import { starterWords } from '../src/data/starter'
import { CARDS } from '../src/logic/album'
import { audioKey, speakable } from '../src/lib/speech'

const texts = new Map<string, string>()
const add = (t?: string) => {
  if (!t) return
  const s = speakable(t)
  if (s) texts.set(audioKey(s), s)
}
for (const w of [...unit1Words, ...starterWords]) {
  add(w.en)
  add(w.example)
}
for (const c of CARDS) add(c.en)
console.log(JSON.stringify([...texts].map(([key, text]) => ({ key, text })), null, 1))
