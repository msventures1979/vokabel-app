// Lokale Datenbank (IndexedDB). Sie ist die Arbeitskopie; der Abgleich mit Supabase läuft in src/sync.
import Dexie, { type Table } from 'dexie'
import type { Assignment, Child, DayLogRow, Goal, Progress, Word, WordList } from '../logic/types'
import { today } from '../logic/dates'
import { unit1, unit1Words } from './en-unit1'

export interface Meta {
  key: string
  value: unknown
}

export class VokabelDB extends Dexie {
  children!: Table<Child, string>
  lists!: Table<WordList, string>
  words!: Table<Word, string>
  assignments!: Table<Assignment, string>
  progress!: Table<Progress, string>
  dayLogs!: Table<DayLogRow, string>
  goals!: Table<Goal, string>
  meta!: Table<Meta, string>

  constructor(name = 'vokabel-app') {
    super(name)
    this.version(1).stores({
      children: 'id',
      lists: 'id',
      words: 'id, listId',
      assignments: 'id, childId, listId',
      progress: 'id, childId, wordId',
      dayLogs: 'id, childId, date',
      goals: 'id, childId, status',
      stats: 'childId',
      meta: 'key',
    })
    // Version 2: Tageswerte pro Gerät, Sterne aus den Tageswerten, Markierung für den Abgleich
    this.version(2)
      .stores({
        children: 'id',
        lists: 'id',
        words: 'id, listId',
        assignments: 'id, childId, listId',
        progress: 'id, childId, wordId',
        dayLogs: 'id, childId, date, deviceId',
        goals: 'id, childId',
        stats: null,
        meta: 'key',
      })
      .upgrade(async (tx) => {
        const deviceId = await ensureDeviceIdIn(tx.table('meta'))
        const logs = (await tx.table('dayLogs').toArray()) as Array<Record<string, unknown>>
        await tx.table('dayLogs').clear()
        await tx.table('dayLogs').bulkAdd(
          logs.map((l) => {
            const { trainingDay: _t, ...rest } = l
            void _t
            return { ...rest, deviceId, id: `${l.childId}:${l.date}:${deviceId}` }
          }),
        )
        await tx
          .table('goals')
          .toCollection()
          .modify((g: Goal) => {
            if (g.status === 'reached') g.status = 'active'
          })
      })
  }
}

async function ensureDeviceIdIn(meta: Table<Meta, string>): Promise<string> {
  const row = await meta.get('deviceId')
  if (row?.value) return row.value as string
  const id = crypto.randomUUID()
  await meta.put({ key: 'deviceId', value: id })
  return id
}

export const db = new VokabelDB()

export const sortChildren = <T extends { order?: number }>(c: T[]) => [...c].sort((a, b) => (a.order ?? 99) - (b.order ?? 99))

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await db.meta.get(key))?.value as T | undefined
}
export async function setMeta(key: string, value: unknown) {
  await db.meta.put({ key, value })
}

let cachedDeviceId: string | null = null
export async function deviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId
  cachedDeviceId = await ensureDeviceIdIn(db.meta)
  return cachedDeviceId
}
// Nach dem Anmelden wird die Konto-ID zur Geräte-ID; bisherige Tageswerte ziehen mit um.
export async function adoptDeviceId(newId: string) {
  const old = await deviceId()
  if (old === newId) return
  await db.transaction('rw', db.dayLogs, db.meta, async () => {
    const rows = await db.dayLogs.where('deviceId').equals(old).toArray()
    await db.dayLogs.bulkDelete(rows.map((r) => r.id))
    await db.dayLogs.bulkPut(rows.map((r) => ({ ...r, deviceId: newId, id: `${r.childId}:${r.date}:${newId}`, dirty: Date.now() })))
    await db.meta.put({ key: 'deviceId', value: newId })
  })
  cachedDeviceId = newId
}

// Startdaten für den Betrieb ohne Konto und für das Anlegen einer neuen Familie
export async function seed() {
  await db.transaction('rw', db.tables, async () => {
    if ((await db.children.count()) > 0) return
    if (await getMeta('familyId')) return // Daten kommen vom Server
    await seedFamilyData()
  })
}

export async function seedFamilyData() {
  // Nur Fehlendes ergänzen, damit vorhandene Spieler und Einstellungen erhalten bleiben
  const kids = [
    { id: 'milan', name: 'Milan', order: 0, newPerDay: 5 },
    { id: 'marlon', name: 'Marlon', order: 1, newPerDay: 5 },
  ]
  for (const k of kids) if (!(await db.children.get(k.id))) await db.children.add(k)
  if (!(await db.lists.get(unit1.id))) {
    await db.lists.put(unit1)
    await db.words.bulkPut(unit1Words)
  }
  if (!(await db.assignments.get(`milan:${unit1.id}`))) {
    await db.assignments.put({ id: `milan:${unit1.id}`, childId: 'milan', listId: unit1.id, active: true })
  }
  if ((await db.goals.where('childId').equals('milan').count()) === 0) {
    await db.goals.add({ id: crypto.randomUUID(), childId: 'milan', title: 'Fußball', requiredDays: 25, startDate: today(), status: 'active' })
  }
}
