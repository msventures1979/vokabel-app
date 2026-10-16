// Antwortprüfung: erlaubte Varianten, Großschreibung nur wo Pflicht, ein Tippfehler = "fast richtig".
import type { Word } from './types'

export type Verdict = 'correct' | 'case' | 'almost' | 'wrong'

export function normalize(s: string): string {
  return s
    .replace(/[‘’´`]/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/[.!?,;:]+$/g, '')
    .trim()
}

export function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return dp[a.length][b.length]
}

export function checkAnswer(word: Word, input: string): Verdict {
  const given = normalize(input)
  if (!given) return 'wrong'
  const lower = given.toLowerCase()
  const answers = word.answers.map(normalize)

  if (answers.includes(given)) return 'correct'
  if (answers.some((a) => a.toLowerCase() === lower)) return word.caseSensitive ? 'case' : 'correct'
  // Tippfehler: genau ein Zeichen daneben, ab 4 Buchstaben
  if (answers.some((a) => a.length >= 4 && levenshtein(a.toLowerCase(), lower) === 1)) return 'almost'
  return 'wrong'
}

// Hauptantwort für die Anzeige
export function mainAnswer(word: Word): string {
  return word.answers[0]
}
