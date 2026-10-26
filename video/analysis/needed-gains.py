"""Turn a measured mix audit into per-pin volume multipliers.

The first attempt at this was clever regex surgery on src/sound.ts and too
fragile to trust. This version does the honest thing: it computes a gain per
pin index (the pin list is generated in a fixed order by both scripts) and
prints a plain table that gets applied by hand — ten numbers, verified by
rendering again.

Usage: python analysis/needed-gains.py [target_db]
"""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
AUDIT = ROOT / "analysis" / "mix-audit.json"

TARGET = float(sys.argv[1]) if len(sys.argv) > 1 else 10.0
CAP = 2.6          # ×2.6 = +8.3 dB is the most a normalized file can take safely
FLOOR = 0.7


def main():
    audit = json.loads(AUDIT.read_text(encoding="utf-8"))
    rows = audit["pins"]
    print(f"target SNR +{TARGET:.0f} dB, gain cap x{CAP}\n")
    print(f"{'#':>2s} {'pin':34s} {'snr':>6s} {'need dB':>8s} {'gain':>6s}")
    for i, r in enumerate(rows):
        need = TARGET - r["snr_db"]
        gain = min(CAP, max(FLOOR, 10 ** (need / 20)))
        print(f"{i:2d} {r['label']:34s} {r['snr_db']:6.1f} {need:8.1f} {gain:6.2f}")

    weakest = min(rows, key=lambda r: r["snr_db"])["label"]
    print(f"\nweakest pin: {weakest}")
    print("apply: new_volume = old_volume * gain, then re-render and re-audit")


if __name__ == "__main__":
    main()
