import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Route } from '../App'
import { albumStats } from '../data/repo'
import { CARDS, CLUBS, clubCards, completedClubs, nextCard, nextCardText, ownedIds, type CardDef, type Line } from '../logic/album'
import { speak } from '../lib/speech'
import { ClubCrest, PlayerCard, TopBar } from '../ui/components'

const ROWS: { line: Line; label: string }[] = [
  { line: 'sturm', label: 'Sturm' },
  { line: 'mittelfeld', label: 'Mittelfeld' },
  { line: 'abwehr', label: 'Abwehr' },
  { line: 'tor', label: 'Tor' },
]

export function Album({ childId, go }: { childId: string; go: (r: Route) => void }) {
  const stats = useLiveQuery(() => albumStats(childId), [childId])
  const [open, setOpen] = useState<CardDef | null>(null)
  if (!stats) return null
  const owned = new Set(ownedIds(stats))
  const done = new Set(completedClubs([...owned]))
  const next = nextCard(stats)
  return (
    <div className="space-y-5">
      <TopBar
        onBack={() => go({ name: 'home', childId })}
        title="Sammelalbum"
        right={
          <span className="font-display text-xl font-extrabold">
            {owned.size} / {CARDS.length}
          </span>
        }
      />
      <p className="text-sm text-chalk/75">
        Jeder Trainingstag bringt dir einen neuen Spieler. Sind alle 11 Spieler eines Vereins da, ist dein Team komplett und du bekommst das Wappen. Tipp auf eine Karte, dann hörst du das englische Wort.
      </p>

      {CLUBS.map((club, ci) => {
        const cards = clubCards(club.id)
        const have = cards.filter((c) => owned.has(c.id)).length
        const complete = done.has(club.id)
        const started = have > 0 || ci === 0 || done.has(CLUBS[ci - 1].id)
        return (
          <section key={club.id} className="space-y-3">
            <div className="flex items-center gap-3">
              <ClubCrest club={club} size={56} earned={complete} />
              <div className="flex-1 min-w-0">
                <div className="font-display text-2xl font-extrabold uppercase leading-none">{club.name}</div>
                <div className="text-sm text-chalk/70 mt-1">
                  {complete ? 'Team komplett! Wappen gewonnen.' : started ? `${have} von 11 Spielern` : `Startet nach den ${CLUBS[ci - 1].name}`}
                </div>
              </div>
              <div className="font-display text-2xl font-extrabold">
                {have}
                <span className="text-chalk/50 text-base">/11</span>
              </div>
            </div>
            <div
              className={`relative rounded-3xl ring-1 ring-white/10 p-3 space-y-2 overflow-hidden ${started ? '' : 'opacity-50'}`}
              style={{ background: 'repeating-linear-gradient(180deg, #1a6146 0 44px, #175a40 44px 88px)' }}
            >
              <div className="pointer-events-none absolute inset-3 rounded-2xl border border-white/20" />
              <div className="pointer-events-none absolute left-3 right-3 top-1/2 border-t border-white/20" />
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" />
              {ROWS.map((row) => (
                <div key={row.line} className="relative flex justify-center gap-2">
                  {cards
                    .filter((c) => c.line === row.line)
                    .map((c) => (
                      <div key={c.id} className="w-[22%] max-w-[92px]">
                        <PlayerCard
                          card={c}
                          size="xs"
                          locked={!owned.has(c.id)}
                          hint={next?.id === c.id ? 'als Nächstes' : row.label}
                          onSpeak={() => {
                            speak(c.en)
                            setOpen(c)
                          }}
                        />
                      </div>
                    ))}
                </div>
              ))}
            </div>
          </section>
        )
      })}

      <p className="text-center text-sm text-chalk/60 pb-4">{next ? nextCardText(stats) : 'Alle Vereine komplett. Weltklasse!'}</p>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/70 grid place-items-center p-6" onClick={() => setOpen(null)}>
          <div className="w-56 animate-pop" onClick={(e) => e.stopPropagation()}>
            <PlayerCard card={open} size="lg" onSpeak={() => speak(open.en)} />
          </div>
        </div>
      )}
    </div>
  )
}
