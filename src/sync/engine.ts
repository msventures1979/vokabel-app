// Abgleich zwischen lokaler Datenbank und Supabase: erst hochladen, dann Neues herunterladen.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Table } from 'dexie'
import { db, deviceId, getMeta, setMeta } from '../data/db'
import { addDays, today } from '../logic/dates'
import type { Child, DayLogRow } from '../logic/types'
import { ALL_TABLES, CONFLICT_KEYS, fromServer, mergeIncoming, PARENT_TABLES, SERVER_TABLE, toServer, type Row, type TableName } from './mapping'

type AnyRow = { id: string; dirty?: number }

const localTable = (t: TableName) => (db as unknown as Record<TableName, Table<AnyRow, string>>)[t]

export interface SyncContext {
  client: SupabaseClient
  familyId: string
  role: 'parent' | 'device'
}

// Markierung nur entfernen, wenn sich der Datensatz seit dem Hochladen nicht erneut geändert hat
async function clearDirty(t: TableName, rows: AnyRow[], field: 'dirty' | 'playerDirty' = 'dirty') {
  const table = localTable(t)
  await db.transaction('rw', table, async () => {
    for (const r of rows) {
      const cur = (await table.get(r.id)) as Record<string, unknown> | undefined
      if (cur && cur[field] === (r as unknown as Record<string, unknown>)[field]) {
        delete cur[field]
        await table.put(cur as unknown as AnyRow)
      }
    }
  })
}

async function dirtyRows(t: TableName): Promise<AnyRow[]> {
  return localTable(t).filter((r) => !!r.dirty).toArray()
}

export async function push(ctx: SyncContext): Promise<number> {
  const { client, familyId, role } = ctx
  let sent = 0

  const upsert = async (t: TableName, rows: AnyRow[]) => {
    if (rows.length === 0) return
    const map = toServer[t] as (r: AnyRow, f: string) => Row
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500)
      const { error } = await client.from(SERVER_TABLE[t]).upsert(chunk.map((r) => map(r, familyId)), { onConflict: CONFLICT_KEYS[t] })
      if (error) throw new Error(`${t}: ${error.message}`)
      await clearDirty(t, chunk)
      sent += chunk.length
    }
  }

  if (role === 'parent') {
    for (const t of PARENT_TABLES) await upsert(t, await dirtyRows(t))
  } else {
    // Geräte dürfen diese Tabellen nicht ändern: lokale Markierungen verwerfen
    for (const t of PARENT_TABLES) {
      const rows = await dirtyRows(t)
      if (rows.length) await clearDirty(t, rows)
    }
  }

  // Spieler (Name, Nummer, Trikot) dürfen alle setzen
  const players = (await db.children.filter((c) => !!c.playerDirty).toArray()) as Child[]
  for (const c of players) {
    const { error } = await client.rpc('set_player', { child: c.id, player: c.player ?? null })
    if (error) throw new Error(`Spieler: ${error.message}`)
    await clearDirty('children', [c as AnyRow], 'playerDirty')
    sent++
  }

  await upsert('progress', await dirtyRows('progress'))

  // Tageswerte: nur eigene, nur bis 3 Tage zurück; einzeln, damit ein abgelehnter Tag nichts blockiert
  const me = await deviceId()
  const oldest = addDays(today(), -3)
  const logs = (await dirtyRows('dayLogs')) as unknown as DayLogRow[]
  const tooOld = logs.filter((l) => l.deviceId !== me || l.date < oldest)
  if (tooOld.length) await clearDirty('dayLogs', tooOld as unknown as AnyRow[])
  for (const l of logs.filter((x) => x.deviceId === me && x.date >= oldest)) {
    const { error } = await client.from('day_logs').upsert(toServer.dayLogs(l, familyId), { onConflict: CONFLICT_KEYS.dayLogs })
    if (error) {
      // Datum vom Server abgelehnt (Uhr des Geräts falsch): später erneut versuchen
      if (error.code === '22023' || /nicht erlaubt/.test(error.message)) continue
      throw new Error(`Tageswerte: ${error.message}`)
    }
    await clearDirty('dayLogs', [l as unknown as AnyRow])
    sent++
  }
  return sent
}

export async function pull(ctx: SyncContext, tables: TableName[] = ALL_TABLES): Promise<number> {
  const { client, familyId } = ctx
  const me = await deviceId()
  let received = 0
  for (const t of tables) {
    const key = `pull:${t}`
    let since = (await getMeta<string>(key)) ?? '1970-01-01T00:00:00Z'
    for (;;) {
      const { data, error } = await client
        .from(SERVER_TABLE[t])
        .select('*')
        .eq('family_id', familyId)
        .gt('updated_at', since)
        .order('updated_at', { ascending: true })
        .limit(1000)
      if (error) throw new Error(`${t}: ${error.message}`)
      if (!data || data.length === 0) break
      const table = localTable(t)
      const conv = fromServer[t] as (r: Row) => AnyRow
      await db.transaction('rw', table, async () => {
        for (const r of data as Row[]) {
          const incoming = conv(r)
          const merged = mergeIncoming(t, await table.get(incoming.id), incoming, me)
          if (merged) await table.put(merged)
        }
      })
      received += data.length
      since = (data[data.length - 1] as Row).updated_at as string
      await setMeta(key, since)
      if (data.length < 1000) break
    }
  }
  return received
}

export async function resetPullMarkers() {
  for (const t of ALL_TABLES) await db.meta.delete(`pull:${t}`)
}
