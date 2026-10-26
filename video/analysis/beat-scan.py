"""Beat-grid analysis for the CET Typing promo.

Usage:  python analysis/beat-scan.py

Reads every mp3 in the skill's assets/audio/bgm, fits an equally spaced beat
grid by least squares over the detected beat sequence (NOT the tempo scalar),
reports the residual, the 0.5x/1x/2x candidates, the strongest kicks, and the
RMS energy arc. Output: analysis/beat-scan.json
"""
import json, pathlib, sys
import numpy as np
import librosa
from scipy.signal import butter, sosfilt

BGM_DIR = pathlib.Path(r"C:\Users\THEO\.agents\skills\video-shotcraft\assets\audio\bgm")
OUT = pathlib.Path(__file__).with_name("beat-scan.json")


def band_env(y, sr, lo, hi):
    sos = butter(4, [lo, hi], btype="band", fs=sr, output="sos")
    env = librosa.onset.onset_strength(y=sosfilt(sos, y), sr=sr)
    return env, librosa.times_like(env, sr=sr)


def fit(beats):
    i = np.arange(len(beats))
    A = np.vstack([i, np.ones_like(i)]).T
    (T, t0), *_ = np.linalg.lstsq(A, beats, rcond=None)
    residual = beats - (t0 + i * T)
    return float(T), float(t0), float(np.abs(residual).max())


def score(grid_t0, T, beats, n_beats, dur):
    """match ratio + mean abs alignment of a candidate grid against real onsets."""
    ts = np.round((beats - grid_t0) / T).astype(int)
    keep = (ts >= 0) & (ts < n_beats)
    aligned = grid_t0 + ts[keep] * T
    err = np.abs(aligned - beats[keep]) * 1000
    return {
        "match": float(keep.mean()),
        "mean_abs_ms": float(err.mean()),
        "max_ms": float(err.max()),
    }


def main():
    reports = {}
    for path in sorted(BGM_DIR.glob("*.mp3")):
        y, sr = librosa.load(path, sr=None, mono=True)
        dur = len(y) / sr
        yh = librosa.effects.hpss(y, margin=2.0)[1]  # percussive part
        tempo, beats = librosa.beat.beat_track(y=yh, sr=sr, tightness=400, units="time")
        b = np.asarray(beats, dtype=float)
        T, t0, resid = fit(b)
        bpm = 60.0 / T

        # 0.5x / 1x / 2x candidates
        cands = {}
        for label, mult in (("0.5x", 0.5), ("1x", 1.0), ("2x", 2.0)):
            T2 = T / mult
            # re-fit phase at that period against the same onsets
            phase = b % T2
            t02 = float(np.angle(np.mean(np.exp(2j * np.pi * phase / T2))) / (2 * np.pi) * T2)
            n = int(dur / T2)
            cands[label] = {
                "bpm": 60.0 / T2,
                "t0": t02,
                **score(t02, T2, b, n, dur),
            }

        # strongest kicks on the winning (1x) grid
        kick_env, ktimes = band_env(yh, sr, 40, 160)
        n_beats = int((dur - t0) / T)
        kicks = []
        for n in range(n_beats):
            t = t0 + n * T
            e = float(kick_env[int(np.argmin(np.abs(ktimes - t)))])
            kicks.append((n, t, e))
        top = sorted(kicks, key=lambda k: -k[2])[:24]

        # RMS arc per bar (4 beats)
        rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=512)[0]
        rt = librosa.times_like(rms, sr=sr)
        bars = []
        n_bars = int((dur - t0) / (4 * T))
        for bar in range(n_bars):
            lo, hi = t0 + bar * 4 * T, t0 + (bar + 1) * 4 * T
            m = (rt >= lo) & (rt < hi)
            bars.append(round(float(rms[m].mean()) if m.any() else 0.0, 4))

        reports[path.name] = {
            "path": str(path),
            "duration_s": round(dur, 3),
            "detected_tempo": float(np.atleast_1d(tempo)[0]),
            "fit_bpm": round(bpm, 3),
            "t0": round(t0, 4),
            "T": round(T, 5),
            "residual_ms": round(resid * 1000, 1),
            "candidates": {k: {kk: (round(vv, 4) if isinstance(vv, float) else vv) for kk, vv in v.items()} for k, v in cands.items()},
            "top_kicks": [{"beat": n, "t": round(t, 3), "e": round(e, 4)} for n, t, e in top],
            "rms_bars": bars,
        }
        print(f"{path.name:26s} dur={dur:6.2f}s  BPM={bpm:7.3f}  t0={t0:6.3f}  resid={resid*1000:5.1f}ms  cand1x_match={cands['1x']['match']:.2f}")
        sys.stdout.flush()

    OUT.write_text(json.dumps(reports, indent=1), encoding="utf-8")
    print("wrote", OUT)


if __name__ == "__main__":
    main()
