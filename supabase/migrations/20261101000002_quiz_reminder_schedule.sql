-- Hourly quiz-reminder run.
--
-- pg_cron fires five past every hour; pg_net POSTs to the app, which emails
-- one reminder to signups whose quiz link is 12+ hours old and unfinished
-- (app/api/cron/quiz-reminders/route.ts). The endpoint only ever acts on rows
-- that are already due and claims each row before emailing, so a stray or
-- repeated call can't send anyone a second reminder.
--
-- Apply after the app version with /api/cron/quiz-reminders is live.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule(jobid) from cron.job where jobname = 'quiz-reminders-hourly';

select cron.schedule(
  'quiz-reminders-hourly',
  '5 * * * *',
  $$
  select net.http_post(
    url := 'https://aetherskin.app/api/cron/quiz-reminders',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
