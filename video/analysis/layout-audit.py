"""Layout collision audit: does anything sit on top of anything else?

The user's complaint was partly "组件重合" — components overlapping. Static
review cannot see this reliably, so this checks it numerically: it finds the ink
bounding boxes of the elements that matter in each shot and reports overlaps.

It works on the DELIVERED video: for a set of frames it locates (a) the caption
pill, (b) the in-scene type, (c) the real-page plate, and flags any pair whose
boxes intersect.

Usage: python analysis/layout-audit.py
"""
import pathlib
import subprocess

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
VIDEO = ROOT / "out" / "promo-bgm.mp4"
FPS = 30


def frame(f: int) -> np.ndarray:
    raw = subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(VIDEO), "-vf", f"select=eq(n\\,{f})",
         "-vframes", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        capture_output=True, check=True,
    ).stdout
    return np.frombuffer(raw, np.uint8).reshape(1080, 1920, 3).astype(np.int16)


def pill_box(a: np.ndarray):
    """The caption pill is the only near-white rounded card on paper."""
    band = a[880:1080]
    bright = band.mean(axis=2) > 250
    if bright.sum() < 5000:
        return None
    ys, xs = np.where(bright)
    return (int(ys.min()) + 880, int(ys.max()) + 880, int(xs.min()), int(xs.max()))


def ink_box(a: np.ndarray, y0: int, y1: int):
    """Dark ink (text) inside a vertical band."""
    band = a[y0:y1]
    mask = band.mean(axis=2) < 150
    if mask.sum() < 50:
        return None
    ys, xs = np.where(mask)
    return (int(ys.min()) + y0, int(ys.max()) + y0, int(xs.min()), int(xs.max()))


def overlap(b1, b2):
    if not b1 or not b2:
        return None
    y0 = max(b1[0], b2[0]); y1 = min(b1[1], b2[1])
    x0 = max(b1[2], b2[2]); x1 = min(b1[3], b2[3])
    if y0 <= y1 and x0 <= x1:
        return (y1 - y0 + 1, x1 - x0 + 1)
    return None


CASES = [
    ("S1 typing + caption", 150),
    ("S1 completed + caption", 200),
    ("S3 mistake + caption", 620),
    ("S3 fix + caption", 700),
    ("S3 completion label", 740),
    ("S4 axis + caption", 860),
]


def main():
    bad = 0
    for name, f in CASES:
        a = frame(f)
        pill = pill_box(a)
        print(f"\n{name}  (f{f})")
        print(f"  caption pill : {pill}")
        # the in-scene content occupies everything above the pill
        if pill:
            content = ink_box(a, 0, pill[0] - 6)
            print(f"  scene ink    : {content}")
            ov = overlap(content, pill)
            if ov:
                print(f"  OVERLAP: {ov[0]}px tall x {ov[1]}px wide")
                bad += 1
            else:
                gap = pill[0] - content[1] if content else None
                print(f"  clear, vertical gap {gap}px")
        else:
            content = ink_box(a, 0, 1000)
            print(f"  no pill; scene ink {content}")

    print(f"\n{bad} overlapping pair(s)")


if __name__ == "__main__":
    main()
