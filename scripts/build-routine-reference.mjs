/**
 * Builds lib/routine/reference.generated.json from the curated lists in ml/
 * (medication, allergy, active ingredient, and active_ingredient_swaps). The lists are the source of
 * truth; the JSON is what the site reads at runtime.
 *
 *   node scripts/build-routine-reference.mjs          write the JSON
 *   node scripts/build-routine-reference.mjs --check  exit 1 if it is stale
 *
 * test/routine.test.ts runs --check, so editing a list without regenerating
 * fails the build.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "lib", "routine", "reference.generated.json");

/** Minimal RFC 4180 parser: quoted fields, doubled quotes, CRLF or LF. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows;
}

function aliases(cell) {
  return [...new Set(cell.split(",").map((a) => a.trim().toLowerCase()).filter(Boolean))];
}

export function buildReference(dir) {
  const read = (name) => parseCsv(readFileSync(join(dir, name), "utf8")).slice(1);

  const medications = read("medication_reference_list.csv").map(([typed, code, cls]) => ({
    code: code.trim(),
    cls: cls.trim(),
    aliases: aliases(typed),
  }));
  const allergies = read("allergy_reference_list.csv").map(([typed, code, cls]) => ({
    code: code.trim(),
    cls: cls.trim(),
    aliases: aliases(typed),
  }));
  const actives = read("active_ingredients_reference_list.csv").map(([cls, mechanism, typed, code, name]) => ({
    code: code.trim(),
    name: name.trim(),
    group: cls.trim().split(":")[0].replace("Class ", "").trim(), // "A".."D"
    groupName: cls.trim().split(":")[1]?.trim() ?? "",
    mechanism: mechanism.trim(),
    aliases: aliases(typed),
  }));

  // active_ingredient_swaps.csv: Type, Trigger, Blocked actives, Safe swaps, Rationale.
  const codeList = (cell) => [...new Set(cell.split(",").map((c) => c.trim()).filter(Boolean))];
  const swaps = { allergy: {}, active: {}, medication: {} };
  const SWAP_TYPES = { Allergy: "allergy", "Active Sensitivity": "active", "Medication Contraindication": "medication" };
  for (const [type, trigger, blocked, safe] of read("active_ingredient_swaps.csv")) {
    const kind = SWAP_TYPES[type.trim()];
    if (!kind) throw new Error(`swaps list: unknown type ${type}`);
    const key = trigger.trim();
    const prev = swaps[kind][key] ?? { blocks: [], safe: [] };
    swaps[kind][key] = {
      blocks: [...new Set([...prev.blocks, ...codeList(blocked)])],
      safe: [...new Set([...prev.safe, ...codeList(safe)])],
    };
  }

  for (const [label, list] of [["medication", medications], ["allergy", allergies], ["active", actives]]) {
    const codes = new Set();
    for (const e of list) {
      if (!e.code || e.aliases.length === 0) throw new Error(`${label} list: row with empty code or aliases`);
      if (codes.has(e.code)) throw new Error(`${label} list: duplicate code ${e.code}`);
      codes.add(e.code);
    }
  }
  return { medications, allergies, actives, swaps };
}

export function render(dir) {
  return JSON.stringify(buildReference(dir), null, 1) + "\n";
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const next = render(join(ROOT, "ml"));
  if (process.argv.includes("--check")) {
    let current = "";
    try {
      current = readFileSync(OUT, "utf8");
    } catch {
      /* missing counts as stale */
    }
    if (current !== next) {
      console.error("lib/routine/reference.generated.json is stale: run node scripts/build-routine-reference.mjs");
      process.exit(1);
    }
    console.log("reference.generated.json is up to date");
  } else {
    writeFileSync(OUT, next);
    console.log("wrote", OUT);
  }
}
