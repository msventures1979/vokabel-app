// Baut die Abfolge einer Trainingsrunde.
import type { Word } from './types'

export type Phase = 'review' | 'practice'
export type Step =
  | { kind: 'intro'; wordId: string }
  | { kind: 'choice'; wordId: string; dir: 'en-de' | 'de-en'; phase: Phase }
  | { kind: 'type'; wordId: string; phase: Phase }
  | { kind: 'flash'; wordId: string; phase: Phase }

export type Rng = () => number

export function shuffle<T>(arr: T[], rng: Rng = Math.random): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const MAX_REVIEWS_PER_ROUND = 25

// Aufwärmen (fällige Wörter), dann neue Wörter kennenlernen und in drei Durchgängen üben.
export function buildRound(dueIds: string[], newIds: string[], rng: Rng = Math.random): Step[] {
  const steps: Step[] = []
  for (const id of shuffle(dueIds, rng).slice(0, MAX_REVIEWS_PER_ROUND)) steps.push({ kind: 'type', wordId: id, phase: 'review' })
  steps.push(...newWordSteps(newIds, rng))
  return steps
}

export function newWordSteps(newIds: string[], rng: Rng = Math.random): Step[] {
  const steps: Step[] = []
  for (const id of newIds) steps.push({ kind: 'intro', wordId: id })
  for (const id of shuffle(newIds, rng)) steps.push({ kind: 'choice', wordId: id, dir: 'en-de', phase: 'practice' })
  for (const id of shuffle(newIds, rng)) steps.push({ kind: 'choice', wordId: id, dir: 'de-en', phase: 'practice' })
  for (const id of shuffle(newIds, rng)) steps.push({ kind: 'type', wordId: id, phase: 'practice' })
  return steps
}

// Extra-Training mit bekannten Wörtern: verändert keine Fächer.
export function buildExtraPractice(knownIds: string[], count = 12, rng: Rng = Math.random): Step[] {
  if (knownIds.length === 0) return []
  const steps: Step[] = []
  let pool: string[] = []
  for (let i = 0; i < count; i++) {
    if (pool.length === 0) pool = shuffle(knownIds, rng)
    const id = pool.pop()!
    const r = rng()
    if (r < 0.45) steps.push({ kind: 'type', wordId: id, phase: 'practice' })
    else if (r < 0.65) steps.push({ kind: 'choice', wordId: id, dir: 'de-en', phase: 'practice' })
    else if (r < 0.8) steps.push({ kind: 'choice', wordId: id, dir: 'en-de', phase: 'practice' })
    else steps.push({ kind: 'flash', wordId: id, phase: 'practice' })
  }
  return steps
}

// Drei falsche Antwortmöglichkeiten aus demselben Wortvorrat.
export function choiceOptions(word: Word, pool: Word[], dir: 'en-de' | 'de-en', rng: Rng = Math.random): string[] {
  const label = (w: Word) => (dir === 'en-de' ? w.de : w.answers[0])
  const correct = label(word)
  const others = shuffle(
    pool.filter((w) => w.id !== word.id && label(w) !== correct),
    rng,
  )
  const distractors: string[] = []
  for (const w of others) {
    if (!distractors.includes(label(w))) distractors.push(label(w))
    if (distractors.length === 3) break
  }
  return shuffle([correct, ...distractors], rng)
}
