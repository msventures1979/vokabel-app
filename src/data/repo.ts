// Alle Lese- und Schreibzugriffe an einer Stelle, damit später der Server-Abgleich hier andocken kann.
import { db } from './db'
import type { DayLog, Goal, Progress, Word, WordList } from '../logic/types'
import { today, type DateStr } from '../logic/dates'
import { introduce, isDue, newProgress, review } from '../logic/scheduler'
import { goalProgress, qualifiesAsTrainingDay, STARS, starsFor } from '../logic/rewards'

export async function wordPool(childId: string): Promise<Word[]> {
  const lists = await db.assignments.where('childId').equals(childId).toArray()
  const words = await db.words.where('listId').anyOf(lists.map((l) => l.listId)).toArray()
  return words.sort((a, b) => (a.listId === b.listId ? a.order - b.order : a.listId.localeCompare(b.listId)))
}

export async function progressMap(childId: string): Promise<Map<string, Progress>> {
  const rows = await db.progress.where('childId').equals(childId).toArray()
  return new Map(rows.map((p) => [p.wordId, p]))
}

function emptyLog(childId: string, date: DateStr): DayLog {
  return { id: `${childId}:${date}`, childId, date, activeSeconds: 0, answers: 0, roundDone: false, trainingDay: false, stars: 0, newIntroduced: 0 }
}

export async function dayLog(childId: string, date: DateStr = today()): Promise<DayLog> {
  return (await db.dayLogs.get(`${childId}:${date}`)) ?? emptyLog(childId, date)
}

export interface Plan {
  pool: Word[]
  dueIds: string[]
  newIds: string[]
  knownIds: string[]
  extraNewAllowed: number
  log: DayLog
}

// Was steht heute an? Neue Wörter: Tagesziel plus höchstens noch einmal so viele im Extra-Training.
export async function plan(childId: string): Promise<Plan> {
  const day = today()
  const child = await db.children.get(childId)
  const pool = await wordPool(childId)
  const prog = await progressMap(childId)
  const log = await dayLog(childId, day)
  const perDay = child?.newPerDay ?? 5
  const fresh = pool.filter((w) => (prog.get(w.id)?.box ?? 0) === 0).map((w) => w.id)
  const dueIds = pool.filter((w) => {
    const p = prog.get(w.id)
    return p ? isDue(p, day) : false
  }).map((w) => w.id)
  const knownIds = pool.filter((w) => (prog.get(w.id)?.box ?? 0) > 0).map((w) => w.id)
  const roundNew = log.roundDone ? 0 : Math.max(0, perDay - log.newIntroduced)
  const extraNewAllowed = Math.max(0, perDay * 2 - log.newIntroduced)
  return { pool, dueIds, newIds: fresh.slice(0, roundNew), knownIds, extraNewAllowed: Math.min(extraNewAllowed, fresh.length), log }
}

export async function freshWordIds(childId: string, n: number): Promise<string[]> {
  const pool = await wordPool(childId)
  const prog = await progressMap(childId)
  return pool.filter((w) => (prog.get(w.id)?.box ?? 0) === 0).slice(0, n).map((w) => w.id)
}

async function updateLog(childId: string, fn: (l: DayLog) => DayLog): Promise<DayLog> {
  return db.transaction('rw', db.dayLogs, db.stats, db.goals, async () => {
    const before = await dayLog(childId)
    const after = fn(before)
    after.trainingDay = before.trainingDay || qualifiesAsTrainingDay(after)
    await db.dayLogs.put(after)
    const gained = after.stars - before.stars
    if (gained) {
      const s = (await db.stats.get(childId)) ?? { childId, stars: 0 }
      await db.stats.put({ ...s, stars: s.stars + gained })
    }
    if (after.trainingDay && !before.trainingDay) await refreshGoal(childId)
    return after
  })
}

export function addActiveTime(childId: string, seconds: number) {
  if (seconds <= 0) return Promise.resolve()
  return updateLog(childId, (l) => ({ ...l, activeSeconds: l.activeSeconds + seconds }))
}

export function recordAnswer(childId: string, seconds: number, baseStars: number) {
  return updateLog(childId, (l) => {
    const activeSeconds = l.activeSeconds + seconds
    return { ...l, activeSeconds, answers: l.answers + 1, stars: l.stars + starsFor(baseStars, activeSeconds) }
  })
}

export function completeRound(childId: string, perfect: boolean) {
  return updateLog(childId, (l) => ({
    ...l,
    roundDone: true,
    stars: l.stars + (perfect ? starsFor(STARS.perfectRound, l.activeSeconds) : 0),
  }))
}

export async function applyReview(childId: string, wordId: string, correct: boolean) {
  const p = (await db.progress.get(`${childId}:${wordId}`)) ?? newProgress(childId, wordId)
  await db.progress.put(review(p, correct, today()))
}

export async function introduceWords(childId: string, wordIds: string[]) {
  const day = today()
  let n = 0
  await db.transaction('rw', db.progress, async () => {
    for (const id of wordIds) {
      const p = (await db.progress.get(`${childId}:${id}`)) ?? newProgress(childId, id)
      if (p.box === 0) n++
      await db.progress.put(introduce(p, day))
    }
  })
  if (n) await updateLog(childId, (l) => ({ ...l, newIntroduced: l.newIntroduced + n }))
}

export async function trainingDates(childId: string): Promise<Set<DateStr>> {
  const logs = await db.dayLogs.where('childId').equals(childId).toArray()
  return new Set(logs.filter((l) => l.trainingDay).map((l) => l.date))
}

export async function activeGoal(childId: string): Promise<Goal | undefined> {
  const goals = await db.goals.where('childId').equals(childId).toArray()
  return goals.find((g) => g.status !== 'handedOver')
}

async function refreshGoal(childId: string) {
  const g = await activeGoal(childId)
  if (!g || g.status !== 'active') return
  if (goalProgress(g, await trainingDates(childId)) >= g.requiredDays) await db.goals.put({ ...g, status: 'reached' })
}

// ---------- Eltern ----------

export async function setGoal(childId: string, title: string, requiredDays: number) {
  const current = await activeGoal(childId)
  if (current && current.status !== 'handedOver') {
    await db.goals.put({ ...current, title, requiredDays })
    await refreshGoal(childId)
    return
  }
  await db.goals.add({ id: crypto.randomUUID(), childId, title, requiredDays, startDate: today(), status: 'active' })
}

export async function confirmHandover(goalId: string) {
  const g = await db.goals.get(goalId)
  if (g) await db.goals.put({ ...g, status: 'handedOver', handedOverOn: today() })
}

export async function setAssignment(childId: string, listId: string, on: boolean) {
  const id = `${childId}:${listId}`
  if (on) await db.assignments.put({ id, childId, listId })
  else await db.assignments.delete(id)
}

export interface ImportFile {
  list: WordList
  words: Array<Omit<Word, 'listId' | 'order' | 'id'> & { id?: string }>
}

// Importdatei: { list: {id, title, subject}, words: [{en, answers, de, ipa?, example?, cloze?, note?, caseSensitive?}] }
export async function importList(data: ImportFile) {
  if (!data?.list?.id || !data.list.title || !Array.isArray(data.words) || data.words.length === 0) {
    throw new Error('Die Datei hat nicht das erwartete Format.')
  }
  const words: Word[] = data.words.map((w, i) => {
    if (!w.en || !w.de || !Array.isArray(w.answers) || w.answers.length === 0) throw new Error(`Wort ${i + 1} ist unvollständig.`)
    return { ...w, id: w.id ?? `${data.list.id}:${i}`, listId: data.list.id, order: i }
  })
  await db.transaction('rw', db.lists, db.words, async () => {
    await db.lists.put({ ...data.list, subject: data.list.subject || 'Englisch' })
    await db.words.bulkPut(words)
  })
  return words.length
}

export async function exportAll() {
  const out: Record<string, unknown[]> = {}
  for (const t of db.tables) if (t.name !== 'meta') out[t.name] = await t.toArray()
  return { app: 'vokabel-app', version: 1, exportedAt: new Date().toISOString(), data: out }
}

export async function restoreAll(backup: { app?: string; data?: Record<string, unknown[]> }) {
  if (backup?.app !== 'vokabel-app' || !backup.data) throw new Error('Das ist keine Sicherung dieser App.')
  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) {
      if (t.name === 'meta' || !backup.data![t.name]) continue
      await t.clear()
      await t.bulkPut(backup.data![t.name] as never[])
    }
  })
}

// Eltern-PIN, vorläufig lokal gespeichert (wird durch den Eltern-Login ersetzt)
async function sha(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('vokabel-app:' + s))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}
export async function hasParentPin() {
  return !!(await db.meta.get('parentPin'))
}
export async function setParentPin(pin: string) {
  await db.meta.put({ key: 'parentPin', value: await sha(pin) })
}
export async function checkParentPin(pin: string) {
  return (await db.meta.get('parentPin'))?.value === (await sha(pin))
}
