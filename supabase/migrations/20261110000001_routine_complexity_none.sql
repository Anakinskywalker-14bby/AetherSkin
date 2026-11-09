-- Quiz v3, question "How complex is your current daily skincare routine?":
-- new first option "I don't have a routine / figuring it out", stored as -1.
-- Widening the CHECK only: every existing row (0-2) keeps its meaning.
alter table public.quiz_responses_v3
  drop constraint if exists quiz_responses_v3_routine_complexity_check;
alter table public.quiz_responses_v3
  add constraint quiz_responses_v3_routine_complexity_check
  check (routine_complexity between -1 and 2);
