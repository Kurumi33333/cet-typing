"""Segment-level beat grid fit for the section of BGM the film will actually use.

Fits the grid ONLY on the beats inside the used window, so the audit value is
the local truth rather than a whole-track average. Also dumps per-16th drum
strengths and writes analysis/beat-data.json for the Remotion timeline.

Usage: python analysis/segment-fit.py <name> <start_bar> <n_bars>
"""
import sys, json, pathlib
import numpy as np
import librosa
from scipy.signal import butter, sosfilt

BGM = pathlib.Path(r"C:\Users\THEO\.agents\skills\video-shotcraft\assets\audio\bgm")
SCAN = json.loads(pathlib.Path(__file__).with_name("beat-scan.json").read_text(encoding="utf-8"))
FPS = 30


def band_env(y, sr, lo, hi):
    sos = butter(4, [lo, hi], btype="band", fs=sr, output="sos")
    env = librosa.onset.onset_strength(y=sosfilt(sos, y), sr=sr)
    return env, librosa.times_like(env, sr=sr)


def main(name, start_bar, n_bars):
    info = SCAN[name]
    y, sr = librosa.load(BGM / name, sr=None, mono=True)
    T0, t00 = info["T"], info["t0"]
    bar = 4 * T0
    start = t00 + start_bar * bar
    end = start + n_bars * bar

    # re-detect beats inside the window and fit locally
    seg = y[int(start * sr): int(end * sr)]
    yh = librosa.effects.hpss(seg, margin=2.0)[1]
    _, beats = librosa.beat.beat_track(y=yh, sr=sr, tightness=400, units="time")
    b = np.asarray(beats, float) + start
    i = np.arange(len(b))
    A = np.vstack([i, np.ones_like(i)]).T
    (T, t0), *_ = np.linalg.lstsq(A, b, rcond=None)
    resid = b - (t0 + i * T)
    bpm = 60.0 / T
    print(f"local fit: BPM={bpm:.4f}  T={T:.5f}s  t0={t0:.4f}s  residual ±{np.abs(resid).max()*1000:.1f}ms  beats={len(b)}")
    print(f"frames per beat = {T * FPS:.3f}")
    max_round_err = 0.0
    for n in range(int((end - t0) / T) + 1):
        t = t0 + n * T
        f = round(t * FPS)
        max_round_err = max(max_round_err, abs(f / FPS - t) * 1000)
    print(f"max beat->frame rounding error: {max_round_err:.1f}ms ({max_round_err/1000*FPS:.2f}f)")

    # drum profile per 16th for the whole window
    prof = {}
    yh2 = librosa.effects.hpss(y, margin=2.0)[1]
    for label, (lo, hi) in {"kick": (40, 160), "snare": (150, 500), "hat": (6000, 14000)}.items():
        env, times = band_env(yh2, sr, lo, hi)
        cells = []
        for step in range(n_bars * 16):
            t = t0 + step * (T / 4)
            cells.append(float(env[int(np.argmin(np.abs(times - t)))]))
        prof[label] = [round(v, 2) for v in cells]

    print("\nmean per-16th strength:")
    for label, cells in prof.items():
        arr = np.array(cells).reshape(n_bars, 16)
        print(f"  {label}: " + " ".join(f"{v:5.1f}" for v in arr.mean(0)))

    print("\nbar energy (RMS):")
    rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=512)[0]
    rt = librosa.times_like(rms, sr=sr)
    for bb in range(n_bars):
        lo_, hi_ = t0 + bb * T * 4, t0 + (bb + 1) * T * 4
        m = (rt >= lo_) & (rt < hi_)
        bar_rms = float(rms[m].mean()) if m.any() else 0.0
        print(f"  bar {start_bar+bb:3d} ({bb:2d})  rms={bar_rms:.3f}  t={lo_:.2f}s  frame={round(lo_*FPS)}")

    out = {
        "file": name,
        "start_bar": start_bar,
        "n_bars": n_bars,
        "bpm": round(bpm, 4),
        "T": round(T, 6),
        "t0": round(t0, 6),
        "residual_ms": round(float(np.abs(resid).max()) * 1000, 2),
        "source_start_s": round(start, 4),
        "source_end_s": round(end, 4),
        "fps": FPS,
        "profile_16th": prof,
    }
    pathlib.Path(__file__).with_name("beat-data.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
    print("\nwrote analysis/beat-data.json")


if __name__ == "__main__":
    main(sys.argv[1], int(sys.argv[2]), int(sys.argv[3]))
