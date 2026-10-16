// Umwandlung zwischen lokalen Datensätzen und Server-Zeilen, plus Zusammenführungsregeln.
import type { Assignment, Child, DayLogRow, Goal, Progress, Word, WordList } from '../logic/types'

export type Row = Record<string, unknown>

const strip = <T extends object>(o: T) => {
  const out: Row = {}
  for (const [k, v] of Object.entries(o)) if (v !== undefined) out[k] = v
  return out
}

export const toServer = {
  children: (c: Child, fam: string): Row => ({ family_id: fam, id: c.id, name: c.name, sort: c.order ?? 0, new_per_day: c.newPerDay, settings: c.settings ?? {} }),
  lists: (l: WordList, fam: string): Row => ({ family_id: fam, id: l.id, title: l.title, subject: l.subject, test_date: l.testDate ?? null }),
  words: (w: Word, fam: string): Row => {
    const { id, listId, order, dirty: _d, ...data } = w
    void _d
    return { family_id: fam, id, list_id: listId, sort: order, data: strip(data) }
  },
  assignments: (a: Assignment, fam: string): Row => ({ family_id: fam, child_id: a.childId, list_id: a.listId, active: a.active !== false }),
  goals: (g: Goal, fam: string): Row => ({
    family_id: fam,
    id: g.id,
    child_id: g.childId,
    title: g.title,
    required_days: g.requiredDays,
    start_date: g.startDate,
    status: g.status === 'handedOver' ? 'handedOver' : 'active',
    handed_over_on: g.handedOverOn ?? null,
    image: g.image ?? null,
  }),
  progress: (p: Progress, fam: string): Row => ({
    family_id: fam,
    child_id: p.childId,
    word_id: p.wordId,
    box: p.box,
    due: p.due,
    wrong_streak: p.wrongStreak,
    errors: p.errors,
    introduced_on: p.introducedOn ?? null,
  }),
  dayLogs: (d: DayLogRow, fam: string): Row => ({
    family_id: fam,
    child_id: d.childId,
    date: d.date,
    device_id: d.deviceId,
    active_seconds: Math.round(d.activeSeconds),
    answers: d.answers,
    round_done: d.roundDone,
    stars: d.stars,
    new_introduced: d.newIntroduced,
  }),
}

const opt = <T>(v: unknown): T | undefined => (v === null || v === undefined ? undefined : (v as T))

export const fromServer = {
  children: (r: Row): Child => ({
    id: r.id as string,
    name: r.name as string,
    order: r.sort as number,
    newPerDay: r.new_per_day as number,
    settings: opt(r.settings),
    player: opt(r.player),
  }),
  lists: (r: Row): WordList => ({ id: r.id as string, title: r.title as string, subject: r.subject as string, testDate: opt(r.test_date) }),
  words: (r: Row): Word => ({ ...(r.data as object), id: r.id as string, listId: r.list_id as string, order: r.sort as number }) as Word,
  assignments: (r: Row): Assignment => ({
    id: `${r.child_id}:${r.list_id}`,
    childId: r.child_id as string,
    listId: r.list_id as string,
    active: r.active as boolean,
  }),
  goals: (r: Row): Goal => ({
    id: r.id as string,
    childId: r.child_id as string,
    title: r.title as string,
    requiredDays: r.required_days as number,
    startDate: r.start_date as string,
    status: r.status as Goal['status'],
    handedOverOn: opt(r.handed_over_on),
    image: opt(r.image),
  }),
  progress: (r: Row): Progress => ({
    id: `${r.child_id}:${r.word_id}`,
    childId: r.child_id as string,
    wordId: r.word_id as string,
    box: r.box as number,
    due: (r.due as string) ?? null,
    wrongStreak: r.wrong_streak as number,
    errors: r.errors as number,
    introducedOn: opt(r.introduced_on),
  }),
  dayLogs: (r: Row): DayLogRow => ({
    id: `${r.child_id}:${r.date}:${r.device_id}`,
    childId: r.child_id as string,
    date: r.date as string,
    deviceId: r.device_id as string,
    activeSeconds: r.active_seconds as number,
    answers: r.answers as number,
    roundDone: r.round_done as boolean,
    stars: r.stars as number,
    newIntroduced: r.new_introduced as number,
  }),
}

export type TableName = keyof typeof fromServer
export const PARENT_TABLES: TableName[] = ['children', 'lists', 'words', 'assignments', 'goals']
export const ALL_TABLES: TableName[] = ['children', 'lists', 'words', 'assignments', 'goals', 'progress', 'dayLogs']

export const SERVER_TABLE: Record<TableName, string> = {
  children: 'children',
  lists: 'lists',
  words: 'words',
  assignments: 'assignments',
  goals: 'goals',
  progress: 'progress',
  dayLogs: 'day_logs',
}

export const CONFLICT_KEYS: Record<TableName, string> = {
  children: 'family_id,id',
  lists: 'family_id,id',
  words: 'family_id,id',
  assignments: 'family_id,child_id,list_id',
  goals: 'family_id,id',
  progress: 'family_id,child_id,word_id',
  dayLogs: 'family_id,child_id,date,device_id',
}

// Zusammenführen beim Herunterladen: lokale, noch nicht hochgeladene Änderungen gewinnen.
// Eigene Tageswerte: jeweils der höhere Wert (Zeit und Antworten wachsen nur).
export function mergeIncoming<T extends { dirty?: number }>(
  table: TableName,
  local: T | undefined,
  incoming: T,
  myDeviceId: string,
): T | null {
  if (table === 'dayLogs') {
    const inc = incoming as unknown as DayLogRow
    const loc = local as unknown as DayLogRow | undefined
    if (!loc || inc.deviceId !== myDeviceId) return incoming
    const merged: DayLogRow = {
      ...loc,
      activeSeconds: Math.max(loc.activeSeconds, inc.activeSeconds),
      answers: Math.max(loc.answers, inc.answers),
      stars: Math.max(loc.stars, inc.stars),
      newIntroduced: Math.max(loc.newIntroduced, inc.newIntroduced),
      roundDone: loc.roundDone || inc.roundDone,
    }
    return merged as unknown as T
  }
  if (table === 'children') {
    const loc = local as unknown as Child | undefined
    const inc = incoming as unknown as Child
    if (!loc) return incoming
    const base: Child = loc.dirty
      ? { ...inc, name: loc.name, order: loc.order, newPerDay: loc.newPerDay, settings: loc.settings, dirty: loc.dirty }
      : { ...inc }
    if (loc.playerDirty) {
      base.player = loc.player
      base.playerDirty = loc.playerDirty
    }
    return base as unknown as T
  }
  if (local?.dirty) return null // lokal bleibt, wird beim nächsten Hochladen gesendet
  return incoming
}
