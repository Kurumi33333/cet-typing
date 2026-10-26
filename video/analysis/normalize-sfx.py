"""Pre-normalize every SFX into public/audio/norm/ so the mix is honest.

The independent review's main finding was a mix failure, and its root cause is a
misuse of `volume`: in Remotion `volume` is a MULTIPLIER against the file's own
level, so a sample recorded at -34 dB RMS can be multiplied by 0.85 and still be
inaudible under the music. The library also has samples with inter-sample peaks
above 0 dBFS, so simply multiplying up clips.

Per sound-design §4.1 the preferred fix is to normalize the assets, then use
`volume` for relative balance:

  * every SFX is rescaled to the same RMS (-20 dBFS) over its attack window,
    which is what makes typewriter taps, clock ticks and paper all read at
    comparable loudness;
  * each is then peak-limited to -1.5 dBFS with a soft clip, so nothing can
    exceed full scale after the small relative tweaks in src/sound.ts;
  * the attack frame survives untouched (the file is only scaled, never shifted),
    so the pins in src/sound.ts stay valid.

Usage: python analysis/normalize-sfx.py
"""
import json
import pathlib
import subprocess

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = ROOT / "public" / "audio"
OUT = SRC / "norm"
OUT.mkdir(parents=True, exist_ok=True)

TARGET_RMS_DB = -18.0
PEAK_CEIL_DB = -6.0
SR = 22050


def load(path: pathlib.Path) -> np.ndarray:
    raw = subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(path), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
        capture_output=True, check=True,
    ).stdout
    return np.frombuffer(raw[: len(raw) // 4 * 4], np.float32).copy()


def main():
    lags = json.loads((ROOT / "src" / "analysis" / "sfx-lags.json").read_text(encoding="utf-8"))
    report = {}
    print(f"{'sample':32s} {'rms in':>8s} {'rms out':>8s} {'peak out':>9s} {'gain':>6s}")
    for path in sorted(SRC.glob("*.mp3")):
        if path.name == "bgm.mp3":
            continue
        a = load(path)
        attack_s = lags.get(path.name, 0) / 30
        start = int(attack_s * SR)
        win = a[start: start + int(0.2 * SR)]
        if len(win) < 32:
            win = a[: int(0.2 * SR)]
        rms = float(np.sqrt((win ** 2).mean()) + 1e-9)
        gain = 10 ** ((TARGET_RMS_DB + 20 * np.log10(rms)) / 20) / (rms / max(rms, 1e-9)) if False else (10 ** (TARGET_RMS_DB / 20)) / rms

        out = a * gain
        # soft-limit to the ceiling: tanh knee above 0.8 of the ceiling
        ceil = 10 ** (PEAK_CEIL_DB / 20)
        if np.abs(out).max() > 0:
            over = np.abs(out) > ceil * 0.85
            out = np.where(np.abs(out) <= ceil * 0.85, out,
                           np.sign(out) * (ceil * 0.85 + (ceil - ceil * 0.85) * np.tanh(
                               (np.abs(out) - ceil * 0.85) / (ceil - ceil * 0.85))))

        raw = (out * 32767).astype(np.int16).tobytes()
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-f", "s16le", "-ar", str(SR), "-ac", "1",
             "-i", "-", "-c:a", "libmp3lame", "-b:a", "192k", str(OUT / path.name)],
            input=raw, check=True,
        )

        check = load(OUT / path.name)
        w2 = check[start: start + int(0.2 * SR)] if len(check) > start else check[: int(0.2 * SR)]
        rms_out = float(20 * np.log10(np.sqrt((w2 ** 2).mean()) + 1e-9))
        peak_out = float(20 * np.log10(np.abs(check).max() + 1e-9))
        report[path.name] = {
            "rms_out_db": round(rms_out, 1), "peak_out_db": round(peak_out, 1), "gain": round(float(gain), 3),
        }
        print(f"{path.name:32s} {20*np.log10(rms):7.1f} {rms_out:7.1f} {peak_out:8.1f} {gain:6.2f}")

    (ROOT / "analysis" / "sfx-normalized.json").write_text(json.dumps(report, indent=1), encoding="utf-8")
    print(f"\nwrote {len(report)} normalized samples to public/audio/norm/")


if __name__ == "__main__":
    main()
