import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import { activeGoal, albumStats, markCardsSeen, plan, seenCards, totalStars, trainingDates } from '../data/repo'
import { CARDS, CLUBS, completedClubs, currentClub, nextCardText, ownedIds } from '../logic/album'
import { speak } from '../lib/speech'
import { play, praise, setSoundOn, soundOn } from '../lib/sounds'
import { ClubCrest, Confetti, PlayerCard } from '../ui/components'
import { ReminderCard } from './Reminder'
import { SyncBadge } from '../ui/SyncBadge'
import type { Route } from '../App'
import { today } from '../logic/dates'
import { goalProgress, levelFor, levelHint, rulesFor, streak, trophyAt } from '../logic/rewards'
import { Btn, Card, FlameIcon, GoalTrack, Jersey, Meter, Star, TopBar } from '../ui/components'

export function Home({ childId, go }: { childId: string; go: (r: Route) => void }) {
  const data = useLiveQuery(async () => {
    const child = await db.children.get(childId)
    if (!child) return null
    const [p, stars, goal, dates, album, seen] = await Promise.all([
      plan(childId),
      totalStars(childId),
      activeGoal(childId),
      trainingDates(childId),
      albumStats(childId),
      seenCards(childId),
    ])
    return { child, p, stars, goal, dates, album, seen }
  }, [childId])

  useEffect(() => {
    if (data === null) go({ name: 'pick' })
    else if (data && !data.child.player) go({ name: 'setup', childId })
  }, [data, childId, go])

  const [dismissed, setDismissed] = useState<string[]>([])

  if (!data || !data.child.player) return null
  const { child, p, stars, goal, dates, album, seen } = data
  const unlocked = ownedIds(album)
  // Ereignisse: neue Karten, danach vollständige Vereine (als "club:<id>")
  const events = [...unlocked, ...completedClubs(unlocked).map((k) => `club:${k}`)]
  // Erstes Öffnen auf diesem Gerät: bereits Erreichtes nicht einzeln feiern
  const fresh = seen === undefined ? [] : events.filter((id) => !seen.includes(id) && !dismissed.includes(id))
  if (seen === undefined) void markCardsSeen(childId, events)
  const freshId = fresh[0]
  const newCard = freshId ? CARDS.find((c) => c.id === freshId) : undefined
  const newClub = freshId?.startsWith('club:') ? CLUBS.find((k) => `club:${k.id}` === freshId) : undefined
  const club = currentClub(unlocked)
  const player = child.player!

  const lvl = levelFor(stars, album.trainingDays, album.legacy.stars)
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
          <div className="mt-2">
            <div className="h-2 rounded-full bg-black/30 overflow-hidden">
              <div
                className="h-full bg-gold rounded-full"
                style={{ width: `${(lvl.next ? lvl.progress : 1 - lvl.starsToTrophy / 2500) * 100}%` }}
              />
            </div>
            <div className="text-xs text-chalk/60 mt-1">{levelHint(lvl)}</div>
          </div>
          {lvl.trophies > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1" aria-label={`${lvl.trophies} Pokale`}>
              <span className="text-xs text-chalk/60 mr-1">Pokalvitrine</span>
              {Array.from({ length: Math.min(lvl.trophies, 12) }, (_, i) => (
                <span key={i} title={trophyAt(i).name} className="text-lg leading-none">
                  {trophyAt(i).icon}
                </span>
              ))}
              {lvl.trophies > 12 && <span className="text-xs text-chalk/70">+{lvl.trophies - 12}</span>}
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

      <button onClick={() => go({ name: 'album', childId })} className="w-full text-left">
        <Card className="flex items-center gap-4">
          <ClubCrest club={club} size={44} earned={completedClubs(unlocked).includes(club.id)} />
          <div className="flex-1">
            <div className="font-display text-2xl font-extrabold uppercase">Sammelalbum</div>
            <div className="text-sm text-chalk/70">
              {club.name}: {CARDS.filter((c) => c.club === club.id && unlocked.includes(c.id)).length} von 11 Spielern · {nextCardText(album)}
            </div>
          </div>
          <div className="font-display text-3xl">›</div>
        </Card>
      </button>

      {goal && (
        <Card className="relative overflow-hidden">
          {goal.image ? (
            <div className="flex items-center gap-4">
              <div className="relative h-28 w-28 shrink-0 grid place-items-center">
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(200,245,96,.35)_0%,rgba(200,245,96,0)_68%)]" />
                <img
                  src={goal.image}
                  alt={goal.title}
                  className={`absolute inset-0 h-full w-full object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,.45)] ${goal.status === 'reached' ? 'animate-pop' : 'animate-float'}`}
                />
              </div>
              <div className="min-w-0">
                <div className="text-sm text-chalk/60 uppercase tracking-wider">{goal.status === 'reached' ? 'Gewonnen!' : 'Dein Ziel'}</div>
                <div className="font-display text-3xl font-extrabold uppercase leading-none break-words">{goal.title}</div>
                <div className="font-display text-3xl font-extrabold mt-1">
                  {gp}
                  <span className="text-chalk/50 text-xl"> / {goal.requiredDays}</span>
                </div>
              </div>
            </div>
          ) : (
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
          )}
          <div className="mt-3">
            <GoalTrack value={gp} max={goal.requiredDays} prize={goal.image} />
          </div>
          <p className="text-sm text-chalk/70 mt-2">
            {goal.status === 'reached'
              ? 'TOR! Ziel erreicht. Deine Eltern bestätigen die Übergabe.'
              : `Noch ${goal.requiredDays - gp} Trainingstage. Jeder Tag mit ${minMin} Minuten Training bringt den Ball näher ans Tor.`}
          </p>
        </Card>
      )}
      <ReminderCard childId={childId} />
      <SoundToggle />

      {newCard && (
        <div className="fixed inset-0 z-40 bg-black/70 grid place-items-center p-6">
          <Confetti />
          <SoundOnce key={newCard.id} childId={childId} />
          <div className="text-center space-y-4 animate-pop">
            <div className="font-display text-4xl font-extrabold uppercase text-lime">Neue Karte!</div>
            <div className="mx-auto w-56">
              <PlayerCard card={newCard} size="lg" onSpeak={() => speak(newCard.en)} />
            </div>
            <Btn
              onClick={async () => {
                setDismissed((d) => [...d, newCard.id])
                await markCardsSeen(childId, [...(seen ?? []), ...dismissed, newCard.id])
              }}
            >
              Ins Album
            </Btn>
          </div>
        </div>
      )}

      {newClub && (
        <div className="fixed inset-0 z-40 bg-black/80 grid place-items-center p-6">
          <Confetti />
          <ClubSound key={newClub.id} childId={childId} />
          <div className="text-center space-y-4 animate-pop">
            <div className="font-display text-4xl font-extrabold uppercase text-lime">Team komplett!</div>
            <div className="mx-auto w-fit drop-shadow-[0_8px_16px_rgba(0,0,0,.5)]">
              <ClubCrest club={newClub} size={150} />
            </div>
            <div className="font-display text-3xl font-extrabold uppercase">{newClub.name}</div>
            <p className="text-chalk/80 max-w-xs mx-auto">
              Alle 11 Spieler sind da. Das Wappen gehört dir!
              {CLUBS.indexOf(newClub) < CLUBS.length - 1 && ` Als Nächstes baust du die ${CLUBS[CLUBS.indexOf(newClub) + 1].name} auf.`}
            </p>
            <Btn
              onClick={async () => {
                const id = `club:${newClub.id}`
                setDismissed((d) => [...d, id])
                await markCardsSeen(childId, [...(seen ?? []), ...dismissed, id])
              }}
            >
              Weiter
            </Btn>
          </div>
        </div>
      )}
    </div>
  )
}

function ClubSound({ childId }: { childId: string }) {
  useEffect(() => {
    play('trainingDay')
    praise('club', childId, 1200)
  }, [childId])
  return null
}

function SoundOnce({ childId }: { childId: string }) {
  useEffect(() => {
    play('card')
    praise('card', childId, 700)
  }, [childId])
  return null
}

// Töne an/aus (gilt für dieses Gerät)
function SoundToggle() {
  const [on, setOn] = useState(soundOn())
  return (
    <Card className="flex items-center gap-4">
      <div className="text-3xl" aria-hidden>
        {on ? '🔊' : '🔇'}
      </div>
      <div className="flex-1">
        <div className="font-display text-xl font-extrabold uppercase">Töne</div>
        <div className="text-sm text-chalk/70">{on ? 'Jubel, Applaus und Pfiffe sind an.' : 'Spielgeräusche sind aus. Die Aussprache bleibt an.'}</div>
      </div>
      <Btn
        size="sm"
        variant="ghost"
        className="w-auto px-5"
        onClick={() => {
          setSoundOn(!on)
          setOn(!on)
          if (!on) setTimeout(() => play('correct'), 50)
        }}
      >
        {on ? 'Aus' : 'An'}
      </Btn>
    </Card>
  )
}
