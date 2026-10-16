# Vokabel-Training

Vokabeltrainer für Milan und Marlon: täglich 5 neue Englisch-Wörter, Karteikasten-Wiederholung, Fußball-Thema und Belohnungssystem.

## Stand: Version 1

- Profile für Milan und Marlon mit eigenem Spieler (Name, Rückennummer, Trikotfarbe)
- Tagesrunde: Aufwärmen mit fälligen Wörtern, dann 5 neue Wörter kennenlernen und üben
- Spielmodi: Auswahl Englisch → Deutsch, Auswahl Deutsch → Englisch, selbst tippen, Karteikarte
- Karteikasten mit 5 Fächern (1, 2, 4, 7, 14 Tage), falsch = ein Fach zurück, zwei Fehler in Folge = Fach 1
- Antwortprüfung mit erlaubten Varianten, Großschreibung nur wo Pflicht, ein Tippfehler = fast richtig
- Sterne (unbegrenzt, ab 45 Minuten halbiert) und Karriere-Level
- Trainingstag: Tagesrunde + 15 Minuten aktive Lernzeit + 40 Antworten, höchstens einer pro Tag
- Belohnungsziel in Trainingstagen (Start: Fußball = 25 Tage), Übergabe bestätigen die Eltern
- Serie mit einem Joker pro Woche
- Eltern-Bereich mit PIN: Statistik, Ziele, Tempo, Wortlisten, Import, Sicherung
- Offline-fähige Web-App (PWA), Daten lokal auf dem Gerät

Noch nicht enthalten: Server-Abgleich (Supabase), Geräte-Kopplung, Audiodateien vom Server, Android-APK für Fire-Tablets, Memory, Buchstabensalat, Sammelalbum.

## Entwicklung

```bash
npm install
npm run dev      # lokaler Server
npm test         # Tests der Lernlogik
npm run build    # Produktions-Build nach dist/
```

## Aufbau

- `src/logic/` – reine Lernlogik ohne Oberfläche (Karteikasten, Antwortprüfung, Belohnungen, Runden)
- `src/data/` – Wortlisten und lokale Datenbank (IndexedDB über Dexie)
- `src/screens/` – Bildschirme
- `src/ui/` – gemeinsame Bausteine

## Wortlisten-Import

```json
{
  "list": { "id": "en-u2", "title": "Unit 2 – ...", "subject": "Englisch" },
  "words": [
    { "en": "house", "answers": ["house"], "de": "das Haus", "ipa": "haʊs", "example": "My house is big.", "cloze": "My ___ is big." }
  ]
}
```

`caseSensitive: true` setzen, wenn Großschreibung Pflicht ist (z. B. English, Mr).
