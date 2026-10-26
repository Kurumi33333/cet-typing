"""A6 / A2 audit: is every SFX pin actually audible in the rendered film?

For each pin, compare the RMS of a short window at the pin against the same
window in the SFX-only render (which isolates the SFX from the music bed).
A pin whose window is no louder than the surrounding BGM is inaudible.

Usage: python analysis/sfx-audibility.py
"""
import json
import pathlib
import subprocess

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
BGM_RENDER = ROOT / "out" / "promo-bgm.mp4"
SFX_RENDER = ROOT / "out" / "promo-nobgm.mp4"
FPS = 30


def rms_db(video: pathlib.Path, start_s: float, dur_s: float = 0.22) -> float:
    tmp = ROOT / "out" / "qa" / "_window.wav"
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{start_s:.4f}", "-t", f"{dur_s:.4f}",
         "-i", str(video), "-ac", "1", "-ar", "16000", str(tmp)],
        check=True,
    )
    raw = subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(tmp), "-f", "f32le", "-"],
        capture_output=True, check=True,
    ).stdout
    a = np.frombuffer(raw, np.float32)
    return float(20 * np.log10(np.sqrt((a ** 2).mean()) + 1e-9))


def main():
    # mirrors src/sound.ts (beat tables resolved to absolute frames in the film)
    pins = [
        ("S1 rule draws", 8), ("S1 letters", 118), ("S1 sentence completes", 196),
        ("C1 card press", 233), ("S2 page cut", 290), ("S2 tier 1", 316),
        ("S2 stat 1", 386), ("C2 card press", 436), ("S3 page handover", 498),
        ("S3 word lands", 558), ("S3 orb walks", 722), ("S3 page advances", 742),
        ("C3 card press", 756), ("S4 dark field", 815), ("S4 due count", 833),
        ("S4 163 days", 907), ("S5 riser", 929), ("S5 wordmark stamp", 1003),
        ("S5 rule draws", 1029), ("S5 sparkle", 1041),
    ]
    print(f"{'pin':24s} {'frame':>6s} {'BGM版 rms':>12s} {'SFX版 rms':>11s} {'delta':>8s}")
    rows = []
    for label, frame in pins:
        t = frame / FPS
        a = rms_db(BGM_RENDER, t)
        b = rms_db(SFX_RENDER, t)
        rows.append({"label": label, "frame": frame, "bgm_db": round(a, 1), "sfx_db": round(b, 1)})
        print(f"{label:24s} {frame:6d} {a:11.1f}dB {b:10.1f}dB {a-b:7.1f}dB")

    base = rms_db(BGM_RENDER, 5.0)  # S1 before any SFX: the music floor
    print(f"\nBGM-only floor at f150: {base:.1f} dB")
    out = ROOT / "analysis" / "sfx-audibility.json"
    out.write_text(json.dumps({"pins": rows, "bgm_floor_db": round(base, 1)}, indent=1), encoding="utf-8")
    print("wrote", out)


if __name__ == "__main__":
    main()
