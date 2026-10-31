/**
 * "14+ skin issues" card for the Solution section: two rows of soft glowing
 * chips drifting in opposite directions, faded at the edges. Pure CSS (no
 * client JS); the rows stop for reduced motion and pause on hover.
 *
 * Cosmetic concerns only. Nothing medical (moles, lesions) is listed, because
 * AetherSkin is not a diagnostic tool.
 */
const ROW_A = [
  { name: "Wrinkles", hue: "#9C7BD8" },
  { name: "Inflammatory acne", hue: "#F08C9E" },
  { name: "Whiteheads", hue: "#8FB4F0" },
  { name: "Redness", hue: "#F29A8B" },
  { name: "Dark spots", hue: "#C79A7A" },
  { name: "Visible pores", hue: "#86CFB5" },
  { name: "Dark circles", hue: "#7C82D6" },
  { name: "Dryness", hue: "#F4B8A2" },
];
const ROW_B = [
  { name: "Acne scars", hue: "#F3A673" },
  { name: "Blackheads", hue: "#8C7AA8" },
  { name: "Pigmentation", hue: "#D9A15F" },
  { name: "Fine lines", hue: "#B59CE6" },
  { name: "Oiliness", hue: "#E5C86A" },
  { name: "Uneven texture", hue: "#E58FC4" },
  { name: "Puffiness", hue: "#9DC3E8" },
  { name: "Freckles", hue: "#B47FE0" },
];
export const SKIN_ISSUE_COUNT = ROW_A.length + ROW_B.length;

function Row({ items, reverse }: { items: typeof ROW_A; reverse?: boolean }) {
  // The list is rendered twice so the -50% translate loops seamlessly.
  const doubled = [...items, ...items];
  return (
    <div className="sk-row">
      <ul className={reverse ? "sk-track sk-track--rev" : "sk-track"}>
        {doubled.map((it, i) => (
          <li key={`${it.name}-${i}`} className="sk-chip" aria-hidden={i >= items.length || undefined}>
            <span className="sk-orb" style={{ "--sk-hue": it.hue } as React.CSSProperties} />
            <span className="sk-name">{it.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SkinIssuesMarquee() {
  return (
    <div className="sk-card">
      <div className="sk-rows">
        <Row items={ROW_A} />
        <Row items={ROW_B} reverse />
      </div>
      <div className="sk-copy">
        <p className="sk-badge">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.5 14 10l8.5 2-8.5 2-2 8.5-2-8.5L1.5 12 10 10Z" /></svg>
          AT BETA LAUNCH
        </p>
        <h3 className="sk-title">
          See the condition of <em>14+ skin issues</em>
        </h3>
        <p className="sk-note">One selfie, every concern scored, so you treat what is actually there.</p>
      </div>
    </div>
  );
}
