import { describe, expect, it } from 'vitest'
import { addDays, isoWeekKey } from './dates'
import { checkAnswer } from './answers'
import { introduce, isDue, LEARNED_BOX, newProgress, review } from './scheduler'
import { activeDelta, goalProgress, levelFor, qualifiesAsTrainingDay, starsFor, streak } from './rewards'
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
    expect(levelFor(1200).name).toBe('Regionalliga')
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
