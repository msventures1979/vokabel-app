// Eltern-Bereich: deutsche Lernwörter selbst einsprechen. Die Aufnahme hängt am Wort und kommt per Abgleich
// auf das Gerät des Kindes. Ohne Aufnahme laufen die Übungen über das Lesen (Schauen, merken, schreiben).
import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState } from 'react'
import { db } from '../data/db'
import { GERMAN, setWordVoice } from '../data/repo'
import { speakDe } from '../lib/speech'
import { blobToVoice, startRecording, type Recording } from '../lib/voice'
import type { Word } from '../logic/types'

const MAX_MS = 3500

export function GermanVoices({ childId }: { childId: string }) {
  const data = useLiveQuery(async () => {
    const assigns = (await db.assignments.where('childId').equals(childId).toArray()).filter((a) => a.active !== false)
    const lists = (await db.lists.bulkGet(assigns.map((a) => a.listId)))
      .filter((l) => l && l.subject === GERMAN)
      // Lernwörterblätter zuerst (der Reihe nach), Extra-Wörter am Ende
      .sort((a, b) => Number(a!.id.startsWith('de-x')) - Number(b!.id.startsWith('de-x')) || a!.title.localeCompare(b!.title, 'de', { numeric: true }))
    const words = await db.words.where('listId').anyOf(lists.map((l) => l!.id)).toArray()
    return lists.map((l) => ({
      list: l!,
      words: words.filter((w) => w.listId === l!.id).sort((a, b) => (a.kind === 'lese' ? 1 : 0) - (b.kind === 'lese' ? 1 : 0) || a.order - b.order),
    }))
  }, [childId])

  const [open, setOpen] = useState<string | null>(null)
  const [busy, setBusy] = useState<{ id: string; phase: 'rec' | 'save' } | null>(null)
  const [msg, setMsg] = useState('')
  const rec = useRef<Recording | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  if (!data) return null
  const all = data.flatMap((d) => d.words.filter((w) => w.kind !== 'lese'))
  const done = all.filter((w) => w.voice).length

  const stop = async (w: Word) => {
    if (timer.current) clearTimeout(timer.current)
    const r = rec.current
    rec.current = null
    if (!r) return
    setBusy({ id: w.id, phase: 'save' })
    try {
      const voice = await blobToVoice(await r.stop())
      if (!voice) {
        setMsg('Nichts zu hören. Bitte nah ans Handy und deutlich sprechen.')
      } else {
        await setWordVoice(w.id, voice)
        speakDe({ voice })
        setMsg('')
      }
    } catch {
      setMsg('Die Aufnahme ließ sich nicht verarbeiten. Bitte nochmal.')
    }
    setBusy(null)
  }

  const start = async (w: Word) => {
    if (busy) return
    setMsg('')
    try {
      rec.current = await startRecording()
    } catch {
      setMsg('Kein Zugriff aufs Mikrofon. Bitte im Browser das Mikrofon für diese Seite erlauben.')
      return
    }
    setBusy({ id: w.id, phase: 'rec' })
    timer.current = setTimeout(() => void stop(w), MAX_MS)
  }

  return (
    <div className="space-y-2 rounded-2xl bg-black/15 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <div className="font-semibold">🎙️ Wörter selbst einsprechen</div>
        <div className="text-xs text-chalk/60">
          {done} von {all.length} Lernwörtern
        </div>
      </div>
      <p className="text-xs text-chalk/60">
        Antippen, Wort deutlich sagen, fertig (stoppt nach 3 Sekunden von selbst). Wörter ohne Aufnahme übt das Kind ohne Ton: anschauen, merken,
        schreiben.
      </p>
      {msg && <p className="text-sm text-gold">{msg}</p>}
      {data.map(({ list, words }) => {
        const lern = words.filter((w) => w.kind !== 'lese')
        const missing = lern.filter((w) => !w.voice).length
        const isOpen = open === list.id
        return (
          <div key={list.id} className="rounded-xl bg-white/5">
            <button onClick={() => setOpen(isOpen ? null : list.id)} className="flex w-full items-center justify-between px-3 py-2 text-left">
              <span>📄 {list.title}</span>
              <span className={`text-xs ${missing ? 'text-gold' : 'text-lime'}`}>{missing ? `${missing} fehlen` : 'alle eingesprochen ✓'}</span>
            </button>
            {isOpen && (
              <ul className="space-y-1 px-2 pb-2">
                {words.map((w) => {
                  const recNow = busy?.id === w.id && busy.phase === 'rec'
                  const saving = busy?.id === w.id && busy.phase === 'save'
                  return (
                    <li key={w.id} className="flex items-center gap-2 rounded-lg bg-black/20 px-2 py-1.5">
                      <span className={`flex-1 font-display text-xl font-extrabold ${w.kind === 'lese' ? 'opacity-60' : ''}`}>
                        {w.en}
                        {w.kind === 'lese' && <span className="ml-1 text-xs font-normal">(Lesewort)</span>}
                      </span>
                      {w.voice && !recNow && (
                        <button onClick={() => speakDe(w)} className="h-9 w-9 rounded-full bg-white/10 text-lg" aria-label="Anhören">
                          ▶
                        </button>
                      )}
                      {w.voice && !recNow && (
                        <button onClick={() => void setWordVoice(w.id, null)} className="h-9 w-9 rounded-full bg-white/10 text-sm" aria-label="Aufnahme löschen">
                          ✕
                        </button>
                      )}
                      <button
                        onClick={() => (recNow ? void stop(w) : void start(w))}
                        disabled={!!busy && !recNow}
                        className={`min-w-[96px] rounded-full px-3 py-2 text-sm font-semibold disabled:opacity-30 ${
                          recNow ? 'bg-flag text-white animate-pulse' : w.voice ? 'bg-white/10' : 'bg-chalk text-pitch'
                        }`}
                      >
                        {recNow ? '■ Stopp' : saving ? '…' : w.voice ? 'Neu' : '● Aufnehmen'}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}
