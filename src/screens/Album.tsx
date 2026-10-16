import { useLiveQuery } from 'dexie-react-hooks'
import type { Route } from '../App'
import { albumStats } from '../data/repo'
import { CARDS, isUnlocked, missingText } from '../logic/album'
import { speak } from '../lib/speech'
import { PlayerCard, TopBar } from '../ui/components'

export function Album({ childId, go }: { childId: string; go: (r: Route) => void }) {
  const stats = useLiveQuery(() => albumStats(childId), [childId])
  if (!stats) return null
  const count = CARDS.filter((c) => isUnlocked(c, stats)).length
  return (
    <div className="space-y-4">
      <TopBar onBack={() => go({ name: 'home', childId })} title="Sammelalbum" right={<span className="font-display text-xl font-extrabold">{count} / {CARDS.length}</span>} />
      <p className="text-sm text-chalk/75">
        Karten gibt es für Sterne, Trainingstage, Serien und Wörter, die sitzen. Tipp auf das englische Wort, dann hörst du es.
      </p>
      <div className="grid grid-cols-3 gap-3">
        {CARDS.map((c) =>
          isUnlocked(c, stats) ? (
            <PlayerCard key={c.id} card={c} size="sm" onSpeak={() => speak(c.en)} />
          ) : (
            <PlayerCard key={c.id} card={c} locked hint={missingText(c, stats)} size="sm" />
          ),
        )}
      </div>
    </div>
  )
}
