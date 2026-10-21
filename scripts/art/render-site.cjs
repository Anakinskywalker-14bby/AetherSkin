// Renders the landing page's six artworks from the Raking Light algorithm.
// Each entry is fully specified (seed + parameters), so every image on the
// site can be regenerated exactly from this file.
//
// Provenance: these replace six screenshots of third-party Pinterest pins
// that previously sat in public/design (other brands' ads, a creator's post,
// watermarks). Everything in public/art is generated here, from code in this
// repository, and nothing else.
//
// Run (the canvas package is only needed for this script, so it is not a
// project dependency):
//   npm install --no-save @napi-rs/canvas
//   node scripts/art/render-site.cjs            # writes public/art/*.webp
//
// The interactive version of the algorithm (seed explorer + parameters) is
// raking-light-viewer.html in the AetherSkin design pack.
const { createCanvas } = require("@napi-rs/canvas");
const fs = require("fs");
const RL = require("./raking-light.cjs");

const PAL = {
  coral: { deep: "#2a0c18", shadow: "#8c2f3a", mid: "#e2645a", light: "#ffb487", highlight: "#fff1dc", ink: "#2a0c18" },
  golden: { deep: "#24110b", shadow: "#7a3a22", mid: "#c7804c", light: "#efbc80", highlight: "#fff3d9", ink: "#2b130b" },
  deep: { deep: "#120706", shadow: "#3d1d12", mid: "#7a4127", light: "#b8774a", highlight: "#f1cf9c", ink: "#f6dcb6" },
  fair: { deep: "#3a1724", shadow: "#a65466", mid: "#e7a19a", light: "#f8cdbf", highlight: "#fff8ef", ink: "#4a1b2b" },
};

const JOBS = [
  // Hero mirror arch, 3:4.
  { file: "hero", w: 900, h: 1200, p: { seed: 20261021, palette: PAL.coral, poreDensity: 0.62, droplets: 2, dropletSize: 0.085, scanPosition: 0.6 } },
  // "The glow-up" panel: dewy, glossy, several small beads. Text sits on a
  // dark gradient at the bottom, so the reading band stays high.
  { file: "glass-skin", w: 1200, h: 1100, p: { seed: 7741, palette: PAL.golden, gloss: 0.78, poreDensity: 0.7, poreDepth: 0.5, droplets: 6, dropletSize: 0.045, lightAzimuth: 120, lightElevation: 16, scanPosition: 0.3, scanWidth: 0.1, contours: 16, contourOpacity: 0.42 } },
  // Dropper panel: high-key and calm, one bead where the animated drop lands.
  { file: "dropper", w: 1200, h: 760, p: { seed: 3302, palette: PAL.fair, relief: 0.7, undulation: 0.7, poreDepth: 0.45, creases: 0.25, lightElevation: 24, dropletList: [{ x: 0.5, y: 0.8, r: 0.1 }], contours: 14, contourOpacity: 0.3, scanPosition: 0.5, scanWidth: 0.3, scanAngle: 0, grain: 0.025 } },
  // Gallery: the same lamp and the same reading across three complexions.
  { file: "gallery-deep", w: 900, h: 1000, p: { seed: 515, palette: PAL.deep, poreDensity: 0.6, droplets: 2, dropletSize: 0.07, lightAzimuth: 150, scanPosition: 0.55, contourOpacity: 0.42 } },
  { file: "gallery-golden", w: 900, h: 1000, p: { seed: 1288, palette: PAL.golden, poreDensity: 0.66, droplets: 3, dropletSize: 0.06, lightAzimuth: 140, scanPosition: 0.5 } },
  { file: "gallery-fair", w: 900, h: 1000, p: { seed: 4096, palette: PAL.fair, poreDensity: 0.58, droplets: 2, dropletSize: 0.075, lightAzimuth: 135, scanPosition: 0.45 } },
];

// Output location is fixed, never taken from the command line: a path
// argument flowing into writeFileSync is a path-traversal pattern (Snyk Code
// flagged it), and nothing needs these files anywhere else.
const outDir = require("path").join(__dirname, "../../public/art");
fs.mkdirSync(outDir, { recursive: true });

// Optional: render a single artwork by name. Only names from JOBS are
// accepted, so the argument can't steer a write anywhere.
const only = process.argv[2];
if (only && !JOBS.some((j) => j.file === only)) {
  console.error(`Unknown artwork "${only}". Choose one of: ${JOBS.map((j) => j.file).join(", ")}`);
  process.exit(1);
}
for (const j of JOBS) {
  if (only && j.file !== only) continue;
  const t0 = Date.now();
  const c = createCanvas(j.w, j.h);
  RL.render(c.getContext("2d"), j.w, j.h, j.p);
  fs.writeFileSync(`${outDir}/${j.file}.webp`, c.toBuffer("image/webp", 82));
  const kb = (fs.statSync(`${outDir}/${j.file}.webp`).size / 1024).toFixed(0);
  console.log(`${j.file}: ${j.w}x${j.h} ${Date.now() - t0}ms ${kb}KB webp`);
}

