import { useEffect, useState } from 'react'
import { db } from '../data/db'
import { setPlayer } from '../data/repo'
import type { Route } from '../App'
import { Btn, JERSEY_COLORS, Jersey, TopBar } from '../ui/components'

export function PlayerSetup({ childId, go }: { childId: string; go: (r: Route) => void }) {
  const [name, setName] = useState('')
  const [number, setNumber] = useState(7)
  const [color, setColor] = useState(JERSEY_COLORS[0])
  const [isEdit, setIsEdit] = useState(false)

  useEffect(() => {
    db.children.get(childId).then((c) => {
      if (!c) return
      setName(c.player?.name ?? c.name)
      if (c.player) {
        setNumber(c.player.number)
        setColor(c.player.color)
        setIsEdit(true)
      }
    })
  }, [childId])

  const save = async () => {
    await setPlayer(childId, { name: name.trim() || 'Spieler', number, color })
    go({ name: 'home', childId })
  }

  return (
    <div>
      <TopBar onBack={() => go(isEdit ? { name: 'home', childId } : { name: 'pick' })} title={isEdit ? 'Spieler ändern' : 'Neuer Spieler'} />
      <div className="flex justify-center mt-2">
        <Jersey color={color} number={number} size={170} />
      </div>
      <label className="block mt-4 text-sm text-chalk/70">Spielername</label>
      <input
        value={name}
        maxLength={16}
        onChange={(e) => setName(e.target.value)}
        className="mt-1 w-full rounded-2xl bg-black/25 ring-1 ring-white/20 px-4 py-3 text-2xl font-display font-extrabold uppercase outline-none focus:ring-lime"
      />
      <label className="block mt-5 text-sm text-chalk/70">Rückennummer</label>
      <div className="flex items-center gap-3 mt-1">
        <Btn variant="ghost" size="md" onClick={() => setNumber((n) => Math.max(1, n - 1))} aria-label="Nummer kleiner">
          −
        </Btn>
        <div className="flex-1 text-center font-display text-5xl font-extrabold">{number}</div>
        <Btn variant="ghost" size="md" onClick={() => setNumber((n) => Math.min(99, n + 1))} aria-label="Nummer größer">
          +
        </Btn>
      </div>
      <label className="block mt-5 text-sm text-chalk/70">Trikotfarbe</label>
      <div className="grid grid-cols-8 gap-2 mt-2">
        {JERSEY_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            aria-label={`Farbe ${c}`}
            className={`aspect-square rounded-full ring-2 ${color === c ? 'ring-lime scale-110' : 'ring-white/20'} transition`}
            style={{ background: c }}
          />
        ))}
      </div>
      <Btn className="w-full mt-8" onClick={save}>
        {isEdit ? 'Speichern' : 'Auf den Platz!'}
      </Btn>
    </div>
  )
}
