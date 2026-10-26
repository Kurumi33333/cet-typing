"""Calibrate every SFX volume against the music bed.

The problem the review found: every pin was multiplied DOWN (0.2–0.95) against
samples that are already quiet, so 31 of 35 SFX sat below the BGM in their own
window. `volume` in Remotion is a multiplier, not a target level.

This script measures, per sample:
  * its RMS over a 0.2 s window starting at its attack (what you actually hear)
  * its peak (for clipping headroom)
then solves for the multiplier that puts that window a fixed margin ABOVE the
music's own RMS in the same window.

Usage: python analysis/mix-calibrate.py            # report
       python analysis/mix-calibrate.py --write    # write src/analysis/mix-gains.json
"""
import json
import pathlib
import subprocess
import sys

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
AUDIO = ROOT / "public" / "audio"
SR = 22050
FPS = 30

# BGM after the planned level change. Measured on the current bed at 0.34:
# ~ -22 dB RMS. Dropping to 0.15 is -7.1 dB -> ~ -29 dB.
BGM_VOLUME = 0.15
BGM_RMS_DB = -22.0 + 20 * np.log10(BGM_VOLUME / 0.34)

# How far above the bed each class of effect must sit to read clearly.
MARGIN_DB = {
    "typing": 7.0,      # short taps: must be above the bed but stay foley-quiet
    "foley": 9.0,
    "transition": 10.0,
    "counter": 10.0,
    "impact": 13.0,
    "riser": 8.0,
    "light": 7.0,
}

CLASS = {
    "typewriter-hit-soft.mp3": "typing",
    "typewriter-hit-single.mp3": "typing",
    "typewriter-hit-hard.mp3": "typing",
    "typewriter-return-bell.mp3": "typing",
    "marker-pen-line.mp3": "foley",
    "switch-light.mp3": "foley",
    "camera-shutter-vintage.mp3": "foley",
    "paper-staple.mp3": "foley",
    "paper-slide.mp3": "foley",
    "transition-soft.mp3": "transition",
    "swoosh-quick.mp3": "transition",
    "whoosh-fast.mp3": "transition",
    "clock-tick-single.mp3": "counter",
    "clock-mech-retract.mp3": "counter",
    "gear-lock-metallic.mp3": "counter",
    "impact-cine-big.mp3": "impact",
    "impact-deep-whoosh.mp3": "impact",
    "hit-weak.mp3": "impact",
    "riser-cine.mp3": "riser",
    "sparkle.mp3": "light",
    "sparkle-touch.mp3": "light",
    "stardust-swish.mp3": "light",
    "ui-zoom-in.mp3": "transition",
}


def load(path: pathlib.Path) -> np.ndarray:
    raw = subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(path), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
        capture_output=True, check=True,
    ).stdout
    return np.frombuffer(raw[: len(raw) // 4 * 4], np.float32)


def main():
    lags = json.loads((ROOT / "src" / "analysis" / "sfx-lags.json").read_text(encoding="utf-8"))
    rows = {}
    print(f"BGM at volume {BGM_VOLUME}: RMS {BGM_RMS_DB:.1f} dB in its own window\n")
    print(f"{'sample':32s} {'class':10s} {'rms':>7s} {'peak':>7s} {'target':>8s} {'gain':>6s} {'peak out':>9s}")
    for name in sorted(lags):
        path = AUDIO / name
        if not path.exists():
            continue
        a = load(path)
        attack = lags[name] / FPS
        start = int(attack * SR)
        win = a[start: start + int(0.20 * SR)]
        if len(win) == 0:
            continue
        rms = float(20 * np.log10(np.sqrt((win ** 2).mean()) + 1e-9))
        peak = float(20 * np.log10(np.abs(a).max() + 1e-9))
        cls = CLASS.get(name, "foley")
        target = BGM_RMS_DB + MARGIN_DB[cls]
        gain = 10 ** ((target - rms) / 20)
        gain = max(0.25, min(3.2, gain))
        peak_out = peak + 20 * np.log10(gain)
        rows[name] = {
            "class": cls,
            "gain": round(gain, 3),
            "rms_db": round(rms, 1),
            "peak_db": round(peak, 1),
            "peak_out_db": round(peak_out, 1),
        }
        flag = "  CLIP RISK" if peak_out > -1.0 else ""
        print(f"{name:32s} {cls:10s} {rms:6.1f}  {peak:6.1f}  {target:7.1f}  {gain:6.2f}  {peak_out:8.1f}{flag}")

    if "--write" in sys.argv:
        out = {k: v["gain"] for k, v in rows.items()}
        (ROOT / "src" / "analysis" / "mix-gains.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
        print("\nwrote src/analysis/mix-gains.json")
    else:
        print("\n(dry run — pass --write to emit the gain table)")


if __name__ == "__main__":
    main()
