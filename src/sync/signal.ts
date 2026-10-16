// Kleiner Signalgeber: Datenänderungen melden "bitte bald abgleichen", ohne die Sync-Logik zu importieren.
let handler: (() => void) | null = null
let timer: ReturnType<typeof setTimeout> | null = null

export function onSyncRequest(fn: (() => void) | null) {
  handler = fn
}

export function syncSoon(delayMs = 2000) {
  if (!handler) return
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = null
    handler?.()
  }, delayMs)
}
