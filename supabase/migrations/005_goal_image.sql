-- Foto der echten Belohnung pro Ziel (kleines Bild als Data-URL, max. ca. 300 KB)
alter table public.goals add column if not exists image text;
alter table public.goals drop constraint if exists goals_image_size;
alter table public.goals add constraint goals_image_size check (image is null or length(image) < 400000);
