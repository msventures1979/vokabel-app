import { useEffect, useState } from 'react'
import { getMeta, seed } from './data/db'
import { ensureCatalog } from './data/catalog'
import { initSync, useSyncState } from './sync/account'
import { Welcome } from './screens/Welcome'
import { ProfilePicker } from './screens/ProfilePicker'
import { PlayerSetup } from './screens/PlayerSetup'
import { Home } from './screens/Home'
import { Training, type TrainingKind } from './screens/Training'
import { Parent } from './screens/Parent'

export type Route =
  | { name: 'pick' }
  | { name: 'setup'; childId: string }
  | { name: 'home'; childId: string }
  | { name: 'train'; childId: string; kind: TrainingKind }
  | { name: 'parent' }

const LAST_KEY = 'vokabel:lastChild'
function readLast(): string | null {
  try {
    return localStorage.getItem(LAST_KEY)
  } catch {
    return null
  }
}
function writeLast(id: string | null) {
  try {
    if (id) localStorage.setItem(LAST_KEY, id)
    else localStorage.removeItem(LAST_KEY)
  } catch {
    /* Speicher nicht verfügbar */
  }
}

export default function App() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [route, setRoute] = useState<Route>(() => {
    const last = readLast()
    return last ? { name: 'home', childId: last } : { name: 'pick' }
  })

  const sync = useSyncState()
  const [localOnly, setLocalOnly] = useState<boolean | null>(null)

  useEffect(() => {
    ;(async () => {
      await initSync()
      await seed()
      if (!(await getMeta('familyId'))) await ensureCatalog() // ohne Konto: Listen lokal ergänzen
      setLocalOnly(!!(await getMeta('localOnly')))
      setReady(true)
    })().catch((e) => setError(String(e?.message ?? e)))
  }, [])

  const [nav, setNav] = useState(0)
  const go = (r: Route) => {
    setNav((n) => n + 1)
    if (r.name === 'home') writeLast(r.childId)
    if (r.name === 'pick') writeLast(null)
    setRoute(r)
    window.scrollTo(0, 0)
  }

  if (error)
    return (
      <div className="p-6 max-w-md mx-auto">
        <h1 className="font-display text-3xl font-extrabold">Da ging was schief</h1>
        <p className="mt-2 text-chalk/80">Der Speicher dieses Geräts ist nicht verfügbar. Bitte die App neu öffnen.</p>
        <p className="mt-4 text-xs text-chalk/50">{error}</p>
      </div>
    )
  if (!ready || localOnly === null) return null

  if (sync.configured && !sync.familyId && !localOnly)
    return (
      <div className="min-h-full max-w-xl mx-auto px-4 pb-8 pt-[max(12px,env(safe-area-inset-top))]">
        <Welcome
          onDone={async () => {
            setLocalOnly(!!(await getMeta('localOnly')))
            go({ name: 'pick' })
          }}
        />
      </div>
    )

  return (
    <div className="min-h-full max-w-xl mx-auto px-4 pb-8 pt-[max(12px,env(safe-area-inset-top))]">
      {route.name === 'pick' && <ProfilePicker go={go} />}
      {route.name === 'setup' && <PlayerSetup childId={route.childId} go={go} />}
      {route.name === 'home' && <Home childId={route.childId} go={go} />}
      {route.name === 'train' && <Training key={nav} childId={route.childId} kind={route.kind} go={go} />}
      {route.name === 'parent' && <Parent go={go} />}
    </div>
  )
}
