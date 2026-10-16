-- Zeitplan: jede volle Stunde die Funktion "reminders" aufrufen.
-- Erst ausführen, wenn die Server-Funktion "reminders" bereitgestellt ist.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.unschedule('vokabel-reminders') where exists (select 1 from cron.job where jobname = 'vokabel-reminders');
select cron.schedule(
  'vokabel-reminders',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://kvhdrkqmzyfhyvvolakg.supabase.co/functions/v1/reminders',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select cron_secret from public.push_config where id = 1)),
    body := '{}'::jsonb
  )
  $$
);
