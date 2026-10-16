// Tägliche Erinnerung per Web-Push. Das Gerät meldet sich mit Uhrzeit und Kind(ern) an;
// der Server prüft stündlich, wer heute noch keinen Trainingstag hat, und schickt dann eine Nachricht.
import { supa } from './account'
import { getMeta } from '../data/db'

export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

interface SubRow {
  endpoint: string
  child_ids: string[]
  hour: number
}

async function currentRow(): Promise<SubRow | null> {
  if (!pushSupported()) return null
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return null
  const { data } = await supa().from('push_subscriptions').select('endpoint, child_ids, hour').eq('endpoint', sub.endpoint).maybeSingle()
  return (data as SubRow) ?? null
}

export async function reminderStatus(childId: string): Promise<{ enabled: boolean; hour: number }> {
  const row = await currentRow().catch(() => null)
  return { enabled: !!row?.child_ids.includes(childId), hour: row?.hour ?? 16 }
}

export async function enableReminder(childId: string, hour: number) {
  if (!pushSupported()) throw new Error('Dieses Gerät unterstützt keine Erinnerungen.')
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('Benachrichtigungen sind für die App ausgeschaltet. Bitte in den Einstellungen des Handys erlauben.')
  const familyId = await getMeta<string>('familyId')
  if (!familyId) throw new Error('Erinnerungen gibt es nur mit Eltern-Konto oder gekoppeltem Gerät.')
  const { data: key, error: kErr } = await supa().rpc('push_public_key')
  if (kErr || !key) throw new Error('Erinnerungen sind auf dem Server noch nicht eingerichtet.')
  const reg = await navigator.serviceWorker.ready
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key as string) }))
  const json = sub.toJSON()
  const existing = await currentRow()
  const childIds = Array.from(new Set([...(existing?.child_ids ?? []), childId]))
  const { error } = await supa()
    .from('push_subscriptions')
    .upsert(
      { endpoint: sub.endpoint, family_id: familyId, p256dh: json.keys?.p256dh, auth: json.keys?.auth, hour, child_ids: childIds },
      { onConflict: 'endpoint' },
    )
  if (error) throw new Error(error.message)
}

export async function setReminderHour(hour: number) {
  const row = await currentRow()
  if (!row) return
  await supa().from('push_subscriptions').update({ hour }).eq('endpoint', row.endpoint)
}

export async function disableReminder(childId: string) {
  const row = await currentRow()
  if (!row) return
  const rest = row.child_ids.filter((c) => c !== childId)
  if (rest.length) {
    await supa().from('push_subscriptions').update({ child_ids: rest }).eq('endpoint', row.endpoint)
    return
  }
  await supa().from('push_subscriptions').delete().eq('endpoint', row.endpoint)
  const reg = await navigator.serviceWorker.ready
  await (await reg.pushManager.getSubscription())?.unsubscribe()
}
