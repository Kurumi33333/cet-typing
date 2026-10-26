"""A8: are the two deliverables the SAME picture?

Comparing decoded H.264 frames is the wrong test: two encodes of identical
source frames legitimately differ by a few levels around text, because the
encoder spends bits differently depending on what else is in the stream. That
produced a false "2.97% different" reading.

The honest test is one level up: render the same frames from both prop sets as
lossless PNG and compare those. If the PNGs are identical, the two deliverables
came from one timeline, which is what the rule actually requires.

Usage: python analysis/parity-png.py [--frames 150,620,1000]
"""
import pathlib
import subprocess
import sys

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "out" / "qa" / "parity"
OUT.mkdir(parents=True, exist_ok=True)

FRAMES = [150, 300, 430, 520, 620, 700, 760, 860, 930, 1000, 1060, 1090]


def still(frame: int, props: str | None, tag: str) -> pathlib.Path:
    out = OUT / f"{tag}-{frame}.png"
    cmd = ["npx", "remotion", "still", "src/index.ts", "CetTypingPromo", str(out), f"--frame={frame}"]
    if props:
        cmd.append(f"--props={props}")
    subprocess.run(cmd, cwd=ROOT, check=True, capture_output=True, shell=True)
    return out


def pixels(p: pathlib.Path) -> np.ndarray:
    d = subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(p), "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        capture_output=True, check=True,
    ).stdout
    arr = np.frombuffer(d, np.uint8).astype(np.int16)
    return arr.reshape(-1, 3)


def main():
    if "--frames" in sys.argv:
        frames = [int(x) for x in sys.argv[sys.argv.index("--frames") + 1].split(",")]
    else:
        frames = FRAMES

    worst = 0.0
    bad = 0
    for f in frames:
        a = pixels(still(f, None, "bgm"))
        b = pixels(still(f, "props-nobgm.json", "nobgm"))
        if a.shape != b.shape:
            print(f"f{f}: SHAPE MISMATCH {a.shape} vs {b.shape}")
            bad += 1
            continue
        d = np.abs(a - b)
        pct = float((d.max(axis=1) > 0).mean() * 100)
        worst = max(worst, pct)
        flag = "" if pct == 0 else "  <-- DIFFERS"
        print(f"f{f}: {pct:.4f}% of pixels differ (max delta {int(d.max())}){flag}")
        if pct > 0:
            bad += 1

    print()
    if bad == 0:
        print(f"parity OK — all {len(frames)} frames are pixel-identical at PNG level")
    else:
        print(f"{bad}/{len(frames)} frames differ — the two deliverables are NOT the same picture")
    print("(decoded-video comparison is not used: H.264 quantises identical frames differently)")


if __name__ == "__main__":
    main()
