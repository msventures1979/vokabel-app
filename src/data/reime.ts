// Reim-Übungen (Deutsch, 1./2. Klasse), nach dem Arbeitsblatt "Mit Silben reimen".

// Silben-Blume: Endsilbe in der Mitte, Anfangssilben als Blütenblätter. "fake" ergibt kein Wort.
export interface Blume {
  end: string
  real: string[] // Anfänge, die mit der Endsilbe ein echtes Wort ergeben
  fake: string[] // Anfänge, die KEIN Wort ergeben
}

export const BLUMEN: Blume[] = [
  { end: 'se', real: ['Ho', 'Mei', 'Rie', 'Wie', 'Rei', 'Ro', 'Ha', 'Na'], fake: ['Pu', 'Ti'] },
  { end: 'me', real: ['Na', 'Da'], fake: ['Ku', 'Pi'] },
  { end: 'te', real: ['Blü', 'Tü'], fake: ['Wo', 'Pa'] },
  { end: 'gel', real: ['Flü', 'Hü', 'Na', 'Ku', 'Vo'], fake: ['Ro', 'Te'] },
  { end: 'bel', real: ['Ne', 'He', 'Ga'], fake: ['Mu', 'Ri'] },
  { end: 'ge', real: ['Zie', 'Flie', 'Wie'], fake: ['Ha', 'Mo'] },
]

// Reimpaare: Wort → Reimwort
export const REIMPAARE: [string, string][] = [
  ['zielen', 'spielen'],
  ['sinken', 'trinken'],
  ['raufen', 'laufen'],
  ['schenken', 'denken'],
  ['lachen', 'machen'],
  ['siegen', 'fliegen'],
  ['Pfanne', 'Tanne'],
  ['sitzen', 'flitzen'],
  ['Löwe', 'Möwe'],
  ['Maus', 'Haus'],
  ['Hund', 'Mund'],
  ['Ball', 'Stall'],
  ['Katze', 'Tatze'],
  ['Hose', 'Rose'],
  ['Hase', 'Nase'],
  ['Name', 'Dame'],
]

// Alle Wörter, die vorgelesen werden (für die Sprachaufnahmen)
export function reimWoerter(): string[] {
  const set = new Set<string>()
  for (const b of BLUMEN) for (const r of b.real) set.add(r + b.end)
  for (const [a, b] of REIMPAARE) {
    set.add(a)
    set.add(b)
  }
  return [...set]
}
