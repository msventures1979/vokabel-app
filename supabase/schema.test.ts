// Prüft Datenbankschema und Zugriffsregeln in einer lokalen Postgres-Instanz (PGlite) mit nachgebautem Supabase-Auth.
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'

const sql = ['001_schema.sql', '002_child_settings.sql', '003_push.sql'].map((f) => readFileSync(new URL(`./migrations/${f}`, import.meta.url), 'utf8')).join('\n')
let db: PGlite

const PARENT = '00000000-0000-0000-0000-000000000001'
const DEVICE = '00000000-0000-0000-0000-000000000002'
const STRANGER = '00000000-0000-0000-0000-000000000003'
const PARENT2 = '00000000-0000-0000-0000-000000000004'

async function as<T>(user: string | null, anonymous: boolean, fn: () => Promise<T>): Promise<T> {
  await db.exec(`reset role;`)
  const claims = JSON.stringify(user ? { sub: user, is_anonymous: anonymous } : {})
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [claims])
  await db.exec(user ? `set role authenticated;` : `set role anon;`)
  try {
    return await fn()
  } finally {
    await db.exec(`reset role;`)
  }
}
const q = (text: string, params: unknown[] = []) => db.query(text, params)

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    grant usage on schema public to anon, authenticated;
    grant execute on all functions in schema auth to anon, authenticated;
    insert into auth.users values ('${PARENT}'), ('${DEVICE}'), ('${STRANGER}'), ('${PARENT2}');
  `)
  await db.exec(sql)
  // Migration ist wiederholbar
  await db.exec(sql)
})

describe('Schema und Zugriffsregeln', () => {
  let fam = ''
  it('Eltern legen Familie an, anonyme Nutzer nicht', async () => {
    await expect(as(DEVICE, true, () => q(`select public.create_family('Storch')`))).rejects.toThrow(/Nur Eltern/)
    const r = await as(PARENT, false, () => q<{ f: string }>(`select public.create_family('Storch') as f`))
    fam = r.rows[0].f
    expect(fam).toMatch(/[0-9a-f-]{36}/)
  })

  it('Eltern schreiben Kinder, Listen, Wörter, Ziele', async () => {
    await as(PARENT, false, async () => {
      await q(`insert into public.children (family_id, id, name, sort) values ($1, 'milan', 'Milan', 0)`, [fam])
      await q(`insert into public.children (family_id, id, name, sort, settings) values ($1, 'marlon', 'Marlon', 1, '{"mode":"picture","minMinutes":10}')`, [fam])
      await q(`insert into public.lists (family_id, id, title) values ($1, 'en-u1', 'Unit 1')`, [fam])
      await q(`insert into public.words (family_id, id, list_id, sort, data) values ($1, 'en-u1:school', 'en-u1', 0, '{"en":"school"}')`, [fam])
      await q(`insert into public.assignments (family_id, child_id, list_id) values ($1, 'milan', 'en-u1')`, [fam])
      await q(`insert into public.goals (family_id, id, child_id, title, required_days, start_date) values ($1, 'g1', 'milan', 'Fußball', 25, public.berlin_today())`, [fam])
    })
  })

  it('Gerät koppelt sich mit Code', async () => {
    const code = (await as(PARENT, false, () => q<{ c: string }>(`select public.create_pairing_code('device') as c`))).rows[0].c
    expect(code).toMatch(/^\d{6}$/)
    await expect(as(DEVICE, true, () => q(`select public.claim_pairing_code('000000x')`))).rejects.toThrow(/ungültig/)
    await as(DEVICE, true, () => q(`select public.claim_pairing_code($1, 'S22')`, [code]))
    // Code nur einmal verwendbar
    await expect(as(STRANGER, true, () => q(`select public.claim_pairing_code($1)`, [code]))).rejects.toThrow(/ungültig/)
  })

  it('Gerät liest Familie, darf aber keine Listen oder Ziele ändern', async () => {
    const words = await as(DEVICE, true, () => q(`select * from public.words`))
    expect(words.rows).toHaveLength(1)
    await expect(as(DEVICE, true, () => q(`insert into public.lists (family_id, id, title) values ($1, 'x', 'x')`, [fam]))).rejects.toThrow()
    const upd = await as(DEVICE, true, () => q(`update public.goals set required_days = 1`))
    expect(upd.affectedRows).toBe(0)
    // Kinder-Geräte können Mindestzeit nicht ändern
    const upd2 = await as(DEVICE, true, () => q(`update public.children set settings = '{"minMinutes":1}'`))
    expect(upd2.affectedRows).toBe(0)
  })

  it('Gerät schreibt Lernstand und eigene Tageswerte, Spieler per Funktion', async () => {
    await as(DEVICE, true, async () => {
      await q(`insert into public.progress (family_id, child_id, word_id, box, due) values ($1, 'milan', 'en-u1:school', 1, public.berlin_today() + 1)`, [fam])
      await q(
        `insert into public.day_logs (family_id, child_id, date, device_id, active_seconds, answers, stars) values ($1, 'milan', public.berlin_today(), $2, 300, 20, 100)`,
        [fam, DEVICE],
      )
      await q(`select public.set_player('milan', '{"name":"Milan","number":7,"color":"#e63946"}')`)
    })
    const p = await as(PARENT, false, () => q<{ player: { number: number } }>(`select player from public.children where id = 'milan'`))
    expect(p.rows[0].player.number).toBe(7)
  })

  it('Tageswerte: kein fremdes Gerät, kein Datum in der Zukunft, Werte nur steigend', async () => {
    await expect(
      as(DEVICE, true, () =>
        q(`insert into public.day_logs (family_id, child_id, date, device_id) values ($1, 'milan', public.berlin_today(), $2)`, [fam, PARENT]),
      ),
    ).rejects.toThrow()
    await expect(
      as(DEVICE, true, () =>
        q(`insert into public.day_logs (family_id, child_id, date, device_id) values ($1, 'milan', public.berlin_today() + 1, $2)`, [fam, DEVICE]),
      ),
    ).rejects.toThrow(/nicht erlaubt/)
    await expect(
      as(DEVICE, true, () =>
        q(`insert into public.day_logs (family_id, child_id, date, device_id) values ($1, 'milan', public.berlin_today() - 4, $2)`, [fam, DEVICE]),
      ),
    ).rejects.toThrow(/nicht erlaubt/)
    await as(DEVICE, true, () =>
      q(`update public.day_logs set active_seconds = 10, answers = 50 where device_id = $1`, [DEVICE]),
    )
    const r = await as(PARENT, false, () => q<{ active_seconds: number; answers: number }>(`select active_seconds, answers from public.day_logs`))
    expect(r.rows[0]).toEqual({ active_seconds: 300, answers: 50 })
  })

  it('Fremde sehen nichts', async () => {
    const r = await as(STRANGER, true, () => q(`select * from public.children`))
    expect(r.rows).toHaveLength(0)
    const r2 = await as(null, true, () => q(`select 1`))
    expect(r2.rows).toHaveLength(1)
    await expect(as(null, true, () => q(`select * from public.children`))).rejects.toThrow()
  })

  it('Zweites Eltern-Konto per Eltern-Code', async () => {
    const code = (await as(PARENT, false, () => q<{ c: string }>(`select public.create_pairing_code('parent') as c`))).rows[0].c
    await expect(as(STRANGER, true, () => q(`select public.claim_pairing_code($1)`, [code]))).rejects.toThrow(/E-Mail/)
    await as(PARENT2, false, () => q(`select public.claim_pairing_code($1)`, [code]))
    const r = await as(PARENT2, false, () => q<{ p: boolean }>(`select public.is_parent() as p`))
    expect(r.rows[0].p).toBe(true)
  })

  it('Geräte können keine Codes erzeugen', async () => {
    await expect(as(DEVICE, true, () => q(`select public.create_pairing_code('parent')`))).rejects.toThrow(/Nur Eltern/)
  })

  it('Erinnerungen: nur eigenes Abo, fällig nur ohne Trainingstag', async () => {
    await as(DEVICE, true, () =>
      q(`insert into public.push_subscriptions (endpoint, family_id, child_ids, hour, p256dh, auth) values ('https://push/1', $1, '{milan,marlon}', 16, 'k', 'a')`, [fam]),
    )
    await expect(as(DEVICE, true, () => q(`select * from public.push_config`))).rejects.toThrow()
    await expect(as(DEVICE, true, () => q(`select * from public.reminders_due(16)`))).rejects.toThrow()
    const other = await as(PARENT, false, () => q(`select * from public.push_subscriptions`))
    expect(other.rows).toHaveLength(0) // Eltern sehen fremde Geräte-Abos nicht
    const due = await q<{ child_id: string }>(`select * from public.reminders_due(16)`)
    expect(due.rows.map((r) => r.child_id).sort()).toEqual(['marlon', 'milan'])
    expect((await q(`select * from public.reminders_due(17)`)).rows).toHaveLength(0)
    // Milan hat heute schon einen Trainingstag (Gerätezeile von vorher: 300 s, 50 Antworten -> ergänzen)
    await q(`update public.day_logs set active_seconds = 1000, round_done = true where child_id = 'milan'`)
    const due2 = await q<{ child_id: string }>(`select * from public.reminders_due(16)`)
    expect(due2.rows.map((r) => r.child_id)).toEqual(['marlon'])
  })
})
