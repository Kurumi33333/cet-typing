"""Deeper look at the two shortlisted BGM sections: drum pattern, brightness, dynamics.

Usage: python analysis/bgm-deep.py <name> <start_bar> <bars>
"""
import sys, json, pathlib
import numpy as np
import librosa
from scipy.signal import butter, sosfilt

BGM = pathlib.Path(r"C:\Users\THEO\.agents\skills\video-shotcraft\assets\audio\bgm")
SCAN = json.loads(pathlib.Path(__file__).with_name("beat-scan.json").read_text(encoding="utf-8"))


def band_env(y, sr, lo, hi):
    sos = butter(4, [lo, hi], btype="band", fs=sr, output="sos")
    env = librosa.onset.onset_strength(y=sosfilt(sos, y), sr=sr)
    return env, librosa.times_like(env, sr=sr)


def main(name, start_bar, bars):
    info = SCAN[name]
    path = BGM / name
    y, sr = librosa.load(path, sr=None, mono=True)
    T, t0 = info["T"], info["t0"]
    bpm = 60.0 / T
    bar_t = 4 * T
    start = t0 + start_bar * bar_t
    dur = bars * bar_t
    seg = y[int(start * sr): int((start + dur) * sr)]
    yh = librosa.effects.hpss(seg, margin=2.0)[1]

    print(f"# {name}  BPM {bpm:.2f}  T={T:.4f}s  bar={bar_t:.4f}s  window {start:.3f}s +{dur:.3f}s")

    # centroid (brightness) in Hz
    cent = librosa.feature.spectral_centroid(y=seg, sr=sr)[0]
    print(f"centroid mean={cent.mean():.0f}Hz  p10={np.percentile(cent,10):.0f}  p90={np.percentile(cent,90):.0f}")

    # 16th-note grid hit strengths per band
    for label, (lo, hi) in {
        "kick 40-160": (40, 160),
        "snare 150-500": (150, 500),
        "hat 6k-14k": (6000, 14000),
    }.items():
        env, times = band_env(yh, sr, lo, hi)
        cells = []
        for step in range(bars * 16):
            t = step * (T / 4)
            e = float(env[int(np.argmin(np.abs(times - t)))])
            cells.append(e)
        cells = np.array(cells)
        top = cells.reshape(bars, 16)
        print(f"\n{label}: mean={cells.mean():.3f}")
        for b in range(min(bars, 8)):
            row = " ".join(f"{v:4.1f}" for v in top[b])
            print(f"  bar {start_bar + b:3d} | {row}")

    # RMS per 16th over the window -> energy contour
    rms = librosa.feature.rms(y=seg, frame_length=1024, hop_length=256)[0]
    rt = librosa.times_like(rms, sr=sr)
    per_bar = []
    for b in range(bars):
        m = (rt >= b * bar_t) & (rt < (b + 1) * bar_t)
        per_bar.append(round(float(rms[m].mean()), 3))
    print("\nRMS per bar:", per_bar)


if __name__ == "__main__":
    main(sys.argv[1], int(sys.argv[2]), int(sys.argv[3]))
