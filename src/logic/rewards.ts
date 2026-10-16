// Belohnungslogik: Sterne (unbegrenzt) und Trainingstage (höchstens einer pro Kalendertag).
import { addDays, isoWeekKey, type DateStr } from './dates'
import type { DayLog, Goal } from './types'

export const MIN_ACTIVE_SECONDS = 15 * 60
export const MIN_ANSWERS = 40
export const MAX_SECONDS_PER_ANSWER = 60
export const HALF_STARS_AFTER_SECONDS = 45 * 60

export const STARS = { typed: 10, choice: 5, almost: 3, flashcard: 2, perfectRound: 20 } as const

export interface DayRules {
  minSeconds: number
  minAnswers: number
}
export const DEFAULT_RULES: DayRules = { minSeconds: MIN_ACTIVE_SECONDS, minAnswers: MIN_ANSWERS }

export function rulesFor(child?: { settings?: { minMinutes?: number; minAnswers?: number } }): DayRules {
  return {
    minSeconds: (child?.settings?.minMinutes ?? MIN_ACTIVE_SECONDS / 60) * 60,
    minAnswers: child?.settings?.minAnswers ?? MIN_ANSWERS,
  }
}

export function qualifiesAsTrainingDay(log: Pick<DayLog, 'roundDone' | 'activeSeconds' | 'answers'>, rules: DayRules = DEFAULT_RULES): boolean {
  return log.roundDone && log.activeSeconds >= rules.minSeconds && log.answers >= rules.minAnswers
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

// Saisons (nur virtuelle Belohnungen): alle `requiredDays` Trainingstage gewinnt das Kind einen Pokal für die Vitrine,
// danach beginnt automatisch die nächste Saison. Keine Übergabe durch die Eltern nötig.
export const SEASON_TROPHIES = [
  { name: 'Meisterschale', icon: '🛡️' },
  { name: 'Goldener Pokal', icon: '🏆' },
  { name: 'Supercup', icon: '🥇' },
  { name: 'Champions-Pokal', icon: '🏆' },
  { name: 'Weltpokal', icon: '🌍' },
  { name: 'Goldener Schuh', icon: '👟' },
] as const

export function seasonFor(goal: Pick<Goal, 'startDate' | 'requiredDays'>, trainingDates: Set<DateStr>) {
  const len = Math.max(1, goal.requiredDays)
  let n = 0
  for (const d of trainingDates) if (d >= goal.startDate) n++
  const won = Math.floor(n / len)
  return {
    season: won + 1,
    won,
    progress: n % len,
    length: len,
    trophy: SEASON_TROPHIES[won % SEASON_TROPHIES.length],
  }
}

export const seasonTrophy = (i: number) => SEASON_TROPHIES[i % SEASON_TROPHIES.length]

// Aufstieg nur mit Sternen UND Trainingstagen (ein sehr langer Tag reicht nicht für den nächsten Aufstieg).
// Wer vor RULES_SINCE schon höher war (alte Regel: nur Sterne), behält seine Liga.
export const LEVELS = [
  { name: 'Jugend', stars: 0, days: 0 },
  { name: 'Kreisliga', stars: 300, days: 3 },
  { name: 'Regionalliga', stars: 1000, days: 8 },
  { name: 'Bundesliga', stars: 2500, days: 15 },
  { name: 'Nationalmannschaft', stars: 5000, days: 30 },
  { name: 'Weltstar', stars: 10000, days: 50 },
] as const

// Nach dem Weltstar: alle 2.500 Sterne ein Pokal für die Vitrine
export const TROPHY_STARS = 2500
export const TROPHIES = [
  { name: 'Goldener Schuh', icon: '👟' },
  { name: 'Meisterschale', icon: '🛡️' },
  { name: 'Champions-Pokal', icon: '🏆' },
  { name: 'Goldener Ball', icon: '⚽' },
  { name: 'Weltpokal', icon: '🌍' },
  { name: 'Supercup', icon: '🥇' },
] as const

export function levelFor(stars: number, days = 0, legacyStars = 0) {
  let idx = 0
  LEVELS.forEach((l, i) => {
    if ((stars >= l.stars && days >= l.days) || legacyStars >= l.stars) idx = i
  })
  const next = LEVELS[idx + 1]
  const starsToNext = next ? Math.max(0, next.stars - stars) : 0
  const daysToNext = next ? Math.max(0, next.days - days) : 0
  const starFrac = next ? Math.min(1, Math.max(0, (stars - LEVELS[idx].stars) / (next.stars - LEVELS[idx].stars))) : 1
  const dayFrac = next ? Math.min(1, Math.max(0, (days - LEVELS[idx].days) / Math.max(1, next.days - LEVELS[idx].days))) : 1
  const top = idx === LEVELS.length - 1
  const trophies = top ? Math.max(0, Math.floor((stars - LEVELS[idx].stars) / TROPHY_STARS)) : 0
  return {
    index: idx,
    name: LEVELS[idx].name,
    next: next?.name,
    progress: Math.min(starFrac, dayFrac),
    starsToNext,
    daysToNext,
    trophies,
    starsToTrophy: top ? TROPHY_STARS - ((stars - LEVELS[idx].stars) % TROPHY_STARS) : 0,
  }
}

export function levelHint(l: ReturnType<typeof levelFor>): string {
  if (!l.next) return `noch ${l.starsToTrophy} Sterne bis zum nächsten Pokal`
  const parts = []
  if (l.starsToNext > 0) parts.push(`${l.starsToNext} Sterne`)
  if (l.daysToNext > 0) parts.push(l.daysToNext === 1 ? '1 Trainingstag' : `${l.daysToNext} Trainingstage`)
  return parts.length ? `noch ${parts.join(' und ')} bis ${l.next}` : `gleich geht's in die ${l.next}!`
}

export function trophyAt(i: number) {
  return TROPHIES[i % TROPHIES.length]
}
