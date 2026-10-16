// Lokale Datenbank (IndexedDB). Später wird sie mit Supabase abgeglichen.
import Dexie, { type Table } from 'dexie'
import type { Assignment, Child, ChildStats, DayLog, Goal, Progress, Word, WordList } from '../logic/types'
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
  dayLogs!: Table<DayLog, string>
  goals!: Table<Goal, string>
  stats!: Table<ChildStats, string>
  meta!: Table<Meta, string>

  constructor() {
    super('vokabel-app')
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
  }
}

export const db = new VokabelDB()

export const sortChildren = <T extends { order?: number }>(c: T[]) => [...c].sort((a, b) => (a.order ?? 99) - (b.order ?? 99))

export async function seed() {
  await db.transaction('rw', db.tables, async () => {
    if ((await db.children.count()) > 0) return
    await db.children.bulkAdd([
      { id: 'milan', name: 'Milan', order: 0, newPerDay: 5 },
      { id: 'marlon', name: 'Marlon', order: 1, newPerDay: 5 },
    ])
    await db.stats.bulkAdd([
      { childId: 'milan', stars: 0 },
      { childId: 'marlon', stars: 0 },
    ])
    await db.lists.add(unit1)
    await db.words.bulkAdd(unit1Words)
    await db.assignments.add({ id: `milan:${unit1.id}`, childId: 'milan', listId: unit1.id })
    await db.goals.add({
      id: crypto.randomUUID(),
      childId: 'milan',
      title: 'Fußball',
      requiredDays: 25,
      startDate: today(),
      status: 'active',
    })
  })
}
