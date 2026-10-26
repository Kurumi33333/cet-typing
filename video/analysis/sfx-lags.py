"""Generate the SFX pin table with attack-aligned offsets.

Sound-design §4.6 / aesthetic rule S5: a pin must be `target frame − attack lag`,
not `target frame`. Every sample's true attack (onset) is read from
analysis/sfx-peaks.json, so the *audible hit* lands on the frame the picture
hits — not the file head.

This script prints the `lagFrames` map that src/sound.ts consumes. Re-run it
whenever a sample is swapped.

Usage: python analysis/sfx-lags.py
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
PEAKS = json.loads((ROOT / "analysis" / "sfx-peaks.json").read_text(encoding="utf-8"))
FPS = 30


def main():
    lags = {}
    for name, info in PEAKS.items():
        # onset is the honest "you hear it start"; peak is where the weight is.
        # For percussive samples (onset ~ peak) the two agree. For swells the
        # picture should land WITH the weight, so we align to the peak of the
        # attack, defined as the earlier of (peak, onset + 0.25 s).
        peak = info["peak_at_s"]
        onset = info["onset_at_s"]
        attack = min(peak, onset + 0.25) if peak - onset > 0.25 else peak
        lags[name] = round(attack * FPS, 1)

    print(f"{'file':34s} {'onset':>7s} {'peak':>7s} {'align':>7s} {'lagF':>7s}")
    for name, info in sorted(PEAKS.items()):
        peak, onset = info["peak_at_s"], info["onset_at_s"]
        attack = min(peak, onset + 0.25) if peak - onset > 0.25 else peak
        print(f"{name:34s} {onset:7.3f} {peak:7.3f} {attack:7.3f} {lags[name]:7.1f}")

    out = ROOT / "analysis" / "sfx-lags.json"
    out.write_text(json.dumps(lags, indent=1), encoding="utf-8")
    print("\nwrote", out)


if __name__ == "__main__":
    main()
