import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Route } from '../App'
import { db, sortChildren } from '../data/db'
import {
  activeGoal,
  checkParentPin,
  clearParentPin,
  dayLog,
  exportAll,
  hasParentPin,
  importList,
  setSeasonLength,
  restoreAll,
  setAssignment,
  setNewPerDay,
  updateChildSettings,
  GERMAN,
  setParentPin,
  totalStars,
  trainingDates,
  wordPool,
} from '../data/repo'
import { today } from '../logic/dates'
import { rulesFor, seasonFor, streak } from '../logic/rewards'
import { LEARNED_BOX } from '../logic/scheduler'
import { Btn, Card, TopBar } from '../ui/components'
import { DevicesPanel } from './Devices'
import { PhotoImport } from './PhotoImport'
import { ReminderCard } from './Reminder'
import { GermanImport } from './GermanImport'
import { signInParent, useSyncState } from '../sync/account'
import { AccountForm } from './Welcome'

export function Parent({ go }: { go: (r: Route) => void }) {
  const [unlocked, setUnlocked] = useState(false)
  const sync = useSyncState()
  if (!unlocked) return <PinGate onBack={() => go({ name: 'pick' })} onOk={() => setUnlocked(true)} />
  if (sync.familyId && sync.role === 'device') return <DeviceParentArea go={go} />
  return <ParentArea go={go} />
}

function PinGate({ onBack, onOk }: { onBack: () => void; onOk: () => void }) {
  const [hasPin, setHasPin] = useState<boolean | null>(null)
  const [pin, setPin] = useState('')
  const [first, setFirst] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [forgot, setForgot] = useState(false)

  useEffect(() => {
    hasParentPin().then(setHasPin)
  }, [])


  useEffect(() => {
    if (pin.length !== 4 || hasPin === null) return
    ;(async () => {
      if (hasPin) {
        if (await checkParentPin(pin)) onOk()
        else {
          setMsg('Falsche PIN')
          setPin('')
        }
      } else if (!first) {
        setFirst(pin)
        setPin('')
        setMsg('PIN zur Bestätigung wiederholen')
      } else if (first === pin) {
        await setParentPin(pin)
        onOk()
      } else {
        setFirst(null)
        setPin('')
        setMsg('PINs stimmen nicht überein. Bitte neu festlegen.')
      }
    })()
  }, [pin, hasPin, first, onOk])

  if (forgot)
    return (
      <ForgotPin
        onBack={() => setForgot(false)}
        onReset={async () => {
          await clearParentPin()
          setForgot(false)
          setFirst(null)
          setPin('')
          setMsg('Neue PIN festlegen')
          setHasPin(false)
        }}
      />
    )
  if (hasPin === null) return null
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']
  return (
    <div>
      <TopBar onBack={onBack} title="Eltern-Bereich" />
      <div className="text-center mt-6">
        <div className="font-display text-3xl font-extrabold uppercase">{hasPin ? 'PIN eingeben' : 'Eltern-PIN festlegen'}</div>
        <p className="text-chalk/70 mt-1 min-h-6">{msg || (hasPin ? '' : '4 Ziffern, die die Kinder nicht kennen')}</p>
        <div className="flex justify-center gap-3 mt-4">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`h-4 w-4 rounded-full ${i < pin.length ? 'bg-lime' : 'bg-white/20'}`} />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-8 max-w-xs mx-auto">
        {keys.map((k, i) =>
          k === '' ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              onClick={() => setPin((p) => (k === '⌫' ? p.slice(0, -1) : p.length < 4 ? p + k : p))}
              className="h-16 rounded-2xl bg-pitch-2 ring-1 ring-white/15 font-display text-3xl font-extrabold active:bg-pitch-3"
              aria-label={k === '⌫' ? 'Löschen' : k}
            >
              {k}
            </button>
          ),
        )}
      </div>
      {hasPin && (
        <button onClick={() => setForgot(true)} className="block mx-auto mt-8 text-sm text-chalk/60 underline underline-offset-4">
          PIN vergessen?
        </button>
      )}
    </div>
  )
}

// PIN zurücksetzen nur mit Eltern-Konto (E-Mail und Passwort)
function ForgotPin({ onBack, onReset }: { onBack: () => void; onReset: () => void }) {
  const sync = useSyncState()
  const [startedSignedIn] = useState(sync.signedIn && !sync.anonymous)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  // Neu angemeldet: Anmeldung gilt als Bestätigung
  useEffect(() => {
    if (!startedSignedIn && sync.signedIn && !sync.anonymous) onReset()
  }, [startedSignedIn, sync.signedIn, sync.anonymous, onReset])

  return (
    <div>
      <TopBar onBack={onBack} title="PIN vergessen" />
      <Card className="mt-2 space-y-3">
        {!sync.configured ? (
          <p className="text-sm">Ohne Abgleich lässt sich die PIN nicht zurücksetzen.</p>
        ) : startedSignedIn ? (
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault()
              setBusy(true)
              setErr('')
              try {
                await signInParent(sync.email!, password)
                onReset()
              } catch (x) {
                setErr((x as Error).message)
              } finally {
                setBusy(false)
              }
            }}
          >
            <p className="text-sm text-chalk/75">Gib das Passwort deines Eltern-Kontos ({sync.email}) ein. Danach legst du eine neue PIN fest.</p>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl bg-black/25 ring-1 ring-white/20 px-3 py-3 outline-none focus:ring-lime"
            />
            <Btn size="md" className="w-full" type="submit" disabled={!password || busy}>
              {busy ? 'Bitte warten …' : 'Bestätigen'}
            </Btn>
            {err && <p className="text-flag text-sm">{err}</p>}
          </form>
        ) : (
          <>
            <p className="text-sm text-chalk/75">
              Melde dich mit deinem Eltern-Konto an oder erstelle eins. Danach legst du eine neue PIN fest, und der Lernstand wird ab dann auf allen Geräten abgeglichen.
            </p>
            <AccountForm />
          </>
        )}
      </Card>
    </div>
  )
}

function ParentArea({ go }: { go: (r: Route) => void }) {
  const children = useLiveQuery(async () => sortChildren(await db.children.toArray()), [])
  const [tab, setTab] = useState<string>('milan')
  if (!children) return null
  return (
    <div className="space-y-4">
      <TopBar onBack={() => go({ name: 'pick' })} title="Eltern-Bereich" />
      <div className="flex gap-2">
        {children.map((c) => (
          <button
            key={c.id}
            onClick={() => setTab(c.id)}
            className={`flex-1 rounded-xl py-2 font-display text-lg font-extrabold uppercase ${tab === c.id ? 'bg-chalk text-pitch' : 'bg-white/5 ring-1 ring-white/15'}`}
          >
            {c.name}
          </button>
        ))}
        <button
          onClick={() => setTab('devices')}
          className={`flex-1 rounded-xl py-2 font-display text-lg font-extrabold uppercase ${tab === 'devices' ? 'bg-chalk text-pitch' : 'bg-white/5 ring-1 ring-white/15'}`}
        >
          Geräte
        </button>
        <button
          onClick={() => setTab('data')}
          className={`flex-1 rounded-xl py-2 font-display text-lg font-extrabold uppercase ${tab === 'data' ? 'bg-chalk text-pitch' : 'bg-white/5 ring-1 ring-white/15'}`}
        >
          Daten
        </button>
      </div>
      {tab === 'data' ? <DataPanel /> : tab === 'devices' ? <DevicesPanel /> : <ChildPanel childId={tab} key={tab} />}
    </div>
  )
}

function ChildPanel({ childId }: { childId: string }) {
  const data = useLiveQuery(async () => {
    const [child, pool, prog, log, dates, goal, lists, assigns, stars] = await Promise.all([
      db.children.get(childId),
      wordPool(childId),
      db.progress.where('childId').equals(childId).toArray(),
      dayLog(childId),
      trainingDates(childId),
      activeGoal(childId),
      db.lists.toArray(),
      db.assignments.where('childId').equals(childId).toArray(),
      totalStars(childId),
    ])
    return { child, pool, prog, log, dates, goal, lists, assigns, stars }
  }, [childId])
  const [goalDays, setGoalDays] = useState<number | null>(null)
  const [saved, setSaved] = useState('')

  if (!data?.child) return null
  const { child, pool, prog, log, dates, goal, lists, assigns, stars } = data
  const rules = rulesFor(child)
  const progById = new Map(prog.map((p) => [p.wordId, p]))
  const boxes = [0, 1, 2, 3, 4, 5, LEARNED_BOX].map((b) => pool.filter((w) => (progById.get(w.id)?.box ?? 0) === b).length)
  const hard = [...prog].filter((p) => p.errors > 0).sort((a, b) => b.errors - a.errors).slice(0, 5)
  const wordById = new Map(pool.map((w) => [w.id, w]))
  const season = goal ? seasonFor(goal, dates) : undefined
  const days = goalDays ?? goal?.requiredDays ?? 25
  const flash = (t: string) => {
    setSaved(t)
    setTimeout(() => setSaved(''), 2000)
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="font-display text-xl font-extrabold uppercase mb-3">Heute</div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat value={Math.floor(log.activeSeconds / 60)} label="Minuten" />
          <Stat value={log.answers} label="Antworten" />
          <Stat value={log.trainingDay ? 'Ja' : 'Nein'} label="Trainingstag" />
          <Stat value={dates.size} label="Trainingstage gesamt" />
          <Stat value={streak(dates, today()).days} label="Serie" />
          <Stat value={stars} label="Sterne" />
        </div>
      </Card>

      <Card>
        <div className="font-display text-xl font-extrabold uppercase mb-2">Karteikasten ({pool.length} Wörter)</div>
        {pool.length > 0 && boxes[0] === 0 && (
          <div className="mb-3 rounded-xl bg-gold/15 ring-1 ring-gold/40 p-3 text-sm">
            <b className="text-gold">Alle Wörter sind eingeführt.</b> {child.name} bekommt keine neuen Wörter mehr. Bitte unten unter „Daten“ per Foto die nächste Unit hinzufügen.
          </div>
        )}
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {['Neu', 'F1', 'F2', 'F3', 'F4', 'F5', 'Sitzt'].map((l, i) => (
            <div key={l} className="rounded-lg bg-black/20 py-2">
              <div className="font-display text-xl font-extrabold">{boxes[i]}</div>
              <div className="text-chalk/60">{l}</div>
            </div>
          ))}
        </div>
        {hard.length > 0 && (
          <div className="mt-3">
            <div className="text-sm text-chalk/60">Schwierige Wörter</div>
            <ul className="mt-1 text-sm space-y-1">
              {hard.map((p) => (
                <li key={p.id} className="flex justify-between">
                  <span>
                    {wordById.get(p.wordId)?.en} = {wordById.get(p.wordId)?.de}
                  </span>
                  <span className="text-flag">{p.errors}× falsch</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <div className="font-display text-xl font-extrabold uppercase">Saison und Pokale</div>
        <p className="text-sm text-chalk/75">
          Nur virtuelle Belohnungen: Nach jeder Saison bekommt {child.name} einen Pokal für die Vitrine in der App. Danach beginnt automatisch die nächste Saison.
        </p>
        {season && (
          <p className="text-sm text-chalk/75">
            Aktuell: Saison {season.season} ({season.trophy.icon} {season.trophy.name}), {season.progress} von {season.length} Trainingstagen.
            {season.won > 0 && ` Gewonnene Pokale: ${season.won}.`}
          </p>
        )}
        <div className="flex items-center gap-2">
          <span className="text-sm text-chalk/80 flex-1">Trainingstage pro Saison</span>
          <input
            type="number"
            min={5}
            max={120}
            value={days}
            onChange={(e) => setGoalDays(Number(e.target.value))}
            className="w-20 rounded-xl bg-black/25 ring-1 ring-white/20 px-3 py-2 outline-none focus:ring-lime"
            aria-label="Trainingstage pro Saison"
          />
        </div>
        <Btn
          size="md"
          variant="chalk"
          disabled={!days || days < 5 || days === goal?.requiredDays}
          onClick={async () => {
            await setSeasonLength(childId, Math.round(days))
            setGoalDays(null)
            flash('Gespeichert')
          }}
        >
          {goal ? 'Speichern' : 'Saisons starten'}
        </Btn>
      </Card>

      <div className="space-y-1">
        <div className="text-xs text-chalk/60 px-1">Erinnerung auf diesem Handy (z. B. wenn {child.name} hier spielt)</div>
        <ReminderCard childId={childId} />
      </div>

      <Card className="space-y-3">
        <div className="font-display text-xl font-extrabold uppercase">Training und Regeln</div>
        <div className="grid grid-cols-2 gap-2">
          {(['write', 'picture'] as const).map((m) => (
            <button
              key={m}
              onClick={() => updateChildSettings(childId, { mode: m })}
              className={`rounded-xl py-2 text-sm font-semibold ${(child.settings?.mode ?? 'write') === m ? 'bg-chalk text-pitch' : 'bg-white/5 ring-1 ring-white/15'}`}
            >
              {m === 'write' ? 'Mit Schreiben' : 'Hören und Bilder'}
            </button>
          ))}
        </div>
        <p className="text-xs text-chalk/60">
          {(child.settings?.mode ?? 'write') === 'write'
            ? 'Für Schulkinder mit Englisch: Auswahl und selbst tippen.'
            : 'Für Kinder ohne Englisch in der Schule: hören, Bilder antippen, laut nachsprechen. Kein Schreiben.'}
        </p>
        <label className="flex items-center justify-between gap-3 py-1">
          <span>
            Deutsch-Lernwörter
            <span className="block text-xs text-chalk/60">Für die Grundschule: Silben, Schreiben, Leserakete</span>
          </span>
          <input
            type="checkbox"
            className="h-6 w-6 accent-lime"
            checked={!!child.settings?.german}
            onChange={(e) => updateChildSettings(childId, { german: e.target.checked })}
          />
        </label>
        <Stepper label="Neue Wörter pro Tag" value={child.newPerDay} min={1} max={15} onChange={(n) => setNewPerDay(child, n)} />
        <Stepper
          label="Minuten für einen Trainingstag"
          value={rules.minSeconds / 60}
          min={5}
          max={60}
          step={5}
          onChange={(n) => updateChildSettings(childId, { minMinutes: n })}
        />
        <Stepper
          label="Antworten für einen Trainingstag"
          value={rules.minAnswers}
          min={10}
          max={100}
          step={5}
          onChange={(n) => updateChildSettings(childId, { minAnswers: n })}
        />
      </Card>

      {child.settings?.german && (
        <Card className="space-y-3">
          <div className="font-display text-xl font-extrabold uppercase">Deutsch-Lernwörter</div>
          {lists.filter((l) => l.subject === GERMAN && assigns.some((a) => a.listId === l.id && a.active !== false)).length === 0 ? (
            <p className="text-sm text-chalk/70">Noch kein Lernwörterblatt.</p>
          ) : (
            <ul className="text-sm space-y-1">
              {lists
                .filter((l) => l.subject === GERMAN && assigns.some((a) => a.listId === l.id && a.active !== false))
                .sort((a, b) => a.title.localeCompare(b.title, 'de', { numeric: true }))
                .map((l) => (
                  <li key={l.id}>📄 {l.title}</li>
                ))}
            </ul>
          )}
          <p className="text-xs text-chalk/60">Geübt wird immer das neueste Blatt. Ältere Lernwörter kommen zur Wiederholung wieder.</p>
          <GermanImport childId={childId} childName={child.name} nextNumber={lists.filter((l) => l.subject === GERMAN).length + 1} />
        </Card>
      )}

      <Card className="space-y-2">
        <div className="font-display text-xl font-extrabold uppercase">Wortlisten</div>
        {lists.length === 0 && <p className="text-sm text-chalk/70">Noch keine Listen vorhanden.</p>}
        {lists.map((l) => {
          const on = assigns.some((a) => a.listId === l.id && a.active !== false)
          return (
            <label key={l.id} className="flex items-center justify-between gap-3 py-1">
              <span>
                {l.subject}: {l.title}
              </span>
              <input type="checkbox" className="h-6 w-6 accent-lime" checked={on} onChange={(e) => setAssignment(childId, l.id, e.target.checked)} />
            </label>
          )
        })}
      </Card>
      {saved && <div className="fixed bottom-6 inset-x-0 mx-auto w-fit rounded-full bg-lime text-pitch px-4 py-2 font-semibold animate-rise">{saved}</div>}
    </div>
  )
}

function Stepper({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-chalk/80 text-sm">{label}</span>
      <div className="flex items-center gap-3 shrink-0">
        <Btn size="sm" variant="ghost" onClick={() => onChange(Math.max(min, value - step))} aria-label={`${label} weniger`}>
          −
        </Btn>
        <span className="font-display text-2xl font-extrabold w-8 text-center">{value}</span>
        <Btn size="sm" variant="ghost" onClick={() => onChange(Math.min(max, value + step))} aria-label={`${label} mehr`}>
          +
        </Btn>
      </div>
    </div>
  )
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-xl bg-black/20 py-2">
      <div className="font-display text-2xl font-extrabold">{value}</div>
      <div className="text-xs text-chalk/60">{label}</div>
    </div>
  )
}

function DataPanel() {
  const [msg, setMsg] = useState('')
  const [text, setText] = useState('')

  const doImport = async (raw: string) => {
    try {
      const n = await importList(JSON.parse(raw))
      setMsg(`${n} Wörter importiert. Jetzt beim Kind unter „Wortlisten“ zuweisen.`)
      setText('')
    } catch (e) {
      setMsg(`Import fehlgeschlagen: ${(e as Error).message}`)
    }
  }

  const download = async () => {
    const data = await exportAll()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `vokabel-sicherung-${today()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="space-y-4">
      <PhotoImport />
      <Card className="space-y-3">
        <div className="font-display text-xl font-extrabold uppercase">Wortliste importieren</div>
        <p className="text-sm text-chalk/75">Importdatei von Claude auswählen oder den Inhalt hier einfügen.</p>
        <input
          type="file"
          accept="application/json,.json"
          onChange={async (e) => {
            const f = e.target.files?.[0]
            if (f) await doImport(await f.text())
            e.target.value = ''
          }}
          className="block w-full text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-chalk file:text-pitch file:px-4 file:py-2 file:font-semibold"
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder='{"list": {...}, "words": [...]}'
          className="w-full rounded-xl bg-black/25 ring-1 ring-white/20 p-3 text-sm font-mono outline-none focus:ring-lime"
        />
        <Btn size="md" variant="chalk" disabled={!text.trim()} onClick={() => doImport(text)}>
          Einfügen
        </Btn>
      </Card>
      <Card className="space-y-3">
        <div className="font-display text-xl font-extrabold uppercase">Sicherung</div>
        <p className="text-sm text-chalk/75">Bis die Online-Synchronisierung kommt, liegen alle Daten nur auf diesem Gerät.</p>
        <Btn size="md" variant="ghost" onClick={download}>
          Sicherung herunterladen
        </Btn>
        <label className="block">
          <span className="text-sm text-chalk/75">Sicherung wiederherstellen (ersetzt alle Daten)</span>
          <input
            type="file"
            accept="application/json,.json"
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (!f) return
              try {
                await restoreAll(JSON.parse(await f.text()))
                setMsg('Sicherung wiederhergestellt.')
              } catch (err) {
                setMsg(`Wiederherstellen fehlgeschlagen: ${(err as Error).message}`)
              }
              e.target.value = ''
            }}
            className="mt-2 block w-full text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-white/10 file:text-chalk file:px-4 file:py-2"
          />
        </label>
      </Card>
      {msg && <p className="text-center text-gold">{msg}</p>}
    </div>
  )
}

// Eltern-Bereich auf einem Kinder-Gerät: nur Einstellungen, die für dieses Gerät gelten
function DeviceParentArea({ go }: { go: (r: Route) => void }) {
  const children = useLiveQuery(async () => sortChildren(await db.children.toArray()), [])
  return (
    <div className="space-y-4">
      <TopBar onBack={() => go({ name: 'pick' })} title="Eltern-Bereich" />
      <Card>
        <div className="font-display text-xl font-extrabold uppercase">Kinder-Gerät</div>
        <p className="text-chalk/75 mt-1 text-sm">Ziele, Wörter und Regeln änderst du in der App auf deinem eigenen Handy. Hier stellst du nur die Erinnerung für dieses Gerät ein.</p>
      </Card>
      {(children ?? []).map((c) => (
        <div key={c.id} className="space-y-2">
          <div className="font-display text-lg font-extrabold uppercase text-chalk/80">{c.player?.name ?? c.name}</div>
          <ReminderCard childId={c.id} />
        </div>
      ))}
    </div>
  )
}
