import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "AetherSkin — AI skin analysis. Stop guessing. Start knowing.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#f9f9f7",
          padding: 72,
          border: "16px solid #1a1c1b",
        }}
      >
        <div
          style={{
            display: "flex",
            alignSelf: "flex-start",
            background: "#beeaf8",
            border: "5px solid #1a1c1b",
            boxShadow: "8px 8px 0 #1a1c1b",
            padding: "10px 26px",
            fontSize: 28,
            fontWeight: 700,
            color: "#1a1c1b",
            marginBottom: 40,
          }}
        >
          AI SKIN ANALYSIS · BETA OPEN
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 120,
            fontWeight: 900,
            fontStyle: "italic",
            color: "#1a1c1b",
            letterSpacing: -5,
            marginBottom: 24,
          }}
        >
          AetherSkin
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 44,
            fontWeight: 700,
            color: "#1a1c1b",
            marginBottom: 44,
          }}
        >
          Stop guessing. Start knowing.
        </div>
        <div
          style={{
            display: "flex",
            alignSelf: "flex-start",
            background: "#e8e883",
            border: "5px solid #1a1c1b",
            boxShadow: "8px 8px 0 #1a1c1b",
            padding: "18px 40px",
            fontSize: 32,
            fontWeight: 700,
            color: "#1a1c1b",
          }}
        >
          JOIN THE BETA →
        </div>
      </div>
    ),
    { ...size }
  );
}
