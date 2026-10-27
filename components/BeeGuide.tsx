"use client";

import { useEffect, useRef } from "react";
import * as Sentry from "@sentry/nextjs";
import { DESKTOP_PATH, MOBILE_PATH, beeMode, isDrawMode, locate, readDraft } from "@/lib/bee-path";

const configured = () => (beeMode() === "mobile" ? MOBILE_PATH : DESKTOP_PATH);

/**
 * A small 3D honeybee that guides the reader down the landing page.
 *
 * It starts sitting on the hero polaroid (wings at rest) and, as the visitor
 * scrolls, flies to the next thing to read: "The problem", the pain points,
 * the solution heading, the category cards, and finally the footer signup.
 *
 * - Model: public/bee/bee.glb, the reference bumblebee body optimised from
 *   19 MB to ~1 MB (meshopt geometry, 512px WebP textures). It has no wings.
 * - Wings: built here from public/bee/wing.png, whose alpha was baked from
 *   the black-backed wing photo by scripts/bee-wing-alpha.py.
 * - Path: each stop is a real element on the page, measured every frame, so
 *   the bee lands on the same words on any screen size. Between stops it
 *   holds still, then dives and glides to the next one (the reference's
 *   ease, hold and dive), lagging slightly behind the scroll.
 * - three.js loads only in the browser, after first paint. Nothing renders
 *   for reduced motion, without WebGL, or while the tab is hidden.
 * - The canvas sits under the hero doors (z-45) and never takes clicks.
 */

type Stop = {
  sel: string;
  ax: number; // anchor within the element's box, 0..1
  ay: number;
  dx: number; // extra offset in bee lengths
  dy: number;
  yaw: number; // 0 faces right, 180 left, 90 the camera
  pitch: number;
  roll: number;
  sit?: boolean; // perched, wings at rest
};

const STOPS: Stop[] = [
  // The polaroid is tilted, so its top edge sits below the bounding box top
  // away from the raised corner; dy lands the feet on that edge.
  { sel: ".eh-polaroid", ax: 0.58, ay: 0, dx: 0, dy: -0.02, yaw: 155, pitch: 0, roll: -3, sit: true },
  { sel: "#problem .ps-kicker", ax: 1, ay: 0.5, dx: 0.85, dy: 0, yaw: 30, pitch: 6, roll: 4 },
  { sel: "#problem .ps-pains", ax: 1, ay: 0, dx: 0.4, dy: -0.55, yaw: 150, pitch: 8, roll: -4 },
  { sel: "#solution h2", ax: 0, ay: 0.5, dx: -0.75, dy: 0, yaw: 25, pitch: 4, roll: 0 },
  { sel: ".cat-card:first-child h2", ax: 1, ay: 0.15, dx: 0.7, dy: 0, yaw: 140, pitch: 6, roll: 4 },
  { sel: "#beta", ax: 0, ay: 0.3, dx: -0.6, dy: -0.15, yaw: 20, pitch: 4, roll: 0 },
];

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerpAngle = (a: number, b: number, t: number) => {
  const d = ((((b - a + 540) % 360) + 360) % 360) - 180;
  return a + d * t;
};
const DEG = Math.PI / 180;

export default function BeeGuide() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Local path editor: preview the live draft as it is drawn.
    const draw = isDrawMode();

    let disposed = false;
    let raf = 0;
    let cleanup: (() => void) | null = null;

    (async () => {
      const THREE = await import("three");
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
      const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
      const { MeshoptDecoder } = await import("three/examples/jsm/libs/meshopt_decoder.module.js");
      if (disposed) return;

      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
      } catch {
        return; // No WebGL: the page simply has no bee.
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;

      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
      camera.position.set(0, 0, 10);
      const resize = () => {
        renderer.setSize(window.innerWidth, window.innerHeight, false);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
      };
      resize();
      window.addEventListener("resize", resize);

      scene.add(new THREE.HemisphereLight(0xf2eeff, 0x7a62c9, 1.3));
      const key = new THREE.DirectionalLight(0xfff1d6, 2.6);
      key.position.set(3, 5, 6);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xc8b8ff, 2.2);
      rim.position.set(-5, 2, -4);
      scene.add(rim);

      // scene > flight (position, scale, yaw) > beeRoot (roll/pitch) > model + wings.
      // beeRoot frame: +X head, +Y up, +Z the bee's right side.
      const flight = new THREE.Group();
      const beeRoot = new THREE.Group();
      flight.add(beeRoot);
      scene.add(flight);

      // Wings: plane hinged at its root, two faint copies fake motion blur.
      const wingTex = await new THREE.TextureLoader().loadAsync("/bee/wing.png");
      if (disposed) return;
      wingTex.colorSpace = THREE.SRGBColorSpace;
      const flaps: { g: InstanceType<typeof THREE.Group>; phase: number }[] = [];
      const wingGeo = (span: number) => {
        const g = new THREE.PlaneGeometry(span, (span * 9) / 16);
        g.translate(span / 2 - span * 0.03, 0, 0);
        g.rotateX(-Math.PI / 2);
        g.rotateY(-Math.PI / 2);
        return g;
      };
      const wingMat = (opacity: number) =>
        new THREE.MeshBasicMaterial({ map: wingTex, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false });
      const buildSide = (anchor: InstanceType<typeof THREE.Vector3>, mirror: boolean) => {
        const side = new THREE.Group();
        side.position.copy(anchor);
        if (mirror) side.scale.z = -1;
        for (const w of [
          { span: 0.72, sweep: -0.42, phase: 0, lift: 0.02 },
          { span: 0.52, sweep: -0.95, phase: -0.5, lift: -0.01 },
        ]) {
          const sweep = new THREE.Group();
          sweep.rotation.y = w.sweep;
          sweep.position.y = w.lift;
          for (const [off, op] of [[0, 0.95], [0.55, 0.28], [-0.55, 0.28]] as const) {
            const flap = new THREE.Group();
            flap.add(new THREE.Mesh(wingGeo(w.span), wingMat(op)));
            sweep.add(flap);
            flaps.push({ g: flap, phase: w.phase + off });
          }
          side.add(sweep);
        }
        beeRoot.add(side);
      };

      // Body.
      const loader = new GLTFLoader();
      loader.setMeshoptDecoder(MeshoptDecoder);
      let gltf;
      try {
        gltf = await loader.loadAsync("/bee/bee.glb");
      } catch (error) {
        Sentry.captureException(error, { tags: { feature: "bee_guide" } });
        renderer.dispose();
        return;
      }
      if (disposed) return;
      const model = gltf.scene;
      model.traverse((o) => {
        const m = o as InstanceType<typeof THREE.Mesh>;
        if (m.isMesh) {
          m.frustumCulled = false;
          const mat = m.material as InstanceType<typeof THREE.MeshStandardMaterial>;
          if (mat && "envMapIntensity" in mat) mat.envMapIntensity = 0.7;
        }
      });
      const holder = new THREE.Group();
      holder.add(model);
      model.rotation.set(0, Math.PI / 2, 0); // head from +Z to +X
      let box = new THREE.Box3().setFromObject(holder);
      const size = box.getSize(new THREE.Vector3());
      model.scale.setScalar(1 / Math.max(size.x, size.y, size.z));
      box = new THREE.Box3().setFromObject(holder);
      model.position.sub(box.getCenter(new THREE.Vector3()));
      box = new THREE.Box3().setFromObject(holder);
      beeRoot.add(holder);
      const anchor = new THREE.Vector3(
        box.min.x + (box.max.x - box.min.x) * 0.66,
        box.max.y * 0.86,
        (box.max.z - box.min.z) * 0.05
      );
      buildSide(anchor, false);
      buildSide(anchor, true);
      canvas.classList.add("ready");

      // Where each stop is right now, in viewport pixels and document y.
      const measure = () => {
        const vh = window.innerHeight;
        const maxScroll = document.documentElement.scrollHeight - vh;
        const beePx = vh * (window.innerWidth < 760 ? 0.075 : 0.09);
        const out: { x: number; y: number; trig: number; stop: Stop }[] = [];
        for (const stop of STOPS) {
          const el = document.querySelector(stop.sel);
          if (!el) continue;
          const r = el.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) continue;
          const x = r.left + r.width * stop.ax + stop.dx * beePx;
          const y = r.top + r.height * stop.ay + stop.dy * beePx;
          // A stop "triggers" when it reaches the reading line; clamp so the
          // last one is reachable at the very bottom of the page.
          const trig = Math.min(r.top + window.scrollY, maxScroll + vh * 0.5);
          out.push({ x, y, trig, stop });
        }
        // A drawn path (lib/bee-path.ts, or the live draft in draw mode)
        // replaces the built-in stops.
        const drawn = draw ? readDraft(beeMode()) ?? configured() : configured();
        if (drawn && drawn.length > 0) {
          const pts = drawn.map((p) => ({ p, at: locate(p) })).filter((q) => q.at);
          out.length = 0;
          pts.forEach(({ p, at }, k) => {
            const next = pts[k + 1]?.at ?? pts[k - 1]?.at;
            const faceRight = next ? (pts[k + 1] ? next.x >= at!.x : at!.x >= next.x) : true;
            out.push({
              x: at!.x,
              y: at!.y,
              trig: Math.min(at!.docY, maxScroll + vh * 0.5),
              stop: { sel: p.sec, ax: 0, ay: 0, dx: 0, dy: 0, yaw: p.perch ? 155 : faceRight ? 25 : 155, pitch: 4, roll: 0, sit: p.perch },
            });
          });
        }
        return { out, beePx, vh };
      };

      const target = () => {
        const { out, beePx } = measure();
        if (out.length === 0) return null;
        const read = window.scrollY + window.innerHeight * 0.5;
        let i = 0;
        while (i < out.length - 1 && read >= out[i + 1].trig) i++;
        const a = out[i];
        const b = out[Math.min(i + 1, out.length - 1)];
        const span = Math.max(1, b.trig - a.trig);
        const f = i === out.length - 1 ? 0 : clamp((read - a.trig) / span, 0, 1);
        const t = ease(clamp((f - 0.12) / 0.76, 0, 1));
        const moving = Math.sin(t * Math.PI);
        const dive = moving * beePx * 1.4; // drops mid-flight, then glides up
        const travelYaw = b.x >= a.x ? 20 : 160;
        const baseYaw = lerpAngle(a.stop.yaw, b.stop.yaw, t);
        return {
          x: lerp(a.x, b.x, t),
          y: lerp(a.y, b.y, t) + dive,
          yaw: lerpAngle(baseYaw, travelYaw, moving * 0.7),
          pitch: lerp(a.stop.pitch, b.stop.pitch, t),
          roll: lerp(a.stop.roll, b.stop.roll, t),
          sit: !!a.stop.sit && t === 0,
          moving,
          s: 1 + moving * 0.12,
          beePx,
        };
      };

      const first = target();
      const cur = { x: first?.x ?? 0, y: first?.y ?? 0, yaw: first?.yaw ?? 150, pitch: 0, roll: 0, s: 1, rest: first?.sit ? 1 : 0 };
      const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
      const onPointer = (e: PointerEvent) => {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -((e.clientY / window.innerHeight) * 2 - 1);
      };
      window.addEventListener("pointermove", onPointer, { passive: true });

      const clock = new THREE.Clock();
      let prevX = cur.x;
      let prevY = cur.y;

      const frame = () => {
        raf = 0;
        if (disposed) return;
        if (document.hidden) {
          clock.getDelta();
          return;
        }
        const dt = Math.min(clock.getDelta(), 0.05);
        const time = clock.elapsedTime;
        const tg = target();
        if (tg) {
          const k = 1 - Math.exp(-dt * 3.2);
          cur.x += (tg.x - cur.x) * k;
          cur.y += (tg.y - cur.y) * k;
          cur.s += (tg.s - cur.s) * k;
          cur.pitch += (tg.pitch - cur.pitch) * k;
          cur.roll += (tg.roll - cur.roll) * k;
          cur.yaw = lerpAngle(cur.yaw, tg.yaw, 1 - Math.exp(-dt * 2.6));
          cur.rest += ((tg.sit ? 1 : 0) - cur.rest) * (1 - Math.exp(-dt * 4));
          const mk = 1 - Math.exp(-dt * 2);
          mouse.sx += (mouse.x - mouse.sx) * mk;
          mouse.sy += (mouse.y - mouse.sy) * mk;

          const vx = (cur.x - prevX) / Math.max(dt, 1e-3) / window.innerWidth;
          const vy = (cur.y - prevY) / Math.max(dt, 1e-3) / window.innerHeight;
          prevX = cur.x;
          prevY = cur.y;

          const halfH = Math.tan((camera.fov * DEG) / 2) * camera.position.z;
          const halfW = halfH * camera.aspect;
          const fly = 1 - cur.rest; // 0 when perched
          const hover = (Math.sin(time * 2.1) * 0.045 + Math.sin(time * 3.7) * 0.015) * fly;
          const lean = 0.4 * fly; // leans toward the cursor only in flight
          const beeWorld = (tg.beePx / window.innerHeight) * halfH * 2;

          flight.position.set(
            ((cur.x / window.innerWidth) * 2 - 1) * halfW + Math.sin(time * 1.3) * 0.04 * fly + mouse.sx * 0.12 * lean,
            -((cur.y / window.innerHeight) * 2 - 1) * halfH + hover * beeWorld * 2 + mouse.sy * 0.08 * lean,
            Math.sin(time * 0.9) * 0.15 * fly
          );
          flight.scale.setScalar(beeWorld * cur.s);
          flight.rotation.set(0, -(cur.yaw + mouse.sx * 12 * lean) * DEG, 0);

          // Nose down when diving (screen y grows downward), banks into turns.
          const pitch = cur.pitch + clamp(vy * 110, -28, 28) * fly + Math.sin(time * 2.1 + 1) * 3 * fly + mouse.sy * 6 * lean;
          const roll = cur.roll + clamp(vx * 150, -30, 30) * fly + Math.sin(time * 1.7) * 4 * fly;
          beeRoot.rotation.set(roll * DEG, 0, pitch * DEG, "YZX");

          // Wings: full beat in flight; folded back with a slow shiver when perched.
          const freq = Math.PI * 2 * (17 + tg.moving * 5);
          for (const { g, phase } of flaps) {
            const a = Math.sin(time * freq + phase);
            const restA = Math.sin(time * 2.4 + phase) * 0.06;
            g.rotation.x = lerp(-0.25 + a * 0.95, 0.35 + restA, cur.rest);
            g.rotation.y = lerp(a * 0.18, -0.35, cur.rest);
            const ghost = (g.children[0] as InstanceType<typeof THREE.Mesh>).material as InstanceType<typeof THREE.MeshBasicMaterial>;
            if (ghost.opacity < 0.5) g.visible = cur.rest < 0.5; // no blur copies at rest
          }
          renderer.render(scene, camera);
        }
        raf = requestAnimationFrame(frame);
      };
      const onVisibility = () => {
        if (!document.hidden && !raf && !disposed) raf = requestAnimationFrame(frame);
      };
      document.addEventListener("visibilitychange", onVisibility);
      raf = requestAnimationFrame(frame);

      cleanup = () => {
        window.removeEventListener("resize", resize);
        window.removeEventListener("pointermove", onPointer);
        document.removeEventListener("visibilitychange", onVisibility);
        scene.traverse((o) => {
          const m = o as InstanceType<typeof THREE.Mesh>;
          if (m.isMesh) {
            m.geometry.dispose();
            const mats = Array.isArray(m.material) ? m.material : [m.material];
            mats.forEach((mt) => mt.dispose());
          }
        });
        wingTex.dispose();
        pmrem.dispose();
        renderer.dispose();
      };
    })().catch((error) => {
      Sentry.captureException(error, { tags: { feature: "bee_guide" } });
    });

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      cleanup?.();
    };
  }, []);

  return <canvas ref={canvasRef} className="bee-guide" aria-hidden="true" />;
}
