import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "AetherSkin — your skin, in a better light.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Social share card, in the "Mirror Moment" palette.
 *
 * Satori (which renders this) supports a subset of CSS: no color-mix(), no
 * CSS variables, and every element needs an explicit display. Colours are
 * therefore literal hex rather than the theme tokens, and this card is always
 * the light theme — social previews have no concept of a user's preference.
 */
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
          background: "#FFF6EC",
          padding: 84,
          position: "relative",
        }}
      >
        {/* The sunrise, bled off the bottom-right corner. */}
        <div
          style={{
            position: "absolute",
            right: -120,
            bottom: -220,
            width: 520,
            height: 520,
            borderRadius: 520,
            background: "#FFD166",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: -40,
            bottom: -170,
            width: 360,
            height: 360,
            borderRadius: 360,
            background: "#FF6B5B",
            display: "flex",
          }}
        />

        <div
          style={{
            display: "flex",
            alignSelf: "flex-start",
            background: "#FFD3DC",
            padding: "12px 28px",
            borderRadius: 999,
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: 2,
            color: "#5A1832",
            marginBottom: 38,
          }}
        >
          FREE AI SKIN ANALYSIS · BETA OPEN
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 118,
            fontWeight: 600,
            color: "#5A1832",
            letterSpacing: -4,
            marginBottom: 20,
          }}
        >
          aetherskin
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 46,
            fontWeight: 400,
            color: "#5A1832",
            marginBottom: 46,
          }}
        >
          Your skin, in a better light.
        </div>

        <div
          style={{
            display: "flex",
            alignSelf: "flex-start",
            background: "#FF6B5B",
            padding: "20px 44px",
            borderRadius: 999,
            fontSize: 30,
            fontWeight: 700,
            color: "#FFF6EC",
          }}
        >
          Join the beta — free
        </div>
      </div>
    ),
    { ...size }
  );
}
