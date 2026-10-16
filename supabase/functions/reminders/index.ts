// Supabase Edge Function "reminders": verschickt die täglichen Erinnerungen.
// Aufruf stündlich durch pg_cron (mit Geheimnis aus push_config). "?action=init" legt die Push-Schlüssel an.
// Einstellung: "Verify JWT" ausschalten, der Schutz läuft über das Geheimnis.
import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2'

// Server-Schlüssel: alter Name oder neues Format (JSON mit Secret Keys)
function serverKey(): string {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (legacy) return legacy
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}')
    const first = Object.values(keys)[0]
    if (typeof first === 'string') return first
  } catch {
    /* ignorieren */
  }
  throw new Error('Kein Server-Schlüssel verfügbar')
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  const db = createClient(Deno.env.get('SUPABASE_URL')!, serverKey())
  let { data: cfg } = await db.from('push_config').select('*').eq('id', 1).maybeSingle()
  if (!cfg) return json({ error: 'push_config fehlt' }, 500)

  if (!cfg.public_key || !cfg.private_key) {
    const keys = webpush.generateVAPIDKeys()
    await db.from('push_config').update({ public_key: keys.publicKey, private_key: keys.privateKey }).eq('id', 1)
    cfg = { ...cfg, public_key: keys.publicKey, private_key: keys.privateKey }
  }

  if (new URL(req.url).searchParams.get('action') === 'init') return json({ ok: true })
  if (req.headers.get('x-cron-secret') !== cfg.cron_secret) return json({ error: 'nicht erlaubt' }, 401)

  webpush.setVapidDetails('mailto:noreply@vokabel-app.local', cfg.public_key, cfg.private_key)
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', hour: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).find((p) => p.type === 'hour')?.value,
  )
  const { data: due, error } = await db.rpc('reminders_due', { p_hour: hour })
  if (error) return json({ error: error.message }, 500)

  // Pro Gerät eine Nachricht, auch wenn mehrere Kinder darauf lernen
  const byEndpoint = new Map<string, { p256dh: string; auth: string; names: string[] }>()
  for (const r of due ?? []) {
    const e = byEndpoint.get(r.endpoint) ?? { p256dh: r.p256dh, auth: r.auth, names: [] }
    e.names.push(r.child_name)
    byEndpoint.set(r.endpoint, e)
  }

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(new Date())
  let sent = 0
  for (const [endpoint, e] of byEndpoint) {
    const who = e.names.join(' und ')
    const payload = JSON.stringify({
      title: 'Training wartet! ⚽',
      body: `${who}, heute fehlt noch dein Vokabel-Training. Dein Ball will ins Tor!`,
      url: '/',
    })
    try {
      await webpush.sendNotification({ endpoint, keys: { p256dh: e.p256dh, auth: e.auth } }, payload, { TTL: 3600 })
      await db.from('push_subscriptions').update({ last_sent: today }).eq('endpoint', endpoint)
      sent++
    } catch (err) {
      const code = (err as { statusCode?: number }).statusCode
      if (code === 404 || code === 410) await db.from('push_subscriptions').delete().eq('endpoint', endpoint)
    }
  }
  return json({ hour, due: byEndpoint.size, sent })
})
