-- Baseline definition for waitlist columns that the app and RLS policies
-- have relied on since early on, but that no tracked migration ever added
-- (vbsec/PYA audit 2026-11-11, same class of gap as 20261111000002's
-- audit_log baseline). `if not exists` throughout so this is safe to run
-- whether these columns already exist live or not -- it does not change an
-- already-matching table or its data.
--
-- Referenced by: lib/quiz-link.ts, lib/audit.ts, app/api/quiz/route.ts,
-- app/api/waitlist/join/route.ts, and the waitlist_select_own RLS policy
-- (20260711000003 / 20261111000001).
alter table public.waitlist
  add column if not exists verification_token_hash text,
  add column if not exists verification_sent_at timestamptz,
  add column if not exists verified_at timestamptz,
  add column if not exists quiz_completed_at timestamptz,
  add column if not exists signup_ip_hash text,
  add column if not exists user_agent text;

-- Not unique: a hash collision across rows is practically impossible for a
-- SHA-256 of a 32-byte random token, but retroactively adding a unique
-- constraint to a column that may already hold live data is a separate,
-- riskier change -- left as a follow-up if ever needed.
create index if not exists waitlist_verification_token_hash_idx
  on public.waitlist (verification_token_hash)
  where verification_token_hash is not null;
