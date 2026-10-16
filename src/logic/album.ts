// Sammelalbum: erfundene Spielerkarten. Jede Karte bringt ein englisches Fußballwort mit.
// Freischaltung nur aus Daten, die ohnehin abgeglichen werden (Sterne, Trainingstage, Serie, gelernte Wörter),
// dadurch ist das Album auf allen Geräten gleich, ohne eigene Speicherung.
import { addDays, type DateStr } from './dates'

export type Rarity = 'bronze' | 'silver' | 'gold' | 'legend'
export type UnlockKind = 'stars' | 'days' | 'streak' | 'words'

export interface CardDef {
  id: string
  name: string
  position: string
  icon: string
  en: string
  de: string
  rarity: Rarity
  unlock: { kind: UnlockKind; value: number }
}

const c = (id: string, name: string, position: string, icon: string, en: string, de: string, rarity: Rarity, kind: UnlockKind, value: number): CardDef => ({
  id, name, position, icon, en, de, rarity, unlock: { kind, value },
})

export const CARDS: CardDef[] = [
  c('c01', 'Kicky Kim', 'Sturm', '⚡', 'kick-off', 'der Anstoß', 'bronze', 'days', 1),
  c('c02', 'Benny Ball', 'Mittelfeld', '⚽', 'ball', 'der Ball', 'bronze', 'stars', 25),
  c('c03', 'Toni Tor', 'Sturm', '🥅', 'goal', 'das Tor', 'bronze', 'stars', 75),
  c('c04', 'Mats Mauer', 'Abwehr', '🧱', 'defender', 'der Verteidiger', 'bronze', 'stars', 150),
  c('c05', 'Paula Pass', 'Mittelfeld', '🎯', 'pass', 'der Pass', 'bronze', 'days', 3),
  c('c06', 'Kalle Keeper', 'Tor', '🧤', 'keeper', 'der Torwart', 'bronze', 'stars', 250),
  c('c07', 'Fips Fan', 'Kurve', '📣', 'fan', 'der Fan', 'bronze', 'words', 10),
  c('c08', 'Lotte Lauf', 'Flügel', '👟', 'boots', 'die Fußballschuhe', 'bronze', 'stars', 400),
  c('c09', 'Hugo Header', 'Sturm', '🦒', 'header', 'der Kopfball', 'bronze', 'days', 5),
  c('c10', 'Ella Ecke', 'Mittelfeld', '🚩', 'corner', 'die Ecke', 'silver', 'stars', 600),
  c('c11', 'Max Match', 'Kapitän', '🤝', 'match', 'das Spiel', 'silver', 'stars', 850),
  c('c12', 'Rico Rakete', 'Sturm', '🚀', 'shoot', 'schießen', 'silver', 'streak', 3),
  c('c13', 'Dora Dribbel', 'Flügel', '🌀', 'dribble', 'dribbeln', 'silver', 'stars', 1150),
  c('c14', 'Willi Wand', 'Abwehr', '🛡️', 'wall', 'die Mauer', 'silver', 'days', 10),
  c('c15', 'Sina Schiri', 'Schiedsrichterin', '⏱️', 'referee', 'der Schiedsrichter', 'silver', 'stars', 1500),
  c('c16', 'Coach Carlo', 'Trainer', '📋', 'coach', 'der Trainer', 'silver', 'words', 25),
  c('c17', 'Fritzi Freistoß', 'Mittelfeld', '🌪️', 'free kick', 'der Freistoß', 'silver', 'stars', 2000),
  c('c18', 'Pepe Pfeife', 'Schiedsrichter', '📯', 'whistle', 'die Pfeife', 'silver', 'days', 15),
  c('c19', 'Lina Löwe', 'Abwehr', '🦁', 'team', 'die Mannschaft', 'gold', 'stars', 2500),
  c('c20', 'Elfer-Ede', 'Sturm', '🎯', 'penalty', 'der Elfmeter', 'gold', 'streak', 7),
  c('c21', 'Sam Save', 'Tor', '🦅', 'save', 'die Parade', 'gold', 'stars', 3200),
  c('c22', 'Mia Mittelfeld', 'Mittelfeld', '🧭', 'midfielder', 'der Mittelfeldspieler', 'gold', 'words', 50),
  c('c23', 'Kai Kapitän', 'Kapitän', '©️', 'captain', 'der Kapitän', 'gold', 'stars', 4000),
  c('c24', 'Torjäger Tim', 'Sturm', '🔥', 'score', 'ein Tor schießen', 'gold', 'days', 25),
  c('c25', 'Pokal-Paul', 'Mittelfeld', '🏆', 'trophy', 'der Pokal', 'gold', 'stars', 5000),
  c('c26', 'Flinke Fiona', 'Flügel', '🐆', 'fast', 'schnell', 'gold', 'stars', 6500),
  c('c27', 'Champion Charly', 'Sturm', '👑', 'champion', 'der Meister', 'legend', 'stars', 8000),
  c('c28', 'Die Wand', 'Tor', '🐘', 'clean sheet', 'zu null spielen', 'legend', 'streak', 14),
  c('c29', 'Legende Leo', 'Sturm', '🌟', 'legend', 'die Legende', 'legend', 'days', 40),
  c('c30', 'Weltstar', 'Alles', '🌍', 'world star', 'der Weltstar', 'legend', 'stars', 10000),
]

export interface AlbumStats {
  stars: number
  trainingDays: number
  bestStreak: number
  wordsLearned: number
}

// Längste Serie aufeinanderfolgender Trainingstage (ohne Joker, damit die Karte etwas Besonderes bleibt)
export function bestStreak(dates: Set<DateStr>): number {
  let best = 0
  for (const d of dates) {
    if (dates.has(addDays(d, -1))) continue
    let n = 1
    while (dates.has(addDays(d, n))) n++
    best = Math.max(best, n)
  }
  return best
}

const value = (s: AlbumStats, k: UnlockKind) =>
  k === 'stars' ? s.stars : k === 'days' ? s.trainingDays : k === 'streak' ? s.bestStreak : s.wordsLearned

export function isUnlocked(card: CardDef, s: AlbumStats) {
  return value(s, card.unlock.kind) >= card.unlock.value
}

export function unlockedIds(s: AlbumStats): string[] {
  return CARDS.filter((c) => isUnlocked(c, s)).map((c) => c.id)
}

export function missingText(card: CardDef, s: AlbumStats): string {
  const left = card.unlock.value - value(s, card.unlock.kind)
  switch (card.unlock.kind) {
    case 'stars':
      return `noch ${left} Sterne`
    case 'days':
      return left === 1 ? 'noch 1 Trainingstag' : `noch ${left} Trainingstage`
    case 'streak':
      return `${card.unlock.value} Trainingstage am Stück`
    case 'words':
      return `${card.unlock.value} Wörter sicher können`
  }
}

// Nächste Karte, die als Ansporn gezeigt wird
export function nextCard(s: AlbumStats): CardDef | undefined {
  return CARDS.filter((c) => !isUnlocked(c, s) && c.unlock.kind === 'stars').sort((a, b) => a.unlock.value - b.unlock.value)[0]
}
