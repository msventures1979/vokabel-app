import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, sortChildren } from '../data/db'
import { importList, setAssignment } from '../data/repo'
import { supa, useSyncState } from '../sync/account'
import { Btn, Card } from '../ui/components'

interface Draft {
  en: string
  answers: string[]
  de: string
  ipa?: string
  example?: string
  note?: string
  caseSensitive?: boolean
  keep: boolean
}

// Bild verkleinern (spart Zeit und Kosten), als JPEG-Base64 zurückgeben
async function shrink(file: File, max = 1600): Promise<string> {
  const img = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.85).split(',')[1]
}

// Lückensatz aus dem Beispielsatz bauen, wenn das Wort darin vorkommt
function makeCloze(example: string | undefined, answers: string[]): string | undefined {
  if (!example) return undefined
  const clean = example.replace(/\(\*\)/g, '').trim()
  for (const a of [...answers].sort((x, y) => y.length - x.length)) {
    const word = a.replace(/^to /, '')
    const re = new RegExp(`(^|[^A-Za-z'])(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?=[^A-Za-z']|$)`, 'i')
    if (re.test(clean)) return clean.replace(re, (_m, pre) => `${pre}___`)
  }
  return undefined
}

export function PhotoImport() {
  const sync = useSyncState()
  const children = useLiveQuery(async () => sortChildren(await db.children.toArray()), [])
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [title, setTitle] = useState('')
  const [childId, setChildId] = useState('milan')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  if (!sync.familyId || sync.role !== 'parent')
    return (
      <Card>
        <div className="font-display text-xl font-extrabold uppercase">Vokabeln per Foto</div>
        <p className="text-sm text-chalk/75 mt-1">Dafür bitte unter „Geräte“ mit dem Eltern-Konto anmelden.</p>
      </Card>
    )

  const read = async (file: File) => {
    setBusy(true)
    setErr('')
    setMsg('')
    try {
      const image = await shrink(file)
      const { data, error } = await (await supa()).functions.invoke('import-vocab', { body: { image, mediaType: 'image/jpeg' } })
      if (error) {
        let text = error.message
        try {
          text = (await (error as { context?: Response }).context?.json())?.error ?? text
        } catch {
          /* keine Details */
        }
        throw new Error(text)
      }
      const words = (data?.words ?? []) as Omit<Draft, 'keep'>[]
      if (!words.length) throw new Error('Auf dem Foto wurden keine Vokabeln erkannt.')
      setDrafts((d) => [...d, ...words.map((w) => ({ ...w, keep: true }))])
      if (!title && data?.title) setTitle(data.title)
      setMsg(`${words.length} Wörter erkannt. Bitte prüfen.`)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const update = (i: number, patch: Partial<Draft>) => setDrafts((d) => d.map((x, j) => (j === i ? { ...x, ...patch } : x)))

  const save = async () => {
    const words = drafts
      .filter((d) => d.keep && d.en.trim() && d.de.trim())
      .map(({ keep: _k, ...w }) => {
        void _k
        const answers = w.answers?.length ? w.answers : [w.en.replace(/\s*\(.*?\)\s*/g, '').trim()]
        return { ...w, answers, cloze: makeCloze(w.example, answers) }
      })
    if (!words.length) return
    setBusy(true)
    try {
      const listId = `foto-${Date.now()}`
      const n = await importList({ list: { id: listId, title: title.trim() || 'Neue Vokabeln', subject: 'Englisch' }, words })
      await setAssignment(childId, listId, true)
      setDrafts([])
      setTitle('')
      setMsg(`${n} Wörter gespeichert und ${children?.find((c) => c.id === childId)?.name ?? ''} zugewiesen.`)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="space-y-3">
      <div className="font-display text-xl font-extrabold uppercase">Vokabeln per Foto</div>
      <p className="text-sm text-chalk/75">Vokabelseite aus dem Buch fotografieren. Die KI liest die Wörter aus, du prüfst sie und speicherst. Mehrere Seiten nacheinander gehen auch.</p>
      <label className={`block text-center rounded-2xl py-4 font-display text-xl font-extrabold uppercase ${busy ? 'bg-white/10 text-chalk/50' : 'bg-lime text-pitch'}`}>
        {busy ? 'Lese Wörter …' : drafts.length ? '📷 Weitere Seite' : '📷 Buchseite fotografieren'}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void read(f)
            e.target.value = ''
          }}
        />
      </label>
      {msg && <p className="text-gold text-sm">{msg}</p>}
      {err && <p className="text-flag text-sm">{err}</p>}

      {drafts.length > 0 && (
        <div className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Name der Liste, z. B. Unit 2 – At home"
            className="w-full rounded-xl bg-black/25 ring-1 ring-white/20 px-3 py-2 outline-none focus:ring-lime"
          />
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {drafts.map((d, i) => (
              <div key={i} className={`rounded-xl p-2 ring-1 ring-white/15 ${d.keep ? 'bg-black/20' : 'opacity-40'}`}>
                <div className="flex gap-2">
                  <input
                    value={d.en}
                    onChange={(e) => update(i, { en: e.target.value, answers: [e.target.value.replace(/\s*\(.*?\)\s*/g, '').trim()] })}
                    className="flex-1 min-w-0 rounded-lg bg-black/25 px-2 py-1 font-semibold"
                    aria-label="Englisch"
                  />
                  <button onClick={() => update(i, { keep: !d.keep })} className="px-2 text-sm underline" aria-label={d.keep ? 'Entfernen' : 'Behalten'}>
                    {d.keep ? '✕' : '↺'}
                  </button>
                </div>
                <input
                  value={d.de}
                  onChange={(e) => update(i, { de: e.target.value })}
                  className="mt-1 w-full rounded-lg bg-black/25 px-2 py-1 text-sm"
                  aria-label="Deutsch"
                />
                {d.example && <div className="text-xs text-chalk/60 mt-1 italic">{d.example}</div>}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-chalk/75">Für</span>
            <div className="flex gap-2 flex-1">
              {(children ?? []).map((c) => (
                <button
                  key={c.id}
                  onClick={() => setChildId(c.id)}
                  className={`flex-1 rounded-xl py-2 font-semibold ${childId === c.id ? 'bg-chalk text-pitch' : 'bg-white/5 ring-1 ring-white/15'}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          <Btn size="md" className="w-full" disabled={busy} onClick={save}>
            {drafts.filter((d) => d.keep).length} Wörter speichern
          </Btn>
        </div>
      )}
    </Card>
  )
}

export { makeCloze }
