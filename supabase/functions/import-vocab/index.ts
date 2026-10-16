// Supabase Edge Function "import-vocab": liest Vokabeln aus einem Foto einer Buchseite (Claude, Bildanalyse).
// Nur für Eltern-Konten. Benötigt das Secret ANTHROPIC_API_KEY (Supabase → Edge Functions → Secrets).
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

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const MODEL = 'claude-sonnet-5-5'

const TOOL = {
  name: 'vokabeln',
  description: 'Die Vokabeln von der Buchseite als strukturierte Liste.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Überschrift/Unit der Seite, z. B. "Unit 2 – At home", falls erkennbar' },
      words: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            en: { type: 'string', description: 'Englischer Eintrag genau wie im Buch, z. B. "it\'s (= it is)" oder "to go"' },
            answers: { type: 'array', items: { type: 'string' }, description: 'Erlaubte englische Antworten, Hauptform zuerst, z. B. ["to go","go"]' },
            de: { type: 'string', description: 'Deutsche Bedeutung genau wie im Buch' },
            ipa: { type: 'string', description: 'Lautschrift ohne eckige Klammern, falls vorhanden' },
            example: { type: 'string', description: 'Englischer Beispielsatz aus dem Buch, falls vorhanden' },
            note: { type: 'string', description: 'Hinweis aus dem Buch (z. B. Betonung, Schreibweise), auf Deutsch' },
            caseSensitive: { type: 'boolean', description: 'true, wenn das Wort immer großgeschrieben wird (English, Mr, Monday …)' },
          },
          required: ['en', 'answers', 'de'],
        },
      },
    },
    required: ['words'],
  },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const db = createClient(Deno.env.get('SUPABASE_URL')!, serverKey())
    const { data: u } = await db.auth.getUser(authHeader.replace(/^Bearer /, ''))
    if (!u.user) return json({ error: 'Bitte anmelden.' }, 401)
    const { data: m } = await db.from('members').select('role').eq('user_id', u.user.id).maybeSingle()
    if (m?.role !== 'parent') return json({ error: 'Nur für Eltern.' }, 403)

    const key = Deno.env.get('ANTHROPIC_API_KEY')
    if (!key) return json({ error: 'Der KI-Zugang ist noch nicht eingerichtet (ANTHROPIC_API_KEY fehlt).' }, 500)

    const { image, mediaType } = await req.json()
    if (typeof image !== 'string' || image.length < 100) return json({ error: 'Kein Bild erhalten.' }, 400)
    if (image.length > 7_000_000) return json({ error: 'Das Bild ist zu groß.' }, 400)

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        tools: [TOOL],
        tool_choice: { type: 'tool', name: 'vokabeln' },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: image } },
              {
                type: 'text',
                text:
                  'Das ist eine Vokabelseite aus einem Englischbuch für die 5. Klasse. Lies alle Vokabeln vollständig und genau ab, in der Reihenfolge der Seite. ' +
                  'Übernimm deutsche Bedeutungen, Lautschrift und Beispielsätze wörtlich. Erfinde nichts dazu; fehlt etwas, lass das Feld weg. ' +
                  'Bei "to go" gehören "to go" und "go" zu den erlaubten Antworten; bei "it\'s (= it is)" gehören "it\'s" und "it is" dazu.',
              },
            ],
          },
        ],
      }),
    })
    if (!res.ok) return json({ error: `KI-Fehler (${res.status}).` }, 502)
    const out = await res.json()
    const tool = (out.content ?? []).find((c: { type: string }) => c.type === 'tool_use')
    if (!tool) return json({ error: 'Auf dem Bild wurden keine Vokabeln erkannt.' }, 422)
    return json(tool.input)
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500)
  }
})
