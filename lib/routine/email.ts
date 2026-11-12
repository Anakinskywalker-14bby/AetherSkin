import { BRAND, SHELL, escapeHtml } from "@/lib/email";
import type { Routine, RoutineStep } from "./build";

/**
 * Renders a routine as a short, scannable email (HTML + plain text): hero,
 * a "start tonight" checklist, a morning card and a night card with every step
 * visible (no collapsibles: email clients cannot be trusted with them).
 * Wording rules:
 *  - say AetherSkin read the quiz answers; do not claim a trained model or
 *    "AI" produced it (the routine is rule-based)
 *  - never promise an allergen is gone from products we cannot see: it is kept
 *    out of the serums and listed to avoid on labels
 *  - cosmetic guidance only, no diagnosis, no brands
 * Every dynamic string is HTML-escaped; free text a member typed (only shown
 * if we could not read it) is escaped and already length-capped.
 */

/** Closing disclaimer, shown to everyone because medication notes can be incomplete. */
export const GP_DISCLAIMER = "If you are on any medication, please double-check with your GP before starting this routine.";

export const CONTACT_EMAIL = "khaleed@aetherskin.app";

export const ROUTINE_SUBJECT = "Checkout your routine, built from your quiz 👀";
export const ROUTINE_PREHEADER = "No brands. Just the ingredients + order that match your answers. Screenshot this.";

export function introParagraphs(r: Routine): string[] {
  const out: string[] = [
    `${r.summary} No brands, no guesswork: just the right ingredients in the right order.`,
    "This is the short version. Do these steps and your skin has a real shot.",
  ];
  if (r.allergens.length) {
    out.push(`You told us about ${list(r.allergens)}, so we kept ${r.allergens.length > 1 ? "them" : "it"} out of your serums. Still check labels on everything else.`);
  }
  for (const s of r.swaps) {
    out.push(
      s.to
        ? `Swap alert: because of your ${s.because} allergy, we replaced ${s.from} with ${s.to}.`
        : `Because of your ${s.because} allergy we left ${s.from} out, and nothing gentler fit, so you have one fewer serum. Less is safer.`
    );
  }
  if (r.gentleMode && r.medications.length) {
    out.push(`Because you're on ${list(r.medications)}, we kept your actives gentle: no resurfacing acids, no strong vitamin C.`);
  } else if (r.gentleMode) {
    out.push("Because you take medication for your skin, we kept your actives gentle: no resurfacing acids, no strong vitamin C.");
  }
  if (r.unrecognisedAllergy.length) {
    out.push(`We didn't recognise "${r.unrecognisedAllergy.join('", "')}" on your allergy list, so we kept things simple and gentle. Reply with the ingredient name and we'll update it.`);
  }
  if (r.unrecognisedMedication.length) {
    out.push(`We didn't recognise "${r.unrecognisedMedication.join('", "')}" in your medication list, so we kept your actives gentle. Reply with the name and we'll update it.`);
  }
  return out;
}

function list(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

type Group = { key: StepGroupKey; nickname: string; steps: RoutineStep[] };
type StepGroupKey = RoutineStep["key"];

/** Consecutive serums become one numbered step. */
function groups(steps: RoutineStep[]): Group[] {
  const out: Group[] = [];
  for (const s of steps) {
    const last = out[out.length - 1];
    if (s.key === "serum" && last && last.key === "serum") last.steps.push(s);
    else
      out.push({
        key: s.key,
        nickname: s.key === "serum" ? (s.nickname.startsWith("The Nighttime") ? "The Nighttime Rebuilders" : "Your Targeted Correctors") : s.nickname,
        steps: [s],
      });
  }
  return out;
}

/** Short checklist labels for "start tonight". */
const CHECK: Record<StepGroupKey, string> = {
  cleanser: "Cleanse", double_cleanse: "Double cleanse", toner: "Toner", serum: "Serums",
  moisturiser: "Moisturiser", night_cream: "Night cream", sunscreen: "SPF", face_oil: "Face oil",
};

const RULES = [
  "Patch-test every new product on your inner arm for 24 hours.",
  "Introduce one new product at a time.",
  "This is cosmetic guidance based on your quiz answers, not medical advice. If anything is severe, painful or changing, see a GP or dermatologist.",
];
const EXTRA_NOTES = (r: Routine) => r.notes.filter((n) => !/patch-test every new|cosmetic skincare guidance|cosmetic guidance/i.test(n));

const MORNING_TITLE = "Morning · Protect & Target";
const NIGHT_TITLE = "Night · Reset & Repair";
const MORNING_TIME = "about 5 minutes";
const NIGHT_TIME = "about 7 minutes";

const CTA_LINES = [
  "Screenshot the morning + night cards and stick them on your lock screen or bathroom mirror.",
  "Questions about any ingredient? Just reply to this email or write to khaleed@aetherskin.app. We actually read them.",
  "Hit reply in a week with a quick update and we'll tweak your plan.",
];

export function renderRoutineText(r: Routine): string {
  const lines: string[] = ["Hey,", "", ...introParagraphs(r).flatMap((p) => [p, ""])];
  const tonight = groups(r.night).map((g) => CHECK[g.key]);
  lines.push("START TONIGHT", ...tonight.map((t, i) => `${i + 1}. ${t}`), "", "Patch-test new products on your inner arm first. One new thing at a time.", "");
  const section = (title: string, time: string, steps: RoutineStep[]) => {
    lines.push("=========================================", `${title} (${time})`, "=========================================", "");
    groups(steps).forEach((g, i) => {
      lines.push(`${i + 1}. ${g.nickname}`);
      for (const s of g.steps) lines.push(`   ${s.pick}`, `   ${s.why}`);
      lines.push("");
    });
  };
  section(`MORNING: ${MORNING_TITLE.split("· ")[1]}`, MORNING_TIME, r.morning);
  section(`NIGHT: ${NIGHT_TITLE.split("· ")[1]}`, NIGHT_TIME, r.night);
  if (r.labelAvoid.length) lines.push(`Always check labels for: ${r.labelAvoid.join(", ")}.`, "");
  lines.push("QUICK RULES", ...RULES.map((x) => `- ${x}`), ...EXTRA_NOTES(r).map((n) => `- ${n}`), "");
  lines.push("-----------------------------------------", "Ready?", ...CTA_LINES, "", "Let's get your skin evolving.", "AetherSkin", CONTACT_EMAIL, "", GP_DISCLAIMER);
  return lines.join("\n");
}

const e = escapeHtml;
const F = { ink: BRAND.ink, muted: BRAND.muted };

function chip(text: string): string {
  return `<span style="display:inline-block;background:#ffffff;border:1px solid ${BRAND.mist};border-radius:999px;padding:3px 10px;font-size:12px;font-weight:700;color:${BRAND.violet};margin:0 4px 4px 0">${e(text)}</span>`;
}

function stepHtml(g: Group, n: number): string {
  const body =
    g.steps.length > 1
      ? g.steps
          .map(
            (s) => `<p style="font-size:14px;color:${F.ink};line-height:1.55;margin:0 0 8px"><strong>${e(s.pick)}</strong><br><span style="color:${F.muted}">${e(s.why)}</span></p>`
          )
          .join("")
      : `<p style="font-size:15px;font-weight:700;color:${F.ink};margin:0 0 4px">${e(g.steps[0].pick)}</p>
         <p style="font-size:14px;color:${F.muted};line-height:1.55;margin:0 0 6px">${e(g.steps[0].why)}</p>`;
  const look = g.steps.map((s) => s.tip).find((t) => t?.startsWith("Handy ingredients to look for:"));
  const chips = look
    ? `<p style="margin:6px 0 0">${look.replace("Handy ingredients to look for:", "").replace(/\.$/, "").split(",").map((x) => chip(x.trim())).join("")}</p>`
    : "";
  return `
    <div style="background:#ffffff;border:1px solid ${BRAND.mist};border-radius:20px;padding:16px 18px;margin:10px 0 0">
      <p style="font-size:12px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:${BRAND.violet};margin:0 0 2px">${n}</p>
      <p style="font-family:${BRAND.serif};font-size:21px;font-style:italic;font-weight:400;color:${F.ink};margin:0 0 8px">${e(g.nickname)}</p>
      ${body}${chips}
    </div>`;
}

export function renderRoutineHtml(r: Routine): string {
  const section = (emoji: string, title: string, time: string, steps: RoutineStep[], bg: string) => `
    <div style="background:${bg};border-radius:999px;padding:12px 22px;margin:28px 0 0">
      <p style="font-size:13px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:${F.ink};margin:0">${emoji} ${e(title)} <span style="font-weight:600;text-transform:none;letter-spacing:0;color:${F.muted}">(${e(time)})</span></p>
    </div>
    ${groups(steps).map((g, i) => stepHtml(g, i + 1)).join("")}`;

  const tonight = groups(r.night).map((g) => CHECK[g.key]);
  const extra = EXTRA_NOTES(r);

  return SHELL(`
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px">${e(ROUTINE_PREHEADER)}</div>
    <p style="font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:${BRAND.violet};margin:0 0 8px">✦ Your plan is ready</p>
    <h1 style="font-size:32px;font-weight:500;color:${F.ink};margin:0 0 16px;line-height:1.15;letter-spacing:-.01em">Your routine, <em style="font-family:${BRAND.serif};font-weight:400">read from your skin.</em></h1>
    <p style="font-size:16px;color:${F.muted};line-height:1.65;margin:0 0 10px">Hey,</p>
    ${introParagraphs(r).map((p) => `<p style="font-size:16px;color:${F.muted};line-height:1.65;margin:0 0 10px">${e(p)}</p>`).join("")}
    <div style="background:${BRAND.blush};border-radius:20px;padding:16px 20px;margin:18px 0 0">
      <p style="font-size:12px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:${F.ink};margin:0 0 8px">Start tonight (about 7 mins)</p>
      <p style="font-size:15px;color:${F.ink};line-height:1.8;margin:0">${tonight.map((t, i) => `${i + 1}. ${e(t)}`).join("<br>")}</p>
      <p style="font-size:13px;color:${F.muted};line-height:1.5;margin:10px 0 0">Patch-test new products on your inner arm first. One new thing at a time.</p>
    </div>
    ${section("☀️", MORNING_TITLE, MORNING_TIME, r.morning, BRAND.peach)}
    ${section("🌙", NIGHT_TITLE, NIGHT_TIME, r.night, BRAND.mist)}
    ${r.labelAvoid.length ? `<p style="font-size:14px;color:${F.ink};line-height:1.6;margin:24px 0 0;background:${BRAND.blush};border-radius:18px;padding:14px 18px"><strong>Always check labels for:</strong> ${e(r.labelAvoid.join(", "))}.</p>` : ""}
    <p style="font-size:12px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:${F.ink};margin:26px 0 6px">Quick rules</p>
    ${[...RULES, ...extra].map((x) => `<p style="font-size:13px;color:${F.muted};line-height:1.55;margin:0 0 6px">• ${e(x)}</p>`).join("")}
    <p style="font-family:${BRAND.serif};font-size:24px;font-style:italic;color:${F.ink};margin:28px 0 8px">Ready?</p>
    ${CTA_LINES.map((x) => `<p style="font-size:15px;color:${F.ink};line-height:1.6;margin:0 0 8px">${e(x)}</p>`).join("")}
    <p style="font-size:15px;color:${F.ink};margin:14px 0 0">Let's get your skin evolving.<br>— AetherSkin<br><a href="mailto:${CONTACT_EMAIL}" style="color:${BRAND.violet};font-weight:700">${CONTACT_EMAIL}</a></p>
    <p style="font-size:13px;font-weight:700;color:${F.ink};line-height:1.6;margin:20px 0 0;background:${BRAND.blush};border-radius:14px;padding:12px 16px">${e(GP_DISCLAIMER)}</p>`);
}

export function renderRoutineEmail(r: Routine): { subject: string; text: string; html: string } {
  return { subject: ROUTINE_SUBJECT, text: renderRoutineText(r), html: renderRoutineHtml(r) };
}
