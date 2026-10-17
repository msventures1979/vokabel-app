import { useEffect, useRef, useState } from 'react'
import { db } from '../data/db'
import { progressMap, recordAnswer, wordPool } from '../data/repo'
import { GOAL_STARS, keeperCorner, pickShots, SHOTS, type Shot } from '../logic/penalty'
import { speak } from '../lib/speech'
import { play, praise } from '../lib/sounds'
import { Ball, Btn, Confetti, SpeakerIcon, Star, TopBar, WordImage } from '../ui/components'

type Phase = 'aim' | 'shooting' | 'result' | 'end'

// Zielpunkte im Tor (Prozent der Spielfläche): linke Ecke, Mitte, rechte Ecke
const CORNER = [
  { x: 24, y: 24 },
  { x: 50, y: 18 },
  { x: 76, y: 24 },
]
const SPOT = { x: 50, y: 84 }
const KEEPER_DIVE = ['translate(-115%, -6%) rotate(-62deg)', 'translate(0, -14%) scale(1.06)', 'translate(115%, -6%) rotate(62deg)']

export function Penalty({ childId, onDone }: { childId: string; onDone: () => void }) {
  const [shots, setShots] = useState<Shot[] | null>(null)
  const [i, setI] = useState(0)
  const [phase, setPhase] = useState<Phase>('aim')
  const [aim, setAim] = useState<number | null>(null)
  const [keeper, setKeeper] = useState<number | null>(null)
  const [results, setResults] = useState<boolean[]>([])
  const [rebound, setRebound] = useState(false)
  const started = useRef(Date.now())

  useEffect(() => {
    ;(async () => {
      const [pool, prog, child] = await Promise.all([wordPool(childId), progressMap(childId), db.children.get(childId)])
      setShots(pickShots(pool, prog, child?.settings?.mode ?? 'write'))
    })()
  }, [childId])

  const shot = shots?.[i]

  // Marlon hört das Wort zu Beginn jedes Elfers
  useEffect(() => {
    if (shot?.dir === 'image' && phase === 'aim') {
      const t = setTimeout(() => speak(shot.word.en), 350)
      return () => clearTimeout(t)
    }
  }, [shot, phase])

  if (!shots) return null
  if (shots.length === 0)
    return (
      <div className="space-y-4">
        <TopBar onBack={onDone} title="Elfmeterschießen" />
        <p className="text-chalk/80 text-center mt-8">Für das Elfmeterschießen brauchst du mindestens drei Wörter. Trainiere erst ein bisschen weiter!</p>
        <Btn onClick={onDone}>Zur Kabine</Btn>
      </div>
    )

  const goals = results.filter(Boolean).length

  const shoot = async (corner: number) => {
    if (phase !== 'aim' || !shot) return
    const hit = corner === shot.correct
    setAim(corner)
    setPhase('shooting')
    play('kick')
    setKeeper(keeperCorner(corner, !hit))
    const secs = Math.min(30, Math.max(1, Math.round((Date.now() - started.current) / 1000)))
    void recordAnswer(childId, secs, hit ? GOAL_STARS : 0)
    setTimeout(() => {
      setResults((r) => [...r, hit])
      setPhase('result')
      play(hit ? 'goal' : 'saved')
      if (!hit) setRebound(true)
      setTimeout(() => speak(shot.word.en), hit ? 900 : 700)
    }, 600)
  }

  const next = () => {
    if (i + 1 >= shots.length) {
      setPhase('end')
      if (goals === shots.length) {
        play('trainingDay')
        praise('day', childId, 1200)
      } else if (goals >= 3) play('goal')
      return
    }
    setI(i + 1)
    setAim(null)
    setKeeper(null)
    setRebound(false)
    setPhase('aim')
    started.current = Date.now()
  }

  if (phase === 'end')
    return (
      <div className="pt-8 space-y-5 text-center">
        {goals >= 4 && <Confetti />}
        <div className="font-display uppercase tracking-[0.3em] text-lime">Elfmeterschießen</div>
        <h1 className="font-display text-7xl font-extrabold leading-none animate-pop">
          {goals} : {shots.length - goals}
        </h1>
        <p className="text-xl font-display font-extrabold uppercase">
          {goals === shots.length ? 'Perfekt! Alle drin!' : goals >= 4 ? 'Stark geschossen!' : goals >= 2 ? 'Gut gemacht!' : 'Nächstes Mal klappt es besser!'}
        </p>
        <div className="flex justify-center gap-2">
          {results.map((r, k) => (
            <span key={k} className="text-3xl">
              {r ? '⚽' : '🧤'}
            </span>
          ))}
        </div>
        <p className="flex items-center justify-center gap-1 text-lg">
          +{goals * GOAL_STARS} <Star size={20} /> für deine Tore
        </p>
        <Btn onClick={onDone}>Zur Kabine</Btn>
      </div>
    )

  const target = aim === null ? SPOT : rebound ? { x: CORNER[aim].x + (aim === 1 ? 0 : aim === 0 ? 8 : -8), y: 46 } : CORNER[aim]

  return (
    <div className="space-y-3">
      <TopBar onBack={onDone} title="Elfmeterschießen" />
      <div className="flex items-center justify-between">
        <div className="font-display text-lg font-extrabold uppercase text-chalk/80">
          Elfer {i + 1} von {shots.length}
        </div>
        <div className="flex gap-1.5" aria-label={`${goals} Tore`}>
          {Array.from({ length: SHOTS }, (_, k) => (
            <span
              key={k}
              className={`h-4 w-4 rounded-full ring-2 ${k < results.length ? (results[k] ? 'bg-lime ring-lime' : 'bg-flag ring-flag') : 'ring-white/30'}`}
            />
          ))}
        </div>
      </div>

      {/* Aufgabe */}
      <div className="text-center min-h-[78px]">
        {shot!.dir === 'de-en' ? (
          <>
            <div className="text-sm text-chalk/70">Wie heißt das auf Englisch?</div>
            <div className="font-display text-4xl font-extrabold leading-tight">{shot!.word.de}</div>
          </>
        ) : (
          <button onClick={() => speak(shot!.word.en)} className="mx-auto flex flex-col items-center gap-1" aria-label="Wort anhören">
            <span className="h-14 w-14 rounded-full bg-chalk text-pitch grid place-items-center">
              <SpeakerIcon size={28} />
            </span>
            <span className="text-sm text-chalk/70">Hör gut zu und schieß auf das richtige Bild!</span>
          </button>
        )}
      </div>

      {/* Spielfeld mit Tor, Torwart und Ball */}
      <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden ring-1 ring-white/10" style={{ background: 'linear-gradient(180deg,#0f4c33 0%,#1a6146 45%,#1f6e4f 100%)' }}>
        {/* Tor */}
        <div
          className="absolute left-[8%] right-[8%] top-[6%] h-[46%] border-[5px] border-b-0 border-chalk rounded-t-md"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,.18) 0 2px, transparent 2px 10px), repeating-linear-gradient(-45deg, rgba(255,255,255,.18) 0 2px, transparent 2px 10px)' }}
        />
        {/* Strafraum und Elfmeterpunkt */}
        <div className="absolute left-[2%] right-[2%] top-[52%] h-px bg-white/40" />
        <div className="absolute left-[24%] right-[24%] top-[52%] h-[26%] border-2 border-t-0 border-white/30" />
        <div className="absolute h-2 w-2 rounded-full bg-white/70" style={{ left: 'calc(50% - 4px)', top: '91%' }} />

        {/* Torwart */}
        <div
          className="absolute w-[18%] transition-transform duration-500 ease-out"
          style={{ left: '41%', top: '20%', transform: keeper === null ? 'none' : KEEPER_DIVE[keeper], transformOrigin: '50% 90%' }}
        >
          <Keeper />
        </div>

        {/* Ball */}
        <div
          className="absolute w-[11%]"
          style={{
            left: `${target.x}%`,
            top: `${target.y}%`,
            transition: aim === null ? 'none' : rebound ? 'all .45s ease-in' : 'all .55s cubic-bezier(.2,.7,.3,1)',
            transform: `translate(-50%,-50%) scale(${aim === null ? 1 : 0.72}) rotate(${aim === null ? 0 : 540}deg)`,
          }}
        >
          <Ball size={40} />
        </div>

        {/* Ergebnis */}
        {phase === 'result' && (
          <div className="absolute inset-x-0 bottom-[6%] text-center animate-pop">
            <span className={`inline-block font-display text-4xl font-extrabold uppercase px-5 py-1.5 rounded-2xl ${results[results.length - 1] ? 'bg-lime text-pitch' : 'bg-flag text-white'}`}>
              {results[results.length - 1] ? 'Tor!' : 'Gehalten!'}
            </span>
          </div>
        )}
      </div>

      {/* Antworten = Ecken */}
      {phase === 'result' ? (
        <div className="space-y-3">
          <div className="text-center">
            {!results[results.length - 1] && <div className="text-sm text-chalk/70">Richtig wäre gewesen:</div>}
            <button onClick={() => speak(shot!.word.en)} className="inline-flex items-center gap-2 font-display text-3xl font-extrabold">
              {shot!.dir === 'image' && shot!.word.image && <WordImage image={shot!.word.image} size={44} />}
              {shot!.word.en} <SpeakerIcon size={22} />
            </button>
            {shot!.dir === 'de-en' && <div className="text-chalk/70">{shot!.word.de}</div>}
          </div>
          <Btn onClick={next}>{i + 1 >= shots.length ? 'Ergebnis' : 'Nächster Elfer'}</Btn>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {shot!.options.map((o, k) => (
            <button
              key={k}
              disabled={phase !== 'aim'}
              onClick={() => shoot(k)}
              className={`rounded-2xl bg-chalk text-pitch shadow-[0_4px_0_#b9b3a3] active:translate-y-[3px] active:shadow-[0_1px_0_#b9b3a3] min-h-[72px] px-1 py-2 flex flex-col items-center justify-center gap-1 ${aim === k ? 'ring-4 ring-lime' : ''}`}
            >
              {shot!.dir === 'image' ? (
                <WordImage image={o} size={52} />
              ) : (
                <span className="font-display text-xl font-extrabold leading-tight break-words">{o}</span>
              )}
              <span className="text-[10px] uppercase tracking-wider opacity-60">{['links', 'Mitte', 'rechts'][k]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Torwart (einfache Figur in Torwartfarben)
function Keeper() {
  return (
    <svg viewBox="0 0 60 80" className="w-full h-auto drop-shadow-[0_4px_4px_rgba(0,0,0,.35)]" aria-hidden>
      <rect x="4" y="22" width="52" height="9" rx="4.5" fill="#ff8a00" />
      <circle cx="5" cy="26.5" r="5.5" fill="#f4f1e8" stroke="#0b3d2a" strokeWidth="1.5" />
      <circle cx="55" cy="26.5" r="5.5" fill="#f4f1e8" stroke="#0b3d2a" strokeWidth="1.5" />
      <rect x="18" y="18" width="24" height="32" rx="6" fill="#ff8a00" stroke="#0b3d2a" strokeWidth="1.5" />
      <text x="30" y="40" textAnchor="middle" fontFamily="Barlow Condensed, sans-serif" fontWeight="800" fontSize="14" fill="#0b3d2a">
        1
      </text>
      <circle cx="30" cy="10" r="8.5" fill="#f2c9a0" stroke="#0b3d2a" strokeWidth="1.5" />
      <rect x="20" y="49" width="9" height="22" rx="3" fill="#0b3d2a" />
      <rect x="31" y="49" width="9" height="22" rx="3" fill="#0b3d2a" />
    </svg>
  )
}
