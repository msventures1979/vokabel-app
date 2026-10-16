// Belohnungslogik: Sterne (unbegrenzt) und Trainingstage (höchstens einer pro Kalendertag).
import { addDays, isoWeekKey, type DateStr } from './dates'
import type { DayLog, Goal } from './types'

export const MIN_ACTIVE_SECONDS = 15 * 60
export const MIN_ANSWERS = 40
export const MAX_SECONDS_PER_ANSWER = 60
export const HALF_STARS_AFTER_SECONDS = 45 * 60

export const STARS = { typed: 10, choice: 5, almost: 3, flashcard: 2, perfectRound: 20 } as const

export function qualifiesAsTrainingDay(log: Pick<DayLog, 'roundDone' | 'activeSeconds' | 'answers'>): boolean {
  return log.roundDone && log.activeSeconds >= MIN_ACTIVE_SECONDS && log.answers >= MIN_ANSWERS
}

// Ab 45 Minuten gibt es nur noch halbe Sterne.
export function starsFor(base: number, activeSecondsToday: number): number {
  return activeSecondsToday >= HALF_STARS_AFTER_SECONDS ? Math.floor(base / 2) : base
}

// Aktive Zeit seit der letzten Eingabe, gedeckelt auf 60 Sekunden.
export function activeDelta(lastActivityMs: number, nowMs: number): number {
  return Math.max(0, Math.min((nowMs - lastActivityMs) / 1000, MAX_SECONDS_PER_ANSWER))
}

// Serie: Trainingstage in Folge. Ein Joker pro Kalenderwoche überbrückt einen verpassten Tag.
// Heute zählt erst, wenn der Trainingstag erreicht ist; ein offener heutiger Tag bricht die Serie nicht.
export function streak(trainingDates: Set<DateStr>, day: DateStr): { days: number; jokerUsedThisWeek: boolean } {
  const usedJokers = new Set<string>()
  let count = 0
  let cursor = trainingDates.has(day) ? day : addDays(day, -1)
  for (let i = 0; i < 400; i++) {
    if (trainingDates.has(cursor)) {
      count++
    } else {
      const week = isoWeekKey(cursor)
      // Joker nur, wenn davor überhaupt noch trainiert wurde
      if (!usedJokers.has(week) && trainingDates.has(addDays(cursor, -1))) usedJokers.add(week)
      else break
    }
    cursor = addDays(cursor, -1)
  }
  return { days: count, jokerUsedThisWeek: usedJokers.has(isoWeekKey(day)) }
}

export function goalProgress(goal: Goal, trainingDates: Set<DateStr>): number {
  let n = 0
  for (const d of trainingDates) if (d >= goal.startDate) n++
  return Math.min(n, goal.requiredDays)
}

export const LEVELS = [
  { name: 'Jugend', stars: 0 },
  { name: 'Kreisliga', stars: 300 },
  { name: 'Regionalliga', stars: 1000 },
  { name: 'Bundesliga', stars: 2500 },
  { name: 'Nationalmannschaft', stars: 5000 },
  { name: 'Weltstar', stars: 10000 },
] as const

export function levelFor(stars: number) {
  let idx = 0
  LEVELS.forEach((l, i) => {
    if (stars >= l.stars) idx = i
  })
  const next = LEVELS[idx + 1]
  return {
    index: idx,
    name: LEVELS[idx].name,
    next: next?.name,
    progress: next ? (stars - LEVELS[idx].stars) / (next.stars - LEVELS[idx].stars) : 1,
    starsToNext: next ? next.stars - stars : 0,
  }
}
