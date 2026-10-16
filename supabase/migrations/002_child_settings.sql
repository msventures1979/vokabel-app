-- Einstellungen pro Kind: Lernmodus (Schreiben oder Bilder), Mindestzeit und Mindestantworten für den Trainingstag
alter table public.children add column if not exists settings jsonb not null default '{}'::jsonb;
