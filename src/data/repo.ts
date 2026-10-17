// Alle Lese- und Schreibzugriffe auf die lokale Datenbank. Jede Änderung wird für den Abgleich markiert.
import { db, deviceId, getMeta, setMeta } from './db'
import type { Child, DayLog, DayLogRow, Goal, Player, Progress, Word, WordList } from '../logic/types'
import { today, type DateStr } from '../logic/dates'
import { introduce, isDue, newProgress, review } from '../logic/scheduler'
import { DEFAULT_RULES, qualifiesAsTrainingDay, rulesFor, STARS, starsFor, type DayRules } from '../logic/rewards'
import { syncSoon } from '../sync/signal'
import { bestStreak, RULES_SINCE, type AlbumStats } from '../logic/album'
import { germanWords } from './german'

const now = () => Date.now()

export const GERMAN = 'Deutsch'
export type Subject = 'en' | 'de'

// Wörter der zugeordneten Listen eines Fachs (Englisch und Deutsch werden getrennt geübt)
export async function wordPool(childId: string, subject: Subject = 'en'): Promise<Word[]> {
  const assigned = (await db.assignments.where('childId').equals(childId).toArray()).filter((a) => a.active !== false)
  const lists = (await db.lists.bulkGet(assigned.map((a) => a.listId))).filter((l) => l && (l.subject === GERMAN) === (subject === 'de'))
  const words = await db.words.where('listId').anyOf(lists.map((l) => l!.id)).toArray()
  return words.sort((a, b) => (a.listId === b.listId ? a.order - b.order : a.listId.localeCompare(b.listId)))
}

export async function progressMap(childId: string): Promise<Map<string, Progress>> {
  const rows = await db.progress.where('childId').equals(childId).toArray()
  return new Map(rows.map((p) => [p.wordId, p]))
}

// ---------- Tageswerte ----------

export function sumLogs(childId: string, date: DateStr, rows: DayLogRow[], rules: DayRules = DEFAULT_RULES): DayLog {
  const sum: DayLog = { childId, date, activeSeconds: 0, answers: 0, roundDone: false, trainingDay: false, stars: 0, newIntroduced: 0 }
  for (const r of rows) {
    sum.activeSeconds += r.activeSeconds
    sum.answers += r.answers
    sum.stars += r.stars
    sum.newIntroduced += r.newIntroduced
    sum.roundDone ||= r.roundDone
  }
  sum.trainingDay = qualifiesAsTrainingDay(sum, rules)
  return sum
}

// Summe aller Geräte für einen Tag
export async function dayLog(childId: string, date: DateStr = today()): Promise<DayLog> {
  const rows = await db.dayLogs.where('date').equals(date).filter((r) => r.childId === childId).toArray()
  return sumLogs(childId, date, rows, await childRules(childId))
}

export async function childRules(childId: string): Promise<DayRules> {
  return rulesFor(await db.children.get(childId))
}

export async function totalStars(childId: string): Promise<number> {
  let s = 0
  await db.dayLogs.where('childId').equals(childId).each((r) => (s += r.stars))
  return s
}

export async function trainingDates(childId: string): Promise<Set<DateStr>> {
  const rows = await db.dayLogs.where('childId').equals(childId).toArray()
  const byDate = new Map<DateStr, DayLogRow[]>()
  for (const r of rows) byDate.set(r.date, [...(byDate.get(r.date) ?? []), r])
  const rules = await childRules(childId)
  const out = new Set<DateStr>()
  for (const [d, rs] of byDate) if (sumLogs(childId, d, rs, rules).trainingDay) out.add(d)
  return out
}

async function updateOwnLog(childId: string, fn: (own: DayLogRow, total: DayLog) => DayLogRow): Promise<DayLog> {
  const dev = await deviceId()
  const date = today()
  const id = `${childId}:${date}:${dev}`
  await db.transaction('rw', db.dayLogs, db.children, async () => {
    const own = (await db.dayLogs.get(id)) ?? { id, childId, date, deviceId: dev, activeSeconds: 0, answers: 0, roundDone: false, stars: 0, newIntroduced: 0 }
    const total = await dayLog(childId, date)
    await db.dayLogs.put({ ...fn(own, total), dirty: now() })
  })
  return dayLog(childId, date)
}

export function addActiveTime(childId: string, seconds: number) {
  if (seconds <= 0) return Promise.resolve()
  return updateOwnLog(childId, (l) => ({ ...l, activeSeconds: Math.round(l.activeSeconds + seconds) }))
}

export function recordAnswer(childId: string, seconds: number, baseStars: number) {
  return updateOwnLog(childId, (l, total) => ({
    ...l,
    activeSeconds: Math.round(l.activeSeconds + seconds),
    answers: l.answers + 1,
    stars: l.stars + starsFor(baseStars, total.activeSeconds + seconds),
  }))
}

export async function completeRound(childId: string, perfect: boolean) {
  const after = await updateOwnLog(childId, (l, total) => ({
    ...l,
    roundDone: true,
    stars: l.stars + (perfect ? starsFor(STARS.perfectRound, total.activeSeconds) : 0),
  }))
  syncSoon()
  return after
}

// ---------- Sammelalbum ----------

export async function albumStats(childId: string): Promise<AlbumStats> {
  const [rows, dates, prog] = await Promise.all([
    db.dayLogs.where('childId').equals(childId).toArray(),
    trainingDates(childId),
    db.progress.where('childId').equals(childId).toArray(),
  ])
  const all = [...dates]
  const before = all.filter((d) => d < RULES_SINCE)
  const after = all.filter((d) => d >= RULES_SINCE)
  return {
    stars: rows.reduce((n, r) => n + r.stars, 0),
    trainingDays: dates.size,
    bestStreak: bestStreak(all),
    wordsLearned: prog.filter((p) => p.box >= 3).length,
    legacy: {
      stars: rows.filter((r) => r.date < RULES_SINCE).reduce((n, r) => n + r.stars, 0),
      trainingDays: before.length,
      bestStreak: bestStreak(before),
    },
    newTrainingDays: after.length,
    trainedToday: today() >= RULES_SINCE && dates.has(today()),
  }
}

export async function seenCards(childId: string): Promise<string[] | undefined> {
  return getMeta<string[]>(`seenCards:${childId}`)
}
export async function markCardsSeen(childId: string, ids: string[]) {
  await setMeta(`seenCards:${childId}`, ids)
}

// ---------- Lernstand ----------

export interface Plan {
  pool: Word[]
  dueIds: string[]
  newIds: string[]
  knownIds: string[]
  extraNewAllowed: number
  freshCount: number // Wörter, die noch nie dran waren
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
  const dueIds = pool
    .filter((w) => {
      const p = prog.get(w.id)
      return p ? isDue(p, day) : false
    })
    .map((w) => w.id)
  const knownIds = pool.filter((w) => (prog.get(w.id)?.box ?? 0) > 0).map((w) => w.id)
  // Neue Wörter je Tag begrenzt über die Zahl der heute eingeführten (Deutsch zählt hier nicht mit)
  const roundNew = Math.max(0, perDay - log.newIntroduced)
  const extraNewAllowed = Math.max(0, perDay * 2 - log.newIntroduced)
  return { pool, dueIds, newIds: fresh.slice(0, roundNew), knownIds, extraNewAllowed: Math.min(extraNewAllowed, fresh.length), freshCount: fresh.length, log }
}

export async function freshWordIds(childId: string, n: number): Promise<string[]> {
  const pool = await wordPool(childId)
  const prog = await progressMap(childId)
  return pool
    .filter((w) => (prog.get(w.id)?.box ?? 0) === 0)
    .slice(0, n)
    .map((w) => w.id)
}

export async function applyReview(childId: string, wordId: string, correct: boolean) {
  const p = (await db.progress.get(`${childId}:${wordId}`)) ?? newProgress(childId, wordId)
  await db.progress.put({ ...review(p, correct, today()), dirty: now() })
}

export async function introduceWords(childId: string, wordIds: string[]) {
  const day = today()
  let n = 0
  await db.transaction('rw', db.progress, async () => {
    for (const id of wordIds) {
      const p = (await db.progress.get(`${childId}:${id}`)) ?? newProgress(childId, id)
      if (p.box === 0) n++
      await db.progress.put({ ...introduce(p, day), dirty: now() })
    }
  })
  if (n) await updateOwnLog(childId, (l) => ({ ...l, newIntroduced: l.newIntroduced + n }))
}

// ---------- Ziele ----------

// Aktuelle Saison-Einstellung (Startdatum und Trainingstage pro Saison)
export async function activeGoal(childId: string): Promise<Goal | undefined> {
  const goals = (await db.goals.where('childId').equals(childId).toArray()).filter((g) => g.status !== 'handedOver')
  goals.sort((a, b) => b.startDate.localeCompare(a.startDate))
  return goals[0]
}

// Trainingstage pro Saison ändern (oder Saisons starten, falls noch keine angelegt sind)
export async function setSeasonLength(childId: string, requiredDays: number) {
  const current = await activeGoal(childId)
  if (current) await db.goals.put({ ...current, requiredDays, dirty: now() })
  else await db.goals.add({ id: crypto.randomUUID(), childId, title: SEASON_TITLE, requiredDays, startDate: today(), status: 'active', dirty: now() })
  syncSoon()
}

export const SEASON_TITLE = 'Saisonpokal'

// ---------- Kinder, Listen ----------

export async function setPlayer(childId: string, player: Player) {
  await db.children.update(childId, { player, playerDirty: now() })
  syncSoon()
}

export async function setNewPerDay(child: Child, n: number) {
  await db.children.update(child.id, { newPerDay: n, dirty: now() })
  syncSoon()
}

export async function updateChildSettings(childId: string, patch: Partial<NonNullable<Child['settings']>>) {
  const c = await db.children.get(childId)
  if (!c) return
  await db.children.update(childId, { settings: { ...c.settings, ...patch }, dirty: now() })
  syncSoon()
}

export async function setAssignment(childId: string, listId: string, on: boolean) {
  await db.assignments.put({ id: `${childId}:${listId}`, childId, listId, active: on, dirty: now() })
  syncSoon()
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
  const stamp = now()
  const words: Word[] = data.words.map((w, i) => {
    if (!w.en || !w.de || !Array.isArray(w.answers) || w.answers.length === 0) throw new Error(`Wort ${i + 1} ist unvollständig.`)
    return { ...w, id: w.id ?? `${data.list.id}:${i}`, listId: data.list.id, order: i, dirty: stamp }
  })
  await db.transaction('rw', db.lists, db.words, async () => {
    await db.lists.put({ ...data.list, subject: data.list.subject || 'Englisch', dirty: stamp })
    await db.words.bulkPut(words)
  })
  syncSoon()
  return words.length
}

// ---------- Sicherung ----------

export async function exportAll() {
  const out: Record<string, unknown[]> = {}
  for (const t of db.tables) if (t.name !== 'meta') out[t.name] = await t.toArray()
  return { app: 'vokabel-app', version: 2, exportedAt: new Date().toISOString(), data: out }
}

export async function restoreAll(backup: { app?: string; version?: number; data?: Record<string, unknown[]> }) {
  if (backup?.app !== 'vokabel-app' || !backup.data) throw new Error('Das ist keine Sicherung dieser App.')
  if ((backup.version ?? 1) < 2) throw new Error('Diese Sicherung stammt aus einer älteren Version.')
  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) {
      if (t.name === 'meta' || !backup.data![t.name]) continue
      await t.clear()
      await t.bulkPut((backup.data![t.name] as Record<string, unknown>[]).map((r) => ({ ...r, dirty: now() })) as never[])
    }
  })
  syncSoon()
}

// ---------- Eltern-PIN (lokal, schützt den Eltern-Bereich auch auf dem Eltern-Handy) ----------

async function sha(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('vokabel-app:' + s))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
export async function hasParentPin() {
  return !!(await getMeta('parentPin'))
}
export async function setParentPin(pin: string) {
  await setMeta('parentPin', await sha(pin))
}
export async function clearParentPin() {
  await db.meta.delete('parentPin')
}
export async function checkParentPin(pin: string) {
  return (await getMeta('parentPin')) === (await sha(pin))
}

// ---------- Deutsch (Lernwörter) ----------

// Ergebnis einer Deutsch-Übung in den Karteikasten übernehmen (zählt nicht zu den neuen Englisch-Wörtern)
export async function germanResult(childId: string, wordId: string, correct: boolean) {
  const day = today()
  const id = `${childId}:${wordId}`
  const p = (await db.progress.get(id)) ?? newProgress(childId, wordId)
  let next = p
  if (p.box === 0) next = introduce(p, day)
  else if (isDue(p, day) || !correct) next = review(p, correct, day)
  if (next !== p) await db.progress.put({ ...next, dirty: now() })
}

export async function germanData(childId: string) {
  const pool = await wordPool(childId, 'de')
  const lists = (await db.lists.bulkGet([...new Set(pool.map((w) => w.listId))])).filter((l): l is WordList => !!l)
  return { pool, lists, progress: await progressMap(childId) }
}

// Neues Lernwörterblatt speichern und dem Kind zuordnen. Wörter mit Silbenstrich: "Kat-ze"
export async function saveGermanSheet(childId: string, title: string, lern: string[], lese: string[]) {
  const listId = `de-${crypto.randomUUID().slice(0, 8)}`
  const words = germanWords(listId, lern, lese)
  if (!words.some((w) => w.kind === 'lern')) throw new Error('Bitte mindestens ein Lernwort eintragen.')
  const stamp = now()
  await db.transaction('rw', db.lists, db.words, db.assignments, async () => {
    await db.lists.put({ id: listId, title: title.trim() || 'Lernwörterblatt', subject: GERMAN, dirty: stamp })
    await db.words.bulkPut(words.map((w) => ({ ...w, dirty: stamp })))
    await db.assignments.put({ id: `${childId}:${listId}`, childId, listId, active: true, dirty: stamp })
  })
  syncSoon()
  return words.length
}
