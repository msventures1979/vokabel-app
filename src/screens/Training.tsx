import { useEffect, useMemo, useRef, useState } from 'react'
import type { Route } from '../App'
import {
  addActiveTime,
  applyReview,
  completeRound,
  dayLog,
  freshWordIds,
  introduceWords,
  plan,
  recordAnswer,
} from '../data/repo'
import type { DayLog, Word } from '../logic/types'
import { buildExtraPractice, buildRound, choiceOptions, newWordSteps, type Step } from '../logic/session'
import { checkAnswer, mainAnswer, type Verdict } from '../logic/answers'
import { MIN_ACTIVE_SECONDS, MIN_ANSWERS, STARS } from '../logic/rewards'
import { useActivityClock } from '../lib/useActivityClock'
import { speak } from '../lib/speech'
import { Btn, Card, Confetti, SpeakerIcon, Star, TopBar } from '../ui/components'

export type TrainingKind = 'round' | 'extra'

interface Feedback {
  verdict: Verdict
  word: Word
  stars: number
}

const stepKey = (s: Step) => `${s.kind}:${s.wordId}:${'dir' in s ? s.dir : ''}`

export function Training({ childId, kind, go }: { childId: string; kind: TrainingKind; go: (r: Route) => void }) {
  const [pool, setPool] = useState<Word[] | null>(null)
  const [queue, setQueue] = useState<Step[]>([])
  const [idx, setIdx] = useState(0)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [mistakes, setMistakes] = useState(0)
  const [earned, setEarned] = useState(0)
  const [done, setDone] = useState<null | { before: DayLog; after: DayLog; perfect: boolean; isRound: boolean }>(null)
  const [quit, setQuit] = useState(false)
  const newIds = useRef<string[]>([])
  const requeued = useRef(new Set<string>())
  const before = useRef<DayLog | null>(null)
  const isRound = useRef(kind === 'round')
  const tick = useActivityClock()

  // Runde zusammenstellen
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const p = await plan(childId)
      before.current = await dayLog(childId)
      let steps: Step[] = []
      if (kind === 'round' && !p.log.roundDone) {
        steps = buildRound(p.dueIds, p.newIds)
        newIds.current = p.newIds
        if (steps.length === 0) {
          // Nichts fällig, keine neuen Wörter: Runde gilt als erledigt, weiter mit freiem Training
          await completeRound(childId, false)
          isRound.current = false
        }
      }
      if (steps.length === 0) {
        isRound.current = false
        const extraNew = Math.min(5, p.extraNewAllowed)
        if (extraNew > 0) {
          newIds.current = await freshWordIds(childId, extraNew)
          steps = newWordSteps(newIds.current)
        } else {
          steps = buildExtraPractice(p.knownIds)
        }
      }
      if (!cancelled) {
        setPool(p.pool)
        setQueue(steps)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [childId, kind])

  const byId = useMemo(() => new Map((pool ?? []).map((w) => [w.id, w])), [pool])
  const step = queue[idx]
  const word = step ? byId.get(step.wordId) : undefined

  const finish = async () => {
    if (newIds.current.length) await introduceWords(childId, newIds.current)
    const perfect = mistakes === 0
    if (isRound.current) await completeRound(childId, perfect)
    const after = await dayLog(childId)
    setDone({ before: before.current!, after, perfect, isRound: isRound.current })
  }

  const next = () => {
    setFeedback(null)
    if (idx + 1 >= queue.length) void finish()
    else setIdx(idx + 1)
  }

  const busy = useRef(false)
  const answer = async (verdict: Verdict, base: number) => {
    if (!step || !word || step.kind === 'intro' || busy.current || feedback) return
    busy.current = true
    const delta = tick()
    const stars = verdict === 'correct' ? base : verdict === 'wrong' ? 0 : STARS.almost
    const logBefore = await dayLog(childId)
    const logAfter = await recordAnswer(childId, delta, stars)
    const gained = logAfter.stars - logBefore.stars
    setEarned((e) => e + gained)

    if (step.phase === 'review' && (verdict === 'correct' || verdict === 'wrong')) {
      await applyReview(childId, word.id, verdict === 'correct')
    }
    if (verdict !== 'correct') {
      setMistakes((m) => m + 1)
      // Einmal nachholen, als Übung ohne Fachwechsel
      const retry: Step = step.phase === 'review' ? { kind: 'choice', wordId: word.id, dir: 'de-en', phase: 'practice' } : { ...step }
      if (!requeued.current.has(stepKey(retry))) {
        requeued.current.add(stepKey(retry))
        setQueue((q) => [...q, retry])
      }
    }
    setFeedback({ verdict, word, stars: gained })
    busy.current = false
  }

  if (done) return <Summary done={done} earned={earned} onHome={() => go({ name: 'home', childId })} onMore={() => go({ name: 'train', childId, kind: 'extra' })} />
  if (!pool || !step || !word) {
    return (
      <div>
        <TopBar onBack={() => go({ name: 'home', childId })} title="Training" />
        {pool && queue.length === 0 && <p className="mt-8 text-center text-chalk/80">Gerade gibt es nichts zu üben.</p>}
      </div>
    )
  }

  const pct = (idx / queue.length) * 100

  return (
    <div className="flex flex-col min-h-[calc(100dvh-24px)]">
      <TopBar
        onBack={() => setQuit(true)}
        title={step.kind === 'intro' ? 'Neues Wort' : step.phase === 'review' ? 'Aufwärmen' : isRound.current ? 'Training' : 'Extra-Training'}
        right={
          <span className="flex items-center gap-1 font-display text-xl font-extrabold">
            <Star /> +{earned}
          </span>
        }
      />
      <div className="h-2 rounded-full bg-black/30 overflow-hidden mt-1">
        <div className="h-full bg-lime transition-all" style={{ width: `${pct}%` }} />
      </div>

      <div className="flex-1 flex flex-col justify-center py-6" key={idx}>
        {step.kind === 'intro' && (
          <IntroCard
            word={word}
            onNext={() => {
              void addActiveTime(childId, tick())
              next()
            }}
          />
        )}
        {step.kind === 'choice' && (
          <ChoiceStep word={word} pool={pool} dir={step.dir} locked={!!feedback} onAnswer={(ok) => answer(ok ? 'correct' : 'wrong', STARS.choice)} />
        )}
        {step.kind === 'type' && <TypeStep word={word} locked={!!feedback} onAnswer={(v) => answer(v, STARS.typed)} />}
        {step.kind === 'flash' && <FlashStep word={word} locked={!!feedback} onAnswer={(ok) => answer(ok ? 'correct' : 'wrong', STARS.flashcard)} />}
      </div>

      {feedback && <FeedbackSheet fb={feedback} onNext={next} />}
      {quit && (
        <div className="fixed inset-0 z-40 bg-black/60 grid place-items-end">
          <div className="w-full max-w-xl mx-auto bg-pitch-2 rounded-t-3xl p-5 space-y-3 animate-rise">
            <div className="font-display text-2xl font-extrabold uppercase">Training unterbrechen?</div>
            <p className="text-chalk/75">Deine Antworten und Spielminuten bleiben gespeichert. Neue Wörter zählen erst, wenn du die Runde fertig spielst.</p>
            <div className="grid grid-cols-2 gap-3">
              <Btn variant="ghost" size="md" onClick={() => setQuit(false)}>
                Weiterspielen
              </Btn>
              <Btn variant="chalk" size="md" onClick={() => go({ name: 'home', childId })}>
                Zur Kabine
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SpeakBtn({ text, className = '' }: { text: string; className?: string }) {
  return (
    <button
      onClick={() => speak(text)}
      className={`h-12 w-12 grid place-items-center rounded-full bg-chalk text-pitch shadow active:scale-95 ${className}`}
      aria-label="Vorlesen"
    >
      <SpeakerIcon />
    </button>
  )
}

function Cloze({ text }: { text: string }) {
  const [a, b] = text.split('___')
  return (
    <p className="text-lg text-chalk/85">
      {a}
      <span className="inline-block min-w-16 border-b-2 border-lime mx-1 align-baseline">&nbsp;</span>
      {b}
    </p>
  )
}

function IntroCard({ word, onNext }: { word: Word; onNext: () => void }) {
  useEffect(() => {
    const t = setTimeout(() => speak(word.en), 300)
    return () => clearTimeout(t)
  }, [word])
  return (
    <div className="space-y-4 animate-rise">
      <div className="rounded-3xl text-center py-8 px-4 bg-chalk text-pitch">
        <div className="text-sm uppercase tracking-widest text-pitch/60">Englisch</div>
        <div className="font-display text-5xl font-extrabold mt-1 break-words">{word.en}</div>
        {word.ipa && <div className="text-pitch/60 mt-1">[{word.ipa}]</div>}
        <div className="flex justify-center mt-4">
          <SpeakBtn text={word.en} className="!bg-pitch !text-chalk" />
        </div>
        <div className="h-px bg-pitch/15 my-5" />
        <div className="text-sm uppercase tracking-widest text-pitch/60">Deutsch</div>
        <div className="font-display text-3xl font-semibold mt-1">{word.de}</div>
      </div>
      {word.example && (
        <button onClick={() => speak(word.example!.replace('(*)', ''))} className="w-full text-left">
          <Card className="flex items-center gap-3">
            <SpeakerIcon size={18} />
            <span className="italic">{word.example.replace(' (*)', '')}</span>
          </Card>
        </button>
      )}
      {word.note && <p className="text-center text-gold">{word.note}</p>}
      <Btn className="w-full" onClick={onNext}>
        Verstanden
      </Btn>
    </div>
  )
}

function ChoiceStep({
  word,
  pool,
  dir,
  locked,
  onAnswer,
}: {
  word: Word
  pool: Word[]
  dir: 'en-de' | 'de-en'
  locked: boolean
  onAnswer: (ok: boolean) => void
}) {
  const options = useMemo(() => choiceOptions(word, pool, dir), [word, pool, dir])
  const correct = dir === 'en-de' ? word.de : mainAnswer(word)
  const [picked, setPicked] = useState<string | null>(null)
  useEffect(() => {
    if (dir === 'en-de') speak(word.en)
  }, [word, dir])

  return (
    <div className="space-y-5 animate-rise">
      <div className="text-center">
        <div className="text-sm uppercase tracking-widest text-chalk/60">{dir === 'en-de' ? 'Was heißt das auf Deutsch?' : 'Was heißt das auf Englisch?'}</div>
        <div className="font-display text-4xl font-extrabold mt-2 break-words">{dir === 'en-de' ? word.en : word.de}</div>
        {dir === 'en-de' && (
          <div className="flex justify-center mt-3">
            <SpeakBtn text={word.en} />
          </div>
        )}
        {dir === 'de-en' && word.cloze && (
          <div className="mt-3">
            <Cloze text={word.cloze} />
          </div>
        )}
      </div>
      <div className="grid gap-3">
        {options.map((o) => {
          const state =
            picked === null
              ? 'bg-pitch-2 ring-1 ring-white/15'
              : o === correct
                ? 'bg-lime text-pitch ring-2 ring-lime'
                : o === picked
                  ? 'bg-flag text-white animate-shake'
                  : 'bg-pitch-2 opacity-40'
          return (
            <button
              key={o}
              disabled={locked}
              onClick={() => {
                setPicked(o)
                onAnswer(o === correct)
              }}
              className={`rounded-2xl px-4 py-4 text-left text-lg font-semibold transition active:scale-[0.99] ${state}`}
            >
              {o}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TypeStep({ word, locked, onAnswer }: { word: Word; locked: boolean; onAnswer: (v: Verdict) => void }) {
  const [value, setValue] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    ref.current?.focus()
  }, [])
  const submit = () => {
    if (!value.trim() || locked) return
    onAnswer(checkAnswer(word, value))
  }
  return (
    <div className="space-y-5 animate-rise">
      <div className="text-center">
        <div className="text-sm uppercase tracking-widest text-chalk/60">Schreib es auf Englisch</div>
        <div className="font-display text-4xl font-extrabold mt-2 break-words">{word.de}</div>
        {word.cloze && (
          <div className="mt-3">
            <Cloze text={word.cloze} />
          </div>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="space-y-3"
      >
        <input
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={locked}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="done"
          placeholder="englisches Wort"
          className="w-full rounded-2xl bg-chalk text-pitch px-4 py-4 text-3xl font-display font-extrabold text-center outline-none ring-4 ring-transparent focus:ring-lime placeholder:text-pitch/30 placeholder:font-semibold"
        />
        <Btn className="w-full" type="submit" disabled={!value.trim() || locked}>
          Schießen!
        </Btn>
      </form>
    </div>
  )
}

function FlashStep({ word, locked, onAnswer }: { word: Word; locked: boolean; onAnswer: (ok: boolean) => void }) {
  const [flipped, setFlipped] = useState(false)
  return (
    <div className="space-y-5 animate-rise">
      <div className="text-center text-sm uppercase tracking-widest text-chalk/60">Weißt du es? Dann dreh die Karte um.</div>
      <button
        onClick={() => {
          setFlipped(true)
          speak(word.en)
        }}
        disabled={flipped}
        className="w-full rounded-3xl bg-chalk text-pitch py-12 px-4 text-center"
      >
        <div className="font-display text-4xl font-extrabold break-words">{word.de}</div>
        {flipped ? (
          <div className="mt-4 animate-pop">
            <div className="font-display text-5xl font-extrabold text-pitch-3 break-words">{word.en}</div>
            {word.ipa && <div className="text-pitch/60">[{word.ipa}]</div>}
          </div>
        ) : (
          <div className="mt-4 text-pitch/50">Tippen zum Umdrehen</div>
        )}
      </button>
      {flipped && (
        <div className="grid grid-cols-2 gap-3">
          <Btn variant="ghost" size="md" disabled={locked} onClick={() => onAnswer(false)}>
            Nochmal üben
          </Btn>
          <Btn size="md" disabled={locked} onClick={() => onAnswer(true)}>
            Gewusst
          </Btn>
        </div>
      )}
    </div>
  )
}

function FeedbackSheet({ fb, onNext }: { fb: Feedback; onNext: () => void }) {
  const btn = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    btn.current?.focus()
    if (fb.verdict !== 'correct') speak(fb.word.en)
  }, [fb])
  const look = {
    correct: { title: ['Treffer!', 'Tor!', 'Klasse!', 'Volltreffer!'][Math.floor(Math.random() * 4)], cls: 'bg-lime text-pitch' },
    almost: { title: 'Knapp am Pfosten!', cls: 'bg-gold text-pitch' },
    case: { title: 'Fast! Achte auf die Großschreibung.', cls: 'bg-gold text-pitch' },
    wrong: { title: 'Daneben!', cls: 'bg-flag text-white' },
  }[fb.verdict]
  return (
    <div className={`fixed inset-x-0 bottom-0 z-30 animate-rise ${look.cls}`}>
      <div className="max-w-xl mx-auto px-5 pt-5 pb-[max(20px,env(safe-area-inset-bottom))] space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-display text-3xl font-extrabold uppercase">{look.title}</div>
          {fb.stars > 0 && (
            <span className="flex items-center gap-1 font-display text-2xl font-extrabold animate-pop">
              +{fb.stars} <Star size={22} />
            </span>
          )}
        </div>
        {fb.verdict !== 'correct' && (
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="text-sm opacity-75">Richtig ist:</div>
              <div className="font-display text-3xl font-extrabold">
                {mainAnswer(fb.word)} <span className="opacity-70 text-xl">= {fb.word.de}</span>
              </div>
            </div>
            <button onClick={() => speak(fb.word.en)} className="h-11 w-11 grid place-items-center rounded-full bg-black/15" aria-label="Vorlesen">
              <SpeakerIcon />
            </button>
          </div>
        )}
        {fb.verdict !== 'correct' && fb.word.note && <div className="text-sm opacity-80">{fb.word.note}</div>}
        <button
          ref={btn}
          onClick={onNext}
          className="w-full rounded-2xl bg-pitch text-chalk font-display font-extrabold uppercase text-2xl py-4 active:scale-[0.99]"
        >
          Weiter
        </button>
      </div>
    </div>
  )
}

function Summary({
  done,
  earned,
  onHome,
  onMore,
}: {
  done: { before: DayLog; after: DayLog; perfect: boolean; isRound: boolean }
  earned: number
  onHome: () => void
  onMore: () => void
}) {
  const { after, before, perfect, isRound } = done
  const newTrainingDay = after.trainingDay && !before.trainingDay
  const minutes = Math.floor(after.activeSeconds / 60)
  const missingMin = Math.max(0, Math.ceil((MIN_ACTIVE_SECONDS - after.activeSeconds) / 60))
  const missingAns = Math.max(0, MIN_ANSWERS - after.answers)
  return (
    <div className="pt-8 space-y-5 text-center">
      {(perfect || newTrainingDay) && <Confetti />}
      <div className="font-display uppercase tracking-[0.3em] text-lime">Abpfiff</div>
      <h1 className="font-display text-6xl font-extrabold uppercase leading-none animate-pop">
        {newTrainingDay ? 'Trainingstag!' : perfect ? 'Tor!' : 'Gut gespielt!'}
      </h1>
      {perfect && isRound && <p className="text-gold">Fehlerfreie Runde: Bonus-Sterne!</p>}
      <Card className="grid grid-cols-3 gap-2">
        <div>
          <div className="font-display text-4xl font-extrabold flex items-center justify-center gap-1">
            {earned} <Star size={24} />
          </div>
          <div className="text-xs text-chalk/60">Sterne</div>
        </div>
        <div>
          <div className="font-display text-4xl font-extrabold">{minutes}</div>
          <div className="text-xs text-chalk/60">Minuten heute</div>
        </div>
        <div>
          <div className="font-display text-4xl font-extrabold">{after.answers}</div>
          <div className="text-xs text-chalk/60">Antworten heute</div>
        </div>
      </Card>
      {newTrainingDay ? (
        <p className="text-lg">Der Ball rollt einen Schritt näher ans Tor!</p>
      ) : after.trainingDay ? (
        <p className="text-chalk/80">Dein Trainingstag ist schon gesichert. Jetzt gibt es Sterne für deine Karriere.</p>
      ) : (
        <p className="text-chalk/80">
          Bis zum Trainingstag fehlen noch {[missingMin > 0 && `${missingMin} Minuten`, missingAns > 0 && `${missingAns} Antworten`].filter(Boolean).join(' und ')}
          {!after.roundDone && ' und die Tagesrunde'}.
        </p>
      )}
      <div className="grid gap-3 pt-2">
        <Btn onClick={onMore}>Extra-Training</Btn>
        <Btn variant="ghost" size="md" onClick={onHome}>
          Zur Kabine
        </Btn>
      </div>
    </div>
  )
}
