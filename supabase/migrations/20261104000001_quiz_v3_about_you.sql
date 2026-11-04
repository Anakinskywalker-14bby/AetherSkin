-- Skin quiz v3, 4 Nov 2026: gender, medication and allergy questions.
--
-- Added as NULLABLE columns on quiz_responses_v3, so every existing row is
-- kept exactly as it is (older answers simply have no value here) and the
-- model inputs/labels in ml/ are untouched. New submissions are validated
-- server-side to always include them (lib/validation/quiz.ts).
--
-- medication_details and allergy_details are short typed notes, stored only
-- when the person answers "yes". They are health information: they are
-- included in the training CSV export (ml/aetherskin_ml/schema.py,
-- EXTRA_COLUMNS) but never sent to Sentry. Service-role only (ADR-0002), as
-- for the table.
-- Never renumber or rename a code; add an option or ship a new quiz_version.

alter table public.quiz_responses_v3
  add column gender             text check (gender in
                                  ('female', 'male', 'non_binary_other', 'prefer_not_to_say')),
  add column medication_use     text check (medication_use in ('no', 'yes')),
  add column medication_details text check (char_length(medication_details) between 1 and 200),
  add column allergy_status     text check (allergy_status in ('no', 'yes', 'unsure')),
  add column allergy_details    text check (char_length(allergy_details) between 1 and 200);

-- A note exists only alongside a "yes".
alter table public.quiz_responses_v3
  add constraint quiz_v3_medication_note_needs_yes
    check (medication_details is null or medication_use = 'yes'),
  add constraint quiz_v3_allergy_note_needs_yes
    check (allergy_details is null or allergy_status = 'yes');
