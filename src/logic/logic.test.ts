import { describe, expect, it } from 'vitest'
import { addDays, isoWeekKey } from './dates'
import { checkAnswer } from './answers'
import { introduce, isDue, LEARNED_BOX, newProgress, review } from './scheduler'
import { activeDelta, goalProgress, levelFor, levelHint, seasonFor, qualifiesAsTrainingDay, starsFor, streak } from './rewards'
import { keeperCorner, pickShots } from './penalty'
import { CARDS, CLUBS, clubCards, completedClubs, nextCard, ownedIds, type AlbumStats } from './album'
import { buildExtraPractice, buildRound, choiceOptions } from './session'
import { starterWords } from '../data/starter'
import { unit1Words } from '../data/en-unit1'
import type { Goal, Progress } from './types'

const w = (key: string) => unit1Words.find((x) => x.id.endsWith(':' + key))!

describe('Antwortprüfung', () => {
  it('akzeptiert Varianten', () => {
    expect(checkAnswer(w('go'), 'go')).toBe('correct')
    expect(checkAnswer(w('go'), 'to go')).toBe('correct')
    expect(checkAnswer(w('its'), 'it is')).toBe('correct')
    expect(checkAnswer(w('its'), 'It’s')).toBe('correct')
    expect(checkAnswer(w('mr'), 'Mr.')).toBe('correct')
  })
  it('prüft Großschreibung nur wo Pflicht', () => {
    expect(checkAnswer(w('school'), 'School')).toBe('correct')
    expect(checkAnswer(w('english'), 'english')).toBe('case')
    expect(checkAnswer(w('english'), 'English')).toBe('correct')
  })
  it('erkennt Tippfehler', () => {
    expect(checkAnswer(w('teacher'), 'teachr')).toBe('almost')
    expect(checkAnswer(w('a'), 'b')).toBe('wrong')
    expect(checkAnswer(w('busy'), 'bisy')).toBe('almost')
    expect(checkAnswer(w('busy'), 'xyz')).toBe('wrong')
    expect(checkAnswer(w('busy'), '  ')).toBe('wrong')
  })
})

describe('Karteikasten', () => {
  const day = '2026-10-16'
  it('führt neue Wörter in Fach 1 ein', () => {
    const p = introduce(newProgress('milan', 'x'), day)
    expect(p.box).toBe(1)
    expect(p.due).toBe('2026-10-17')
    expect(isDue(p, day)).toBe(false)
    expect(isDue(p, '2026-10-17')).toBe(true)
  })
  it('rückt bei richtig weiter, bis gelernt', () => {
    let p = introduce(newProgress('milan', 'x'), day)
    p = review(p, true, day)
    expect(p.box).toBe(2)
    expect(p.due).toBe(addDays(day, 2))
    for (let i = 0; i < 4; i++) p = review(p, true, day)
    expect(p.box).toBe(LEARNED_BOX)
    expect(p.due).toBeNull()
  })
  it('geht bei falsch ein Fach zurück, bei zwei Fehlern in Folge in Fach 1', () => {
    let p: Progress = { ...newProgress('milan', 'x'), box: 4, due: day }
    p = review(p, false, day)
    expect(p.box).toBe(3)
    p = review(p, false, day)
    expect(p.box).toBe(1)
    expect(p.errors).toBe(2)
  })
})

describe('Belohnungen', () => {
  it('Trainingstag braucht Runde, 15 Minuten und 40 Antworten', () => {
    expect(qualifiesAsTrainingDay({ roundDone: true, activeSeconds: 900, answers: 40 })).toBe(true)
    expect(qualifiesAsTrainingDay({ roundDone: true, activeSeconds: 899, answers: 80 })).toBe(false)
    expect(qualifiesAsTrainingDay({ roundDone: true, activeSeconds: 2000, answers: 39 })).toBe(false)
    expect(qualifiesAsTrainingDay({ roundDone: false, activeSeconds: 2000, answers: 80 })).toBe(false)
  })
  it('deckelt Zeit pro Antwort auf 60 Sekunden', () => {
    expect(activeDelta(0, 30_000)).toBe(30)
    expect(activeDelta(0, 600_000)).toBe(60)
  })
  it('halbiert Sterne nach 45 Minuten', () => {
    expect(starsFor(10, 100)).toBe(10)
    expect(starsFor(10, 45 * 60)).toBe(5)
  })
  it('Serie mit Joker', () => {
    const d = (s: string[]) => new Set(s)
    // Fr 16.10., Do 15.10., (Mi 14.10. fehlt), Di 13.10.
    expect(streak(d(['2026-10-16', '2026-10-15', '2026-10-13']), '2026-10-16').days).toBe(3)
    // zwei Lücken in derselben Woche brechen die Serie
    expect(streak(d(['2026-10-16', '2026-10-14', '2026-10-12']), '2026-10-16').days).toBe(2)
    // heute noch offen: Serie zählt ab gestern
    expect(streak(d(['2026-10-15', '2026-10-14']), '2026-10-16').days).toBe(2)
    expect(isoWeekKey('2026-10-16')).toBe('2026-W42')
  })
  it('Ziel zählt nur Trainingstage ab Start', () => {
    const goal: Goal = { id: 'g', childId: 'milan', title: 'Fußball', requiredDays: 25, startDate: '2026-10-10', status: 'active' }
    expect(goalProgress(goal, new Set(['2026-10-09', '2026-10-10', '2026-10-11']))).toBe(2)
  })
  it('Level nach Sternen', () => {
    expect(levelFor(0).name).toBe('Jugend')
    // Sterne allein reichen nicht mehr: ein langer Tag bringt keinen Doppelaufstieg
    expect(levelFor(1200, 1).name).toBe('Jugend')
    expect(levelFor(1200, 3).name).toBe('Kreisliga')
    expect(levelFor(1200, 8).name).toBe('Regionalliga')
    expect(levelHint(levelFor(1200, 3))).toBe('noch 5 Trainingstage bis Regionalliga')
    // alter Stand bleibt erhalten
    expect(levelFor(1200, 1, 1200).name).toBe('Regionalliga')
    // Pokalvitrine nach dem Weltstar
    expect(levelFor(16000, 60).trophies).toBe(2)
    expect(levelFor(16000, 60).starsToTrophy).toBe(1500)
  })
})

describe('Runde', () => {
  it('Aufwärmen zuerst, dann neue Wörter', () => {
    const steps = buildRound(['a', 'b'], ['x', 'y'])
    expect(steps.slice(0, 2).every((s) => s.kind === 'type' && s.phase === 'review')).toBe(true)
    expect(steps.filter((s) => s.kind === 'intro')).toHaveLength(2)
    expect(steps).toHaveLength(2 + 2 * 4)
  })
  it('Auswahl hat 4 eindeutige Optionen inkl. richtiger', () => {
    const opts = choiceOptions(w('busy'), unit1Words, 'en-de')
    expect(new Set(opts).size).toBe(4)
    expect(opts).toContain(w('busy').de)
  })
  it('Bilder-Modus: keine Schreibaufgaben', () => {
    const steps = [...buildRound(['a', 'b'], ['x', 'y', 'z'], Math.random, 'picture'), ...buildExtraPractice(['a', 'b'], 20, Math.random, 'picture')]
    expect(steps.some((s) => s.kind === 'type' || s.kind === 'choice')).toBe(false)
    expect(steps.filter((s) => s.kind === 'intro')).toHaveLength(3)
  })
  it('Bild-Auswahl hat 4 verschiedene Bilder', () => {
    const w0 = starterWords[0]
    const opts = choiceOptions(w0, starterWords, 'image')
    expect(new Set(opts).size).toBe(4)
    expect(opts).toContain(w0.image)
  })
  it('Startwortschatz: alle Wörter mit Bild, keine doppelten Bilder', () => {
    expect(starterWords.length).toBeGreaterThan(100)
    expect(starterWords.every((w) => w.image)).toBe(true)
    expect(new Set(starterWords.map((w) => w.image)).size).toBe(starterWords.length)
  })
  it('Wortliste hat 26 Wörter', () => {
    expect(unit1Words).toHaveLength(26)
  })
})

describe('Foto-Import', () => {
  it('baut Lückensätze aus Beispielsätzen', async () => {
    const { makeCloze } = await import('../screens/PhotoImport')
    expect(makeCloze('My house is big.', ['house'])).toBe('My ___ is big.')
    expect(makeCloze('I go to school.', ['to go', 'go'])).toBe('I ___ to school.')
    expect(makeCloze("It's my uniform.", ["it's", 'it is'])).toBe('___ my uniform.')
    expect(makeCloze('No match here.', ['dog'])).toBeUndefined()
  })
})

describe('Sammelalbum mit Vereinen', () => {
  const base: AlbumStats = { stars: 0, trainingDays: 0, wordsLearned: 0, bestStreak: 0, legacy: { stars: 0, trainingDays: 0, bestStreak: 0 }, newTrainingDays: 0, trainedToday: false }

  it('jeder Verein hat 11 Spieler in 4-3-3, Wörter sind eindeutig', () => {
    expect(CARDS).toHaveLength(33)
    for (const k of CLUBS) {
      const cs = clubCards(k.id)
      expect(cs).toHaveLength(11)
      expect(cs.filter((c) => c.line === 'tor')).toHaveLength(1)
      expect(cs.filter((c) => c.line === 'abwehr')).toHaveLength(4)
      expect(cs.filter((c) => c.line === 'mittelfeld')).toHaveLength(3)
      expect(cs.filter((c) => c.line === 'sturm')).toHaveLength(3)
    }
    expect(new Set(CARDS.map((c) => c.id)).size).toBe(33)
    expect(new Set(CARDS.map((c) => c.en)).size).toBe(33)
  })

  it('höchstens eine neue Karte pro Trainingstag, egal wie viele Sterne', () => {
    expect(ownedIds({ ...base, stars: 50000 })).toEqual([])
    expect(ownedIds({ ...base, stars: 50000, newTrainingDays: 2 })).toEqual(['c01', 'c02'])
  })

  it('alter Stand bleibt, neue Karten füllen die Lücken in Reihenfolge', () => {
    const s = { ...base, legacy: { stars: 1200, trainingDays: 1, bestStreak: 1 } }
    const old = ownedIds(s)
    expect(old).toEqual(['c01', 'c02', 'c03', 'c04', 'c06', 'c08', 'c10', 'c11', 'c13'])
    expect(nextCard(s)?.id).toBe('c05')
    const later = ownedIds({ ...s, newTrainingDays: 2 })
    expect(later).toHaveLength(11)
    expect(completedClubs(later)).toEqual(['k1'])
    expect(nextCard({ ...s, newTrainingDays: 2 })?.club).toBe('k2')
  })
})

describe('Saisons (virtuelle Pokale)', () => {
  const dates = (n: number) => new Set(Array.from({ length: n }, (_, i) => `2026-11-${String(i + 1).padStart(2, '0')}`))
  it('nach 25 Trainingstagen gibt es einen Pokal, danach startet die nächste Saison', () => {
    const g = { startDate: '2026-11-01', requiredDays: 25 }
    expect(seasonFor(g, dates(24))).toMatchObject({ season: 1, won: 0, progress: 24 })
    expect(seasonFor(g, dates(25))).toMatchObject({ season: 2, won: 1, progress: 0 })
    expect(seasonFor(g, dates(27)).trophy.name).toBe('Goldener Pokal')
    expect(seasonFor(g, new Set(['2026-10-31'])).progress).toBe(0) // Tage vor dem Saisonstart zählen nicht
  })
})

describe('Elfmeterschießen', () => {
  const words = Array.from({ length: 12 }, (_, i) => ({
    id: `w${i}`, listId: i < 6 ? 'a' : 'b', order: i, en: `en${i}`, answers: [`en${i}`], de: `de${i}`, image: `🙂${i}`,
  })) as never[]
  const prog = new Map(
    [0, 1, 2, 3, 4, 5, 6].map((i) => [`w${i}`, { id: `k:w${i}`, childId: 'k', wordId: `w${i}`, box: 2, due: null, wrongStreak: i === 6 ? 2 : 0, errors: i === 6 ? 5 : 0 }]),
  ) as never

  it('5 Schüsse mit je 3 verschiedenen Antworten, genau eine richtig', () => {
    const shots = pickShots(words, prog, 'write')
    expect(shots).toHaveLength(5)
    for (const s of shots) {
      expect(s.options).toHaveLength(3)
      expect(new Set(s.options).size).toBe(3)
      expect(s.options[s.correct]).toBe(s.word.answers[0])
    }
    // das schwerste Wort ist dabei, nur schon eingeführte Wörter
    expect(shots.map((s) => s.word.id)).toContain('w6')
    expect(shots.every((s) => ['w0', 'w1', 'w2', 'w3', 'w4', 'w5', 'w6'].includes(s.word.id))).toBe(true)
  })

  it('Bilder-Modus nutzt Bilder als Antworten', () => {
    const s = pickShots(words, prog, 'picture')[0]
    expect(s.dir).toBe('image')
    expect(s.options[s.correct]).toBe(s.word.image)
  })

  it('Torwart springt bei Fehlschuss in die Schussecke, sonst woanders hin', () => {
    expect(keeperCorner(2, true)).toBe(2)
    for (let i = 0; i < 20; i++) expect(keeperCorner(1, false)).not.toBe(1)
  })
})
