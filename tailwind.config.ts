import type { Config } from "tailwindcss";

/**
 * AetherSkin — "Void cut". Deep-black cinema, one electric volt-lime signal,
 * one bioaetherskinescent pink pulse for detections.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        night: { DEFAULT: "#050505", 2: "#0f0f0f", 3: "#161616" },
        signal: { DEFAULT: "#d9ff3b", dim: "#5a6b14", deep: "#8fb800" },
        ember: "#ff9ee0",
        fog: "#8a9490",
        frost: "#f2f5f0",
      },
      fontFamily: {
        headline: ["var(--font-manrope)", "system-ui", "sans-serif"],
        body: ["var(--font-hanken)", "system-ui", "sans-serif"],
        label: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        beam: "0 0 44px rgba(217, 255, 59, 0.25)",
        "beam-lg": "0 0 90px rgba(217, 255, 59, 0.16)",
        pulse: "0 0 24px rgba(255, 158, 224, 0.45)",
      },
      keyframes: {
        sparkle: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.35", transform: "scale(0.7)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.8)", opacity: "0.9" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
        scanline: {
          "0%": { transform: "translateY(-8%)" },
          "100%": { transform: "translateY(108%)" },
        },
      },
      animation: {
        sparkle: "sparkle 2.4s ease-in-out infinite",
        "pulse-ring": "pulse-ring 1.4s cubic-bezier(0.2,0.6,0.4,1) infinite",
        scanline: "scanline 6s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
