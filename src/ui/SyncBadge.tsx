import { useSyncState } from '../sync/account'

// Kleiner Punkt: grün = abgeglichen, gelb = läuft/offline, rot = Fehler
export function SyncBadge() {
  const s = useSyncState()
  if (!s.familyId) return null
  const color = s.status === 'idle' ? 'bg-lime' : s.status === 'error' ? 'bg-flag' : 'bg-gold'
  const label =
    s.status === 'idle' ? 'Abgeglichen' : s.status === 'syncing' ? 'Gleicht ab' : s.status === 'offline' ? 'Offline' : 'Abgleich-Fehler'
  return (
    <span className="inline-flex items-center" title={label} aria-label={label}>
      <span className={`h-2.5 w-2.5 rounded-full ${color} ${s.status === 'syncing' ? 'animate-pulse' : ''}`} />
    </span>
  )
}
