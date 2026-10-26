"""Peak-vs-bed audit: does each SFX read as an EVENT over the music?

What the ear responds to is the PEAK of the effect against the RMS of the bed
under it — a short percussive hit has a low window RMS even when its attack is
loud, so RMS-vs-RMS is the wrong metric.

The pin list is READ OUT OF src/sound.ts instead of being typed here. A
hand-kept frame table in this script reported three false "silent pin" results
after the typing rhythm changed, which cost a debugging round.

Usage: python analysis/peak-audit.py
"""
import json
import pathlib
import re
import subprocess

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
SR = 22050
FPS = 30
WIN = 0.30
BEAT_SEC = 0.483857


def decode(p):
    raw = subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(p), "-vn", "-ac", "1",
         "-ar", str(SR), "-f", "f32le", "-"],
        capture_output=True, check=True,
    ).stdout
    return np.frombuffer(raw[: len(raw) // 4 * 4], np.float32)


def peak(x):
    return 20 * np.log10(np.abs(x).max() + 1e-12)


def rms(x):
    return 20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-12)


def shot_starts() -> dict:
    src = (ROOT / "src" / "beat.ts").read_text(encoding="utf-8")
    out = {}
    for m in re.finditer(r"(\w+): shot\((\d+), (\d+)\)", src):
        out[m.group(1)] = round(int(m.group(2)) * BEAT_SEC * FPS)
    return out


def pins_from_source() -> list:
    src = (ROOT / "src" / "sound.ts").read_text(encoding="utf-8")
    starts = shot_starts()

    consts = {}
    for m in re.finditer(r"const (S\d|C\d) = SHOTS\.(\w+)\.from;", src):
        consts[m.group(1)] = starts.get(m.group(2), 0)
    for m in re.finditer(r"const (\w+) = (\[[\d,\s]+\]);", src):
        consts[m.group(1)] = [int(x) for x in re.findall(r"\d+", m.group(2))]
    for m in re.finditer(r"const (\w+) = (\d+);", src):
        consts.setdefault(m.group(1), int(m.group(2)))

    pins = []
    for m in re.finditer(r"pin\((\w+) \+ ([^,]+), '([^']+)', ([\d.]+), '([^']*)'", src):
        shot, off, name, vol, note = m.groups()
        if shot not in consts:
            continue
        try:
            o = eval(off, {"__builtins__": {}}, dict(consts))  # noqa: S307 - our own file
        except Exception:
            continue
        pins.append({"frame": int(consts[shot] + o), "src": name,
                     "volume": float(vol), "note": note})
    return pins


NEED = {
    "impact": 14.0, "slam": 14.0, "stamp": 15.0, "marker": 8.0,
    "key-": 7.0, "typewriter": 7.0, "paper": 8.0, "clock": 9.0,
    "riser": 7.0, "sparkle": 8.0, "switch": 9.0,
}


def need_for(name: str, note: str) -> float:
    n = (name + " " + note).lower()
    for k, v in NEED.items():
        if k in n:
            return v
    return 8.0


def main():
    mix = decode(ROOT / "out" / "promo-bgm.mp4")
    sfx = decode(ROOT / "out" / "promo-nobgm.mp4")
    n = min(len(mix), len(sfx))
    bed = mix[:n] - sfx[:n]
    sfx = sfx[:n]

    pins = pins_from_source()
    rows = []
    bad = 0
    print(f"{'pin':40s} {'frame':>6s} {'sfx pk':>7s} {'bed rms':>8s} {'over':>6s} {'need':>5s}  verdict")
    for p in sorted(pins, key=lambda r: r["frame"]):
        s = int(p["frame"] / FPS * SR)
        e = min(n, s + int(WIN * SR))
        if e <= s:
            continue
        pk = peak(sfx[s:e])
        bd = rms(bed[s:e])
        over = pk - bd
        need = need_for(p["src"], p["note"])
        ok = over >= need
        if not ok:
            bad += 1
        rows.append({"frame": p["frame"], "src": p["src"], "over_db": round(float(over), 1),
                     "needed_db": float(need), "reads": bool(ok), "note": p["note"]})
        label = (p["note"] or p["src"])[:40]
        print(f"{label:40s} {p['frame']:6d} {pk:7.1f} {bd:8.1f} {over:6.1f} "
              f"{need:5.0f}  {'OK' if ok else 'BURIED'}")

    out = ROOT / "analysis" / "peak-audit.json"
    out.write_text(json.dumps({"pins": rows, "buried": bad, "total": len(rows)}, indent=1), encoding="utf-8")
    print(f"\n{bad}/{len(rows)} pins under their target")
    print("wrote", out)


if __name__ == "__main__":
    main()
