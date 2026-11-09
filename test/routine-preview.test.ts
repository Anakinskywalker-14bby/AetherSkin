import { describe, it } from "vitest";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildRoutine } from "@/lib/routine/build";
import { renderRoutineEmail } from "@/lib/routine/email";

/**
 * Not a real test: when ROUTINE_PREVIEW_DIR is set it writes sample emails to
 * that folder so the copy can be read in a browser. Skipped otherwise.
 *   $env:ROUTINE_PREVIEW_DIR="previews\emails"; npx vitest run test/routine-preview.test.ts
 */
const dir = process.env.ROUTINE_PREVIEW_DIR;

describe.skipIf(!dir)("routine email preview", () => {
  it("writes sample emails", () => {
    mkdirSync(dir!, { recursive: true });
    const logo = `data:image/png;base64,${readFileSync(join(process.cwd(), "public", "brand", "lockup-aetherskin.png")).toString("base64")}`;
    const base: Record<string, unknown> = {
      gender: "female", medication_use: "no", medication_details: null, allergy_status: "no", allergy_details: null,
      primary_goal: "acne_control", skin_type: "oily", environment: "urban_pollution", texture_preference: "gel_fluid",
      sunscreen_frequency: 2, routine_complexity: 2, age: 27, breakouts_level: 3, redness_level: 1, dryness_level: 1,
    };
    const samples: Record<string, Record<string, unknown>> = {
      "acne-with-allergy": { ...base, allergy_status: "yes", allergy_details: "salicylic acid, fragrance" },
      "dry-on-accutane": { ...base, skin_type: "dry", primary_goal: "hydration", breakouts_level: 2, dryness_level: 4, medication_use: "yes", medication_details: "Accutane" },
      "anti-aging": { ...base, skin_type: "normal", primary_goal: "anti_aging", age: 41, breakouts_level: 0, dryness_level: 1, environment: "outdoors" },
    };
    for (const [name, input] of Object.entries(samples)) {
      const m = buildRoutine(input as never);
      const mail = renderRoutineEmail(m);
      // Inline the logo so the preview works offline (real emails use the hosted URL).
      const html = mail.html.replace(/src="[^"]*lockup-aetherskin\.png"/, `src="${logo}"`);
      writeFileSync(join(dir!, `${name}.html`), `<!doctype html><meta charset="utf-8">${html}`);
      writeFileSync(join(dir!, `${name}.txt`), `Subject: ${mail.subject}\n\n${mail.text}`);
    }
  });
});
