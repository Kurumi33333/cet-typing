"""Per-sample peak lag + onset for every SFX the film uses.

Sound-design §4.6: a sample's attack is not at its file head. The pin has to be
`target frame − peak lag`, otherwise the sound lands late by however long the
sample's own swell is. impact-cine-big is the dangerous one (7.9 s with a long
build), so this measures rather than guesses.

Usage: python analysis/sfx-peaks.py
"""
import json
import pathlib
import subprocess

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
AUDIO = ROOT / "public" / "audio"
SR = 22050


def load(path: pathlib.Path) -> np.ndarray:
    raw = subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(path), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
        capture_output=True, check=True,
    ).stdout
    return np.frombuffer(raw, np.float32)


def main():
    rows = {}
    print(f"{'file':32s} {'dur':>6s} {'peak@':>7s} {'onset@':>7s} {'peak dB':>8s}")
    for path in sorted(AUDIO.glob("*.mp3")):
        if path.name == "bgm.mp3":
            continue
        a = load(path)
        dur = len(a) / SR
        peak_idx = int(np.argmax(np.abs(a)))
        peak_t = peak_idx / SR
        # onset: first frame whose short-window RMS reaches 25% of the peak RMS
        win = int(0.02 * SR)
        env = np.sqrt(np.convolve(a ** 2, np.ones(win) / win, mode="same"))
        thr = env.max() * 0.25
        onset_t = float(np.argmax(env > thr) / SR)
        peak_db = 20 * np.log10(np.abs(a).max() + 1e-9)
        rows[path.name] = {
            "duration_s": round(dur, 3),
            "peak_at_s": round(peak_t, 3),
            "onset_at_s": round(onset_t, 3),
            "peak_db": round(float(peak_db), 1),
        }
        print(f"{path.name:32s} {dur:6.2f} {peak_t:7.3f} {onset_t:7.3f} {peak_db:7.1f}")

    out = ROOT / "analysis" / "sfx-peaks.json"
    out.write_text(json.dumps(rows, indent=1), encoding="utf-8")
    print("wrote", out)

    late = {k: v for k, v in rows.items() if v["peak_at_s"] > 0.12}
    if late:
        print("\nsamples whose true attack is NOT at the file head (>0.12 s):")
        for k, v in late.items():
            print(f"  {k:30s} peak at {v['peak_at_s']:.2f}s  onset at {v['onset_at_s']:.2f}s")


if __name__ == "__main__":
    main()
