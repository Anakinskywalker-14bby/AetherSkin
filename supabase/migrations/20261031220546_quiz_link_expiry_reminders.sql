-- Quiz links: 24-hour expiry, single use, and one reminder at 12 hours.
--
-- 1. The v1 (quiz_responses) and v2 (quiz_responses_v2) answer tables are
--    retired. They are already absent from the live database; these drops
--    only record that in the repo so a rebuilt database matches. They delete
--    nothing on a database where the tables are gone.
drop table if exists public.quiz_responses;
drop table if exists public.quiz_responses_v2;

-- 2. Reminder bookkeeping. The reminder email carries its own link (we store
--    only token hashes, so the original link can't be re-sent). Either hash
--    opens the quiz until verification_sent_at + 24 hours.
alter table public.waitlist
  add column if not exists reminder_token_hash text,
  add column if not exists reminder_sent_at timestamptz;

create index if not exists waitlist_reminder_token_hash_idx
  on public.waitlist (reminder_token_hash)
  where reminder_token_hash is not null;

-- Rows the hourly reminder job looks at: link sent, quiz not done, no
-- reminder yet.
create index if not exists waitlist_reminder_due_idx
  on public.waitlist (verification_sent_at)
  where quiz_completed_at is null and reminder_sent_at is null
    and verification_token_hash is not null;

comment on column public.waitlist.reminder_token_hash is
  'SHA-256 of the token in the 12-hour reminder email. Valid until verification_sent_at + 24h; cleared when the quiz is completed or a new link is requested.';
comment on column public.waitlist.reminder_sent_at is
  'When the 12-hour quiz reminder was sent (at most one per link).';
