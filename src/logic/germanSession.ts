// Deutsch-Runde für Grundschulkinder: Lernwörter des aktuellen Lernwörterblatts mit Silben und Schreiben,
// fällige Lernwörter früherer Blätter zur Wiederholung, am Ende die Leserakete.
import { isDue } from './scheduler'
import type { DateStr } from './dates'
import type { Progress, Word, WordList } from './types'
import { BLUMEN, REIMPAARE } from '../data/reime'

import { shuffle, type Rng } from './session'

export type GermanStep =
  | { kind: 'blume'; end: string; petals: { front: string; real: boolean }[] }
  | { kind: 'reim'; word: string; options: string[]; correct: string }
  | { kind: 'silben'; word: Word }
  | { kind: 'schreiben'; word: Word }
  | { kind: 'rakete'; words: Word[] }

const MAX_REVIEW = 4

// Neue Lernwörter kommen der Reihe nach aus den Lernwörterblättern ("Lernwörterblatt 3" nach "Lernwörterblatt 2"),
// danach aus den Extra-Listen. Pro Tag so viele neue, wie beim Kind eingestellt (newPerDay).
// Heute schon eingeführte Wörter werden in weiteren Runden am selben Tag mitgeübt, ältere über die Wiederholung.
const isExtra = (id: string) => id.startsWith('de-x')
const byTitle = (a: WordList, b: WordList) => a.title.localeCompare(b.title, 'de', { numeric: true })

function lernQueue(lists: WordList[], pool: Word[]): Word[] {
  const order = [...lists.filter((l) => !isExtra(l.id)).sort(byTitle), ...lists.filter((l) => isExtra(l.id)).sort(byTitle)]
  return order.flatMap((l) => pool.filter((w) => w.listId === l.id && w.kind !== 'lese').sort((a, b) => a.order - b.order))
}

// Die Lernwörter dieser Runde: heute schon begonnene plus neue bis zum Tageslimit.
// Ist alles geübt, die Wörter des neuesten Blatts zum Weiterüben.
export function roundWords(lists: WordList[], pool: Word[], progress: Map<string, Progress>, day: DateStr, perDay: number): Word[] {
  const queue = lernQueue(lists, pool)
  const todays = queue.filter((w) => progress.get(w.id)?.introducedOn === day)
  const fresh = queue.filter((w) => !progress.has(w.id)).slice(0, Math.max(0, perDay - todays.length))
  const words = [...todays, ...fresh]
  if (words.length) return words
  const latest = lists.filter((l) => !isExtra(l.id) && pool.some((w) => w.listId === l.id)).sort(byTitle).at(-1)
  return latest ? queue.filter((w) => w.listId === latest.id) : []
}

// Für die Anzeige in der Kabine: aus welchem Blatt die Wörter gerade kommen
export function currentSheet(lists: WordList[], pool: Word[], progress?: Map<string, Progress>, day?: DateStr, perDay = 7): WordList | undefined {
  const words = progress && day ? roundWords(lists, pool, progress, day, perDay) : []
  const id = words.at(-1)?.listId ?? lists.filter((l) => pool.some((w) => w.listId === l.id)).sort(byTitle).at(-1)?.id
  return lists.find((l) => l.id === id)
}

export function buildGermanRound(pool: Word[], lists: WordList[], progress: Map<string, Progress>, day: DateStr, perDay = 7, rng: Rng = Math.random): GermanStep[] {
  const lern = roundWords(lists, pool, progress, day, perDay)
  if (!lern.length) return []
  const ids = new Set(lern.map((w) => w.id))
  const sheets = new Set(lern.map((w) => w.listId))
  const review = shuffle(
    pool.filter((w) => !ids.has(w.id) && w.kind !== 'lese' && progress.get(w.id) && isDue(progress.get(w.id)!, day)),
    rng,
  ).slice(0, MAX_REVIEW)
  const lese = pool.filter((w) => sheets.has(w.listId) && w.kind === 'lese')
  const extraLese = shuffle(pool.filter((w) => isExtra(w.listId) && !sheets.has(w.listId) && w.kind === 'lese'), rng).slice(0, 3)

  const steps: GermanStep[] = []
  for (const w of lern) {
    if ((w.syllables?.length ?? 1) > 1) steps.push({ kind: 'silben', word: w })
    steps.push({ kind: 'schreiben', word: w })
  }
  for (const w of review) steps.push({ kind: 'schreiben', word: w })
  steps.push(...rhymeSteps(rng))
  const rocket = shuffle([...lese, ...lern, ...extraLese], rng)
  if (rocket.length) steps.push({ kind: 'rakete', words: rocket })
  return steps
}

export interface Tile {
  id: number
  ch: string
}

// Buchstaben-Kärtchen: alle Buchstaben des Wortes plus Ablenker (andere Groß-/Kleinschreibung, ähnliche Buchstaben)
export function lettersFor(word: string, rng: Rng = Math.random): Tile[] {
  const chars = [...word]
  const extra: string[] = []
  const first = chars[0]
  const flipped = first === first.toUpperCase() ? first.toLowerCase() : first.toUpperCase()
  if (flipped !== first) extra.push(flipped)
  const similar: Record<string, string> = { ß: 's', ä: 'a', ü: 'u', ö: 'o', a: 'ä', u: 'ü', o: 'ö', b: 'd', d: 'b', s: 'z', z: 's', e: 'i', i: 'e', m: 'n', n: 'm', h: 'k', k: 'h', g: 'k', t: 'd' }
  for (const c of shuffle(chars.slice(1), rng)) {
    const s = similar[c]
    if (s && !extra.includes(s)) extra.push(s)
    if (extra.length >= 3) break
  }
  while (extra.length < 3) {
    const r = 'aeinrstlmh'[Math.floor(rng() * 10)]
    if (!extra.includes(r)) extra.push(r)
  }
  return shuffle([...chars, ...extra], rng).map((ch, id) => ({ id, ch }))
}

// Reim-Übungen: eine Silben-Blume (3 echte Wörter + 1 Scherz-Blatt) und zwei Reimpaare
export function rhymeSteps(rng: Rng = Math.random): GermanStep[] {
  const b = BLUMEN[Math.floor(rng() * BLUMEN.length)]
  const real = shuffle(b.real, rng).slice(0, 3)
  const fake = b.fake[Math.floor(rng() * b.fake.length)]
  const blume: GermanStep = {
    kind: 'blume',
    end: b.end,
    petals: shuffle([...real.map((front) => ({ front, real: true })), { front: fake, real: false }], rng),
  }
  const pairs = shuffle(REIMPAARE, rng).slice(0, 2)
  const reime: GermanStep[] = pairs.map(([word, rhyme]) => {
    const others = shuffle(
      REIMPAARE.filter(([w]) => w !== word).map(([, r]) => r),
      rng,
    ).slice(0, 2)
    return { kind: 'reim', word, correct: rhyme, options: shuffle([rhyme, ...others], rng) }
  })
  return [blume, ...reime]
}
