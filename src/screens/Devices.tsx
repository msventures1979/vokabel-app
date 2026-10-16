import { useCallback, useEffect, useState } from 'react'
import { createFamily, createPairingCode, currentUserId, listMembers, removeMember, signOut, syncNow, useSyncState, type Member } from '../sync/account'
import { Btn, Card } from '../ui/components'
import { AccountForm } from './Welcome'

export function DevicesPanel() {
  const sync = useSyncState()
  if (!sync.configured) return <Card>Der Abgleich ist in dieser Version nicht eingerichtet.</Card>
  if (!sync.signedIn) {
    return (
      <Card className="space-y-3">
        <div className="font-display text-xl font-extrabold uppercase">Eltern-Konto</div>
        <p className="text-sm text-chalk/75">
          Mit einem Konto wird der Lernstand auf allen Geräten abgeglichen. Bisherige Daten auf diesem Gerät werden übernommen.
        </p>
        <AccountForm />
      </Card>
    )
  }
  if (!sync.familyId) return <NoFamily />
  return <FamilyDevices />
}

function NoFamily() {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  return (
    <Card className="space-y-3">
      <div className="font-display text-xl font-extrabold uppercase">Familie anlegen</div>
      <p className="text-sm text-chalk/75">Angemeldet. Lege jetzt die Familie an. Kinder, Wörter, Ziele und bisheriger Lernstand von diesem Gerät werden hochgeladen.</p>
      <Btn
        size="md"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          setErr('')
          try {
            await createFamily()
          } catch (e) {
            setErr((e as Error).message)
          } finally {
            setBusy(false)
          }
        }}
      >
        Familie anlegen
      </Btn>
      {err && <p className="text-flag text-sm">{err}</p>}
    </Card>
  )
}

function FamilyDevices() {
  const sync = useSyncState()
  const [members, setMembers] = useState<Member[]>([])
  const [me, setMe] = useState<string>()
  const [code, setCode] = useState<{ code: string; kind: 'device' | 'parent'; until: number } | null>(null)
  const [err, setErr] = useState('')
  const [left, setLeft] = useState(0)

  const load = useCallback(async () => {
    try {
      setMembers(await listMembers())
      setMe(await currentUserId())
    } catch (e) {
      setErr((e as Error).message)
    }
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!code) return
    const t = setInterval(() => {
      const s = Math.max(0, Math.round((code.until - Date.now()) / 1000))
      setLeft(s)
      if (s === 0) setCode(null)
      if (s % 5 === 0) void load()
    }, 1000)
    return () => clearInterval(t)
  }, [code, load])

  const makeCode = async (kind: 'device' | 'parent') => {
    setErr('')
    try {
      const c = await createPairingCode(kind)
      setCode({ code: c, kind, until: Date.now() + 15 * 60_000 })
      setLeft(15 * 60)
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-2">
        <div className="font-display text-xl font-extrabold uppercase">Abgleich</div>
        <p className="text-sm text-chalk/75">
          Angemeldet als {sync.email ?? 'Eltern-Konto'}.{' '}
          {sync.status === 'syncing'
            ? 'Gleicht gerade ab …'
            : sync.status === 'offline'
              ? 'Offline. Der Abgleich läuft, sobald wieder Internet da ist.'
              : sync.status === 'error'
                ? `Fehler: ${sync.error}`
                : sync.lastSync
                  ? `Zuletzt abgeglichen um ${new Date(sync.lastSync).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr.`
                  : ''}
        </p>
        <Btn size="sm" variant="ghost" onClick={() => void syncNow()}>
          Jetzt abgleichen
        </Btn>
      </Card>

      <Card className="space-y-3">
        <div className="font-display text-xl font-extrabold uppercase">Gerät koppeln</div>
        <p className="text-sm text-chalk/75">
          Auf dem Kinder-Gerät die App öffnen, „Kinder-Gerät koppeln“ wählen und den Code eingeben. Der Code gilt 15 Minuten.
        </p>
        {code ? (
          <div className="rounded-2xl bg-chalk text-pitch p-4 text-center">
            <div className="text-sm uppercase tracking-widest text-pitch/60">{code.kind === 'device' ? 'Code für Kinder-Gerät' : 'Code für zweites Eltern-Konto'}</div>
            <div className="font-display text-6xl font-extrabold tracking-[0.15em]">{code.code}</div>
            <div className="text-sm text-pitch/60">
              noch {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')} Minuten
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Btn size="md" onClick={() => makeCode('device')}>
              Kinder-Gerät
            </Btn>
            <Btn size="md" variant="ghost" onClick={() => makeCode('parent')}>
              2. Elternteil
            </Btn>
          </div>
        )}
      </Card>

      <Card className="space-y-2">
        <div className="font-display text-xl font-extrabold uppercase">Verbundene Geräte</div>
        {members.map((m) => (
          <div key={m.user_id} className="flex items-center justify-between gap-3 py-1">
            <div>
              <div className="font-semibold">
                {m.role === 'parent' ? 'Eltern-Konto' : m.device_name || 'Kinder-Gerät'}
                {m.user_id === me && <span className="text-lime"> (dieses Gerät)</span>}
              </div>
              <div className="text-xs text-chalk/60">seit {new Date(m.created_at).toLocaleDateString('de-DE')}</div>
            </div>
            {m.user_id !== me && m.role === 'device' && (
              <Btn
                size="sm"
                variant="ghost"
                onClick={async () => {
                  try {
                    await removeMember(m.user_id)
                    await load()
                  } catch (e) {
                    setErr((e as Error).message)
                  }
                }}
              >
                Entfernen
              </Btn>
            )}
          </div>
        ))}
      </Card>

      {err && <p className="text-flag text-sm">{err}</p>}
      <SignOut />
    </div>
  )
}

function SignOut() {
  const [ask, setAsk] = useState(false)
  if (!ask)
    return (
      <button className="block mx-auto text-sm text-chalk/60 underline underline-offset-4" onClick={() => setAsk(true)}>
        Auf diesem Gerät abmelden
      </button>
    )
  return (
    <Card className="space-y-2">
      <p className="text-sm">Abmelden entfernt die Daten von diesem Gerät. Auf dem Server bleibt alles erhalten.</p>
      <div className="grid grid-cols-2 gap-2">
        <Btn size="sm" variant="ghost" onClick={() => setAsk(false)}>
          Abbrechen
        </Btn>
        <Btn size="sm" variant="danger" onClick={() => void signOut()}>
          Abmelden
        </Btn>
      </div>
    </Card>
  )
}
