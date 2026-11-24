-- Push notifications scheduler: every 10 minutes pg_cron calls the
-- push-dispatch Edge Function (supabase/functions/push-dispatch) with the
-- dispatcher key from public.app_settings (never exposed to the site).
create extension if not exists pg_net;
create extension if not exists pg_cron;

create or replace function public.run_push_dispatch()
returns bigint
language sql
security definer
set search_path = ''
as $$
  select net.http_post(
    url := 'https://unoyaasqcgrrtlaqjppn.supabase.co/functions/v1/push-dispatch',
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'x-dispatch-key', (select value from public.app_settings where key = 'dispatch_key')),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  )
$$;
revoke all on function public.run_push_dispatch() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'push-dispatch';
select cron.schedule('push-dispatch', '*/10 * * * *', 'select public.run_push_dispatch()');
