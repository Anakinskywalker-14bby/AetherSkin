import { ACTIVES, ALLERGIES, MEDICATIONS, type RefEntry } from "./reference";

/**
 * Reads a member's typed medication or allergy note against the reference
 * lists. Three outcomes matter for safety:
 *
 *   matched       every list entry whose spelling appears in the note. When two
 *                 entries share a spelling (e.g. "soy"), BOTH match: for an
 *                 allergy filter an extra match only makes the routine safer.
 *   unrecognised  words left over that are not on any list. The caller must
 *                 treat these as "could be an allergen" and fall back to the
 *                 gentlest routine; they are never silently ignored.
 *   (nothing)     the note says no/none/unsure, or is empty.
 *
 * Matching is whole-word (so "mi" does not match inside "vitamin") and longest
 * spelling first (so "cetyl alcohol" is not also read as drying "alcohol").
 */

const MAX_NOTE = 400;

const FILLER = new Set(
  (
    "a an the and or of to in on for with from by my me i im i'm am is are was have has had take takes taking took " +
    "use uses using used get gets got allergic allergy allergies allergen sensitive sensitivity react reacts reaction " +
    "reactions rash rashes cream creams serum serums gel gels lotion ointment tablet tablets pill pills capsule " +
    "capsules mg ml daily day days night nights morning once twice weekly week weeks month months year years every " +
    "topical oral prescribed prescription doctor dermatologist derm gp pharmacist skin acne medication medications " +
    "medicine meds treatment treatments currently also some bit little very mild mildly bad badly when it they them " +
    "that this which stuff things thing products product ingredient ingredients"
  ).split(" ")
);

const NOTHING = /^(none|no|nil|n\/?a|na|nothing|not sure|unsure|idk|dont know|don'?t know|nope|-|\.)$/;

export function normaliseNote(input: string): string {
  return input
    .slice(0, MAX_NOTE)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z0-9%'\-+/.,;&\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\/-]/g, "\\$&");

/** Edit distance, capped: returns > max as soon as it cannot be within max. */
function within(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return false;
    prev = cur;
  }
  return prev[b.length] <= max;
}

export interface NoteMatch {
  entries: RefEntry[];
  unrecognised: string[];
}

export function matchNote(note: string | null | undefined, lists: readonly RefEntry[][]): NoteMatch {
  const empty: NoteMatch = { entries: [], unrecognised: [] };
  if (typeof note !== "string") return empty;
  let text = normaliseNote(note);
  if (!text || NOTHING.test(text)) return empty;

  // alias -> every entry that spells it that way
  const index = new Map<string, RefEntry[]>();
  for (const list of lists) {
    for (const e of list) {
      for (const a of e.aliases) {
        const bucket = index.get(a);
        if (bucket) bucket.push(e);
        else index.set(a, [e]);
      }
    }
  }
  const aliases = [...index.keys()].sort((a, b) => b.length - a.length || (a < b ? -1 : 1));

  const found = new Map<string, RefEntry>();
  const take = (alias: string) => {
    for (const e of index.get(alias) ?? []) found.set(e.code, e);
  };

  // 1. Exact whole-word spellings, longest first; matched text is blanked out.
  for (const alias of aliases) {
    const re = new RegExp(`(?<![a-z0-9])${escapeRe(alias)}(?:s|es)?(?![a-z0-9])`, "g");
    if (!re.test(text)) continue;
    take(alias);
    text = text.replace(re, (m) => " ".repeat(m.length));
  }

  // 2. What is left, split into pieces: fuzzy-match, else report.
  const unrecognised: string[] = [];
  for (const piece of text.split(/[,;&+/|\n.]+|\s+(?:and|or|plus)\s+/)) {
    const words = piece
      .split(/\s+/)
      .map((w) => w.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ""))
      .filter((w) => w && !FILLER.has(w) && !/^\d+(\.\d+)?%?$/.test(w));
    if (words.length === 0) continue;

    // Walk the words left to right, trying windows of 3, 2, then 1 word. A
    // matched window is consumed; every word that matches nothing is reported,
    // so one recognised name can never hide another misspelled one.
    const leftover: string[] = [];
    let i = 0;
    while (i < words.length) {
      let used = 0;
      for (let len = Math.min(3, words.length - i); len >= 1 && !used; len--) {
        const chunk = words.slice(i, i + len).join(" ");
        for (const alias of aliases) {
          if (alias.length < 6) continue;
          const max = alias.length >= 12 ? 2 : 1;
          if (within(chunk, alias, max)) {
            take(alias);
            used = len;
            break;
          }
        }
      }
      if (used) i += used;
      else leftover.push(words[i++]);
    }
    if (leftover.length) unrecognised.push(leftover.join(" ").slice(0, 60));
  }

  return { entries: [...found.values()], unrecognised: [...new Set(unrecognised)] };
}

/** An allergy note can name a product ingredient (niacinamide) or an allergen (fragrance). */
export function matchAllergyNote(note: string | null | undefined): NoteMatch {
  return matchNote(note, [ALLERGIES, ACTIVES]);
}

export function matchMedicationNote(note: string | null | undefined): NoteMatch {
  return matchNote(note, [MEDICATIONS]);
}
