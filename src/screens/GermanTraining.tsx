import { useEffect, useRef, useState } from 'react'
import type { Route } from '../App'
import { childRules, completeRound, dayLog, germanData, germanResult, recordAnswer } from '../data/repo'
import { shuffle } from '../logic/session'
import { buildGermanRound, lettersFor, type GermanStep, type Tile } from '../logic/germanSession'
import { today } from '../logic/dates'
import type { DayLog, Word } from '../logic/types'
import { DEFAULT_RULES, type DayRules } from '../logic/rewards'
import { speakDe } from '../lib/speech'
import { play } from '../lib/sounds'
import { useActivityClock } from '../lib/useActivityClock'
import { Btn, SpeakerIcon, TopBar } from '../ui/components'
import { Summary } from './Training'
import { Penalty } from './Penalty'

const STARS_SCHREIBEN = 10
const STARS_SILBEN = 5
const STARS_LESEN = 2

export function GermanTraining({ childId, go }: { childId: string; go: (r: Route) => void }) {
  const [steps, setSteps] = useState<GermanStep[] | null>(null)
  const [idx, setIdx] = useState(0)
  const [earned, setEarned] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [done, setDone] = useState<null | { before: DayLog; after: DayLog; perfect: boolean; isRound: boolean; rules: DayRules }>(null)
  const [penalty, setPenalty] = useState(false)
  const [round, setRound] = useState(0)
  const before = useRef<DayLog | null>(null)
  const rules = useRef<DayRules>(DEFAULT_RULES)
  const tick = useActivityClock()

  useEffect(() => {
    ;(async () => {
      const { pool, lists, progress } = await germanData(childId)
      before.current = await dayLog(childId)
      rules.current = await childRules(childId)
      setSteps(buildGermanRound(pool, lists, progress, today()))
      setIdx(0)
      setEarned(0)
      setMistakes(0)
      setDone(null)
    })()
  }, [childId, round])

  const answer = async (stars: number, correct: boolean, wordId?: string) => {
    if (!correct) setMistakes((m) => m + 1)
    if (wordId) await germanResult(childId, wordId, correct)
    const after = await recordAnswer(childId, tick(), stars)
    setEarned((e) => e + (after ? stars : 0))
  }

  const next = async () => {
    if (!steps) return
    if (idx + 1 < steps.length) return setIdx(idx + 1)
    const perfect = mistakes === 0
    const after = await completeRound(childId, perfect)
    setDone({ before: before.current!, after, perfect, isRound: true, rules: rules.current })
  }

  if (penalty) return <Penalty childId={childId} subject="de" onDone={() => go({ name: 'home', childId })} />
  if (done)
    return (
      <Summary
        lang="de"
        childId={childId}
        done={done}
        earned={earned}
        onHome={() => go({ name: 'home', childId })}
        onMore={() => setRound((r) => r + 1)}
        onPenalty={() => setPenalty(true)}
        moreLabel="Nochmal Deutsch"
      />
    )
  if (!steps) return null
  if (steps.length === 0)
    return (
      <div className="space-y-4">
        <TopBar onBack={() => go({ name: 'home', childId })} title="Deutsch" />
        <p className="text-center text-chalk/80 mt-8">Noch keine Lernwörter. Deine Eltern fotografieren bald dein Lernwörterblatt.</p>
      </div>
    )

  const step = steps[idx]
  return (
    <div className="space-y-4">
      <TopBar onBack={() => go({ name: 'home', childId })} title="Deutsch" />
      <div className="h-2 rounded-full bg-black/30 overflow-hidden">
        <div className="h-full bg-lime rounded-full transition-all" style={{ width: `${(idx / steps.length) * 100}%` }} />
      </div>
      {step.kind === 'blume' && <BlumeStep key={idx} end={step.end} petals={step.petals} onDone={(ok) => answer(ok ? STARS_SILBEN : 0, ok)} onNext={next} />}
      {step.kind === 'reim' && (
        <ReimStep key={idx} word={step.word} options={step.options} correct={step.correct} onDone={(ok) => answer(ok ? STARS_SILBEN : 0, ok)} onNext={next} />
      )}
      {step.kind === 'silben' && <SilbenStep key={idx} word={step.word} onDone={(ok) => answer(ok ? STARS_SILBEN : 0, ok)} onNext={next} />}
      {step.kind === 'schreiben' && (
        <SchreibenStep key={idx} word={step.word} onDone={(errors) => answer(errors === 0 ? STARS_SCHREIBEN : errors === 1 ? 3 : 0, errors === 0, step.word.id)} onNext={next} />
      )}
      {step.kind === 'rakete' && <RaketeStep key={idx} words={step.words} onWord={() => answer(STARS_LESEN, true)} onNext={next} />}
    </div>
  )
}

// ---------- Silben-Blume (Reime) ----------

function BlumeStep({
  end,
  petals,
  onDone,
  onNext,
}: {
  end: string
  petals: { front: string; real: boolean }[]
  onDone: (ok: boolean) => void
  onNext: () => void
}) {
  const [found, setFound] = useState<string[]>([])
  const [wrong, setWrong] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [errors, setErrors] = useState(0)
  const realCount = petals.filter((p) => p.real).length
  const finished = found.length === realCount
  const n = petals.length

  const tap = (p: { front: string; real: boolean }) => {
    if (finished || found.includes(p.front)) return
    if (p.real) {
      play('tap')
      speakDe(p.front + end)
      setMsg('')
      const f = [...found, p.front]
      setFound(f)
      if (f.length === realCount) {
        setTimeout(() => play('correct'), 700)
        onDone(errors === 0)
      }
    } else {
      setErrors((e) => e + 1)
      setWrong(p.front)
      play('wrong')
      setMsg(`„${p.front}${end}“ gibt es nicht. Das ist das Scherz-Blatt!`)
      setTimeout(() => setWrong(null), 600)
    }
  }

  return (
    <div className="space-y-4 text-center animate-rise">
      <div className="text-sm uppercase tracking-widest text-chalk/60">Silben-Blume</div>
      <div className="text-chalk/80">Tippe die Blätter an, die mit „{end}“ ein Wort ergeben. Ein Blatt ist ein Scherz!</div>
      <div className="relative mx-auto h-64 w-64">
        {petals.map((p, i) => {
          const angle = (i / n) * Math.PI * 2 - Math.PI / 2
          const x = 50 + Math.cos(angle) * 34
          const y = 50 + Math.sin(angle) * 34
          const ok = found.includes(p.front)
          return (
            <button
              key={p.front}
              onClick={() => tap(p)}
              className={`absolute -translate-x-1/2 -translate-y-1/2 h-20 w-20 rounded-full font-display text-2xl font-extrabold shadow-[0_3px_0_rgba(0,0,0,.25)] transition ${
                ok ? 'bg-lime text-pitch' : wrong === p.front ? 'bg-flag text-white animate-shake' : 'bg-[#f9a8d4] text-pitch'
              }`}
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              {p.front}
            </button>
          )
        })}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-20 w-20 rounded-full bg-gold text-pitch grid place-items-center font-display text-3xl font-extrabold ring-4 ring-[#f59e0b]">
          {end}
        </div>
      </div>
      <div className="min-h-[56px] space-y-1">
        <div className="flex flex-wrap justify-center gap-2">
          {found.map((f) => (
            <button key={f} onClick={() => speakDe(f + end)} className="rounded-xl bg-chalk text-pitch px-3 py-1 font-display text-2xl font-extrabold">
              {f}
              <span className="text-[#d97706]">{end}</span>
            </button>
          ))}
        </div>
        {msg && <div className="text-gold text-sm font-semibold">{msg}</div>}
      </div>
      {finished && (
        <div className="space-y-3 animate-pop">
          <div className="font-display text-3xl font-extrabold uppercase text-lime">Alle Reime gefunden!</div>
          <Btn onClick={onNext}>Weiter</Btn>
        </div>
      )}
    </div>
  )
}

// ---------- Reimpaar finden ----------

function ReimStep({ word, options, correct, onDone, onNext }: { word: string; options: string[]; correct: string; onDone: (ok: boolean) => void; onNext: () => void }) {
  const [picked, setPicked] = useState<string | null>(null)
  const [wrong, setWrong] = useState<string[]>([])
  const done = picked === correct

  useEffect(() => {
    const t = setTimeout(() => speakDe(word), 300)
    return () => clearTimeout(t)
  }, [word])

  const pick = (o: string) => {
    if (done) return
    speakDe(o)
    if (o === correct) {
      setPicked(o)
      setTimeout(() => play('correct'), 500)
      onDone(wrong.length === 0)
    } else {
      setWrong((w) => [...w, o])
      setTimeout(() => play('wrong'), 450)
    }
  }

  return (
    <div className="space-y-5 text-center animate-rise">
      <div className="text-sm uppercase tracking-widest text-chalk/60">Reimwort finden</div>
      <div className="text-chalk/80">Was reimt sich auf …</div>
      <button onClick={() => speakDe(word)} className="mx-auto flex items-center gap-3 rounded-2xl bg-chalk text-pitch px-5 py-3">
        <SpeakerIcon size={26} />
        <span className="font-display text-4xl font-extrabold">{word}</span>
      </button>
      <div className="grid gap-3">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => pick(o)}
            disabled={wrong.includes(o) || done}
            className={`rounded-2xl px-4 py-4 font-display text-3xl font-extrabold transition ${
              picked === o ? 'bg-lime text-pitch animate-pop' : wrong.includes(o) ? 'bg-black/30 text-chalk/30 line-through' : 'bg-white/10 ring-1 ring-white/20'
            }`}
          >
            {o}
          </button>
        ))}
      </div>
      <div className="text-xs text-chalk/60">Tipp: Antippen liest das Wort vor.</div>
      {done && (
        <div className="space-y-3 animate-pop">
          <div className="font-display text-3xl font-extrabold uppercase text-lime">
            {word} – {correct}. Reimt sich!
          </div>
          <Btn onClick={onNext}>Weiter</Btn>
        </div>
      )}
    </div>
  )
}

// ---------- Silben-Bögen ----------

function SilbenStep({ word, onDone, onNext }: { word: Word; onDone: (ok: boolean) => void; onNext: () => void }) {
  const syl = word.syllables ?? [word.en]
  const [order] = useState(() => shuffleIdx(syl.length))
  const [placed, setPlaced] = useState<number[]>([])
  const [wrong, setWrong] = useState<number | null>(null)
  const [errors, setErrors] = useState(0)
  const finished = placed.length === syl.length

  useEffect(() => {
    const t = setTimeout(() => speakDe(word.en), 300)
    return () => clearTimeout(t)
  }, [word])

  const tap = (i: number) => {
    if (finished || placed.includes(i)) return
    if (i === placed.length) {
      play('tap')
      const p = [...placed, i]
      setPlaced(p)
      if (p.length === syl.length) {
        play('correct')
        speakDe(word.en, syl)
        onDone(errors === 0)
      }
    } else {
      setErrors((e) => e + 1)
      setWrong(i)
      play('wrong')
      setTimeout(() => setWrong(null), 450)
    }
  }

  return (
    <div className="space-y-6 text-center animate-rise" data-word={word.en} data-syl={JSON.stringify(syl)}>
      <div className="text-sm uppercase tracking-widest text-chalk/60">Silben-Bögen</div>
      <div className="text-chalk/80">Tippe die Silben in der richtigen Reihenfolge!</div>
      <button onClick={() => speakDe(word.en)} className="mx-auto flex items-center gap-2 rounded-full bg-chalk text-pitch px-4 py-2 font-semibold">
        <SpeakerIcon size={20} /> Anhören
      </button>

      {/* Ergebnis mit Bögen */}
      <div className="flex justify-center items-end gap-1 min-h-[96px]">
        {syl.map((s, i) => (
          <div key={i} className="flex flex-col items-center">
            <span className={`font-display text-5xl font-extrabold ${i < placed.length ? '' : 'opacity-15'}`}>{i < placed.length ? s : '_'.repeat(Math.max(2, s.length))}</span>
            <svg width={Math.max(40, s.length * 26)} height="18" viewBox="0 0 100 18" preserveAspectRatio="none" className={i < placed.length ? 'text-gold' : 'text-white/15'}>
              <path d="M4 2 Q50 30 96 2" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
            </svg>
          </div>
        ))}
      </div>

      {!finished ? (
        <div className="flex flex-wrap justify-center gap-3">
          {order.map((i) => (
            <button
              key={i}
              onClick={() => tap(i)}
              disabled={placed.includes(i)}
              className={`rounded-2xl bg-chalk text-pitch px-5 py-3 font-display text-3xl font-extrabold shadow-[0_4px_0_#b9b3a3] disabled:opacity-20 ${wrong === i ? 'animate-shake bg-flag text-white' : ''}`}
            >
              {syl[i]}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-3 animate-pop">
          <div className="font-display text-3xl font-extrabold uppercase text-lime">{errors === 0 ? 'Super!' : 'Geschafft!'}</div>
          <Btn onClick={onNext}>Weiter</Btn>
        </div>
      )}
    </div>
  )
}

// ---------- Hören und Schreiben (Buchstaben-Kärtchen) ----------

function SchreibenStep({ word, onDone, onNext }: { word: Word; onDone: (errors: number) => void; onNext: () => void }) {
  const target = [...word.en]
  const [tiles] = useState<Tile[]>(() => lettersFor(word.en))
  const [used, setUsed] = useState<number[]>([])
  const [wrong, setWrong] = useState<number | null>(null)
  const [errors, setErrors] = useState(0)
  const [hint, setHint] = useState('')
  const finished = used.length === target.length

  useEffect(() => {
    const t = setTimeout(() => speakDe(word.en), 300)
    return () => clearTimeout(t)
  }, [word])

  const tap = (t: Tile) => {
    if (finished || used.includes(t.id)) return
    const expected = target[used.length]
    if (t.ch === expected) {
      play('tap')
      const u = [...used, t.id]
      setUsed(u)
      setHint('')
      if (u.length === target.length) {
        play(errors === 0 ? 'correct' : 'almost')
        speakDe(word.en)
        onDone(errors)
      }
    } else {
      setErrors((e) => e + 1)
      setWrong(t.id)
      play('wrong')
      setHint(t.ch.toLowerCase() === expected.toLowerCase() ? (expected === expected.toUpperCase() ? 'Achtung: hier groß!' : 'Achtung: hier klein!') : '')
      setTimeout(() => setWrong(null), 450)
    }
  }

  return (
    <div className="space-y-5 text-center animate-rise" data-word={word.en}>
      <div className="text-sm uppercase tracking-widest text-chalk/60">Hören und Schreiben</div>
      <button onClick={() => speakDe(word.en)} className="mx-auto flex flex-col items-center gap-1" aria-label="Wort anhören">
        <span className="h-16 w-16 rounded-full bg-chalk text-pitch grid place-items-center">
          <SpeakerIcon size={32} />
        </span>
        <span className="text-sm text-chalk/70">Hör gut zu und leg das Wort!</span>
      </button>

      {/* Schreiblinie */}
      <div className="flex justify-center flex-wrap gap-1.5">
        {target.map((c, i) => (
          <div key={i} className="w-10 h-14 border-b-4 border-chalk/60 grid place-items-end justify-center pb-1">
            <span className={`font-display text-4xl font-extrabold ${i < used.length ? 'text-chalk' : 'text-transparent'}`}>{c}</span>
          </div>
        ))}
      </div>
      <div className="h-5 text-gold font-semibold">{hint}</div>

      {!finished ? (
        <div className="grid grid-cols-5 gap-2 max-w-sm mx-auto">
          {tiles.map((t) => (
            <button
              key={t.id}
              onClick={() => tap(t)}
              disabled={used.includes(t.id)}
              className={`aspect-square rounded-xl bg-chalk text-pitch font-display text-3xl font-extrabold shadow-[0_3px_0_#b9b3a3] disabled:opacity-15 ${wrong === t.id ? 'animate-shake !bg-flag !text-white' : ''}`}
            >
              {t.ch}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-3 animate-pop">
          <div className="font-display text-3xl font-extrabold uppercase text-lime">{errors === 0 ? 'Fehlerfrei!' : 'Geschafft!'}</div>
          <Btn onClick={onNext}>Weiter</Btn>
        </div>
      )}
    </div>
  )
}

// ---------- Leserakete ----------

function RaketeStep({ words, onWord, onNext }: { words: Word[]; onWord: () => void; onNext: () => void }) {
  const [i, setI] = useState(0)
  const [launched, setLaunched] = useState(false)
  const pct = words.length ? i / words.length : 1
  const read = () => {
    onWord()
    play('tap')
    if (i + 1 >= words.length) {
      setI(words.length)
      setLaunched(true)
      play('card')
    } else setI(i + 1)
  }
  return (
    <div className="space-y-5 text-center animate-rise">
      <div className="text-sm uppercase tracking-widest text-chalk/60">Leserakete</div>
      <div className="relative h-64 rounded-3xl overflow-hidden ring-1 ring-white/10" style={{ background: 'linear-gradient(180deg,#0b1d3a 0%,#123a5c 60%,#1a6146 100%)' }}>
        {[12, 30, 55, 72, 88].map((x, k) => (
          <span key={k} className="absolute text-xs text-white/60" style={{ left: `${x}%`, top: `${8 + ((k * 23) % 50)}%` }}>
            ✦
          </span>
        ))}
        <div
          className="absolute left-1/2 text-6xl transition-all duration-700"
          style={{ bottom: launched ? '130%' : `${6 + pct * 60}%`, transform: 'translateX(-50%) rotate(-45deg)' }}
          aria-hidden
        >
          🚀
        </div>
        {!launched && (
          <div className="absolute inset-x-0 top-6 font-display text-5xl font-extrabold text-chalk drop-shadow-[0_2px_6px_rgba(0,0,0,.6)]">{words[i]?.en}</div>
        )}
        {launched && <div className="absolute inset-0 grid place-items-center font-display text-4xl font-extrabold uppercase text-lime animate-pop">Abgehoben!</div>}
      </div>
      {!launched ? (
        <>
          <div className="text-chalk/70">Lies das Wort laut vor! ({i + 1} von {words.length})</div>
          <div className="grid grid-cols-2 gap-3">
            <Btn variant="ghost" size="md" onClick={() => speakDe(words[i].en)}>
              🔊 Anhören
            </Btn>
            <Btn size="md" onClick={read}>
              Gelesen!
            </Btn>
          </div>
        </>
      ) : (
        <Btn onClick={onNext}>Fertig</Btn>
      )}
    </div>
  )
}

function shuffleIdx(n: number): number[] {
  const a = shuffle(Array.from({ length: n }, (_, i) => i))
  // nie schon in der richtigen Reihenfolge anzeigen
  if (n > 1 && a.every((v, i) => v === i)) a.reverse()
  return a
}
