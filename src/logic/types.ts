import type { DateStr } from './dates'

export interface Word {
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
}

export interface WordList {
  id: string
  title: string
  subject: string
  testDate?: DateStr
}

export interface Child {
  id: string
  name: string
  order?: number
  newPerDay: number
  player?: { name: string; number: number; color: string }
}

export interface Assignment {
  id: string // `${childId}:${listId}`
  childId: string
  listId: string
}

// Fach 0 = noch nicht eingeführt, 1–5 = Karteikasten, 6 = gelernt
export interface Progress {
  id: string // `${childId}:${wordId}`
  childId: string
  wordId: string
  box: number
  due: DateStr | null
  wrongStreak: number
  errors: number
  introducedOn?: DateStr
}

export interface DayLog {
  id: string // `${childId}:${date}`
  childId: string
  date: DateStr
  activeSeconds: number
  answers: number
  roundDone: boolean
  trainingDay: boolean
  stars: number
  newIntroduced: number
}

export interface Goal {
  id: string
  childId: string
  title: string
  requiredDays: number
  startDate: DateStr
  status: 'active' | 'reached' | 'handedOver'
  handedOverOn?: DateStr
}

export interface ChildStats {
  childId: string
  stars: number
}
