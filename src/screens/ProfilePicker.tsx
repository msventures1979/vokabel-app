import { useLiveQuery } from 'dexie-react-hooks'
import { db, sortChildren } from '../data/db'
import type { Route } from '../App'
import { Jersey } from '../ui/components'

export function ProfilePicker({ go }: { go: (r: Route) => void }) {
  const children = useLiveQuery(async () => sortChildren(await db.children.toArray()), [])
  if (!children) return null
  return (
    <div className="pt-6">
      <p className="font-display uppercase tracking-[0.2em] text-lime text-sm">Vokabel-Training</p>
      <h1 className="font-display text-5xl font-extrabold uppercase leading-none mt-1">Wer spielt heute?</h1>
      <div className="grid grid-cols-2 gap-4 mt-8">
        {children.map((c) => (
          <button
            key={c.id}
            onClick={() => go(c.player ? { name: 'home', childId: c.id } : { name: 'setup', childId: c.id })}
            className="rounded-3xl bg-pitch-2 ring-1 ring-white/15 p-5 flex flex-col items-center active:scale-[0.98] transition"
          >
            <Jersey color={c.player?.color ?? '#f4f1e8'} number={c.player?.number ?? '?'} size={110} />
            <span className="font-display text-3xl font-extrabold uppercase mt-2">{c.player?.name ?? c.name}</span>
          </button>
        ))}
      </div>
      <button onClick={() => go({ name: 'parent' })} className="mt-10 mx-auto block text-chalk/60 underline underline-offset-4">
        Eltern-Bereich
      </button>
    </div>
  )
}
