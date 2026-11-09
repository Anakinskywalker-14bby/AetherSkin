import data from "./reference.generated.json";

/**
 * The three curated reference lists (ml/*_reference_list.csv), generated into
 * reference.generated.json by scripts/build-routine-reference.mjs. Aliases are
 * lower-case spellings people type; codes are the stable identifiers.
 */
export interface RefEntry {
  code: string;
  /** Class or category from the list (medications, allergies). */
  cls?: string;
  /** Display name (active ingredients). */
  name?: string;
  /** "A".."D" for active ingredients. */
  group?: string;
  aliases: string[];
}

export const MEDICATIONS = data.medications as unknown as RefEntry[];
export const ALLERGIES = data.allergies as unknown as RefEntry[];
export const ACTIVES = data.actives as unknown as RefEntry[];

const BY_CODE = new Map<string, RefEntry>(
  [...MEDICATIONS, ...ALLERGIES, ...ACTIVES].map((e) => [e.code, e])
);

export function entryByCode(code: string): RefEntry | undefined {
  return BY_CODE.get(code);
}

/** A readable name for a matched entry: the ingredient name, else its first alias. */
export function displayName(e: RefEntry): string {
  return e.name ?? e.aliases[0];
}
