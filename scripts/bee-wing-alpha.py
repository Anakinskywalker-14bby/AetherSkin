"""Bake the bee-wing texture's alpha offline (public/bee/wing.png).

The source is a veined wing photographed on pure black. Same maths the
reference does at runtime in a canvas: alpha from luminance, then brighten.
Doing it once here keeps that work (and a 1 MB source) off visitors' phones.

Usage: python bee-wing-alpha.py wing.png out.png   (needs ffmpeg on PATH)
"""
import subprocess, sys
import numpy as np

src, out = sys.argv[1], sys.argv[2]
W, H = 512, 288
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-vf", f"scale={W}:{H}:flags=lanczos",
                      "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
a = np.frombuffer(raw, np.uint8).reshape(H, W, 3).astype(np.float32)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
lum = (r * 0.3 + g * 0.59 + b * 0.11) / 255
alpha = np.clip((lum - 0.035) * 4.2, 0, 1) * 255
rgba = np.dstack([np.minimum(255, r * 1.5 + 30), np.minimum(255, g * 1.5 + 30), np.minimum(255, b * 1.5 + 40), alpha]).astype(np.uint8)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{W}x{H}", "-i", "-", out],
               input=rgba.tobytes(), check=True)
print("wrote", out)
