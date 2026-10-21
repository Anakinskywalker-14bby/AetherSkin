-- Skin quiz v2: ten structured answers, no free text, typed for model training.
--
--   categorical  text codes, one-hot encoded downstream
--   ordinal      smallint, the ranked value itself
--   continuous   raw numbers, standard-scaled downstream
--
-- The CHECK constraints repeat lib/validation/quiz.ts so the database itself
-- refuses anything outside the defined values, whatever writes to it.
-- Codes and integers are part of the dataset's schema: never renumber or
-- rename, add a new option or a new quiz_version instead.
-- See docs/quiz-data-dictionary.md.
--
-- No email or name column: rows link to a person only through waitlist_id.
-- The v1 table public.quiz_responses is left as it is.

create table public.quiz_responses_v2 (
  id                  uuid primary key default gen_random_uuid(),
  waitlist_id         uuid not null unique references public.waitlist (id) on delete cascade,
  quiz_version        smallint not null default 2 check (quiz_version = 2),

  -- Part 1: categorical
  primary_goal        text not null check (primary_goal in
                        ('hydration', 'anti_aging', 'acne_control', 'brightening', 'calming')),
  skin_type           text not null check (skin_type in
                        ('oily', 'dry', 'combination', 'normal', 'highly_sensitive')),
  environment         text not null check (environment in
                        ('climate_controlled_indoor', 'outdoors', 'urban_pollution', 'balanced_indoor')),
  texture_preference  text not null check (texture_preference in
                        ('gel_fluid', 'rich_cream', 'oil_balm', 'no_preference')),

  -- Part 2: ordinal
  sunscreen_frequency smallint not null check (sunscreen_frequency between 0 and 3),
  stress_level        smallint not null check (stress_level between 1 and 5),
  routine_complexity  smallint not null check (routine_complexity between 0 and 2),

  -- Part 3: continuous
  age                 smallint not null check (age between 18 and 100),
  sleep_hours         numeric(3, 1) not null check (sleep_hours between 0 and 24 and sleep_hours * 2 = trunc(sleep_hours * 2)),
  water_glasses       smallint not null check (water_glasses between 0 and 30),

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.quiz_responses_v2 is
  'Skin quiz v2: structured, ML-ready answers. Encodings in docs/quiz-data-dictionary.md.';

create trigger quiz_responses_v2_set_updated_at
  before update on public.quiz_responses_v2
  for each row execute function public.set_updated_at();

-- Service-role only (ADR-0002): RLS on with no policies, and no table
-- privileges for the public API roles, so anon/authenticated get nothing.
alter table public.quiz_responses_v2 enable row level security;
revoke all on public.quiz_responses_v2 from anon, authenticated;
