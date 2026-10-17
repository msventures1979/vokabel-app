// Ausrüstung im Spind: Trikot-Muster, Schuhe und Torjubel. Alles virtuell.
// Freigeschaltet über die Liga (Index in LEVELS) und vollständige Vereine im Album.
import { CLUBS } from './album'

export type PatternId = 'plain' | 'stripes' | 'hoops' | 'sash' | 'halves' | 'stars'
export type CelebrationId = 'fist' | 'plane' | 'dance' | 'heart' | 'rocket' | 'crown' | 'badge'

export interface Unlock {
  level?: number // ab dieser Liga (Index in LEVELS)
  club?: string // wenn dieser Verein komplett ist
}

export const PATTERNS: {
  id: PatternId
  name: string
  label: string
  unlock: Unlock
}[] = [
  { id: 'plain', name: 'Einfarbig', label: 'einfarbiges Trikot', unlock: {} },
  {
    id: 'stripes',
    name: 'Streifen',
    label: 'Streifen-Trikot',
    unlock: { level: 1 },
  },
  { id: 'hoops', name: 'Ringel', label: 'Ringel-Trikot', unlock: { level: 2 } },
  {
    id: 'sash',
    name: 'Schärpe',
    label: 'Trikot mit Schärpe',
    unlock: { level: 3 },
  },
  {
    id: 'halves',
    name: 'Zweifarbig',
    label: 'zweifarbiges Trikot',
    unlock: { level: 4 },
  },
  {
    id: 'stars',
    name: 'Sternen-Trikot',
    label: 'Sternen-Trikot',
    unlock: { level: 5 },
  },
]

// Vereinstrikots: Farben des Vereins, Ringel-Muster
export const CLUB_KITS = CLUBS.map((k) => ({
  id: `club-${k.id}`,
  name: k.name,
  color: k.colors[0],
  accent: k.colors[1],
  pattern: 'hoops' as PatternId,
  unlock: { club: k.id } as Unlock,
}))

export const BOOTS: {
  id: string
  name: string
  label: string
  color: string
  unlock: Unlock
}[] = [
  {
    id: 'white',
    name: 'Weiß',
    label: 'weiße Schuhe',
    color: '#f4f1e8',
    unlock: {},
  },
  {
    id: 'black',
    name: 'Schwarz',
    label: 'schwarze Schuhe',
    color: '#1f2937',
    unlock: {},
  },
  {
    id: 'lime',
    name: 'Lime',
    label: 'Lime-Schuhe',
    color: '#c8f560',
    unlock: { level: 1 },
  },
  {
    id: 'red',
    name: 'Rot',
    label: 'rote Schuhe',
    color: '#e63946',
    unlock: { level: 2 },
  },
  {
    id: 'blue',
    name: 'Blau',
    label: 'blaue Schuhe',
    color: '#2563eb',
    unlock: { level: 3 },
  },
  {
    id: 'gold',
    name: 'Gold',
    label: 'goldene Schuhe',
    color: '#ffc940',
    unlock: { level: 4 },
  },
  {
    id: 'rainbow',
    name: 'Regenbogen',
    label: 'Regenbogen-Schuhe',
    color: 'rainbow',
    unlock: { level: 5 },
  },
]

export const CELEBRATIONS: {
  id: CelebrationId
  name: string
  icon: string
  unlock: Unlock
}[] = [
  { id: 'fist', name: 'Siegerfaust', icon: '👊', unlock: {} },
  { id: 'plane', name: 'Flieger', icon: '✈️', unlock: { level: 1 } },
  { id: 'dance', name: 'Tänzchen', icon: '🕺', unlock: { level: 2 } },
  { id: 'heart', name: 'Herz', icon: '🫶', unlock: { level: 3 } },
  { id: 'rocket', name: 'Rakete', icon: '🚀', unlock: { level: 4 } },
  { id: 'crown', name: 'Krone', icon: '👑', unlock: { level: 5 } },
  { id: 'badge', name: 'Wappenkuss', icon: '😘', unlock: { club: 'k1' } },
]

export function isUnlocked(u: Unlock, level: number, clubsDone: string[]) {
  if (u.club) return clubsDone.includes(u.club)
  return level >= (u.level ?? 0)
}

export function lockText(u: Unlock): string {
  if (u.club) return `${CLUBS.find((k) => k.id === u.club)?.name ?? 'Verein'} komplett`
  return ['', 'ab Kreisliga', 'ab Regionalliga', 'ab Bundesliga', 'ab Nationalmannschaft', 'ab Weltstar'][u.level ?? 0] ?? ''
}

// Was mit genau dieser Liga neu dazukommt (für die Aufstiegsmeldung)
export function newAtLevel(level: number): string[] {
  const at = (u: Unlock) => !u.club && (u.level ?? 0) === level
  return [
    ...PATTERNS.filter((p) => at(p.unlock)).map((p) => p.label),
    ...BOOTS.filter((b) => at(b.unlock)).map((b) => b.label),
    ...CELEBRATIONS.filter((c) => at(c.unlock)).map((c) => `Torjubel „${c.name}“ ${c.icon}`),
  ]
}

// Gespeicherte Auswahl absichern: Gesperrtes fällt auf das Standard-Teil zurück
export function safeGear(p: { pattern?: string; boots?: string; celebration?: string }, level: number, clubsDone: string[]) {
  const pat = PATTERNS.find((x) => x.id === p.pattern)
  const kit = CLUB_KITS.find((x) => x.id === p.pattern)
  const boots = BOOTS.find((x) => x.id === p.boots)
  const cel = CELEBRATIONS.find((x) => x.id === p.celebration)
  return {
    pattern: (pat && isUnlocked(pat.unlock, level, clubsDone)) || (kit && isUnlocked(kit.unlock, level, clubsDone)) ? p.pattern! : 'plain',
    boots: boots && isUnlocked(boots.unlock, level, clubsDone) ? boots.id : 'white',
    celebration: cel && isUnlocked(cel.unlock, level, clubsDone) ? cel.id : 'fist',
  }
}
