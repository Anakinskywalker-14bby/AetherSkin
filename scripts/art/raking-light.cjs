/*
 * Raking Light: a generative surface study for AetherSkin.
 *
 * One function, render(ctx, width, height, params), draws a seeded skin-like
 * surface lit by a lamp a few degrees above the horizon, with liquid
 * droplets that act as lenses and a band of contour lines where the surface
 * is being "read".
 *
 * Runs unchanged in a browser (the p5.js viewer passes its drawingContext)
 * and in Node with @napi-rs/canvas (scripts that render the site's stills).
 * No dependencies: its own seeded PRNG and simplex noise, so the same seed
 * gives the same image everywhere.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.RakingLight = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // ── Seeded randomness ─────────────────────────────────────────────────
  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Integer hash for per-cell values (pores). Stateless, so a cell's pore is
  // identical however the image is tiled or resized.
  function hash3(ix, iy, salt) {
    let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(salt, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  // ── Seeded 2D simplex noise ───────────────────────────────────────────
  function makeSimplex(rand) {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const t = p[i];
      p[i] = p[j];
      p[j] = t;
    }
    const perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    const GX = [1, -1, 1, -1, 1, -1, 0, 0];
    const GY = [1, 1, -1, -1, 0, 0, 1, -1];
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;

    return function (xin, yin) {
      const s = (xin + yin) * F2;
      const i = Math.floor(xin + s);
      const j = Math.floor(yin + s);
      const t = (i + j) * G2;
      const x0 = xin - (i - t);
      const y0 = yin - (j - t);
      const i1 = x0 > y0 ? 1 : 0;
      const j1 = x0 > y0 ? 0 : 1;
      const x1 = x0 - i1 + G2;
      const y1 = y0 - j1 + G2;
      const x2 = x0 - 1 + 2 * G2;
      const y2 = y0 - 1 + 2 * G2;
      const ii = i & 255;
      const jj = j & 255;
      let n = 0;
      let t0 = 0.5 - x0 * x0 - y0 * y0;
      if (t0 > 0) {
        const g = perm[ii + perm[jj]] & 7;
        t0 *= t0;
        n += t0 * t0 * (GX[g] * x0 + GY[g] * y0);
      }
      let t1 = 0.5 - x1 * x1 - y1 * y1;
      if (t1 > 0) {
        const g = perm[ii + i1 + perm[jj + j1]] & 7;
        t1 *= t1;
        n += t1 * t1 * (GX[g] * x1 + GY[g] * y1);
      }
      let t2 = 0.5 - x2 * x2 - y2 * y2;
      if (t2 > 0) {
        const g = perm[ii + 1 + perm[jj + 1]] & 7;
        t2 *= t2;
        n += t2 * t2 * (GX[g] * x2 + GY[g] * y2);
      }
      return 70 * n; // ~[-1, 1]
    };
  }

  function fbm(noise, x, y, octaves) {
    let sum = 0;
    let amp = 0.5;
    let freq = 1;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += amp * noise(x * freq, y * freq);
      norm += amp;
      amp *= 0.5;
      freq *= 2.03; // not exactly 2, so octave lattices never line up
    }
    return sum / norm;
  }

  // ── Colour ────────────────────────────────────────────────────────────
  function hexToRgb(hex) {
    const h = hex.replace("#", "");
    const v = parseInt(h.length === 3 ? h.replace(/(.)/g, "$1$1") : h, 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }

  const smoothstep = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };

  // Five-stop tone ramp. The stops sit slightly closer together in the
  // mid-tones, where skin spends most of its area, so the gradation there
  // is finer than in the deep shadows or full highlights.
  const STOPS = [0, 0.3, 0.56, 0.8, 1];
  function makeRamp(palette) {
    const cols = [palette.deep, palette.shadow, palette.mid, palette.light, palette.highlight].map(hexToRgb);
    const LUT = new Float32Array(256 * 3);
    for (let k = 0; k < 256; k++) {
      const t = k / 255;
      let s = 0;
      while (s < STOPS.length - 2 && t > STOPS[s + 1]) s++;
      const f = smoothstep(STOPS[s], STOPS[s + 1], t);
      for (let c = 0; c < 3; c++) LUT[k * 3 + c] = cols[s][c] + (cols[s + 1][c] - cols[s][c]) * f;
    }
    return LUT;
  }

  // ── Defaults ──────────────────────────────────────────────────────────
  const DEFAULTS = {
    seed: 20261021,
    lightAzimuth: 145, // degrees; direction the light comes FROM (0 = right, 90 = top)
    lightElevation: 13, // degrees above the surface; low = raking
    relief: 1.0,
    undulation: 1.0,
    warp: 0.45,
    poreDensity: 0.55,
    poreDepth: 0.65,
    creases: 0.4,
    creaseAngle: 28,
    gloss: 0.35,
    droplets: 3,
    dropletSize: 0.075,
    contours: 26,
    contourOpacity: 0.5,
    scanPosition: 0.62,
    scanWidth: 0.16,
    scanAngle: 8,
    grain: 0.035,
    palette: {
      deep: "#2a0c18",
      shadow: "#8c2f3a",
      mid: "#e2645a",
      light: "#ffb487",
      highlight: "#fff1dc",
      ink: "#2a0c18",
    },
  };

  // ── Render ────────────────────────────────────────────────────────────
  function render(ctx, W, H, userParams) {
    const P = Object.assign({}, DEFAULTS, userParams || {});
    P.palette = Object.assign({}, DEFAULTS.palette, (userParams && userParams.palette) || {});

    const rand = mulberry32(P.seed >>> 0);
    const nBase = makeSimplex(rand);
    const nWarp = makeSimplex(rand);
    const nDetail = makeSimplex(rand);
    const salt = Math.floor(rand() * 1e9);

    const S = Math.min(W, H); // feature scale follows the short side
    const N = W * H;

    // Light, in screen space (y grows downward, so "from the top" is -y).
    const az = (P.lightAzimuth * Math.PI) / 180;
    const el = (P.lightElevation * Math.PI) / 180;
    const Lx = Math.cos(el) * Math.cos(az);
    const Ly = -Math.cos(el) * Math.sin(az);
    const Lz = Math.sin(el);
    // Blinn half-vector with the viewer straight above (0, 0, 1).
    let Hx = Lx, Hy = Ly, Hz = Lz + 1;
    const hl = Math.hypot(Hx, Hy, Hz);
    Hx /= hl; Hy /= hl; Hz /= hl;
    const l2 = Math.hypot(Lx, Ly) || 1;
    const L2x = Lx / l2;
    const L2y = Ly / l2;

    // ── 1. The surface, as altitude only ──────────────────────────────
    // Heights are in units of S, so slopes (and therefore the lighting) are
    // independent of output resolution.
    const base = new Float32Array(N); // broad undulation: also feeds the contours
    const height = new Float32Array(N);
    const cavity = new Float32Array(N); // how deep inside a pore a pixel sits

    // Kept deliberately gentle: the undulation should read as the curve of a
    // face under the texture, never as texture itself.
    const aBase = 0.022 * P.undulation;
    const cell = 0.062 - 0.044 * P.poreDensity; // pore spacing, in S units
    const aPore = 0.0034 * P.poreDepth;
    const aCrease = 0.0016 * P.creases;
    const ca = (P.creaseAngle * Math.PI) / 180;
    const cc = Math.cos(ca);
    const cs = Math.sin(ca);

    for (let y = 0; y < H; y++) {
      const v = y / S;
      for (let x = 0; x < W; x++) {
        const u = x / S;
        const i = y * W + x;

        // Domain-warped undulation: the curve of a cheek or a shoulder.
        const qx = fbm(nWarp, u * 0.8 + 3.7, v * 0.8 + 1.9, 2);
        const qy = fbm(nWarp, u * 0.8 - 5.3, v * 0.8 + 7.1, 2);
        const b = aBase * fbm(nBase, (u + P.warp * qx) * 1.15, (v + P.warp * qy) * 1.15, 3);
        base[i] = b;

        // Pores: jittered cellular pits. Density drifts across the surface
        // so some regions are calm and others busy, as on a real face.
        const cluster = smoothstep(-0.35, 0.55, fbm(nDetail, u * 2.2 + 11.3, v * 2.2 - 4.1, 2));
        const gx = Math.floor(u / cell);
        const gy = Math.floor(v / cell);
        let pore = 0;
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const cx = gx + ox;
            const cy = gy + oy;
            const keep = hash3(cx, cy, salt + 7);
            if (keep > 0.25 + 0.7 * cluster) continue; // not every cell holds a pore
            const px = (cx + 0.15 + 0.7 * hash3(cx, cy, salt + 1)) * cell;
            const py = (cy + 0.15 + 0.7 * hash3(cx, cy, salt + 2)) * cell;
            const r = cell * (0.1 + 0.14 * hash3(cx, cy, salt + 3));
            const d = 0.45 + 0.55 * hash3(cx, cy, salt + 4);
            const dx = u - px;
            const dy = v - py;
            const q = (dx * dx + dy * dy) / (r * r);
            if (q < 9) pore += d * Math.exp(-q);
          }
        }
        cavity[i] = Math.min(1, pore);

        // Creases: a ridge noise stretched hard along one direction, so it
        // reads as fine lines following tension rather than as blotches.
        const ru = u * cc + v * cs;
        const rv = -u * cs + v * cc;
        const ridge = 1 - Math.abs(nDetail(ru * 7.0 + 31.7, rv * 58.0 - 12.9));
        const crease = Math.pow(ridge, 6) * smoothstep(-0.2, 0.7, nBase(u * 3.1 - 8.8, v * 3.1 + 2.6));

        // Orange-peel micro-texture, finer than the pores.
        const micro = 0.00045 * nDetail(u * 150 + 1.3, v * 150 - 7.7);

        height[i] = b - aPore * pore - aCrease * crease + micro;
      }
    }

    // ── 2. Light it ───────────────────────────────────────────────────
    const ramp = makeRamp(P.palette);
    const hi = hexToRgb(P.palette.highlight);
    const shininess = 18 + 160 * P.gloss;
    const specStrength = 0.15 + 0.95 * P.gloss;
    const flatTone = Lz; // what a perfectly flat patch receives
    const rgb = new Float32Array(N * 3);

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        const xm = x > 0 ? i - 1 : i;
        const xp = x < W - 1 ? i + 1 : i;
        const ym = y > 0 ? i - W : i;
        const yp = y < H - 1 ? i + W : i;
        // Gradient in S units: one pixel is 1/S.
        const hx = ((height[xp] - height[xm]) * S) / (xp - xm || 1);
        const hy = ((height[yp] - height[ym]) * S) / ((yp - ym) / W || 1);
        let nx = -hx * P.relief * 1.0;
        let ny = -hy * P.relief * 1.0;
        let nz = 1;
        const nl = Math.hypot(nx, ny, nz);
        nx /= nl; ny /= nl; nz /= nl;

        const diffuse = Math.max(0, nx * Lx + ny * Ly + nz * Lz);
        // A flat patch lands just above mid-ramp. Departures are measured
        // relative to the flat value and eased through tanh, so a slope
        // toward the lamp brightens and a slope away darkens without either
        // slamming into the end stops: skin, not chrome.
        let t = 0.54 + 0.46 * Math.tanh(((diffuse - flatTone) / flatTone) * 0.9);

        // The lamp is a real object off-canvas: the near side is brighter.
        const along = ((x / W - 0.5) * L2x + (y / H - 0.5) * L2y);
        t *= 0.9 + 0.32 * along;

        // Pits hold a little shadow whatever the light does. Kept light-handed:
        // the lamp, not this term, should be what draws each pore.
        t *= 1 - 0.14 * cavity[i];
        t = Math.min(1, Math.max(0, t));

        const k = (t * 255) | 0;
        let r = ramp[k * 3];
        let g = ramp[k * 3 + 1];
        let bl = ramp[k * 3 + 2];

        const spec = specStrength * Math.pow(Math.max(0, nx * Hx + ny * Hy + nz * Hz), shininess);
        // Screen-blend the glint so it brightens without clipping to white.
        r = 255 - ((255 - r) * (255 - hi[0] * spec)) / 255;
        g = 255 - ((255 - g) * (255 - hi[1] * spec)) / 255;
        bl = 255 - ((255 - bl) * (255 - hi[2] * spec)) / 255;

        rgb[i * 3] = r;
        rgb[i * 3 + 1] = g;
        rgb[i * 3 + 2] = bl;
      }
    }

    // ── 3. Droplets: shadows first, then the lenses on top ─────────────
    const drops = [];
    // Explicit placements (fractions of width/height; r as a fraction of the
    // short side) for compositions that need a drop in a particular spot.
    if (Array.isArray(P.dropletList)) {
      for (const d of P.dropletList) drops.push({ cx: d.x * W, cy: d.y * H, R: d.r * S });
    }
    for (let d = 0; d < (Array.isArray(P.dropletList) ? 0 : P.droplets); d++) {
      const R = P.dropletSize * S * (0.6 + 0.75 * rand());
      // Keep drops clear of the edges and of each other.
      let cx = 0, cy = 0, ok = false;
      for (let attempt = 0; attempt < 40 && !ok; attempt++) {
        cx = R * 1.6 + rand() * (W - R * 3.2);
        cy = R * 1.6 + rand() * (H - R * 3.2);
        ok = drops.every((o) => Math.hypot(o.cx - cx, o.cy - cy) > (o.R + R) * 1.35);
      }
      if (ok) drops.push({ cx, cy, R });
    }

    // The lens magnifies the surface *beneath* it, which a drop's own cast
    // shadow never reaches (the shadow falls beside the bead). So keep a copy
    // of the lit surface from before any shadows for the lenses to read.
    const under = rgb.slice();

    const castLen = Math.min(1.6, 0.18 / Math.tan(el)); // longer shadows at lower sun
    for (const dr of drops) {
      // Soft cast shadow, displaced away from the lamp.
      const sx = dr.cx - L2x * dr.R * castLen;
      const sy = dr.cy - L2y * dr.R * castLen;
      const reach = dr.R * 1.5;
      const x0 = Math.max(0, Math.floor(sx - reach)), x1 = Math.min(W - 1, Math.ceil(sx + reach));
      const y0 = Math.max(0, Math.floor(sy - reach)), y1 = Math.min(H - 1, Math.ceil(sy + reach));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const q = Math.hypot(x - sx, y - sy) / (dr.R * 1.08);
          const shade = 1 - 0.42 * (1 - smoothstep(0.55, 1.15, q));
          const i = (y * W + x) * 3;
          rgb[i] *= shade; rgb[i + 1] *= shade; rgb[i + 2] *= shade;
        }
      }
    }

    const sample = (fx, fy, c) => {
      fx = Math.min(W - 1.001, Math.max(0, fx));
      fy = Math.min(H - 1.001, Math.max(0, fy));
      const x = fx | 0, y = fy | 0, ax = fx - x, ay = fy - y;
      const i00 = (y * W + x) * 3 + c, i10 = i00 + 3, i01 = i00 + W * 3, i11 = i01 + 3;
      return (under[i00] * (1 - ax) + under[i10] * ax) * (1 - ay) + (under[i01] * (1 - ax) + under[i11] * ax) * ay;
    };

    for (const dr of drops) {
      const x0 = Math.max(0, Math.floor(dr.cx - dr.R - 2)), x1 = Math.min(W - 1, Math.ceil(dr.cx + dr.R + 2));
      const y0 = Math.max(0, Math.floor(dr.cy - dr.R - 2)), y1 = Math.min(H - 1, Math.ceil(dr.cy + dr.R + 2));
      // Caustic: light passing through the bead focuses on the far side.
      const kx = dr.cx - L2x * dr.R * 0.42;
      const ky = dr.cy - L2y * dr.R * 0.42;
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const dx = x - dr.cx, dy = y - dr.cy;
          const rr = Math.hypot(dx, dy) / dr.R;
          if (rr > 1) continue;
          const edge = 1 - smoothstep(0.94, 1.0, rr); // anti-aliased rim
          // Spherical-cap normal.
          const zc = Math.sqrt(Math.max(0, 1 - rr * rr));
          const nxs = dx / dr.R, nys = dy / dr.R, nzs = zc;
          // Refraction as magnification that grows toward the rim.
          const mag = 0.58 + 0.22 * rr * rr;
          const fx = dr.cx + dx * mag, fy = dr.cy + dy * mag;
          const i = (y * W + x) * 3;
          const fres = smoothstep(0.62, 1.0, rr); // darker, more reflective rim
          const caus = Math.exp(-(((x - kx) ** 2 + (y - ky) ** 2) / (dr.R * dr.R * 0.05)));
          const spec = Math.pow(Math.max(0, nxs * Hx + nys * Hy + nzs * Hz), 260);
          for (let c = 0; c < 3; c++) {
            let col = sample(fx, fy, c) * (1.08 - 0.3 * fres);
            col += (hi[c] - col) * (0.42 * caus); // caustic bloom
            col = 255 - ((255 - col) * (255 - hi[c] * Math.min(1, spec * 1.4))) / 255; // crown
            rgb[i + c] = rgb[i + c] * (1 - edge) + col * edge;
          }
        }
      }
    }

    // ── 4. Grain, then write pixels ───────────────────────────────────
    const img = ctx.createImageData(W, H);
    const out = img.data;
    const grainAmp = P.grain * 255;
    const gRand = mulberry32((P.seed ^ 0x9e3779b9) >>> 0);
    for (let i = 0; i < N; i++) {
      const g = (gRand() - 0.5) * grainAmp;
      out[i * 4] = Math.max(0, Math.min(255, rgb[i * 3] + g));
      out[i * 4 + 1] = Math.max(0, Math.min(255, rgb[i * 3 + 1] + g));
      out[i * 4 + 2] = Math.max(0, Math.min(255, rgb[i * 3 + 2] + g));
      out[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);

    // ── 5. The reading: contours of the undulation, sharp only in the band
    if (P.contours > 0 && P.contourOpacity > 0) {
      let lo = Infinity, hiB = -Infinity;
      for (let i = 0; i < N; i++) { if (base[i] < lo) lo = base[i]; if (base[i] > hiB) hiB = base[i]; }
      const step = Math.max(2, Math.round(S / 260)); // marching-squares grid
      const gw = Math.floor((W - 1) / step) + 1;
      const gh = Math.floor((H - 1) / step) + 1;
      const at = (gx, gy) => base[Math.min(H - 1, gy * step) * W + Math.min(W - 1, gx * step)];
      const ink = hexToRgb(P.palette.ink);
      const sa = (P.scanAngle * Math.PI) / 180;
      // Band: distance from a line through the canvas at scanPosition.
      const bandNx = -Math.sin(sa), bandNy = Math.cos(sa);
      const bandC = P.scanPosition * (Math.abs(bandNx) * W + Math.abs(bandNy) * H);
      const bandW = P.scanWidth * Math.max(W, H);
      ctx.lineCap = "round";
      const baseWidth = Math.max(1.1, S / 520);

      for (let li = 1; li <= P.contours; li++) {
        const level = lo + ((hiB - lo) * li) / (P.contours + 1);
        // Every fifth line is an index contour, drawn a touch heavier, as on a survey map.
        const index = li % 5 === 0;
        for (let gy = 0; gy < gh - 1; gy++) {
          for (let gx = 0; gx < gw - 1; gx++) {
            const a = at(gx, gy), b = at(gx + 1, gy), c = at(gx + 1, gy + 1), d = at(gx, gy + 1);
            let code = 0;
            if (a > level) code |= 1;
            if (b > level) code |= 2;
            if (c > level) code |= 4;
            if (d > level) code |= 8;
            if (code === 0 || code === 15) continue;
            const X = gx * step, Y = gy * step;
            const lerpE = (p, q) => (level - p) / (q - p || 1e-9);
            const top = [X + step * lerpE(a, b), Y];
            const right = [X + step, Y + step * lerpE(b, c)];
            const bottom = [X + step * lerpE(d, c), Y + step];
            const left = [X, Y + step * lerpE(a, d)];
            const segs = [];
            switch (code) {
              case 1: case 14: segs.push([left, top]); break;
              case 2: case 13: segs.push([top, right]); break;
              case 3: case 12: segs.push([left, right]); break;
              case 4: case 11: segs.push([right, bottom]); break;
              case 6: case 9: segs.push([top, bottom]); break;
              case 7: case 8: segs.push([left, bottom]); break;
              case 5: segs.push([left, top], [right, bottom]); break;
              case 10: segs.push([top, right], [left, bottom]); break;
            }
            for (const [p0, p1] of segs) {
              const mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
              const dist = Math.abs(mx * bandNx + my * bandNy - bandC);
              const inBand = Math.exp(-(dist * dist) / (2 * bandW * bandW * 0.25));
              const alpha = Math.min(1, P.contourOpacity * 1.5 * (0.06 + 0.94 * inBand) * (index ? 1 : 0.7));
              if (alpha < 0.01) continue;
              ctx.lineWidth = baseWidth * (index ? 1.6 : 1);
              ctx.strokeStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},${alpha.toFixed(3)})`;
              ctx.beginPath();
              ctx.moveTo(p0[0], p0[1]);
              ctx.lineTo(p1[0], p1[1]);
              ctx.stroke();
            }
          }
        }
      }
    }

    return { droplets: drops.length };
  }

  return { render, DEFAULTS };
});
