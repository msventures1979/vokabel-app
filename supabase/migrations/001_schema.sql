-- Vokabel-App: Datenbank, Zugriffsregeln und Server-Funktionen
-- Einmalig im Supabase SQL Editor ausführen.


-- ---------- Tabellen ----------

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Familie',
  created_at timestamptz not null default now()
);

-- Wer gehört zu welcher Familie: Eltern-Konten und gekoppelte Geräte
create table if not exists public.members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  role text not null check (role in ('parent', 'device')),
  device_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.pairing_codes (
  code text primary key,
  family_id uuid not null references public.families (id) on delete cascade,
  kind text not null check (kind in ('device', 'parent')),
  expires_at timestamptz not null,
  created_by uuid not null references auth.users (id) on delete cascade
);

create table if not exists public.children (
  family_id uuid not null references public.families (id) on delete cascade,
  id text not null,
  name text not null,
  sort int not null default 0,
  new_per_day int not null default 5 check (new_per_day between 1 and 30),
  player jsonb,
  updated_at timestamptz not null default now(),
  primary key (family_id, id)
);

create table if not exists public.lists (
  family_id uuid not null references public.families (id) on delete cascade,
  id text not null,
  title text not null,
  subject text not null default 'Englisch',
  test_date date,
  updated_at timestamptz not null default now(),
  primary key (family_id, id)
);

create table if not exists public.words (
  family_id uuid not null references public.families (id) on delete cascade,
  id text not null,
  list_id text not null,
  sort int not null default 0,
  data jsonb not null, -- en, answers, de, ipa, example, cloze, note, caseSensitive, image
  updated_at timestamptz not null default now(),
  primary key (family_id, id)
);

create table if not exists public.assignments (
  family_id uuid not null references public.families (id) on delete cascade,
  child_id text not null,
  list_id text not null,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (family_id, child_id, list_id)
);

create table if not exists public.progress (
  family_id uuid not null references public.families (id) on delete cascade,
  child_id text not null,
  word_id text not null,
  box int not null check (box between 0 and 6),
  due date,
  wrong_streak int not null default 0,
  errors int not null default 0,
  introduced_on date,
  updated_at timestamptz not null default now(),
  primary key (family_id, child_id, word_id)
);

-- Lernzeit pro Kind, Tag und Gerät. Summiert ergibt das den Trainingstag.
create table if not exists public.day_logs (
  family_id uuid not null references public.families (id) on delete cascade,
  child_id text not null,
  date date not null,
  device_id uuid not null,
  active_seconds int not null default 0 check (active_seconds between 0 and 21600),
  answers int not null default 0 check (answers between 0 and 5000),
  round_done boolean not null default false,
  stars int not null default 0 check (stars between 0 and 100000),
  new_introduced int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (family_id, child_id, date, device_id)
);

create table if not exists public.goals (
  family_id uuid not null references public.families (id) on delete cascade,
  id text not null,
  child_id text not null,
  title text not null,
  required_days int not null check (required_days between 1 and 365),
  start_date date not null,
  status text not null default 'active' check (status in ('active', 'handedOver')),
  handed_over_on date,
  updated_at timestamptz not null default now(),
  primary key (family_id, id)
);

create index if not exists words_updated on public.words (family_id, updated_at);
create index if not exists progress_updated on public.progress (family_id, updated_at);
create index if not exists day_logs_updated on public.day_logs (family_id, updated_at);

-- ---------- Hilfsfunktionen ----------

create or replace function public.my_family() returns uuid
language sql stable security definer set search_path = public as $$
  select family_id from public.members where user_id = auth.uid()
$$;

create or replace function public.is_parent() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where user_id = auth.uid() and role = 'parent')
$$;

-- Das heutige Datum bestimmt der Server, nicht das Gerät.
create or replace function public.berlin_today() returns date
language sql stable as $$
  select (now() at time zone 'Europe/Berlin')::date
$$;

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end $$;

-- Tageswerte nur für heute und die letzten 3 Tage (offline gelernt); Zeit und Antworten nur steigend
create or replace function public.check_day_log() returns trigger
language plpgsql as $$
begin
  if new.date > public.berlin_today() or new.date < public.berlin_today() - 3 then
    raise exception 'Datum % ist nicht erlaubt', new.date using errcode = '22023';
  end if;
  if tg_op = 'UPDATE' then
    new.active_seconds := greatest(new.active_seconds, old.active_seconds);
    new.answers := greatest(new.answers, old.answers);
    new.stars := greatest(new.stars, old.stars);
    new.new_introduced := greatest(new.new_introduced, old.new_introduced);
    new.round_done := new.round_done or old.round_done;
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['children','lists','words','assignments','progress','day_logs','goals'] loop
    execute format('drop trigger if exists touch on public.%I', t);
    execute format('create trigger touch before insert or update on public.%I for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

drop trigger if exists check_day on public.day_logs;
create trigger check_day before insert or update on public.day_logs for each row execute function public.check_day_log();

-- ---------- Zugriffsregeln (Row Level Security) ----------

alter table public.families enable row level security;
alter table public.members enable row level security;
alter table public.pairing_codes enable row level security;
alter table public.children enable row level security;
alter table public.lists enable row level security;
alter table public.words enable row level security;
alter table public.assignments enable row level security;
alter table public.progress enable row level security;
alter table public.day_logs enable row level security;
alter table public.goals enable row level security;

drop policy if exists fam_read on public.families;
create policy fam_read on public.families for select to authenticated using (id = public.my_family());

drop policy if exists mem_read on public.members;
create policy mem_read on public.members for select to authenticated using (family_id = public.my_family());
drop policy if exists mem_parent_delete on public.members;
create policy mem_parent_delete on public.members for delete to authenticated
  using (family_id = public.my_family() and public.is_parent() and user_id <> auth.uid());

-- Alle in der Familie dürfen lesen
do $$
declare t text;
begin
  foreach t in array array['children','lists','words','assignments','progress','day_logs','goals'] loop
    execute format('drop policy if exists family_read on public.%I', t);
    execute format('create policy family_read on public.%I for select to authenticated using (family_id = public.my_family())', t);
  end loop;
end $$;

-- Nur Eltern verwalten Kinder, Wortlisten, Zuweisungen und Ziele
do $$
declare t text;
begin
  foreach t in array array['children','lists','words','assignments','goals'] loop
    execute format('drop policy if exists parent_write on public.%I', t);
    execute format('create policy parent_write on public.%I for all to authenticated using (family_id = public.my_family() and public.is_parent()) with check (family_id = public.my_family() and public.is_parent())', t);
  end loop;
end $$;

-- Lernstand: alle Familiengeräte dürfen schreiben
drop policy if exists progress_write on public.progress;
create policy progress_write on public.progress for insert to authenticated with check (family_id = public.my_family());
drop policy if exists progress_update on public.progress;
create policy progress_update on public.progress for update to authenticated
  using (family_id = public.my_family()) with check (family_id = public.my_family());

-- Tageswerte: jedes Gerät nur seine eigene Zeile
drop policy if exists day_write on public.day_logs;
create policy day_write on public.day_logs for insert to authenticated
  with check (family_id = public.my_family() and device_id = auth.uid());
drop policy if exists day_update on public.day_logs;
create policy day_update on public.day_logs for update to authenticated
  using (family_id = public.my_family() and device_id = auth.uid())
  with check (family_id = public.my_family() and device_id = auth.uid());

-- ---------- Server-Funktionen ----------

-- Erstes Eltern-Konto legt die Familie an
create or replace function public.create_family(family_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare fid uuid;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then raise exception 'Nur Eltern-Konten'; end if;
  if exists (select 1 from members where user_id = auth.uid()) then raise exception 'Schon einer Familie zugeordnet'; end if;
  insert into families (name) values (coalesce(nullif(family_name, ''), 'Familie')) returning id into fid;
  insert into members (user_id, family_id, role) values (auth.uid(), fid, 'parent');
  return fid;
end $$;

-- Eltern erzeugen einen 6-stelligen Code, 15 Minuten gültig
create or replace function public.create_pairing_code(code_kind text default 'device') returns text
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if not public.is_parent() then raise exception 'Nur Eltern'; end if;
  if code_kind not in ('device', 'parent') then raise exception 'Unbekannte Art'; end if;
  delete from pairing_codes where expires_at < now();
  loop
    c := lpad((floor(random() * 1000000))::int::text, 6, '0');
    exit when not exists (select 1 from pairing_codes where code = c);
  end loop;
  insert into pairing_codes (code, family_id, kind, expires_at, created_by)
  values (c, public.my_family(), code_kind, now() + interval '15 minutes', auth.uid());
  return c;
end $$;

-- Gerät (anonym) oder zweites Eltern-Konto tritt mit Code bei
create or replace function public.claim_pairing_code(pairing_code text, name text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare pc pairing_codes;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select * into pc from pairing_codes where code = pairing_code and expires_at > now();
  if pc is null then raise exception 'Code ungültig oder abgelaufen' using errcode = '22023'; end if;
  if pc.kind = 'parent' and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Für Eltern-Codes bitte mit E-Mail anmelden';
  end if;
  insert into members (user_id, family_id, role, device_name)
  values (auth.uid(), pc.family_id, pc.kind, name)
  on conflict (user_id) do update set family_id = excluded.family_id, role = excluded.role, device_name = excluded.device_name;
  delete from pairing_codes where code = pairing_code;
  return pc.family_id;
end $$;

-- Kinder gestalten ihren Spieler auch auf gekoppelten Geräten
create or replace function public.set_player(child text, player jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.my_family() is null then raise exception 'Keine Familie'; end if;
  update children set player = set_player.player where family_id = public.my_family() and id = child;
end $$;

-- ---------- Rechte für die Data API ----------
-- Neue Tabellen sind in diesem Projekt nicht automatisch freigegeben.

revoke all on all tables in schema public from anon;
grant select on public.families, public.members to authenticated;
grant delete on public.members to authenticated;
grant select, insert, update, delete on public.children, public.lists, public.words, public.assignments, public.goals to authenticated;
grant select, insert, update on public.progress, public.day_logs to authenticated;
revoke execute on all functions in schema public from anon, public;
grant execute on function public.my_family(), public.is_parent(), public.berlin_today(),
  public.create_family(text), public.create_pairing_code(text), public.claim_pairing_code(text, text),
  public.set_player(text, jsonb) to authenticated;
