import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'
import { fromServer, mergeIncoming, toServer } from './mapping'
import { VokabelDB } from '../data/db'
import { unit1Words } from '../data/en-unit1'
import type { Child, DayLogRow, Progress } from '../logic/types'

describe('Zusammenführen', () => {
  const p = (box: number, dirty?: number): Progress => ({ id: 'milan:w', childId: 'milan', wordId: 'w', box, due: null, wrongStreak: 0, errors: 0, dirty })
  it('lokale ungesendete Änderungen gewinnen', () => {
    expect(mergeIncoming('progress', p(3, 123), p(1), 'dev')).toBeNull()
    expect(mergeIncoming('progress', p(3), p(1), 'dev')).toEqual(p(1))
  })
  it('eigene Tageswerte: höherer Wert gewinnt; fremde Geräte werden übernommen', () => {
    const l = (deviceId: string, s: number, a: number): DayLogRow => ({
      id: `milan:2026-10-16:${deviceId}`, childId: 'milan', date: '2026-10-16', deviceId, activeSeconds: s, answers: a, roundDone: false, stars: 0, newIntroduced: 0,
    })
    expect(mergeIncoming('dayLogs', l('me', 500, 10), l('me', 300, 20), 'me')).toMatchObject({ activeSeconds: 500, answers: 20 })
    expect(mergeIncoming('dayLogs', l('other', 500, 10), l('other', 300, 20), 'me')).toMatchObject({ activeSeconds: 300 })
  })
  it('Spieler bleibt, bis er hochgeladen ist', () => {
    const local: Child = { id: 'milan', name: 'Milan', newPerDay: 5, player: { name: 'MILAN', number: 7, color: 'red' }, playerDirty: 1 }
    const server: Child = { id: 'milan', name: 'Milan', newPerDay: 8 }
    expect(mergeIncoming('children', local, server, 'x')).toMatchObject({ newPerDay: 8, player: { number: 7 }, playerDirty: 1 })
  })
  it('Wörter überstehen den Weg zum Server und zurück', () => {
    const w = unit1Words.find((x) => x.id.endsWith(':english'))!
    const back = fromServer.words(JSON.parse(JSON.stringify(toServer.words(w, 'fam'))))
    expect(back).toEqual(w)
  })
})

describe('Datenbank-Upgrade von Version 1', () => {
  it('überführt Tageswerte und Ziele', async () => {
    const old = new Dexie('upgrade-test')
    old.version(1).stores({
      children: 'id', lists: 'id', words: 'id, listId', assignments: 'id, childId, listId', progress: 'id, childId, wordId',
      dayLogs: 'id, childId, date', goals: 'id, childId, status', stats: 'childId', meta: 'key',
    })
    await old.open()
    await old.table('dayLogs').add({ id: 'milan:2026-10-16', childId: 'milan', date: '2026-10-16', activeSeconds: 600, answers: 30, roundDone: true, trainingDay: false, stars: 90, newIntroduced: 5 })
    await old.table('goals').add({ id: 'g', childId: 'milan', title: 'Fußball', requiredDays: 25, startDate: '2026-10-16', status: 'reached' })
    old.close()

    const db = new VokabelDB('upgrade-test')
    await db.open()
    const dev = (await db.meta.get('deviceId'))!.value as string
    const logs = await db.dayLogs.toArray()
    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatchObject({ deviceId: dev, id: `milan:2026-10-16:${dev}`, stars: 90 })
    expect('trainingDay' in logs[0]).toBe(false)
    expect((await db.goals.get('g'))!.status).toBe('active')
    db.close()
  })
})
