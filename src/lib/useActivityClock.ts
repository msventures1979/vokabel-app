// Misst aktive Lernzeit: nur bei sichtbarer App, höchstens 60 Sekunden pro Eingabe.
import { useCallback, useEffect, useRef } from 'react'
import { activeDelta } from '../logic/rewards'

export function useActivityClock() {
  const last = useRef(Date.now())

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') last.current = Date.now()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  // Gibt die aktive Zeit seit der letzten Eingabe zurück und startet die Uhr neu.
  return useCallback(() => {
    const now = Date.now()
    const delta = document.visibilityState === 'visible' ? activeDelta(last.current, now) : 0
    last.current = now
    return delta
  }, [])
}
