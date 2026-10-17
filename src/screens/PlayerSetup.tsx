import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import { albumStats, setPlayer } from '../data/repo'
import type { Route } from '../App'
import { completedClubs, ownedIds } from '../logic/album'
import { BOOTS, CELEBRATIONS, CLUB_KITS, isUnlocked, lockText, PATTERNS, safeGear } from '../logic/gear'
import { levelFor } from '../logic/rewards'
import { Boot, Btn, Celebration, JERSEY_COLORS, Jersey, TopBar } from '../ui/components'

export function PlayerSetup({ childId, go }: { childId: string; go: (r: Route) => void }) {
  const [name, setName] = useState('')
  const [number, setNumber] = useState(7)
  const [color, setColor] = useState(JERSEY_COLORS[0])
  const [pattern, setPattern] = useState('plain')
  const [accent, setAccent] = useState<string | undefined>(undefined)
  const [boots, setBoots] = useState('white')
  const [celebration, setCelebration] = useState('fist')
  const [preview, setPreview] = useState<string | null>(null)
  const [previewKey, setPreviewKey] = useState(0)
  const [isEdit, setIsEdit] = useState(false)

  const unlocks = useLiveQuery(async () => {
    const a = await albumStats(childId)
    return {
      level: levelFor(a.stars, a.trainingDays, a.legacy.stars).index,
      clubs: completedClubs(ownedIds(a)),
    }
  }, [childId])
  const level = unlocks?.level ?? 0
  const clubs = unlocks?.clubs ?? []

  useEffect(() => {
    db.children.get(childId).then((c) => {
      if (!c) return
      setName(c.player?.name ?? c.name)
      if (c.player) {
        setNumber(c.player.number)
        setColor(c.player.color)
        setPattern(c.player.pattern ?? 'plain')
        setAccent(c.player.accent)
        setBoots(c.player.boots ?? 'white')
        setCelebration(c.player.celebration ?? 'fist')
        setIsEdit(true)
      }
    })
  }, [childId])

  const save = async () => {
    const g = safeGear({ pattern, boots, celebration }, level, clubs)
    await setPlayer(childId, {
      name: name.trim() || 'Spieler',
      number,
      color,
      pattern: g.pattern,
      accent,
      boots: g.boots,
      celebration: g.celebration,
    })
    go({ name: 'home', childId })
  }

  const showCelebration = (id: string) => {
    setCelebration(id)
    setPreview(id)
    setPreviewKey((k) => k + 1)
    setTimeout(() => setPreview(null), 1150)
  }
  const cel = CELEBRATIONS.find((c) => c.id === preview)
  const bootColor = BOOTS.find((b) => b.id === boots)?.color ?? '#f4f1e8'

  return (
    <div className="pb-6">
      <TopBar onBack={() => go(isEdit ? { name: 'home', childId } : { name: 'pick' })} title={isEdit ? 'Spieler und Spind' : 'Neuer Spieler'} />
      <div className="flex justify-center items-end gap-1 mt-2">
        <Jersey color={color} number={number} size={170} pattern={pattern} accent={accent} />
        <div className="mb-3">
          <Boot color={bootColor} size={56} />
        </div>
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

      <Section title="Trikotfarbe">
        <div className="grid grid-cols-8 gap-2">
          {JERSEY_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => {
                setColor(c)
                setAccent(undefined)
                if (pattern.startsWith('club-')) setPattern('plain')
              }}
              aria-label={`Farbe ${c}`}
              className={`aspect-square rounded-full ring-2 ${color === c && !pattern.startsWith('club-') ? 'ring-lime scale-110' : 'ring-white/20'} transition`}
              style={{ background: c }}
            />
          ))}
        </div>
      </Section>

      {isEdit && (
        <>
          <Section title="Trikot-Muster">
            <div className="grid grid-cols-3 gap-2">
              {PATTERNS.map((p) => (
                <Item
                  key={p.id}
                  active={pattern === p.id}
                  locked={!isUnlocked(p.unlock, level, clubs)}
                  hint={lockText(p.unlock)}
                  label={p.name}
                  onClick={() => {
                    setPattern(p.id)
                    setAccent(undefined)
                  }}
                >
                  <Jersey color={color} number="" size={54} pattern={p.id} />
                </Item>
              ))}
              {CLUB_KITS.map((k) => (
                <Item
                  key={k.id}
                  active={pattern === k.id}
                  locked={!isUnlocked(k.unlock, level, clubs)}
                  hint={lockText(k.unlock)}
                  label={k.name}
                  onClick={() => {
                    setPattern(k.id)
                    setColor(k.color)
                    setAccent(k.accent)
                  }}
                >
                  <Jersey color={k.color} number="" size={54} pattern={k.id} accent={k.accent} />
                </Item>
              ))}
            </div>
          </Section>

          <Section title="Schuhe">
            <div className="grid grid-cols-4 gap-2">
              {BOOTS.map((b) => (
                <Item
                  key={b.id}
                  active={boots === b.id}
                  locked={!isUnlocked(b.unlock, level, clubs)}
                  hint={lockText(b.unlock)}
                  label={b.name}
                  onClick={() => setBoots(b.id)}
                >
                  <Boot color={b.color} size={44} />
                </Item>
              ))}
            </div>
          </Section>

          <Section title="Torjubel" note="Kommt bei jeder richtigen Antwort. Tipp drauf zum Ausprobieren!">
            <div className="grid grid-cols-4 gap-2">
              {CELEBRATIONS.map((c) => (
                <Item
                  key={c.id}
                  active={celebration === c.id}
                  locked={!isUnlocked(c.unlock, level, clubs)}
                  hint={lockText(c.unlock)}
                  label={c.name}
                  onClick={() => showCelebration(c.id)}
                >
                  <span className="text-3xl leading-none">{c.icon}</span>
                </Item>
              ))}
            </div>
          </Section>
        </>
      )}

      <Btn className="w-full mt-8" onClick={save}>
        {isEdit ? 'Speichern' : 'Auf den Platz!'}
      </Btn>
      {cel && <Celebration key={previewKey} id={cel.id} icon={cel.icon} name={cel.name} />}
    </div>
  )
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <div className="text-sm text-chalk/70 mb-2">
        {title}
        {note && <span className="block text-xs text-chalk/50">{note}</span>}
      </div>
      {children}
    </div>
  )
}

function Item({
  active,
  locked,
  hint,
  label,
  onClick,
  children,
}: {
  active: boolean
  locked: boolean
  hint: string
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      disabled={locked}
      onClick={onClick}
      className={`relative rounded-2xl p-2 flex flex-col items-center justify-center gap-1 min-h-[86px] transition ${
        active ? 'bg-chalk text-pitch ring-4 ring-lime' : 'bg-white/5 ring-1 ring-white/15'
      } ${locked ? 'opacity-45' : ''}`}
    >
      <div className={locked ? 'grayscale' : ''}>{children}</div>
      <div className={`text-[11px] font-semibold leading-tight text-center ${locked ? 'invisible' : ''}`}>{label}</div>
      {locked && (
        <div className="absolute inset-0 rounded-2xl bg-black/55 grid place-items-center text-center px-1">
          <div>
            <div className="text-lg">🔒</div>
            <div className="text-[10px] leading-tight text-chalk">{hint}</div>
          </div>
        </div>
      )}
    </button>
  )
}
