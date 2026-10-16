-- Tägliche Erinnerungen per Web-Push

create table if not exists public.push_subscriptions (
  endpoint text primary key,
  family_id uuid not null references public.families (id) on delete cascade,
  device_id uuid not null default auth.uid(),
  child_ids text[] not null default '{}',
  hour int not null default 16 check (hour between 0 and 23),
  p256dh text not null,
  auth text not null,
  last_sent date,
  created_at timestamptz not null default now()
);

-- Schlüssel und Geheimnis für den Zeitplan; nur für den Server lesbar (keine Rechte für Nutzer)
create table if not exists public.push_config (
  id int primary key default 1 check (id = 1),
  public_key text,
  private_key text,
  cron_secret text not null default gen_random_uuid()::text
);
insert into public.push_config (id) values (1) on conflict (id) do nothing;

alter table public.push_subscriptions enable row level security;
alter table public.push_config enable row level security;

drop policy if exists push_own on public.push_subscriptions;
create policy push_own on public.push_subscriptions for all to authenticated
  using (family_id = public.my_family() and device_id = auth.uid())
  with check (family_id = public.my_family() and device_id = auth.uid());

grant select, insert, update, delete on public.push_subscriptions to authenticated;
revoke all on public.push_config from anon, authenticated;

-- Öffentlicher Schlüssel für das Abonnieren im Browser
create or replace function public.push_public_key() returns text
language sql stable security definer set search_path = public as $$
  select public_key from push_config where id = 1
$$;
revoke execute on function public.push_public_key() from public, anon;
grant execute on function public.push_public_key() to authenticated;

-- Wer soll zur vollen Stunde erinnert werden? Nur Kinder, die heute noch keinen Trainingstag haben.
create or replace function public.reminders_due(p_hour int)
returns table (endpoint text, p256dh text, auth text, child_id text, child_name text)
language sql stable security definer set search_path = public as $$
  select s.endpoint, s.p256dh, s.auth, c.id, coalesce(c.player ->> 'name', c.name)
  from push_subscriptions s
  join children c on c.family_id = s.family_id and c.id = any (s.child_ids)
  where s.hour = p_hour
    and (s.last_sent is null or s.last_sent < public.berlin_today())
    and not exists (
      select 1 from (
        select coalesce(sum(l.active_seconds), 0) secs, coalesce(sum(l.answers), 0) ans, coalesce(bool_or(l.round_done), false) rd
        from day_logs l where l.family_id = c.family_id and l.child_id = c.id and l.date = public.berlin_today()
      ) x
      where x.rd
        and x.secs >= coalesce((c.settings ->> 'minMinutes')::int, 15) * 60
        and x.ans >= coalesce((c.settings ->> 'minAnswers')::int, 40)
    )
$$;
revoke execute on function public.reminders_due(int) from public, anon, authenticated;

-- Server-Funktionen (Edge Functions) laufen als service_role und brauchen ausdrückliche Rechte
grant select, update on public.push_config to service_role;
grant select, update, delete on public.push_subscriptions to service_role;
grant select on public.members to service_role;
grant execute on function public.reminders_due(int) to service_role;
