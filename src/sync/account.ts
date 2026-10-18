// Konto, Familie, Geräte-Kopplung und der laufende Abgleich.
import type { SupabaseClient } from '@supabase/supabase-js'
import { useSyncExternalStore } from 'react'
import { SUPABASE_KEY, SUPABASE_URL, SYNC_CONFIGURED } from '../config'
import { adoptDeviceId, db, getMeta, seedFamilyData, setMeta } from '../data/db'
import { ensureCatalog } from '../data/catalog'
import type { DayLogRow, Progress } from '../logic/types'
import { pull, push, resetPullMarkers, type SyncContext } from './engine'
import { PARENT_TABLES } from './mapping'
import { onSyncRequest } from './signal'

export type Role = 'parent' | 'device'

export interface SyncState {
  configured: boolean
  signedIn: boolean
  email?: string
  anonymous?: boolean
  familyId?: string
  role?: Role
  status: 'off' | 'idle' | 'syncing' | 'offline' | 'error'
  lastSync?: number
  error?: string
  ready: boolean
}

let state: SyncState = { configured: SYNC_CONFIGURED, signedIn: false, status: 'off', ready: false }
const listeners = new Set<() => void>()
function setState(patch: Partial<SyncState>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}
export function useSyncState() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

// Die Supabase-Bibliothek ist groß und wird erst bei Bedarf nachgeladen
let client: Promise<SupabaseClient> | null = null
export function supa(): Promise<SupabaseClient> {
  if (!SYNC_CONFIGURED) return Promise.reject(new Error('Abgleich ist nicht eingerichtet.'))
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true } }),
  )
  return client
}

const fehler = (e: unknown) => {
  const m = (e as { message?: string })?.message ?? String(e)
  if (/Invalid login credentials/i.test(m)) return 'E-Mail oder Passwort stimmt nicht.'
  if (/Email not confirmed/i.test(m)) return 'Bitte zuerst die E-Mail bestätigen (Link im Postfach).'
  if (/User already registered/i.test(m)) return 'Für diese E-Mail gibt es schon ein Konto. Bitte anmelden.'
  if (/Anonymous sign-ins are disabled/i.test(m)) return 'Gerätekopplung ist in Supabase noch nicht freigeschaltet (Anonymous Sign-ins).'
  if (/Password should be at least/i.test(m)) return 'Das Passwort muss mindestens 6 Zeichen haben.'
  if (/Failed to fetch|NetworkError|network/i.test(m)) return 'Keine Internetverbindung.'
  return m
}

// ---------- Start ----------

export async function initSync() {
  if (!SYNC_CONFIGURED) {
    setState({ ready: true })
    return
  }
  const { data } = await (await supa()).auth.getSession()
  const user = data.session?.user
  const familyId = await getMeta<string>('familyId')
  const role = await getMeta<Role>('role')
  setState({
    ready: true,
    signedIn: !!user,
    email: user?.email,
    anonymous: user?.is_anonymous,
    familyId: user ? familyId : undefined,
    role: user ? role : undefined,
    status: user && familyId ? 'idle' : 'off',
  })
  if (user && familyId) startLoop()
}

let loopStarted = false
function startLoop() {
  onSyncRequest(() => void syncNow())
  if (loopStarted) return
  loopStarted = true
  window.addEventListener('online', () => void syncNow())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void syncNow()
  })
  setInterval(() => {
    if (document.visibilityState === 'visible') void syncNow()
  }, 60_000)
  void syncNow()
}

let running: Promise<void> | null = null
export function syncNow(): Promise<void> {
  if (running) return running
  running = (async () => {
    if (!state.familyId || !state.role) return
    if (!navigator.onLine) {
      setState({ status: 'offline' })
      return
    }
    setState({ status: 'syncing' })
    try {
      const ctx: SyncContext = { client: (await supa()), familyId: state.familyId, role: state.role }
      await push(ctx)
      await pull(ctx)
      // Eltern-Gerät: neue eingebaute Wortlisten ergänzen und hochladen
      if (ctx.role === 'parent' && (await ensureCatalog())) await push(ctx)
      setState({ status: 'idle', lastSync: Date.now(), error: undefined })
    } catch (e) {
      const msg = fehler(e)
      // Mitgliedschaft entfernt (Gerät abgemeldet)?
      if (/JWT|not authorized|permission/i.test(msg)) await checkMembership()
      setState({ status: navigator.onLine ? 'error' : 'offline', error: msg })
    }
  })().finally(() => {
    running = null
  })
  return running
}

async function checkMembership() {
  const { data } = await (await supa()).from('members').select('family_id, role').maybeSingle()
  if (!data) await forgetFamily()
}

// ---------- Eltern-Konto ----------

export async function signUpParent(email: string, password: string): Promise<'confirm' | 'ok'> {
  try {
    const { data, error } = await (await supa()).auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
    if (error) throw error
    if (!data.session) return 'confirm'
    await afterSignIn()
    return 'ok'
  } catch (e) {
    throw new Error(fehler(e))
  }
}

export async function signInParent(email: string, password: string) {
  try {
    const { error } = await (await supa()).auth.signInWithPassword({ email, password })
    if (error) throw error
    await afterSignIn()
  } catch (e) {
    throw new Error(fehler(e))
  }
}

// Nach dem Anmelden: gehört das Konto schon zu einer Familie?
async function afterSignIn() {
  const { data: u } = await (await supa()).auth.getUser()
  if (!u.user) throw new Error('Anmeldung fehlgeschlagen.')
  setState({ signedIn: true, email: u.user.email, anonymous: u.user.is_anonymous })
  await adoptDeviceId(u.user.id)
  const { data: m, error } = await (await supa()).from('members').select('family_id, role').eq('user_id', u.user.id).maybeSingle()
  if (error) throw error
  if (m) await attachToFamily(m.family_id as string, m.role as Role)
}

// Neue Familie: lokale Daten (Kinder, Unit 1, Ziel, bisheriger Lernstand) werden hochgeladen
export async function createFamily(name = 'Familie Storch') {
  try {
    const { data, error } = await (await supa()).rpc('create_family', { family_name: name })
    if (error) throw error
    const familyId = data as string
    await seedFamilyData()
    await ensureCatalog()
    const stamp = Date.now()
    await db.transaction('rw', db.tables, async () => {
      for (const t of [...PARENT_TABLES, 'progress', 'dayLogs'] as const) {
        await db.table(t).toCollection().modify((r: { dirty?: number }) => {
          r.dirty = stamp
        })
      }
      await db.children.toCollection().modify((c) => {
        if (c.player) c.playerDirty = stamp
      })
    })
    await resetPullMarkers()
    await setMeta('familyId', familyId)
    await setMeta('role', 'parent')
    setState({ familyId, role: 'parent', status: 'idle' })
    startLoop()
    await syncNow()
  } catch (e) {
    throw new Error(fehler(e))
  }
}

// ---------- Kopplung ----------

export async function createPairingCode(kind: 'device' | 'parent'): Promise<string> {
  const { data, error } = await (await supa()).rpc('create_pairing_code', { code_kind: kind })
  if (error) throw new Error(fehler(error))
  return data as string
}

// Kind-Gerät: anonym anmelden und mit Code der Familie beitreten
export async function pairDevice(code: string, deviceName: string) {
  try {
    const c = await supa()
    const { data: s } = await c.auth.getSession()
    if (!s.session) {
      const { error } = await c.auth.signInAnonymously()
      if (error) throw error
    }
    const { data: u } = await c.auth.getUser()
    await adoptDeviceId(u.user!.id)
    const { data, error } = await c.rpc('claim_pairing_code', { pairing_code: code.trim(), name: deviceName })
    if (error) throw error
    setState({ signedIn: true, anonymous: u.user!.is_anonymous, email: u.user!.email })
    await attachToFamily(data as string, u.user!.is_anonymous ? 'device' : 'parent')
  } catch (e) {
    throw new Error(fehler(e))
  }
}

export async function joinAsParent(code: string) {
  return pairDevice(code, 'Eltern')
}

// Lokale Daten auf die Familie umstellen: Server gewinnt, nur lokal vorhandener Lernstand wird ergänzt.
async function attachToFamily(familyId: string, role: Role) {
  const localProgress = (await db.progress.toArray()) as Progress[]
  const localPlayers = new Map((await db.children.toArray()).filter((c) => c.player).map((c) => [c.id, c.player!]))
  const ownLogs = (await db.dayLogs.toArray()) as DayLogRow[]
  await db.transaction('rw', db.tables, async () => {
    for (const t of [...PARENT_TABLES, 'progress'] as const) await db.table(t).clear()
  })
  await resetPullMarkers()
  await setMeta('familyId', familyId)
  await setMeta('role', role)
  setState({ familyId, role, status: 'syncing' })
  const ctx: SyncContext = { client: (await supa()), familyId, role }
  await pull(ctx)
  const serverChildren = new Set((await db.children.toArray()).map((c) => c.id))
  const stamp = Date.now()
  await db.transaction('rw', db.progress, db.children, db.dayLogs, async () => {
    for (const p of localProgress) {
      if (!serverChildren.has(p.childId)) continue
      if (!(await db.progress.get(p.id))) await db.progress.put({ ...p, dirty: stamp })
    }
    for (const [id, player] of localPlayers) {
      const c = await db.children.get(id)
      if (c && !c.player) await db.children.put({ ...c, player, playerDirty: stamp })
    }
    for (const l of ownLogs) if (!serverChildren.has(l.childId)) await db.dayLogs.delete(l.id)
  })
  startLoop()
  await syncNow()
}

// ---------- Geräte verwalten, Abmelden ----------

export interface Member {
  user_id: string
  role: Role
  device_name: string | null
  created_at: string
}

export async function listMembers(): Promise<Member[]> {
  const { data, error } = await (await supa()).from('members').select('user_id, role, device_name, created_at').order('created_at')
  if (error) throw new Error(fehler(error))
  return data as Member[]
}

export async function removeMember(userId: string) {
  const { error } = await (await supa()).from('members').delete().eq('user_id', userId)
  if (error) throw new Error(fehler(error))
}

export async function currentUserId(): Promise<string | undefined> {
  const { data } = await (await supa()).auth.getSession()
  return data.session?.user.id
}

async function forgetFamily() {
  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) if (t.name !== 'meta') await t.clear()
  })
  await db.meta.delete('familyId')
  await db.meta.delete('role')
  await resetPullMarkers()
  setState({ familyId: undefined, role: undefined, status: 'off' })
}

export async function signOut() {
  await syncNow().catch(() => undefined)
  await forgetFamily()
  await (await supa()).auth.signOut()
  await db.meta.delete('deviceId')
  setState({ signedIn: false, email: undefined, anonymous: undefined })
  window.location.reload()
}

export async function useWithoutAccount() {
  await setMeta('localOnly', true)
}
