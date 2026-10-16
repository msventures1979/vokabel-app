import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import { activeGoal, plan, totalStars, trainingDates } from '../data/repo'
import { SyncBadge } from '../ui/SyncBadge'
import type { Route } from '../App'
import { today } from '../logic/dates'
import { goalProgress, levelFor, rulesFor, streak } from '../logic/rewards'
import { Btn, Card, FlameIcon, GoalTrack, Jersey, Meter, Star, TopBar } from '../ui/components'

export function Home({ childId, go }: { childId: string; go: (r: Route) => void }) {
  const data = useLiveQuery(async () => {
    const child = await db.children.get(childId)
    if (!child) return null
    const [p, stars, goal, dates] = await Promise.all([plan(childId), totalStars(childId), activeGoal(childId), trainingDates(childId)])
    return { child, p, stars, goal, dates }
  }, [childId])

  useEffect(() => {
    if (data === null) go({ name: 'pick' })
    else if (data && !data.child.player) go({ name: 'setup', childId })
  }, [data, childId, go])

  if (!data || !data.child.player) return null
  const { child, p, stars, goal, dates } = data
  const player = child.player!

  const lvl = levelFor(stars)
  const s = streak(dates, today())
  const log = p.log
  const minutes = log.activeSeconds / 60
  const noWords = p.pool.length === 0
  const gp = goal ? goalProgress(goal, dates) : 0
  const rules = rulesFor(child)
  const minMin = rules.minSeconds / 60

  return (
    <div className="space-y-4">
      <TopBar
        onBack={() => go({ name: 'pick' })}
        title="Kabine"
        right={
          <div className="flex items-center gap-3 font-display text-xl font-extrabold">
            <SyncBadge />
            <span className="flex items-center gap-1" title="Serie">
              <FlameIcon /> {s.days}
            </span>
            <span className="flex items-center gap-1" title="Sterne">
              <Star /> {stars}
            </span>
          </div>
        }
      />

      <Card className="flex items-center gap-4">
        <button onClick={() => go({ name: 'setup', childId })} aria-label="Spieler ändern">
          <Jersey color={player.color} number={player.number} size={92} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-display text-3xl font-extrabold uppercase truncate">{player.name}</div>
          <div className="text-lime font-display text-xl font-semibold uppercase">{lvl.name}</div>
          {lvl.next && (
            <div className="mt-2">
              <div className="h-2 rounded-full bg-black/30 overflow-hidden">
                <div className="h-full bg-gold rounded-full" style={{ width: `${lvl.progress * 100}%` }} />
              </div>
              <div className="text-xs text-chalk/60 mt-1">
                noch {lvl.starsToNext} Sterne bis {lvl.next}
              </div>
            </div>
          )}
        </div>
      </Card>

      {noWords ? (
        <Card>
          <div className="font-display text-2xl font-extrabold uppercase">Noch keine Wörter</div>
          <p className="text-chalk/75 mt-1">Deine Eltern stellen bald deine Vokabeln ein. Dann geht das Training los.</p>
        </Card>
      ) : (
        <Card className="space-y-4">
          <div className="flex items-baseline justify-between">
            <div className="font-display text-2xl font-extrabold uppercase">Heutiges Training</div>
            {log.trainingDay && <span className="font-display text-lime font-extrabold uppercase">Geschafft!</span>}
          </div>
          {!log.roundDone && (
            <p className="text-chalk/80">
              {p.dueIds.length > 0 && <>Aufwärmen: {p.dueIds.length} {p.dueIds.length === 1 ? 'Wort' : 'Wörter'}. </>}
              {p.newIds.length > 0 && <>Neu: {p.newIds.length} Wörter.</>}
              {p.dueIds.length === 0 && p.newIds.length === 0 && <>Alle Wörter sitzen. Heute gibt es freies Training.</>}
            </p>
          )}
          <Meter label="Spielminuten" value={minutes} max={minMin} done={minutes >= minMin} />
          <Meter label="Ballkontakte (Antworten)" value={log.answers} max={rules.minAnswers} done={log.answers >= rules.minAnswers} />
          {!log.roundDone ? (
            <Btn className="w-full" onClick={() => go({ name: 'train', childId, kind: 'round' })}>
              Training starten
            </Btn>
          ) : (
            <>
              {!log.trainingDay && (
                <p className="text-sm text-chalk/75">
                  Runde geschafft! Für den Trainingstag fehlen noch{' '}
                  {[
                    minutes < minMin && `${Math.ceil(minMin - minutes)} Minuten`,
                    log.answers < rules.minAnswers && `${rules.minAnswers - log.answers} Antworten`,
                  ]
                    .filter(Boolean)
                    .join(' und ')}
                  . Weiter im Extra-Training!
                </p>
              )}
              <Btn
                className="w-full"
                variant={log.trainingDay ? 'chalk' : 'primary'}
                onClick={() => go({ name: 'train', childId, kind: 'extra' })}
              >
                Extra-Training
              </Btn>
            </>
          )}
        </Card>
      )}

      {goal && (
        <Card>
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-sm text-chalk/60 uppercase tracking-wider">Dein Ziel</div>
              <div className="font-display text-3xl font-extrabold uppercase">{goal.title}</div>
            </div>
            <div className="font-display text-3xl font-extrabold">
              {gp}
              <span className="text-chalk/50 text-xl"> / {goal.requiredDays}</span>
            </div>
          </div>
          <div className="mt-3">
            <GoalTrack value={gp} max={goal.requiredDays} />
          </div>
          <p className="text-sm text-chalk/70 mt-2">
            {goal.status === 'reached'
              ? 'TOR! Ziel erreicht. Deine Eltern bestätigen die Übergabe.'
              : `Noch ${goal.requiredDays - gp} Trainingstage. Jeder Tag mit ${minMin} Minuten Training bringt den Ball näher ans Tor.`}
          </p>
        </Card>
      )}
    </div>
  )
}
