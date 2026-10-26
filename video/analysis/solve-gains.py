"""Close the loop on the mix: solve every pin's volume from measured results.

`volume` in Remotion is a linear multiplier, and RMS in dB is linear in the log
of that multiplier. So one measurement per pin is enough to solve for the gain
that hits a target SNR — no guessing, no hand-tuning:

    needed_delta_db = target_snr - measured_snr
    new_volume      = old_volume * 10 ** (needed_delta_db / 20)

This script reads analysis/mix-audit.json (produced by mix-audit.py from the two
renders), prints the new volume table, and rewrites the trailing volume constant
of every `pin(...)` call in src/sound.ts.

Usage:
  python analysis/mix-audit.py            # measure current renders
  python analysis/solve-gains.py --write  # rewrite src/sound.ts volumes
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
AUDIT = ROOT / "analysis" / "mix-audit.json"
SOUND = ROOT / "src" / "sound.ts"

# how far each pin must sit above the music bed in its own window
TARGET = {
    "SLAM": 14.0,
    "rule draw": 10.0,
    "last slot": 9.0,
    "card press": 9.0,
    "page cut": 9.0,
    "stat": 11.0,
    "handover": 9.0,
    "WRONG": 13.0,
    "caret": 10.0,
    "fix lands": 11.0,
    "orb": 8.0,
    "dark field": 9.0,
    "interval": 11.0,
    "riser": 9.0,
    "rule draws": 8.0,
    "sparkle": 8.0,
}


def target_for(label: str) -> float:
    for key, value in TARGET.items():
        if key.lower() in label.lower():
            return value
    return 9.0


def main():
    audit = json.loads(AUDIT.read_text(encoding="utf-8"))
    src = SOUND.read_text(encoding="utf-8")

    # map every pin() call in the file, in order, to its declared volume
    calls = list(re.finditer(r"pin\(([^,]+), '([^']+)', ([\d.]+), '([^']*)'", src))
    if not calls:
        sys.exit("no pin() calls found — did src/sound.ts change shape?")

    by_note = {c.group(4): c for c in calls}

    # the audit labels are written for humans; match them back to pins by prefix
    print(f"{'pin':34s} {'now':>7s} {'snr':>7s} {'target':>7s} {'new vol':>8s}")
    new_volumes = {}
    for row in audit["pins"]:
        label = row["label"]
        cand = None
        for c in calls:
            note = c.group(4)
            # loose match on the leading words of the audit label
            head = label.split("(")[0].strip()
            if head.split()[0] in note or note.split("·")[-1].strip().startswith(head[:6]):
                cand = c
                break
        if cand is None:
            continue
        old = float(cand.group(3))
        tgt = target_for(label)
        delta = tgt - row["snr_db"]
        new = max(0.2, min(2.5, old * 10 ** (delta / 20)))
        new_volumes[cand.group(4)] = round(new, 2)
        print(f"{label:34s} {old:7.2f} {row['snr_db']:7.1f} {tgt:7.1f} {new:8.2f}")

    if "--write" not in sys.argv:
        print("\n(dry run — pass --write to apply)")
        return

    out = src
    for note, vol in new_volumes.items():
        out = re.sub(
            r"(pin\([^,]+, '[^']+', )([\d.]+)(, '" + re.escape(note) + "'\))",
            lambda m: f"{m.group(1)}{vol}{m.group(3)}",
            out,
        )
    SOUND.write_text(out, encoding="utf-8")
    print(f"\napplied {len(new_volumes)} volume changes to src/sound.ts")


if __name__ == "__main__":
    main()
