"""Fill in attack lags for every sample the film now uses.

The old table only covered the first batch of effects. After the sound redesign
the film also plays 206 cut keystrokes (`key-*.mp3`) plus `clock-mech-retract`
and `switch-tap`, none of which had a measured attack — so they were pinned as if
their hit were at the file head, which lands them late and reads as sloppy.

Because the keystrokes were cut with a fixed 12 ms lead-in, their attack is a
known constant rather than 206 separate measurements; this script measures one
to confirm the constant, then writes it for all of them.

Usage: python analysis/fill-lags.py
"""
import json
import pathlib
import subprocess

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
LAGS = ROOT / "src" / "analysis" / "sfx-lags.json"
NORM = ROOT / "public" / "audio" / "norm"
SR = 22050
FPS = 30


def load(p):
    raw = subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(p), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
        capture_output=True, check=True,
    ).stdout
    return np.frombuffer(raw[: len(raw) // 4 * 4], np.float32)


def onset_frames(p) -> float:
    a = load(p)
    if len(a) == 0:
        return 0.0
    win = int(0.005 * SR)
    env = np.abs(a)
    e = np.convolve(env, np.ones(win) / win, mode="same")
    thr = e.max() * 0.5
    idx = int(np.argmax(e > thr))
    return round(idx / SR * FPS, 1)


def main():
    lags = json.loads(LAGS.read_text(encoding="utf-8"))
    added = 0

    keys = sorted(NORM.glob("key-*.mp3"))
    if keys:
        probe = onset_frames(keys[0])
        # the cut is mechanical (12 ms lead-in, same detector), so one probe
        # defines the whole bank; measure three to be sure they agree
        probes = [onset_frames(k) for k in (keys[0], keys[len(keys) // 2], keys[-1])]
        spread = max(probes) - min(probes)
        lag = round(sum(probes) / len(probes), 1)
        print(f"keystroke bank: {len(keys)} files, probe lags {probes} (spread {spread:.1f}f) -> {lag}f")
        for k in keys:
            lags[k.name] = lag
            added += 1

    for name in ("clock-mech-retract.mp3", "switch-tap.mp3", "paper-slide.mp3", "marker-pen-line.mp3"):
        p = NORM / name
        if not p.exists():
            p = ROOT / "public" / "audio" / name
        if p.exists():
            f = onset_frames(p)
            if name not in lags or abs(lags[name] - f) > 1:
                lags[name] = f
                added += 1
            print(f"{name:28s} onset {f:5.1f}f")

    LAGS.write_text(json.dumps(lags, indent=1), encoding="utf-8")
    print(f"\nupdated {added} entries in {LAGS.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
