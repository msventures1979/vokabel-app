import { useState } from 'react'
import { saveGermanSheet } from '../data/repo'
import { supa, useSyncState } from '../sync/account'
import { Btn, Card } from '../ui/components'

// Bild verkleinern und als JPEG-Base64 zurückgeben
async function shrink(file: File, max = 1600): Promise<string> {
  const img = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.85).split(',')[1]
}

const split = (t: string) =>
  t
    .split(/[\n,;]+/)
    .map((w) => w.trim())
    .filter(Boolean)

// Neues Lernwörterblatt (Deutsch): per Foto auslesen lassen oder von Hand eintragen
export function GermanImport({ childId, childName, nextNumber }: { childId: string; childName: string; nextNumber: number }) {
  const sync = useSyncState()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(`Lernwörterblatt ${nextNumber}`)
  const [lern, setLern] = useState('')
  const [lese, setLese] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const canPhoto = !!sync.familyId && sync.role === 'parent'

  const read = async (file: File) => {
    setBusy(true)
    setErr('')
    setMsg('')
    try {
      const image = await shrink(file)
      const { data, error } = await (await supa()).functions.invoke('import-vocab', { body: { image, mediaType: 'image/jpeg', kind: 'lernwoerter' } })
      if (error) {
        let text = error.message
        try {
          text = (await (error as { context?: Response }).context?.json())?.error ?? text
        } catch {
          /* keine Details */
        }
        throw new Error(text)
      }
      const lw = (data?.lernwoerter ?? []) as string[]
      const rw = (data?.lesewoerter ?? []) as string[]
      if (!lw.length) throw new Error('Auf dem Foto wurden keine Lernwörter erkannt.')
      setLern(lw.join('\n'))
      setLese(rw.join(', '))
      if (data?.title) setTitle(data.title)
      setMsg(`${lw.length} Lernwörter und ${rw.length} Leserakete-Wörter erkannt. Bitte prüfen.`)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const save = async () => {
    setBusy(true)
    setErr('')
    try {
      const n = await saveGermanSheet(childId, title, split(lern), split(lese))
      setMsg(`Gespeichert: ${n} Wörter für ${childName}.`)
      setLern('')
      setLese('')
      setOpen(false)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (!open)
    return (
      <div className="space-y-2">
        <Btn size="md" variant="chalk" className="w-full" onClick={() => setOpen(true)}>
          Neues Lernwörterblatt
        </Btn>
        {msg && <p className="text-sm text-lime">{msg}</p>}
      </div>
    )

  return (
    <Card className="space-y-3 !bg-black/20">
      <div className="font-display text-lg font-extrabold uppercase">Neues Lernwörterblatt</div>
      {canPhoto ? (
        <label className={`block text-center font-display font-extrabold uppercase rounded-2xl px-3 py-3 bg-lime text-pitch ${busy ? 'opacity-40' : 'cursor-pointer'}`}>
          {busy ? 'Wird gelesen …' : '📷 Blatt fotografieren'}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (f) void read(f)
            }}
          />
        </label>
      ) : (
        <p className="text-xs text-chalk/60">Für das Foto bitte unter „Geräte“ mit dem Eltern-Konto anmelden. Von Hand eintragen geht immer.</p>
      )}
      <label className="block text-sm text-chalk/70">
        Titel
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-xl bg-black/25 ring-1 ring-white/20 px-3 py-2 outline-none focus:ring-lime" />
      </label>
      <label className="block text-sm text-chalk/70">
        Lernwörter (zum Schreiben), Silben mit Bindestrich
        <textarea
          value={lern}
          onChange={(e) => setLern(e.target.value)}
          rows={5}
          placeholder={'Ha-se\nHund\nKat-ze\nfres-sen\nleicht'}
          className="mt-1 w-full rounded-xl bg-black/25 ring-1 ring-white/20 px-3 py-2 outline-none focus:ring-lime"
        />
      </label>
      <label className="block text-sm text-chalk/70">
        Leserakete (zum Lesen), mit Komma getrennt
        <textarea
          value={lese}
          onChange={(e) => setLese(e.target.value)}
          rows={3}
          placeholder="mei-ne, vom, bei-de, was, los"
          className="mt-1 w-full rounded-xl bg-black/25 ring-1 ring-white/20 px-3 py-2 outline-none focus:ring-lime"
        />
      </label>
      {msg && <p className="text-sm text-lime">{msg}</p>}
      {err && <p className="text-sm text-flag">{err}</p>}
      <div className="grid grid-cols-2 gap-2">
        <Btn size="md" variant="ghost" onClick={() => setOpen(false)}>
          Abbrechen
        </Btn>
        <Btn size="md" disabled={busy || !lern.trim()} onClick={save}>
          Speichern
        </Btn>
      </div>
    </Card>
  )
}
