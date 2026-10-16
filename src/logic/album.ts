// Sammelalbum: erfundene Spielerkarten in erfundenen Vereinen (je 11 Spieler, 4-3-3).
// Jede Karte bringt ein englisches Fußballwort mit.
// Regel ab RULES_SINCE: höchstens eine neue Karte pro Trainingstag (nächste offene Position).
// Was vorher nach den alten Regeln (Sterne, Trainingstage, Serie) freigeschaltet war, bleibt erhalten.
// Alles wird nur aus abgeglichenen Daten berechnet, dadurch ist das Album auf allen Geräten gleich.
import { addDays, type DateStr } from './dates'

export const RULES_SINCE: DateStr = '2026-10-17'

export type Rarity = 'bronze' | 'silver' | 'gold' | 'legend'
export type Line = 'tor' | 'abwehr' | 'mittelfeld' | 'sturm'
type LegacyKind = 'stars' | 'days' | 'streak' | 'words'

export interface Club {
  id: string
  name: string
  short: string
  icon: string
  colors: [string, string] // Hauptfarbe, Zweitfarbe
  cheer: string // englischer Ruf beim vollständigen Team
}

export const CLUBS: Club[] = [
  { id: 'k1', name: 'Kurpfalz Kickers', short: 'KK', icon: '🦁', colors: ['#d62828', '#f4f1e8'], cheer: 'Kickers, Kickers!' },
  { id: 'k2', name: 'Neckar United', short: 'NU', icon: '🌊', colors: ['#1d4ed8', '#f4f1e8'], cheer: 'United!' },
  { id: 'k3', name: 'Rhein Rockets', short: 'RR', icon: '🚀', colors: ['#111827', '#ffc940'], cheer: 'Rockets!' },
]

export interface CardDef {
  id: string
  club: string
  line: Line
  name: string
  position: string
  icon: string
  en: string
  de: string
  rarity: Rarity
  legacy?: { kind: LegacyKind; value: number } // alte Freischaltregel (nur für den Stand vor RULES_SINCE)
}

const c = (id: string, club: string, line: Line, name: string, position: string, icon: string, en: string, de: string, rarity: Rarity, legacy?: [LegacyKind, number]): CardDef => ({
  id, club, line, name, position, icon, en, de, rarity, ...(legacy ? { legacy: { kind: legacy[0], value: legacy[1] } } : {}),
})

// Reihenfolge = Reihenfolge, in der neue Karten kommen (Verein für Verein)
export const CARDS: CardDef[] = [
  // Kurpfalz Kickers
  c('c01', 'k1', 'sturm', 'Kicky Kim', 'Sturm', '⚡', 'kick-off', 'der Anstoß', 'bronze', ['days', 1]),
  c('c02', 'k1', 'mittelfeld', 'Benny Ball', 'Mittelfeld', '⚽', 'ball', 'der Ball', 'bronze', ['stars', 25]),
  c('c03', 'k1', 'sturm', 'Toni Tor', 'Sturm', '🥅', 'goal', 'das Tor', 'bronze', ['stars', 75]),
  c('c04', 'k1', 'abwehr', 'Mats Mauer', 'Abwehr', '🧱', 'defender', 'der Verteidiger', 'bronze', ['stars', 150]),
  c('c05', 'k1', 'mittelfeld', 'Paula Pass', 'Mittelfeld', '🎯', 'pass', 'der Pass', 'bronze', ['days', 3]),
  c('c06', 'k1', 'tor', 'Kalle Keeper', 'Tor', '🧤', 'keeper', 'der Torwart', 'bronze', ['stars', 250]),
  c('c08', 'k1', 'abwehr', 'Lotte Lauf', 'Abwehr links', '👟', 'boots', 'die Fußballschuhe', 'bronze', ['stars', 400]),
  c('c09', 'k1', 'sturm', 'Hugo Header', 'Sturm', '🦒', 'header', 'der Kopfball', 'bronze', ['days', 5]),
  c('c10', 'k1', 'mittelfeld', 'Ella Ecke', 'Mittelfeld', '🚩', 'corner', 'die Ecke', 'bronze', ['stars', 600]),
  c('c11', 'k1', 'abwehr', 'Max Match', 'Kapitän, Abwehr', '🤝', 'match', 'das Spiel', 'bronze', ['stars', 850]),
  c('c13', 'k1', 'abwehr', 'Dora Dribbel', 'Abwehr rechts', '🌀', 'dribble', 'dribbeln', 'bronze', ['stars', 1150]),
  // Neckar United
  c('c07', 'k2', 'sturm', 'Fips Fan', 'Sturm', '📣', 'fan', 'der Fan', 'silver', ['words', 10]),
  c('c12', 'k2', 'sturm', 'Rico Rakete', 'Sturm', '🚀', 'shoot', 'schießen', 'silver', ['streak', 3]),
  c('c14', 'k2', 'abwehr', 'Willi Wand', 'Abwehr', '🛡️', 'wall', 'die Mauer', 'silver', ['days', 10]),
  c('c15', 'k2', 'abwehr', 'Sina Schiri', 'Abwehr', '⏱️', 'referee', 'der Schiedsrichter', 'silver', ['stars', 1500]),
  c('c16', 'k2', 'mittelfeld', 'Coach Carlo', 'Spielmacher', '📋', 'coach', 'der Trainer', 'silver', ['words', 25]),
  c('c17', 'k2', 'mittelfeld', 'Fritzi Freistoß', 'Mittelfeld', '🌪️', 'free kick', 'der Freistoß', 'silver', ['stars', 2000]),
  c('c18', 'k2', 'abwehr', 'Pepe Pfeife', 'Abwehr', '📯', 'whistle', 'die Pfeife', 'silver', ['days', 15]),
  c('c19', 'k2', 'abwehr', 'Lina Löwe', 'Kapitänin, Abwehr', '🦁', 'team', 'die Mannschaft', 'silver', ['stars', 2500]),
  c('c20', 'k2', 'sturm', 'Elfer-Ede', 'Sturm', '🎯', 'penalty', 'der Elfmeter', 'silver', ['streak', 7]),
  c('c21', 'k2', 'tor', 'Sam Save', 'Tor', '🦅', 'save', 'die Parade', 'silver', ['stars', 3200]),
  c('c22', 'k2', 'mittelfeld', 'Mia Mittelfeld', 'Mittelfeld', '🧭', 'midfielder', 'der Mittelfeldspieler', 'silver', ['words', 50]),
  // Rhein Rockets
  c('c23', 'k3', 'abwehr', 'Kai Kapitän', 'Kapitän, Abwehr', '©️', 'captain', 'der Kapitän', 'gold', ['stars', 4000]),
  c('c24', 'k3', 'sturm', 'Torjäger Tim', 'Sturm', '🔥', 'score', 'ein Tor schießen', 'gold', ['days', 25]),
  c('c31', 'k3', 'abwehr', 'Tilda Tackle', 'Abwehr', '🦾', 'tackle', 'der Zweikampf', 'gold'),
  c('c25', 'k3', 'mittelfeld', 'Pokal-Paul', 'Mittelfeld', '🏆', 'trophy', 'der Pokal', 'gold', ['stars', 5000]),
  c('c28', 'k3', 'tor', 'Die Wand', 'Tor', '🐘', 'clean sheet', 'zu null spielen', 'gold', ['streak', 14]),
  c('c32', 'k3', 'abwehr', 'Ole Offside', 'Abwehr', '🚧', 'offside', 'das Abseits', 'gold'),
  c('c26', 'k3', 'mittelfeld', 'Flinke Fiona', 'Mittelfeld', '🐆', 'fast', 'schnell', 'gold', ['stars', 6500]),
  c('c33', 'k3', 'abwehr', 'Bruno Block', 'Abwehr', '🧊', 'block', 'blocken', 'gold'),
  c('c27', 'k3', 'sturm', 'Champion Charly', 'Sturm', '👑', 'champion', 'der Meister', 'legend', ['stars', 8000]),
  c('c29', 'k3', 'sturm', 'Legende Leo', 'Sturm', '🌟', 'legend', 'die Legende', 'legend', ['days', 40]),
  c('c30', 'k3', 'mittelfeld', 'Weltstar', 'Spielmacher', '🌍', 'world star', 'der Weltstar', 'legend', ['stars', 10000]),
]

export interface AlbumStats {
  stars: number
  trainingDays: number
  wordsLearned: number
  bestStreak: number
  // Stand vor RULES_SINCE (alte Regeln)
  legacy: { stars: number; trainingDays: number; bestStreak: number }
  newTrainingDays: number // Trainingstage ab RULES_SINCE
  trainedToday: boolean // heute schon Trainingstag (ab RULES_SINCE)
}

// Längste Serie aufeinanderfolgender Trainingstage (ohne Joker)
export function bestStreak(dates: Iterable<DateStr>): number {
  const set = new Set(dates)
  let best = 0
  for (const d of set) {
    if (set.has(addDays(d, -1))) continue
    let n = 1
    while (set.has(addDays(d, n))) n++
    best = Math.max(best, n)
  }
  return best
}

function legacyUnlocked(card: CardDef, s: AlbumStats) {
  const l = card.legacy
  if (!l || l.kind === 'words') return false // Wörter-Karten gab es vor der Umstellung noch nicht
  const v = l.kind === 'stars' ? s.legacy.stars : l.kind === 'days' ? s.legacy.trainingDays : s.legacy.bestStreak
  return v >= l.value
}

// Alle Karten, die das Kind besitzt: alter Stand + eine Karte pro Trainingstag in Album-Reihenfolge
export function ownedIds(s: AlbumStats): string[] {
  const owned = new Set(CARDS.filter((c) => legacyUnlocked(c, s)).map((c) => c.id))
  let left = s.newTrainingDays
  for (const c of CARDS) {
    if (left <= 0) break
    if (owned.has(c.id)) continue
    owned.add(c.id)
    left--
  }
  return CARDS.filter((c) => owned.has(c.id)).map((c) => c.id)
}

// Nächste Karte = erste offene in Album-Reihenfolge
export function nextCard(s: AlbumStats): CardDef | undefined {
  const owned = new Set(ownedIds(s))
  return CARDS.find((c) => !owned.has(c.id))
}

export function nextCardText(s: AlbumStats): string {
  if (!nextCard(s)) return 'Alle Karten gesammelt!'
  return s.trainedToday ? 'nächste Karte mit dem nächsten Trainingstag' : 'nächste Karte mit dem heutigen Trainingstag'
}

export const clubCards = (clubId: string) => CARDS.filter((c) => c.club === clubId)

export function completedClubs(owned: string[]): string[] {
  const set = new Set(owned)
  return CLUBS.filter((k) => clubCards(k.id).every((c) => set.has(c.id))).map((k) => k.id)
}

// Verein, an dem gerade gesammelt wird (erster unvollständiger)
export function currentClub(owned: string[]): Club {
  const done = new Set(completedClubs(owned))
  return CLUBS.find((k) => !done.has(k.id)) ?? CLUBS[CLUBS.length - 1]
}
