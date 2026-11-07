// Elfmeterschießen nach der Runde: 5 Schüsse, je 3 Antworten (= linke Ecke, Mitte, rechte Ecke).
// Bevorzugt Wörter, die zuletzt schwer waren; ändert den Karteikasten nicht (reine Wiederholung mit Spaß).
import type { Progress, Word } from './types'

export const SHOTS = 5
export const GOAL_STARS = 5 // Sterne pro Tor

import { shuffle, type Rng } from './session'

export interface Shot {
  word: Word
  dir: 'de-en' | 'image' | 'hear-de' | 'spell-de' // spell-de: ohne Aufnahme das richtig geschriebene Wort wählen; Milan: deutsches Wort → englisches wählen; Marlon: englisches Wort hören → Bild wählen; Deutsch: Wort hören → richtig geschriebenes Wort wählen
  options: string[] // genau 3, in Reihenfolge links, Mitte, rechts
  correct: number // Index der richtigen Antwort
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
    // Deutsch ohne Aufnahme: richtig geschriebenes Wort zwischen zwei falsch geschriebenen finden
    if (dir === 'hear-de' && !word.voice) {
      const wrong = misspellings(word.en, rng).slice(0, 2)
      if (wrong.length === 2) {
        const options = shuffle([correctLabel, ...wrong], rng)
        return { word, dir: 'spell-de' as const, options, correct: options.indexOf(correctLabel) }
      }
    }
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

// Typische Schreibfehler von Erstklässlern, damit die falschen Wörter plausibel aussehen
export function misspellings(word: string, rng: Rng = Math.random): string[] {
  const out = new Set<string>()
  const add = (w: string) => {
    if (w && w !== word && w.toLowerCase() !== word.toLowerCase()) out.add(w)
  }
  const first = word[0]
  // doppelte Mitlaute vereinfachen / einfache verdoppeln
  add(word.replace(/([bdfgklmnprstz])\1/, '$1'))
  const single = word.slice(1).search(/[aeiouäöü][lmnpt][aeiou]/)
  if (single >= 0) add(word.slice(0, single + 3) + word[single + 2] + word.slice(single + 3))
  // Dehnungs-h, ie/i, ß/s
  add(word.replace('ie', 'i'))
  add(word.replace(/ah|eh|oh|uh/, (m) => m[0]))
  add(word.replace('ß', 's'))
  add(word.replace('ß', 'ss'))
  // Endungen und ähnliche Laute
  add(word.replace(/er$/, 'a'))
  add(word.replace(/en$/, 'n'))
  add(word.replace(/d$/, 't'))
  add(word.replace(/g$/, 'k'))
  add(word.replace(/t$/, 'd'))
  add(word.replace('ei', 'ai'))
  add(word.replace('eu', 'oi'))
  add(word.replace('sch', 'sh'))
  const typical = [...out]
  // nur als Ersatz: Selbstlaute vertauschen
  add(word.replace(/^(.)(.)/, (_, a: string, b: string) => a + (b === 'a' ? 'e' : b === 'e' ? 'ä' : b)))
  add(word.replace(/([aeiou])/, (v) => ({ a: 'o', e: 'i', i: 'e', o: 'u', u: 'o' })[v] ?? v))
  const fallback = [...out].filter((w) => !typical.includes(w))
  // Groß-/Kleinschreibung am Anfang
  const flipped = (first === first.toUpperCase() ? first.toLowerCase() : first.toUpperCase()) + word.slice(1)
  // typische Fehler zuerst (leicht gemischt), Vokal-Tausch nur als Ersatz
  const list = [...shuffle(typical, rng), ...fallback]
  // die Großschreibung als Fehler nur, wenn sonst zu wenig da ist
  if (list.length < 2 && flipped !== word) list.push(flipped)
  return list
}

// Ecke, in die der Torwart springt: hält er (falsche Antwort), springt er in die Schussecke, sonst in eine andere
export function keeperCorner(shotCorner: number, saved: boolean, rng: Rng = Math.random): number {
  if (saved) return shotCorner
  const others = [0, 1, 2].filter((c) => c !== shotCorner)
  return others[Math.floor(rng() * others.length)]
}
