"""Feathered alpha mask of the footer character, for the dark-mode video.

Usage (from a folder holding f0.rgb, frame 0 as raw 1920x1080 rgb24):
    python footer-video-mask.py [threshold]

Background = pixels near the pale lavender backdrop that connect to the frame
edge. Everything else (body, heart, eyes, highlights) stays. The character
only moves its pupils, so one static mask covers every frame.
Writes mask.pgm (255 = character). Pure numpy; no scipy needed.
"""
import sys
import numpy as np

W, H = 1920, 1080
thr = float(sys.argv[1]) if len(sys.argv) > 1 else 14.0
a = np.fromfile("f0.rgb", np.uint8).reshape(H, W, 3).astype(np.float32)
s = a[::2, ::2]
bg = np.array([236, 234, 248], np.float32)
cand = np.sqrt(((s - bg) ** 2).sum(-1)) < thr

seed = np.zeros_like(cand)
seed[0, :] = cand[0, :]
seed[:, 0] = cand[:, 0]
seed[:, -1] = cand[:, -1]
while True:
    d = seed.copy()
    d[1:] |= seed[:-1]
    d[:-1] |= seed[1:]
    d[:, 1:] |= seed[:, :-1]
    d[:, :-1] |= seed[:, 1:]
    d &= cand
    if (d == seed).all():
        break
    seed = d

fg = (~seed).astype(np.float32)


def blur(x, r):
    """Separable box blur via cumulative sums."""
    for axis in (0, 1):
        p = np.pad(x, [(r, r) if i == axis else (0, 0) for i in range(2)], mode="edge")
        c = np.cumsum(p, axis=axis)
        c = np.concatenate([np.zeros_like(c.take([0], axis=axis)), c], axis=axis)
        n = x.shape[axis]
        x = (c.take(range(2 * r + 1, n + 2 * r + 1), axis=axis) - c.take(range(0, n), axis=axis)) / (2 * r + 1)
    return x


fg = blur(fg, 2)
fg = np.clip((fg - 0.65) * 3 + 0.5, 0, 1)  # >0.5 pulls the edge in, dropping the pale halo
fg = blur(fg, 3)
full = np.repeat(np.repeat(fg, 2, 0), 2, 1)
out = (full * 255).astype(np.uint8)
with open("mask.pgm", "wb") as f:
    f.write(f"P5 {W} {H} 255\n".encode())
    f.write(out.tobytes())
print("character fraction", round(float(full.mean()), 3))
