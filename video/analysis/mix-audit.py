"""Measure the ACTUAL mix: per-pin SFX-to-music ratio on the delivered file.

The previous report could only compare window RMS of the two renders, which
conflates "the effect is quiet" with "the effect is there but the music is loud
in the same window". This does it properly:

  stem_sfx = render_without_bgm          (picture-identical, SFX only)
  stem_mix = render_with_bgm
  stem_bgm_only = stem_mix - stem_sfx     (the bed, recovered by subtraction)

then for every pin, in a 0.25 s window at its target frame:
  snr = RMS(stem_sfx) - RMS(stem_bgm_only)

A pin needs roughly +6 dB to read as an event rather than a texture.

Usage: python analysis/mix-audit.py
"""
import json
import pathlib
import subprocess

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
MIX = ROOT / "out" / "promo-bgm.mp4"
SFX_ONLY = ROOT / "out" / "promo-nobgm.mp4"
SR = 22050
FPS = 30
WIN = 0.25


def decode(path: pathlib.Path) -> np.ndarray:
    raw = subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(path), "-vn", "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
        capture_output=True, check=True,
    ).stdout
    return np.frombuffer(raw[: len(raw) // 4 * 4], np.float32)


def rms_db(x: np.ndarray) -> float:
    if len(x) == 0:
        return -120.0
    return float(20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-12))


def main():
    mix = decode(MIX)
    sfx = decode(SFX_ONLY)
    n = min(len(mix), len(sfx))
    mix, sfx = mix[:n], sfx[:n]
    bed = mix - sfx

    # the pin list, rebuilt from the same numbers src/sound.ts uses
    from itertools import chain
    pins = []
    pins.append((8, "S1 rule draw"))
    pins.append((196, "S1 sentence complete (SLAM 1)"))
    pins.append((199, "S1 last slot locks"))
    pins.append((233, "C1 card press"))
    pins.append((290, "S2 page cut"))
    pins.append((290 + 80, "S2 stat 1"))
    pins.append((436, "C2 card press"))
    pins.append((494 + 6, "S3 page handover"))
    pins.append((494 + 66, "S3 WRONG word marked red"))
    pins.append((494 + 176, "S3 caret returns"))
    pins.append((494 + 202, "S3 fix lands"))
    pins.append((494 + 212, "S3 energy orb"))
    pins.append((756, "C3 card press"))
    pins.append((813 + 2, "S4 dark field cut"))
    pins.append((813 + 38, "S4 interval 1"))
    pins.append((813 + 86, "S4 interval 4"))
    pins.append((929 + 0, "S5 riser"))
    pins.append((929 + 74, "S5 WORDMARK STAMP (SLAM 2)"))
    pins.append((929 + 100, "S5 rule draws"))
    pins.append((929 + 112, "S5 sparkle"))

    rows = []
    print(f"{'pin':34s} {'frame':>6s} {'sfx':>8s} {'bed':>8s} {'snr':>7s}  verdict")
    below = 0
    for frame, label in pins:
        s = int((frame / FPS) * SR)
        e = s + int(WIN * SR)
        a = rms_db(sfx[s:e])
        b = rms_db(bed[s:e])
        snr = a - b
        ok = snr >= 6.0
        if not ok:
            below += 1
        rows.append({"label": label, "frame": frame, "sfx_db": round(a, 1), "bed_db": round(b, 1), "snr_db": round(snr, 1), "reads": ok})
        print(f"{label:34s} {frame:6d} {a:7.1f} {b:7.1f} {snr:6.1f}  {'OK' if ok else 'BURIED'}")

    # loudness of the two declared slams vs the rest of the film
    def window_peak(frame, w=12):
        s = int(max(0, (frame / FPS) - w / FPS) * SR)
        e = int(((frame + w) / FPS) * SR)
        return rms_db(sfx[s:e])

    print()
    print("whole-film loudest SFX moments (0.4 s windows):")
    step = int(0.2 * SR)
    env = np.array([rms_db(sfx[i:i + int(0.4 * SR)]) for i in range(0, len(sfx) - int(0.4 * SR), step)])
    order = np.argsort(-env)[:12]
    seen = []
    for i in order:
        f = int((i * step) / SR * FPS)
        if all(abs(f - g) > 30 for g in seen):
            seen.append(f)
        if len(seen) >= 5:
            break
    for f in sorted(seen):
        print(f"  f{f:5d}  {rms_db(sfx[int(f/FPS*SR):int(f/FPS*SR)+int(0.4*SR)]):6.1f} dB")

    out = ROOT / "analysis" / "mix-audit.json"
    out.write_text(json.dumps({"pins": rows, "buried": below, "total": len(rows)}, indent=1), encoding="utf-8")
    print(f"\n{below}/{len(rows)} pins still under +6 dB SNR")
    print("wrote", out)


if __name__ == "__main__":
    main()
