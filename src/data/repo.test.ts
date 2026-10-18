import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, seed } from './db'
import { activeGoal, completeRound, dayLog, introduceWords, plan, recordAnswer, trainingDates } from './repo'

beforeEach(async () => {
  await db.delete()
  await db.open()
  await seed()
})

describe('Ablauf eines Tages', () => {
  it('plant 5 neue Wörter für Milan, keine für Marlon', async () => {
    expect((await plan('milan')).newIds).toHaveLength(5)
    expect((await plan('marlon')).pool).toHaveLength(0)
  })

  it('zählt Trainingstag nur einmal und erst mit allen Bedingungen', async () => {
    const p = await plan('milan')
    for (let i = 0; i < 40; i++) await recordAnswer('milan', 30, 10) // 20 Minuten, 40 Antworten
    expect((await dayLog('milan')).trainingDay).toBe(false) // Runde fehlt noch
    await introduceWords('milan', p.newIds)
    await completeRound('milan', true)
    const log = await dayLog('milan')
    expect(log.trainingDay).toBe(true)
    expect(log.newIntroduced).toBe(5)
    expect((await trainingDates('milan')).size).toBe(1)
    // Extra-Training am selben Tag bringt keinen zweiten Trainingstag
    for (let i = 0; i < 40; i++) await recordAnswer('milan', 30, 10)
    expect((await trainingDates('milan')).size).toBe(1)
    // Nach der Runde: keine weiteren Rundenwörter, aber Extra-Wörter erlaubt
    const p2 = await plan('milan')
    expect(p2.newIds).toHaveLength(0)
    expect(p2.extraNewAllowed).toBe(5)
  })

  it('halbiert Sterne ab 45 Minuten', async () => {
    for (let i = 0; i < 45; i++) await recordAnswer('milan', 60, 10)
    const before = (await dayLog('milan')).stars
    await recordAnswer('milan', 10, 10)
    expect((await dayLog('milan')).stars - before).toBe(5)
  })

  it('Milan hat Saisons mit 25 Tagen', async () => {
    const g = await activeGoal('milan')
    expect(g?.title).toBe('Saisonpokal')
    expect(g?.requiredDays).toBe(25)
  })
})

describe('Neue eingebaute Englisch-Liste', () => {
  it('Unit 1 – Station 1 landet einmalig bei Milan, nach Unit 1', async () => {
    const { ensureCatalog } = await import('./catalog')
    const { wordPool } = await import('./repo')
    await ensureCatalog()
    expect(await db.assignments.get('milan:en-u1s1')).toMatchObject({ childId: 'milan', active: true })
    expect(await db.assignments.get('marlon:en-u1s1')).toBeUndefined()
    const pool = await wordPool('milan')
    expect(pool.filter((w) => w.listId === 'en-u1s1')).toHaveLength(43)
    expect(pool[0].listId).toBe('en-u1') // Unit 1 kommt zuerst
    // abgewählt bleibt abgewählt
    await db.assignments.update('milan:en-u1s1', { active: false })
    await ensureCatalog()
    expect((await db.assignments.get('milan:en-u1s1'))?.active).toBe(false)
  })
})
