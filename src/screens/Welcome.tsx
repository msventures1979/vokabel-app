import { useState } from 'react'
import { createFamily, joinAsParent, pairDevice, signInParent, signUpParent, useSyncState, useWithoutAccount } from '../sync/account'
import { Ball, Btn, Card, TopBar } from '../ui/components'

type Mode = 'start' | 'parent' | 'device'

export function Welcome({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<Mode>('start')
  if (mode === 'parent')
    return (
      <div>
        <TopBar onBack={() => setMode('start')} title="Eltern-Konto" />
        <Card className="mt-2 space-y-3">
          <p className="text-sm text-chalk/75">Mit deinem Konto verwaltest du Kinder, Wörter und Ziele. Der Lernstand wird auf allen Geräten abgeglichen.</p>
          <AccountForm onDone={onDone} />
        </Card>
      </div>
    )
  if (mode === 'device') return <PairDevice onBack={() => setMode('start')} onDone={onDone} />
  return (
    <div className="pt-8 space-y-6">
      <div className="flex justify-center">
        <Ball size={84} />
      </div>
      <div className="text-center">
        <p className="font-display uppercase tracking-[0.2em] text-lime text-sm">Vokabel-Training</p>
        <h1 className="font-display text-5xl font-extrabold uppercase leading-none mt-1">Anpfiff!</h1>
        <p className="text-chalk/75 mt-3">Wie soll dieses Gerät verwendet werden?</p>
      </div>
      <div className="grid gap-3">
        <Btn onClick={() => setMode('parent')}>Eltern-Gerät</Btn>
        <Btn variant="chalk" onClick={() => setMode('device')}>
          Kinder-Gerät koppeln
        </Btn>
      </div>
      <button
        className="block mx-auto text-sm text-chalk/60 underline underline-offset-4"
        onClick={async () => {
          await useWithoutAccount()
          onDone()
        }}
      >
        Ohne Konto ausprobieren (nur dieses Gerät)
      </button>
    </div>
  )
}

export function AccountForm({ onDone }: { onDone?: () => void }) {
  const sync = useSyncState()
  const [isNew, setIsNew] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [joinCode, setJoinCode] = useState('')

  if (sync.signedIn && !sync.anonymous && !sync.familyId) {
    // Angemeldet, aber noch keiner Familie zugeordnet: zweites Elternteil kann mit Code beitreten
    return (
      <div className="space-y-3">
        <p className="text-sm">Angemeldet als {sync.email}. Neue Familie anlegen oder als zweites Elternteil mit Code beitreten.</p>
        <Btn
          size="md"
          className="w-full"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            setErr('')
            try {
              await createFamily()
              onDone?.()
            } catch (e) {
              setErr((e as Error).message)
            } finally {
              setBusy(false)
            }
          }}
        >
          {busy ? 'Bitte warten …' : 'Neue Familie anlegen'}
        </Btn>
        <div className="text-center text-sm text-chalk/60">oder Eltern-Code eingeben</div>
        <CodeInput value={joinCode} onChange={setJoinCode} />
        <Btn
          size="md"
          variant="chalk"
          className="w-full"
          disabled={joinCode.length !== 6 || busy}
          onClick={async () => {
            setBusy(true)
            setErr('')
            try {
              await joinAsParent(joinCode)
              onDone?.()
            } catch (e) {
              setErr((e as Error).message)
            } finally {
              setBusy(false)
            }
          }}
        >
          Mit Code beitreten
        </Btn>
        {err && <p className="text-flag text-sm">{err}</p>}
      </div>
    )
  }

  const submit = async () => {
    setBusy(true)
    setErr('')
    setMsg('')
    try {
      if (isNew) {
        const r = await signUpParent(email.trim(), password)
        if (r === 'confirm') {
          setMsg('Fast geschafft: Bitte bestätige deine E-Mail über den Link im Postfach. Danach hier anmelden.')
          setIsNew(false)
          return
        }
      } else {
        await signInParent(email.trim(), password)
      }
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setIsNew(false)}
          className={`rounded-xl py-2 font-semibold ${!isNew ? 'bg-chalk text-pitch' : 'bg-white/5 ring-1 ring-white/15'}`}
        >
          Anmelden
        </button>
        <button
          type="button"
          onClick={() => setIsNew(true)}
          className={`rounded-xl py-2 font-semibold ${isNew ? 'bg-chalk text-pitch' : 'bg-white/5 ring-1 ring-white/15'}`}
        >
          Konto erstellen
        </button>
      </div>
      <input
        type="email"
        autoComplete="email"
        required
        placeholder="E-Mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-xl bg-black/25 ring-1 ring-white/20 px-3 py-3 outline-none focus:ring-lime"
      />
      <input
        type="password"
        autoComplete={isNew ? 'new-password' : 'current-password'}
        required
        minLength={6}
        placeholder="Passwort"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-xl bg-black/25 ring-1 ring-white/20 px-3 py-3 outline-none focus:ring-lime"
      />
      <Btn size="md" className="w-full" type="submit" disabled={busy}>
        {busy ? 'Bitte warten …' : isNew ? 'Konto erstellen' : 'Anmelden'}
      </Btn>
      {msg && <p className="text-gold text-sm">{msg}</p>}
      {err && <p className="text-flag text-sm">{err}</p>}
    </form>
  )
}

function CodeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      placeholder="000000"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      className="w-full rounded-2xl bg-chalk text-pitch px-4 py-4 text-5xl font-display font-extrabold text-center tracking-[0.3em] outline-none placeholder:text-pitch/25"
    />
  )
}

function PairDevice({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  return (
    <div>
      <TopBar onBack={onBack} title="Kinder-Gerät koppeln" />
      <Card className="mt-2 space-y-3">
        <p className="text-sm text-chalk/75">Im Eltern-Bereich auf dem Eltern-Handy unter „Geräte“ einen Code für ein Kinder-Gerät erzeugen und hier eingeben.</p>
        <CodeInput value={code} onChange={setCode} />
        <input
          placeholder="Name des Geräts, z. B. Milans Handy"
          value={name}
          maxLength={30}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl bg-black/25 ring-1 ring-white/20 px-3 py-3 outline-none focus:ring-lime"
        />
        <Btn
          className="w-full"
          disabled={code.length !== 6 || busy}
          onClick={async () => {
            setBusy(true)
            setErr('')
            try {
              await pairDevice(code, name.trim() || 'Kinder-Gerät')
              onDone()
            } catch (e) {
              setErr((e as Error).message)
            } finally {
              setBusy(false)
            }
          }}
        >
          {busy ? 'Koppeln …' : 'Koppeln'}
        </Btn>
        {err && <p className="text-flag text-sm">{err}</p>}
      </Card>
    </div>
  )
}
