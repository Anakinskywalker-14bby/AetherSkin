-- The 12-hour quiz reminder was removed before launch. Quiz links still
-- expire after 24 hours and work once; nothing needs these columns.
drop index if exists public.waitlist_reminder_due_idx;
drop index if exists public.waitlist_reminder_token_hash_idx;

alter table public.waitlist
  drop column if exists reminder_token_hash,
  drop column if exists reminder_sent_at;
