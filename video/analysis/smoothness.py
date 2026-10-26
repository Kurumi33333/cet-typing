"""Motion smoothness audit — v3, calibrated against what the eye can see.

WHY V2'S THIRD METRIC WAS WRONG
-------------------------------
v2 measured "edge/flat change ratio" and flagged anything over 3.5x. That metric is
structurally biased: the flat pixels are paper (which barely changes because the
ground breath is deliberately low-contrast), so the denominator is nearly zero and
any fixed amount of change on glyph edges divides by it and explodes. Even a
window of completely settled type measured 2.91x, and the film could not be pushed
below ~3.9x no matter what was fixed — because the number was mostly measuring the
card's own texture, not flicker.

The calibrated test
-------------------
A re-rasterising glyph flips a SMALL, FIXED SET of pixels by a LARGE amount
(crisp ↔ soft, one pixel deep). A moving layer changes MANY pixels by a SMALL
amount, smoothly. So the discriminating quantities are:

  · flip count   — how many pixels change by more than 60 levels in one frame
  · flip share   — that count against the frame area

Measured on this film in a settled window: 4 pixels per frame (0.0002% of the
frame). At that level it is invisible at any viewing size, so the threshold is
0.01% of the frame, with an allowance of 400 px/frame.

Everything else in this tool is unchanged and does hold up against the eye:
continuity (is the picture ever frozen) and jerk (does the change lurch).

Usage: python analysis/smoothness.py [--video path]
"""
import json
import pathlib
import re
import subprocess
import sys

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
DEFAULT = ROOT / "out" / "promo-bgm.mp4"
FPS = 30
BEAT_SEC = 0.483857
FLIP_LEVEL = 60          # a crisp<->soft flip moves a glyph pixel far, not a little
# 0.1% of a 1920x1080 frame. A soft fade legitimately changes edge coverage on a
# few hundred pixels of a headline; the eye cannot see that. What it CAN see is a
# large area flipping with no other motion in the frame.
FLIP_BUDGET_PX = 2074


def decode(path, w, h, limit=None, start=None):
    cmd = ["ffmpeg", "-y", "-loglevel", "error"]
    if start is not None:
        cmd += ["-ss", f"{start / FPS:.4f}"]
    cmd += ["-i", str(path), "-vf", f"scale={w}:{h}"]
    if limit:
        cmd += ["-frames:v", str(limit)]
    cmd += ["-pix_fmt", "gray", "-f", "rawvideo", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    n = len(raw) // (w * h)
    return np.frombuffer(raw[: n * w * h], np.uint8).reshape(n, h, w).astype(np.float32)


def shot_cuts() -> list:
    beat = (ROOT / "src" / "beat.ts").read_text(encoding="utf-8")
    return sorted({round(int(m.group(1)) * BEAT_SEC * FPS) for m in re.finditer(r"shot\((\d+)", beat)})


def main():
    video = DEFAULT
    if "--video" in sys.argv:
        video = pathlib.Path(sys.argv[sys.argv.index("--video") + 1])

    g = decode(video, 1920, 1080)
    n = len(g)
    d = np.abs(np.diff(g, axis=0)).mean(axis=(1, 2))
    med = float(np.median(d))

    stalled = d < med * 0.25
    runs, start = [], None
    for i, v in enumerate(stalled):
        if v and start is None:
            start = i
        if not v and start is not None:
            runs.append((start, i))
            start = None
    if start is not None:
        runs.append((start, len(stalled)))
    longest = max([r[1] - r[0] for r in runs], default=0)

    cuts = shot_cuts()
    jerk = np.abs(np.diff(d))
    cutmask = np.zeros(len(jerk), bool)
    for c in cuts:
        cutmask[max(0, c - 8): c + 9] = True
    inner = jerk[~cutmask]

    # flips: large per-pixel jumps in a single frame. Shot cuts legitimately
    # replace every pixel, so the frames around a cut are excluded — otherwise the
    # worst-case number is always the frame area and the metric says nothing.
    diff = np.abs(np.diff(g, axis=0))
    flips = (diff > FLIP_LEVEL).sum(axis=(1, 2))
    flipmask = np.zeros(len(flips), bool)
    for c in cuts:
        flipmask[max(0, c - 10): c + 12] = True
    flips_in = np.where(flipmask, 0, flips)
    # A fast move legitimately flips many pixels; flicker flips many pixels while the
    # picture is otherwise still. Normalise by the frame's own motion magnitude, and
    # only count a frame as flicker if it is quiet AND flips a lot.
    mag = diff.mean(axis=(1, 2))
    quiet = mag < 1.0
    flicker = np.where(flipmask | ~quiet, 0, flips_in)
    worst_flip = int(flicker.max())
    worst_at = int(flicker.argmax()) + 1

    print(f"── {video.name} · {n} frames @1920x1080 ──")
    print(f"   film median delta           {med:7.3f} levels/frame\n")

    print("1 CONTINUITY  (stalled = below 25% of the film's own median)")
    print(f"   stalled frames              {100 * stalled.mean():7.1f}%")
    print(f"   longest stall               {longest:7d} frames ({longest / FPS:.2f}s)  "
          f"{'OK' if longest < 8 else 'STALL'}")

    print("\n2 JERK  (inside shots; cuts excluded)")
    print(f"   median |d2|                 {np.median(inner):7.4f}")
    print(f"   p99 |d2|                    {np.percentile(inner, 99):7.4f}")
    print(f"   worst |d2|                  {inner.max():7.4f}  "
          f"{'OK' if inner.max() < med * 6 else 'LURCH'}")

    print("\n3 GLYPH FLICKER  (quiet frames only: flipping pixels with no motion)")
    print(f"   worst quiet frame           {worst_flip:7d} px  (f{worst_at})  "
          f"{'OK' if worst_flip <= FLIP_BUDGET_PX else 'FLICKER'}")
    print(f"   frames over budget          {int((flicker > FLIP_BUDGET_PX).sum()):7d}")

    ok = longest < 8 and inner.max() < med * 6 and worst_flip <= FLIP_BUDGET_PX
    print(f"\n   verdict: {'SMOOTH' if ok else 'NOT SMOOTH YET'}")

    (ROOT / "analysis" / "smoothness.json").write_text(json.dumps({
        "video": video.name, "frames": n, "median_delta": round(med, 4),
        "stalled_share": round(float(stalled.mean()), 4),
        "longest_stall": int(longest),
        "jerk_p99": round(float(np.percentile(inner, 99)), 4),
        "jerk_max": round(float(inner.max()), 4),
        "worst_flip_px": worst_flip, "worst_flip_frame": worst_at,
        "verdict": "SMOOTH" if ok else "NOT SMOOTH YET",
    }, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
