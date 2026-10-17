import type { DateStr } from './dates'

// dirty: Zeitstempel einer lokalen Änderung, die noch zum Server muss
interface Syncable {
  dirty?: number
}

export interface Word extends Syncable {
  id: string
  listId: string
  order: number
  en: string // Anzeige, z. B. "it's (= it is)"
  answers: string[] // erlaubte englische Antworten
  de: string // Anzeige, z. B. "der Lehrer / die Lehrerin"
  ipa?: string
  example?: string // Beispielsatz
  cloze?: string // Satz mit ___ als Kontext für Deutsch → Englisch
  note?: string
  caseSensitive?: boolean // Großschreibung ist Pflicht (English, Mr, Mrs, OK)
  image?: string
  // Deutsch (Lernwörterblätter): en = das deutsche Wort, das geschrieben/gelesen wird
  syllables?: string[] // z. B. ["Kat", "ze"]
  kind?: 'lern' | 'lese' // Lernwort (schreiben) oder Leserakete (lesen)
}

export interface WordList extends Syncable {
  id: string
  title: string
  subject: string
  testDate?: DateStr
}

export interface Player {
  name: string
  number: number
  color: string
  pattern?: string // Trikot-Muster oder Vereinstrikot (siehe logic/gear.ts)
  accent?: string // Zweitfarbe des Musters
  boots?: string
  celebration?: string
}

// Lernmodus: 'write' = mit Schreiben (Milan), 'picture' = hören und Bilder antippen (Marlon)
export interface ChildSettings {
  mode?: 'write' | 'picture'
  minMinutes?: number
  minAnswers?: number
  curriculum?: 'starter'
  german?: boolean // Deutsch-Lernwörter (nur für Grundschulkinder)
  germanInit?: boolean // Lernwörterblätter wurden einmalig zugeordnet
}

export interface Child extends Syncable {
  id: string
  name: string
  order?: number
  newPerDay: number
  settings?: ChildSettings
  player?: Player
  playerDirty?: number
}

export interface Assignment extends Syncable {
  id: string // `${childId}:${listId}`
  childId: string
  listId: string
  active?: boolean // false = abgewählt
}

// Fach 0 = noch nicht eingeführt, 1–5 = Karteikasten, 6 = gelernt
export interface Progress extends Syncable {
  id: string // `${childId}:${wordId}`
  childId: string
  wordId: string
  box: number
  due: DateStr | null
  wrongStreak: number
  errors: number
  introducedOn?: DateStr
}

// Gespeicherte Tageswerte eines Geräts
export interface DayLogRow extends Syncable {
  id: string // `${childId}:${date}:${deviceId}`
  childId: string
  date: DateStr
  deviceId: string
  activeSeconds: number
  answers: number
  roundDone: boolean
  stars: number
  newIntroduced: number
}

// Summe über alle Geräte eines Tages
export interface DayLog {
  childId: string
  date: DateStr
  activeSeconds: number
  answers: number
  roundDone: boolean
  trainingDay: boolean
  stars: number
  newIntroduced: number
}

export interface Goal extends Syncable {
  id: string
  childId: string
  title: string
  requiredDays: number
  startDate: DateStr
  status: 'active' | 'reached' | 'handedOver' // 'reached' wird nur berechnet, nie gespeichert
  handedOverOn?: DateStr
  image?: string // Foto der Belohnung (Data-URL)
}
