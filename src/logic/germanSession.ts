// Deutsch-Runde für Grundschulkinder: Lernwörter des aktuellen Lernwörterblatts mit Silben und Schreiben,
// fällige Lernwörter früherer Blätter zur Wiederholung, am Ende die Leserakete.
import { isDue } from './scheduler'
import type { DateStr } from './dates'
import type { Progress, Word, WordList } from './types'
import { BLUMEN, REIMPAARE } from '../data/reime'

type Rng = () => number

export type GermanStep =
  | { kind: 'blume'; end: string; petals: { front: string; real: boolean }[] }
  | { kind: 'reim'; word: string; options: string[]; correct: string }
  | { kind: 'silben'; word: Word }
  | { kind: 'schreiben'; word: Word }
  | { kind: 'rakete'; words: Word[] }

const MAX_REVIEW = 4

function shuffle<T>(a: T[], rng: Rng): T[] {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

// Aktuelles Blatt = das mit der höchsten Nummer im Titel ("Lernwörterblatt 3" nach "Lernwörterblatt 2")
const isExtra = (id: string) => id.startsWith('de-x')
const EXTRA_NEW_PER_ROUND = 2

export function currentSheet(lists: WordList[], pool: Word[]): WordList | undefined {
  const withWords = lists.filter((l) => pool.some((w) => w.listId === l.id))
  const school = withWords.filter((l) => !isExtra(l.id))
  if (school.length) return [...school].sort((a, b) => a.title.localeCompare(b.title, 'de', { numeric: true })).at(-1)
  return [...withWords].sort((a, b) => a.title.localeCompare(b.title, 'de', { numeric: true })).at(-1)
}

export function buildGermanRound(pool: Word[], lists: WordList[], progress: Map<string, Progress>, day: DateStr, rng: Rng = Math.random): GermanStep[] {
  const sheet = currentSheet(lists, pool)
  if (!sheet) return []
  const lern = pool.filter((w) => w.listId === sheet.id && w.kind !== 'lese').sort((a, b) => a.order - b.order)
  const lese = pool.filter((w) => w.listId === sheet.id && w.kind === 'lese')
  const review = shuffle(
    pool.filter((w) => w.listId !== sheet.id && w.kind !== 'lese' && progress.get(w.id) && isDue(progress.get(w.id)!, day)),
    rng,
  ).slice(0, MAX_REVIEW)

  // Zusatzwörter: jede Runde bis zu 2 neue (in Listenreihenfolge), wenn ein Schulblatt Hauptsache ist
  const extraNew = isExtra(sheet.id)
    ? []
    : pool
        .filter((w) => isExtra(w.listId) && w.kind !== 'lese' && !progress.get(w.id))
        .sort((a, b) => a.listId.localeCompare(b.listId) || a.order - b.order)
        .slice(0, EXTRA_NEW_PER_ROUND)
  const extraLese = shuffle(pool.filter((w) => isExtra(w.listId) && w.kind === 'lese'), rng).slice(0, 3)

  const steps: GermanStep[] = []
  for (const w of [...lern, ...extraNew]) {
    if ((w.syllables?.length ?? 1) > 1) steps.push({ kind: 'silben', word: w })
    steps.push({ kind: 'schreiben', word: w })
  }
  for (const w of review) steps.push({ kind: 'schreiben', word: w })
  steps.push(...rhymeSteps(rng))
  const rocket = shuffle([...lese, ...lern, ...(isExtra(sheet.id) ? [] : extraLese)], rng)
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
