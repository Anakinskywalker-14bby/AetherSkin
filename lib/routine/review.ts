import type { Routine } from "./build";

/**
 * Decides whether a routine may be emailed automatically or must wait for the
 * owner. A routine is held when we could not fully read what the member told us
 * about allergies or medication, or when no safe sunscreen could be chosen.
 *
 * Returns short reason codes only. The member's own words are health data, so
 * they never appear here (these reasons go to the audit log, Sentry and the
 * owner's alert email).
 */
export type HoldReason = "unreadable_allergy_note" | "unreadable_medication_note" | "no_safe_sunscreen";

export function holdReasons(r: Routine): HoldReason[] {
  const out: HoldReason[] = [];
  if (r.conservative) out.push("unreadable_allergy_note");
  if (r.unrecognisedMedication.length > 0) out.push("unreadable_medication_note");
  // needsReview is also set when the allergy list rules out every sunscreen family.
  if (r.needsReview && out.length === 0) out.push("no_safe_sunscreen");
  return out;
}
