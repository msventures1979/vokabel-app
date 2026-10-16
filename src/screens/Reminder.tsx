import { useEffect, useState } from 'react'
import { useSyncState } from '../sync/account'
import { disableReminder, enableReminder, pushSupported, reminderStatus, setReminderHour } from '../sync/push'
import { Btn, Card } from '../ui/components'

const HOURS = [14, 15, 16, 17, 18, 19]

// Kleine Karte in der Kabine: tägliche Erinnerung an- oder ausschalten
export function ReminderCard({ childId }: { childId: string }) {
  const sync = useSyncState()
  const [state, setState] = useState<{ enabled: boolean; hour: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!sync.familyId || !pushSupported()) return
    reminderStatus(childId).then(setState)
  }, [childId, sync.familyId])

  if (!sync.familyId || !pushSupported() || !state) return null

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setErr('')
    try {
      await fn()
      setState(await reminderStatus(childId))
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="text-3xl">🔔</div>
        <div className="flex-1">
          <div className="font-display text-xl font-extrabold uppercase">Erinnerung</div>
          <div className="text-sm text-chalk/70">
            {state.enabled ? `Täglich um ${state.hour} Uhr, wenn das Training noch fehlt.` : 'Eine Nachricht, wenn das Training noch fehlt.'}
          </div>
        </div>
      </div>
      <div className="text-xs text-chalk/60 -mb-1">Um wie viel Uhr?</div>
      <div className="flex gap-1.5">
        {HOURS.map((h) => (
          <button
            key={h}
            disabled={busy}
            onClick={() => (state.enabled ? run(() => setReminderHour(h)) : setState({ ...state, hour: h }))}
            className={`flex-1 rounded-lg py-1.5 text-sm font-semibold leading-tight ${state.hour === h ? 'bg-chalk text-pitch' : 'bg-white/5 ring-1 ring-white/15'}`}
          >
            {h}
            <span className="block text-[10px] font-normal opacity-70">Uhr</span>
          </button>
        ))}
      </div>
      {state.enabled ? (
        <Btn size="sm" variant="ghost" className="w-full" disabled={busy} onClick={() => run(() => disableReminder(childId))}>
          Ausschalten
        </Btn>
      ) : (
        <Btn size="md" variant="chalk" className="w-full" disabled={busy} onClick={() => run(() => enableReminder(childId, state.hour))}>
          Erinnerung einschalten
        </Btn>
      )}
      {err && <p className="text-flag text-sm">{err}</p>}
    </Card>
  )
}
