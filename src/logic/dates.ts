// Datumshelfer. Ein Kalendertag wird als "YYYY-MM-DD" in Ortszeit gespeichert.
// Hinweis: Sobald der Server angebunden ist, bestimmt er das Datum eines Trainingstags.

export type DateStr = string

export function toDateStr(d: Date): DateStr {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function today(now: Date = new Date()): DateStr {
  return toDateStr(now)
}

export function parseDate(s: DateStr): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d, 12) // Mittag, damit Zeitumstellungen nicht stören
}

export function addDays(s: DateStr, n: number): DateStr {
  const d = parseDate(s)
  d.setDate(d.getDate() + n)
  return toDateStr(d)
}

// ISO-Kalenderwoche als Schlüssel "YYYY-Www", für den Wochen-Joker.
export function isoWeekKey(s: DateStr): string {
  const d = parseDate(s)
  const day = (d.getDay() + 6) % 7 // Montag = 0
  d.setDate(d.getDate() - day + 3) // Donnerstag derselben Woche
  const firstThursday = new Date(d.getFullYear(), 0, 4, 12)
  const week =
    1 +
    Math.round(
      ((d.getTime() - firstThursday.getTime()) / 86_400_000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7,
    )
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`
}
