// Karteikasten mit 5 Fächern. Eigenes Modul, damit es später durch FSRS ersetzt werden kann.
import { addDays, type DateStr } from './dates'
import type { Progress } from './types'

export const LEARNED_BOX = 6
// Abstand in Tagen, wenn ein Wort in Fach n liegt
export const INTERVALS: Record<number, number> = { 1: 1, 2: 2, 3: 4, 4: 7, 5: 14 }

export function newProgress(childId: string, wordId: string): Progress {
  return { id: `${childId}:${wordId}`, childId, wordId, box: 0, due: null, wrongStreak: 0, errors: 0 }
}

export function isDue(p: Progress, day: DateStr): boolean {
  return p.box >= 1 && p.box < LEARNED_BOX && p.due !== null && p.due <= day
}

// Ein neues Wort wurde kennengelernt und geübt: ab in Fach 1, morgen wieder dran.
export function introduce(p: Progress, day: DateStr): Progress {
  if (p.box > 0) return p
  return { ...p, box: 1, due: addDays(day, INTERVALS[1]), introducedOn: day }
}

// Nur fällige Abfragen verändern das Fach.
export function review(p: Progress, correct: boolean, day: DateStr): Progress {
  if (correct) {
    const box = Math.min(p.box + 1, LEARNED_BOX)
    return { ...p, box, wrongStreak: 0, due: box >= LEARNED_BOX ? null : addDays(day, INTERVALS[box]) }
  }
  const wrongStreak = p.wrongStreak + 1
  const box = wrongStreak >= 2 ? 1 : Math.max(1, p.box - 1)
  return { ...p, box, wrongStreak, errors: p.errors + 1, due: addDays(day, 1) }
}
