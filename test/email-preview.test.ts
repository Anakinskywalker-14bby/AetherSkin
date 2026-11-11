import { describe, it } from "vitest";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { founderNoteEmail, quizCompleteEmail, verificationEmail } from "@/lib/email";

/**
 * Not a real test: when EMAIL_PREVIEW_DIR is set it writes the signup emails
 * there so they can be viewed in a browser (logo inlined, works offline).
 *   $env:EMAIL_PREVIEW_DIR="previews\emails"; npx vitest run test/email-preview.test.ts
 */
const dir = process.env.EMAIL_PREVIEW_DIR;

describe.skipIf(!dir)("signup email preview", () => {
  it("writes the emails", () => {
    mkdirSync(dir!, { recursive: true });
    const logo = `data:image/png;base64,${readFileSync(join(process.cwd(), "public", "brand", "lockup-aetherskin.png")).toString("base64")}`;
    const wrap = (html: string) =>
      `<!doctype html><meta charset="utf-8">${html
        .replace(/src="[^"]*lockup-aetherskin\.png"/, `src="${logo}"`)}`;
    writeFileSync(join(dir!, "signup-verify.html"), wrap(verificationEmail("preview-token")));
    writeFileSync(join(dir!, "signup-complete.html"), wrap(quizCompleteEmail(42)));
    writeFileSync(join(dir!, "founder-note.html"), wrap(founderNoteEmail()));
  });
});
