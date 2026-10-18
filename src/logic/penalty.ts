// Elfmeterschießen nach der Runde: 5 Schüsse, je 3 Antworten (= linke Ecke, Mitte, rechte Ecke).
// Bevorzugt Wörter, die zuletzt schwer waren; ändert den Karteikasten nicht (reine Wiederholung mit Spaß).
import type { Progress, Word } from './types'

export const SHOTS = 5
export const GOAL_STARS = 5 // Sterne pro Tor

type Rng = () => number

export interface Shot {
  word: Word
  dir: 'de-en' | 'image' | 'hear-de' // Milan: deutsches Wort → englisches wählen; Marlon: englisches Wort hören → Bild wählen; Deutsch: Wort hören → richtig geschriebenes Wort wählen
  options: string[] // genau 3, in Reihenfolge links, Mitte, rechts
  correct: number // Index der richtigen Antwort
}

function shuffle<T>(a: T[], rng: Rng): T[] {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

export function pickShots(pool: Word[], progress: Map<string, Progress>, mode: 'write' | 'picture' | 'de', rng: Rng = Math.random): Shot[] {
  const dir = mode === 'de' ? 'hear-de' : mode === 'picture' ? 'image' : 'de-en'
  const label = (w: Word) => (dir === 'image' ? (w.image ?? '') : dir === 'hear-de' ? w.en : w.answers[0])
  // Deutsch: bevorzugt Lernwörter; reichen die nicht, auch Lesewörter
  const lern = dir === 'hear-de' ? pool.filter((w) => w.kind !== 'lese') : pool
  const usable = (lern.length >= SHOTS ? lern : pool).filter((w) => label(w))
  if (usable.length < 3) return []

  // Kandidaten: schon eingeführte Wörter, die schwersten zuerst; reicht das nicht, auch neue Wörter
  const known = usable.filter((w) => (progress.get(w.id)?.box ?? 0) > 0)
  const hardness = (w: Word) => {
    const p = progress.get(w.id)
    return p ? p.errors * 2 + p.wrongStreak * 3 + (6 - p.box) : 0
  }
  const hard = shuffle(known, rng)
    .sort((a, b) => hardness(b) - hardness(a))
    .slice(0, 3)
  const rest = shuffle(
    (known.length >= SHOTS ? known : usable).filter((w) => !hard.includes(w)),
    rng,
  )
  const chosen = shuffle([...hard, ...rest].slice(0, SHOTS), rng)

  return chosen.map((word) => {
    const correctLabel = label(word)
    // Ablenker möglichst aus derselben Liste (gleiches Thema), sonst aus allen
    const same = shuffle(
      usable.filter((w) => w.listId === word.listId && label(w) !== correctLabel),
      rng,
    )
    const other = shuffle(
      usable.filter((w) => w.listId !== word.listId && label(w) !== correctLabel),
      rng,
    )
    const distract: string[] = []
    for (const w of [...same, ...other]) {
      if (!distract.includes(label(w))) distract.push(label(w))
      if (distract.length === 2) break
    }
    const options = shuffle([correctLabel, ...distract], rng)
    return { word, dir, options, correct: options.indexOf(correctLabel) }
  })
}

// Ecke, in die der Torwart springt: hält er (falsche Antwort), springt er in die Schussecke, sonst in eine andere
export function keeperCorner(shotCorner: number, saved: boolean, rng: Rng = Math.random): number {
  if (saved) return shotCorner
  const others = [0, 1, 2].filter((c) => c !== shotCorner)
  return others[Math.floor(rng() * others.length)]
}
