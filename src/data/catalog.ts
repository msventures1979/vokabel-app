// Eingebaute Wortlisten. Neue Listen, die hier ergänzt werden, landen beim nächsten Start
// auf dem Eltern-Gerät (oder im Betrieb ohne Konto) automatisch in der Datenbank.
import { db } from './db'
import { unit1, unit1Words } from './en-unit1'
import { isStarterList, starterLists, starterWords } from './starter'
import { germanSheets } from './german'
import type { Word, WordList } from '../logic/types'
import { today } from '../logic/dates'

const CATALOG: Array<{ list: WordList; words: Word[] }> = [
  { list: unit1, words: unit1Words },
  ...starterLists.map((list) => ({ list, words: starterWords.filter((w) => w.listId === list.id) })),
  ...germanSheets,
]

export const MARLON_DEFAULTS = { mode: 'picture' as const, minMinutes: 10, minAnswers: 25, curriculum: 'starter' as const }

// Gibt zurück, ob etwas geändert wurde (dann muss hochgeladen werden).
export async function ensureCatalog(): Promise<boolean> {
  const stamp = Date.now()
  let changed = false
  await db.transaction('rw', db.lists, db.words, db.children, db.assignments, db.goals, async () => {
    for (const { list, words } of CATALOG) {
      if (await db.lists.get(list.id)) continue
      await db.lists.put({ ...list, dirty: stamp })
      await db.words.bulkPut(words.map((w) => ({ ...w, dirty: stamp })))
      changed = true
    }

    // Marlon: einmalig auf Bilder-Modus mit Startwortschatz einstellen
    const marlon = await db.children.get('marlon')
    if (marlon && !marlon.settings?.mode) {
      const assigned = (await db.assignments.where('childId').equals('marlon').toArray()).filter((a) => a.active !== false)
      if (assigned.length === 0) {
        await db.children.put({ ...marlon, newPerDay: 3, settings: { ...marlon.settings, ...MARLON_DEFAULTS }, dirty: stamp })
        changed = true
      }
    }

    // Marlon: Saisons mit 25 Trainingstagen, falls noch keine angelegt sind
    if (marlon && (await db.goals.where('childId').equals('marlon').count()) === 0) {
      await db.goals.add({ id: crypto.randomUUID(), childId: 'marlon', title: 'Saisonpokal', requiredDays: 25, startDate: today(), status: 'active', dirty: stamp })
      changed = true
    }

    // Marlon: einmalig Deutsch-Lernwörter einschalten und die Lernwörterblätter zuordnen
    const m2 = await db.children.get('marlon')
    if (m2 && !m2.settings?.germanInit) {
      for (const { list } of germanSheets) {
        const id = `marlon:${list.id}`
        if (!(await db.assignments.get(id))) await db.assignments.put({ id, childId: 'marlon', listId: list.id, active: true, dirty: stamp })
      }
      await db.children.put({ ...m2, settings: { ...m2.settings, german: true, germanInit: true }, dirty: stamp })
      changed = true
    }

    // Nur virtuelle Belohnungen: frühere echte Ziele (Titel, Fotos) in Saisons umwandeln
    for (const g of await db.goals.toArray()) {
      if (g.title === 'Saisonpokal' && !g.image) continue
      await db.goals.put({ ...g, title: 'Saisonpokal', image: undefined, dirty: stamp })
      changed = true
    }

    // Kinder mit Startwortschatz bekommen neue Start-Listen automatisch dazu
    const starterIds = starterLists.map((l) => l.id).filter(isStarterList)
    for (const c of await db.children.toArray()) {
      if (c.settings?.curriculum !== 'starter') continue
      for (const listId of starterIds) {
        const id = `${c.id}:${listId}`
        if (await db.assignments.get(id)) continue
        await db.assignments.put({ id, childId: c.id, listId, active: true, dirty: stamp })
        changed = true
      }
    }
  })
  return changed
}
