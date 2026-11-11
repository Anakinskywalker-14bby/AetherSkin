-- Security: require a verified email claim for the email-match branch of
-- waitlist_select_own (vbsec/PYA audit 2026-11-11, medium).
--
-- The policy previously trusted auth.jwt() ->> 'email' without checking it
-- was ever confirmed. The anon key is public and a Supabase Auth signup
-- path exists (handle_new_user() trigger in 20260711000001), so if this
-- project ever issues a session before email confirmation, an attacker
-- could self-register with a victim's email and read that victim's
-- waitlist signup/quiz-completion status through this policy.
--
-- The user_id = auth.uid() branch is untouched: it was never the issue.
drop policy "waitlist_select_own" on public.waitlist;
create policy "waitlist_select_own" on public.waitlist
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (
      lower(email) = (select lower(coalesce(auth.jwt() ->> 'email', '')))
      and coalesce((select auth.jwt() ->> 'email_verified')::boolean, false)
    )
  );
