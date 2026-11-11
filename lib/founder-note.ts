/**
 * The founder's note, in one place. The landing page, the About page and the
 * email sent after signup all render exactly these words, so they can never
 * drift apart. `b: true` marks the bold phrases. No result or health claims.
 */
export type NoteSegment = { t: string; b?: boolean };

export const FOUNDER_NOTE = {
  kicker: "A note from the founder",
  titleLead: "Why I'm building",
  titleBrand: "AetherSkin",
  paragraphs: [
    [
      {
        t: "Skincare advice online is made for everyone, which means it's made for no one. A trend can't see your skin. It doesn't know your budget, what you've already tried, or what's sitting on your shelf right now.",
      },
    ],
    [
      { t: "I'm building AetherSkin to flip that around. It starts with " },
      { t: "you", b: true },
      { t: ": your answers today, your selfie at beta launch, and a routine built around your skin instead of someone else's." },
    ],
    [
      { t: "And instead of ten tabs, five stores and a hundred opinions, the brands you already love are " },
      { t: "all in one spot", b: true },
      { t: ", matched to you." },
    ],
  ] as NoteSegment[][],
  name: "Khaleed",
  role: "Founder, AetherSkin",
} as const;
