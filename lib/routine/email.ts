import { BRAND, SHELL, escapeHtml } from "@/lib/email";
import type { Routine, RoutineStep } from "./build";

/**
 * Renders a routine as the personalised "skin lab report" email (HTML + plain
 * text). Copy is a first draft to be refined later. Wording rules:
 *  - say AetherSkin read the quiz answers; do not claim a trained model or
 *    "AI" produced it (the routine is rule-based)
 *  - never promise an allergen is gone from products we cannot see: it is kept
 *    out of the serums and listed to avoid on labels
 *  - cosmetic guidance only, no diagnosis, no brands
 * Every dynamic string is HTML-escaped; free text a member typed (only shown
 * if we could not read it) is escaped and already length-capped.
 */

export const ROUTINE_SUBJECT = "Your Personalised Skin Lab Report 🧪 (No Guesswork Required)";

export function introParagraphs(r: Routine): string[] {
  const out: string[] = [
    "We read every answer you gave us and built this routine around you: your skin, your goals, and what you told us about medication and allergies. No brands, no guesswork. Just the right ingredients, in the right order.",
  ];
  if (r.allergens.length) {
    out.push(`You told us about ${list(r.allergens)}. We kept ${r.allergens.length > 1 ? "them" : "it"} out of your serums and listed what to avoid on labels for every other step.`);
  }
  for (const s of r.swaps) {
    out.push(
      s.to
        ? `Swap alert: because of your ${s.because} allergy, we replaced ${s.from} with ${s.to}.`
        : `Because of your ${s.because} allergy we left ${s.from} out, and nothing gentler fit, so you have one fewer serum. Less is safer.`
    );
  }
  if (r.gentleMode && r.medications.length) {
    out.push(`Because you're on ${list(r.medications)}, we kept your actives gentle: no resurfacing acids and no strong vitamin C, so we don't stack irritation on top of your treatment.`);
  } else if (r.gentleMode) {
    out.push("Because you take medication for your skin, we kept your actives gentle: no resurfacing acids and no strong vitamin C.");
  }
  if (r.unrecognisedAllergy.length) {
    out.push(`We didn't recognise "${r.unrecognisedAllergy.join('", "')}" on your allergy list, so we kept your routine to the simplest, gentlest option. Reply with the ingredient name and we'll update it.`);
  }
  if (r.unrecognisedMedication.length) {
    out.push(`We didn't recognise "${r.unrecognisedMedication.join('", "')}" in your medication list, so we kept your actives gentle as a precaution. Reply with the name and we'll update it.`);
  }
  out.push("Here is your master plan for radiant, healthy skin.");
  return out;
}

function list(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

type Group = { header: string; nickname: string; steps: RoutineStep[] };

/** Consecutive serums become one numbered step. */
function groups(steps: RoutineStep[]): Group[] {
  const out: Group[] = [];
  for (const s of steps) {
    const last = out[out.length - 1];
    if (s.key === "serum" && last && last.steps[0].key === "serum") last.steps.push(s);
    else
      out.push({
        header: s.key === "serum" ? "ACTIVE SERUMS" : s.title,
        nickname: s.key === "serum" ? (s.nickname.startsWith("The Nighttime") ? "The Nighttime Rebuilders" : "Your Targeted Correctors") : s.nickname,
        steps: [s],
      });
  }
  return out;
}

const RULE = "=========================================";

export function renderRoutineText(r: Routine): string {
  const lines: string[] = ["Hi there,", "", ...introParagraphs(r).flatMap((p) => [p, ""])];
  const section = (title: string, steps: RoutineStep[]) => {
    lines.push(RULE, title, RULE, "");
    groups(steps).forEach((g, i) => {
      lines.push(`${i + 1}. ${g.header}: ${g.nickname}`);
      for (const s of g.steps) {
        lines.push(g.steps.length > 1 || s.key === "serum" ? `   ${s.pick}` : `   Use: ${s.pick}`);
        lines.push(`   What it does: ${s.what}`, `   Why it's for you: ${s.why}`);
        if (s.tip) lines.push(`   Tip: ${s.tip}`);
      }
      lines.push("");
    });
  };
  section("☀️ THE MORNING ROUTINE: Protect & Target", r.morning);
  section("🌙 THE NIGHT ROUTINE: Reset & Repair", r.night);
  if (r.labelAvoid.length) lines.push(`Always check labels for: ${r.labelAvoid.join(", ")}.`, "");
  lines.push(...r.notes.flatMap((n) => [n, ""]));
  lines.push("-----------------------------------------", "Ready to start your skin evolution?", "Reply directly to this email if you have any questions about your custom ingredients!", "", "AetherSkin");
  return lines.join("\n");
}

const e = escapeHtml;

const F = { ink: BRAND.ink, muted: BRAND.muted };

function stepHtml(g: Group, n: number): string {
  const items = g.steps
    .map(
      (s) => `
      <div style="margin:0 0 14px">
        <p style="font-size:15px;font-weight:700;color:${F.ink};margin:0 0 4px">${e(s.pick)}</p>
        <p style="font-size:14px;color:${F.muted};line-height:1.6;margin:0 0 8px"><strong style="color:${F.ink}">What it does:</strong> ${e(s.what)}</p>
        <p style="font-size:14px;color:${F.ink};line-height:1.6;margin:0;background:${BRAND.blush};border-radius:14px;padding:10px 14px"><strong>Why it's for you:</strong> ${e(s.why)}</p>
        ${s.tip ? `<p style="font-size:12px;color:${F.muted};line-height:1.5;margin:8px 0 0">${e(s.tip)}</p>` : ""}
      </div>`
    )
    .join("");
  return `
    <div style="background:#ffffff;border:1px solid ${BRAND.mist};border-radius:22px;padding:20px 20px 8px;margin:14px 0 0">
      <p style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${BRAND.violet};margin:0 0 4px">Step ${n} · ${e(g.header)}</p>
      <p style="font-family:${BRAND.serif};font-size:22px;font-style:italic;font-weight:400;color:${F.ink};margin:0 0 14px">${e(g.nickname)}</p>
      ${items}
    </div>`;
}

export function renderRoutineHtml(r: Routine): string {
  const section = (emoji: string, title: string, steps: RoutineStep[], bg: string) => `
    <div style="background:${bg};border-radius:999px;padding:12px 22px;margin:30px 0 0">
      <p style="font-size:13px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:${F.ink};margin:0">${emoji} ${e(title)}</p>
    </div>
    ${groups(steps).map((g, i) => stepHtml(g, i + 1)).join("")}`;

  return SHELL(`
    <p style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${BRAND.violet};margin:0 0 8px">✦ Your skin lab report</p>
    <h1 style="font-size:32px;font-weight:500;color:${F.ink};margin:0 0 16px;line-height:1.15;letter-spacing:-.01em">Your routine, <em style="font-family:${BRAND.serif};font-weight:400">read from your skin.</em> 🧪</h1>
    <p style="font-size:16px;color:${F.muted};line-height:1.7;margin:0 0 12px">Hi there,</p>
    ${introParagraphs(r).map((p) => `<p style="font-size:16px;color:${F.muted};line-height:1.7;margin:0 0 12px">${e(p)}</p>`).join("")}
    ${section("☀️", "The morning routine: Protect & Target", r.morning, BRAND.peach)}
    ${section("🌙", "The night routine: Reset & Repair", r.night, BRAND.mist)}
    ${r.labelAvoid.length ? `<p style="font-size:14px;color:${F.ink};line-height:1.6;margin:24px 0 0;background:${BRAND.blush};border-radius:18px;padding:14px 18px"><strong>Always check labels for:</strong> ${e(r.labelAvoid.join(", "))}.</p>` : ""}
    ${r.notes.map((n) => `<p style="font-size:13px;color:${F.muted};line-height:1.6;margin:14px 0 0">${e(n)}</p>`).join("")}
    <p style="font-family:${BRAND.serif};font-size:22px;font-style:italic;color:${F.ink};margin:28px 0 4px">Ready to start your skin evolution?</p>
    <p style="font-size:14px;color:${F.muted};line-height:1.6;margin:0">Reply directly to this email if you have any questions about your custom ingredients!</p>`);
}

export function renderRoutineEmail(r: Routine): { subject: string; text: string; html: string } {
  return { subject: ROUTINE_SUBJECT, text: renderRoutineText(r), html: renderRoutineHtml(r) };
}
