"""Build the hero loop, poster and polaroid from the owner-supplied assets.

Hero clip: the source opens on a mockup (text overlays) and zooms in; the clean
close-up stops zooming at ~4.0s. We keep 4.0s..end (the face already sits
right of centre, like the old hero), then ping-pong the clip (forward +
reverse) so the loop has no seam.

Usage: python scripts/hero-guy.py <wind.mp4> <polaroid-source.jpg>
"""
import os
import subprocess
import sys
import tempfile

from PIL import Image

SRC, POL = sys.argv[1], sys.argv[2]
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "hero")
START = 4.0


tmp = tempfile.mkdtemp(prefix="heroguy-")
vf = "format=yuv420p"
subprocess.run(
    ["ffmpeg", "-v", "error", "-y", "-ss", str(START), "-i", SRC, "-an",
     "-vf", vf, "-q:v", "2", os.path.join(tmp, "f%04d.jpg")],
    check=True,
)
frames = sorted(f for f in os.listdir(tmp) if f.endswith(".jpg"))
order = frames + frames[-2:0:-1]  # forward, then back without repeating ends
listfile = os.path.join(tmp, "list.txt")
with open(listfile, "w") as fh:
    for f in order:
        fh.write(f"file '{os.path.join(tmp, f).replace(chr(92), '/')}'\nduration {1/24:.6f}\n")
subprocess.run(
    ["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", listfile,
     "-r", "24", "-c:v", "libx264", "-preset", "slow", "-crf", "26",
     "-pix_fmt", "yuv420p", "-profile:v", "high", "-movflags", "+faststart",
     os.path.join(OUT, "hero-loop.mp4")],
    check=True,
)

# Poster = first frame, so the photo -> video fade is invisible.
Image.open(os.path.join(tmp, frames[0])).convert("RGB").save(
    os.path.join(OUT, "hero.jpg"), quality=82, optimize=True, progressive=True
)

# Polaroid: inner photo of the supplied polaroid, cropped 4:5 around the face.
im = Image.open(POL).convert("RGB")
W, H = im.size
sx = W / 600
box = tuple(round(v * sx) for v in (206, 27, 394, 262))  # 188x235 = 4:5
im.crop(box).resize((520, 650), Image.LANCZOS).save(
    os.path.join(OUT, "polaroid-face.jpg"), quality=85, optimize=True, progressive=True
)
print(len(frames), "frames ->", len(order), "loop frames")
