-- Skin quiz v3: the ten v2 answers plus lifestyle habits (Part 4) and how
-- the skin looks now (Part 5, the training labels for ml/).
--
-- A new table rather than new columns on v2: every column is NOT NULL, and
-- rows from different quiz versions should never share a training set by
-- accident. The CHECK constraints repeat lib/validation/quiz.ts. Never
-- renumber or rename a code; add an option or ship a new quiz_version.
-- See docs/quiz-data-dictionary.md. No email or name column.

create table public.quiz_responses_v3 (
  id                  uuid primary key default gen_random_uuid(),
  waitlist_id         uuid not null unique references public.waitlist (id) on delete cascade,
  quiz_version        smallint not null default 3 check (quiz_version = 3),

  -- Part 1: categorical (unchanged from v2)
  primary_goal        text not null check (primary_goal in
                        ('hydration', 'anti_aging', 'acne_control', 'brightening', 'calming')),
  skin_type           text not null check (skin_type in
                        ('oily', 'dry', 'combination', 'normal', 'highly_sensitive')),
  environment         text not null check (environment in
                        ('climate_controlled_indoor', 'outdoors', 'urban_pollution', 'balanced_indoor')),
  texture_preference  text not null check (texture_preference in
                        ('gel_fluid', 'rich_cream', 'oil_balm', 'no_preference')),

  -- Part 2: ordinal (unchanged from v2)
  sunscreen_frequency smallint not null check (sunscreen_frequency between 0 and 3),
  stress_level        smallint not null check (stress_level between 1 and 5),
  routine_complexity  smallint not null check (routine_complexity between 0 and 2),

  -- Part 3: continuous (unchanged from v2)
  age                 smallint not null check (age between 18 and 100),
  sleep_hours         numeric(3, 1) not null check (sleep_hours between 0 and 24 and sleep_hours * 2 = trunc(sleep_hours * 2)),
  water_glasses       smallint not null check (water_glasses between 0 and 30),

  -- Part 4: lifestyle habits (ordinal), new in v3
  sugar_intake        smallint not null check (sugar_intake between 0 and 4),
  dairy_intake        smallint not null check (dairy_intake between 0 and 4),
  fruit_veg_intake    smallint not null check (fruit_veg_intake between 0 and 4),
  alcohol_intake      smallint not null check (alcohol_intake between 0 and 4),

  -- Part 5: how the skin looks now (ordinal): TRAINING LABELS, new in v3
  breakouts_level     smallint not null check (breakouts_level between 0 and 4),
  redness_level       smallint not null check (redness_level between 0 and 4),
  dryness_level       smallint not null check (dryness_level between 0 and 4),

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.quiz_responses_v3 is
  'Skin quiz v3: structured, ML-ready answers incl. lifestyle habits and self-reported skin state (training labels). Encodings in docs/quiz-data-dictionary.md.';

create trigger quiz_responses_v3_set_updated_at
  before update on public.quiz_responses_v3
  for each row execute function public.set_updated_at();

-- Service-role only (ADR-0002).
alter table public.quiz_responses_v3 enable row level security;
revoke all on public.quiz_responses_v3 from anon, authenticated;
