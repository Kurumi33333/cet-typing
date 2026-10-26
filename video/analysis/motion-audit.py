"""Find motion discontinuities: where does the picture JUMP instead of glide?

"不流畅 / 不连续" cannot be seen in still frames — it needs the frame-to-frame
derivative.

The important distinction this script makes: a DELIBERATE ramp (a ten-frame
dissolve from paper into the dark field) also produces a large per-frame delta,
and a naive detector flags it as a defect. A real discontinuity is concentrated
in ONE frame: its delta is large AND much larger than the deltas either side of
it. `ratio` here is delta divided by the max of the neighbouring ±3 frames —
a smooth ramp scores about 1, a hard cut scores 10–100.

Usage: python analysis/motion-audit.py [--video path] [--top 20]
"""
import json
import pathlib
import subprocess
import sys

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
DEFAULT_VIDEO = ROOT / "out" / "promo-bgm.mp4"
FPS = 30
W, H = 480, 270


def decode_grey(path: pathlib.Path) -> np.ndarray:
    raw = subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(path),
         "-vf", f"scale={W}:{H}", "-pix_fmt", "gray", "-f", "rawvideo", "-"],
        capture_output=True, check=True,
    ).stdout
    n = len(raw) // (W * H)
    return np.frombuffer(raw[: n * W * H], np.uint8).reshape(n, H, W).astype(np.float32)


def main():
    video = DEFAULT_VIDEO
    if "--video" in sys.argv:
        video = pathlib.Path(sys.argv[sys.argv.index("--video") + 1])
    top = int(sys.argv[sys.argv.index("--top") + 1]) if "--top" in sys.argv else 20

    frames = decode_grey(video)
    n = len(frames)
    d = np.abs(np.diff(frames, axis=0)).mean(axis=(1, 2)) * 1000  # milli-units
    print(f"{video.name}: {n} frames, mean frame delta {d.mean():.2f} mu")

    nb = np.zeros_like(d)
    for i in range(len(d)):
        lo = d[max(0, i - 3): i]
        hi = d[i + 1: i + 4]
        nb[i] = max(lo.max() if len(lo) else 0.0, hi.max() if len(hi) else 0.0)
    ratio = d / np.maximum(nb, 0.6)

    idx = np.argsort(-ratio)[: top * 3]
    events, used = [], []
    for i in idx:
        f = int(i + 1)  # delta[i] is the change INTO frame i+1
        if any(abs(f - g) <= 3 for g in used):
            continue
        used.append(f)
        events.append({
            "frame": f,
            "delta_mu": round(float(d[i]), 2),
            "neighbour_mu": round(float(nb[i]), 2),
            "ratio": round(float(ratio[i]), 1),
        })
        if len(events) >= top:
            break
    events.sort(key=lambda e: e["frame"])

    print(f"\n{'frame':>6s} {'t(s)':>6s} {'delta':>9s} {'neighbour':>10s} {'ratio':>7s}  kind")
    for e in events:
        kind = "HARD CUT" if e["ratio"] > 8 else ("step" if e["ratio"] > 3 else "ramp")
        print(f"{e['frame']:6d} {e['frame']/FPS:6.2f} {e['delta_mu']:9.2f} "
              f"{e['neighbour_mu']:10.2f} {e['ratio']:7.1f}x  {kind}")

    cuts = [e for e in events if e["ratio"] > 8]
    print(f"\n{len(cuts)} hard discontinuity(ies) out of {len(events)} events")

    out = ROOT / "analysis" / "motion-audit.json"
    out.write_text(json.dumps({"video": video.name, "frames": n,
                               "mean_delta": round(float(d.mean()), 3), "events": events}, indent=1),
                   encoding="utf-8")
    print("wrote", out)

    print("\nper-second mean frame delta (a gliding shot is flat):")
    per_sec = [round(float(d[i:i + FPS].mean()), 2) for i in range(0, len(d) - FPS, FPS)]
    for s in range(0, len(per_sec), 4):
        print(f"  {s:2d}s  " + "  ".join(f"{v:6.2f}" for v in per_sec[s:s + 4]))


if __name__ == "__main__":
    main()
