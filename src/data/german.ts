// Deutsch-Lernwörter (2. Klasse): Lernwörterblätter aus der Schule.
// Lernwörter werden mit Silben geübt und geschrieben, Leserakete-Wörter werden gelesen.
import type { Word, WordList } from '../logic/types'

export const GERMAN_SUBJECT = 'Deutsch'

// Wort mit Silbentrennung schreiben: "Kat-ze" → Wort "Katze", Silben ["Kat", "ze"]
export function parseSyllables(s: string): { word: string; syllables: string[] } {
  const parts = s
    .trim()
    .split(/[-·|]/)
    .map((p) => p.trim())
    .filter(Boolean)
  return { word: parts.join(''), syllables: parts }
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')

export function germanWords(listId: string, lern: string[], lese: string[]): Word[] {
  const out: Word[] = []
  lern.forEach((raw, i) => {
    const { word, syllables } = parseSyllables(raw)
    out.push({ id: `${listId}:${slug(word)}`, listId, order: i, en: word, answers: [word], de: '', syllables, kind: 'lern', caseSensitive: true })
  })
  lese.forEach((raw, i) => {
    const { word, syllables } = parseSyllables(raw)
    const id = `${listId}:lese-${slug(word)}`
    if (out.some((w) => w.id === id)) return
    out.push({ id, listId, order: 100 + i, en: word, answers: [word], de: '', syllables, kind: 'lese', caseSensitive: true })
  })
  return out
}

export const germanSheets: Array<{ list: WordList; words: Word[] }> = [
  {
    list: { id: 'de-lw1', title: 'Lernwörterblatt 1', subject: GERMAN_SUBJECT },
    words: germanWords(
      'de-lw1',
      ['Bub', 'Mäd-chen', 'müs-sen', 'Buch', 'laut'],
      ['nicht', 'mor-gen', 'nie', 'Mäd-chen', 'klein', 'die', 'nein', 'so', 'Hund', 'Gar-ten', 'o-der', 'oh-ne'],
    ),
  },
  {
    list: { id: 'de-lw2', title: 'Lernwörterblatt 2', subject: GERMAN_SUBJECT },
    words: germanWords(
      'de-lw2',
      ['Ha-se', 'Hund', 'Kat-ze', 'fres-sen', 'leicht'],
      ['mei-ne', 'vom', 'bei-de', 'was', 'los', 'wie', 'weil', 'ge-gen', 'sind', 'wei-ter', 'jetzt'],
    ),
  },
  // Zusatzwörter (Grundwortschatz Klasse 2), kommen neben dem Schulblatt dazu: 2 neue pro Runde
  {
    list: { id: 'de-x1', title: 'Extra-Wörter 1', subject: GERMAN_SUBJECT },
    words: germanWords('de-x1', ['Ball', 'Tor', 'spie-len', 'ren-nen', 'schnell'], ['und', 'ist', 'ein', 'mit', 'auf', 'der']),
  },
  {
    list: { id: 'de-x2', title: 'Extra-Wörter 2', subject: GERMAN_SUBJECT },
    words: germanWords('de-x2', ['Fuß', 'groß', 'Freund', 'Bru-der', 'Schu-le'], ['das', 'er', 'sie', 'hat', 'wir', 'im']),
  },
]

// Zusatzlisten (von uns), im Unterschied zu den Lernwörterblättern aus der Schule
export const isExtraList = (listId: string) => listId.startsWith('de-x')

