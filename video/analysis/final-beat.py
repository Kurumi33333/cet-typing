"""Final music decision: fix the 18-bar window, verify the grid on it, list the
kick energy per beat (for choosing the film's 2 whole-screen impacts), and cut
the audio the film will actually play.

Usage: python analysis/final-beat.py
"""
import json, pathlib, subprocess
import numpy as np
import librosa
from scipy.signal import butter, sosfilt

ROOT = pathlib.Path(__file__).resolve().parents[1]
BGM = pathlib.Path(r"C:\Users\THEO\.agents\skills\video-shotcraft\assets\audio\bgm\bgm-tech-house.mp3")
OUT_JSON = ROOT / "analysis" / "beat-data.json"
OUT_AUDIO = ROOT / "public" / "audio" / "bgm.mp3"

FPS = 30
WINDOW_START_BAR_T = 87.8409   # local-fit downbeat (see segment-fit.py output)
N_BARS = 20


def band_env(y, sr, lo, hi):
    sos = butter(4, [lo, hi], btype="band", fs=sr, output="sos")
    env = librosa.onset.onset_strength(y=sosfilt(sos, y), sr=sr)
    return env, librosa.times_like(env, sr=sr)


def main():
    y, sr = librosa.load(BGM, sr=None, mono=True)
    # fit the grid again, but ONLY on beats inside the window
    seg_start = WINDOW_START_BAR_T - 2
    seg_end = seg_start + (N_BARS + 2) * 4 * 0.4839
    seg = y[int(seg_start * sr): int(seg_end * sr)]
    yh = librosa.effects.hpss(seg, margin=2.0)[1]
    _, beats = librosa.beat.beat_track(y=yh, sr=sr, tightness=400, units="time")
    b = np.asarray(beats, float) + seg_start
    i = np.arange(len(b))
    A = np.vstack([i, np.ones_like(i)]).T
    (T, t0), *_ = np.linalg.lstsq(A, b, rcond=None)
    resid = b - (t0 + i * T)
    bpm = 60.0 / T
    print(f"grid: BPM={bpm:.4f}  T={T:.5f}s  t0={t0:.4f}s  residual ±{np.abs(resid).max()*1000:.1f}ms")

    # make the window start exactly on a grid beat
    k = round((WINDOW_START_BAR_T - t0) / T)
    beat0 = t0 + k * T
    print(f"window start = beat index {k} of the fit -> {beat0:.4f}s")

    total_beats = N_BARS * 4
    end_t = beat0 + total_beats * T
    print(f"window {beat0:.3f}s -> {end_t:.3f}s  ({end_t - beat0:.3f}s, {total_beats} beats)")

    # kick strength per beat inside the window
    yh_full = librosa.effects.hpss(y, margin=2.0)[1]
    kick_env, ktimes = band_env(yh_full, sr, 40, 160)
    snare_env, _ = band_env(yh_full, sr, 150, 500)
    hat_env, _ = band_env(yh_full, sr, 6000, 14000)
    rows = []
    for n in range(total_beats):
        t = beat0 + n * T
        idx = int(np.argmin(np.abs(ktimes - t)))
        rows.append({
            "beat": n,
            "bar": n // 4,
            "beatInBar": n % 4,
            "t": round(t - beat0, 4),
            "frame": round((t - beat0) * FPS),
            "kick": round(float(kick_env[idx]), 3),
            "snare": round(float(snare_env[idx]), 3),
            "hat": round(float(hat_env[idx]), 3),
        })

    print("\nbeat  bar.b  frame   kick  snare   hat")
    for r in rows:
        print(f"{r['beat']:4d}  {r['bar']}.{r['beatInBar']}  {r['frame']:5d}  {r['kick']:5.2f}  {r['snare']:5.2f}  {r['hat']:5.2f}")

    top = sorted(rows, key=lambda r: -r["kick"])[:8]
    print("\nstrongest kicks:", [(r["beat"], r["kick"]) for r in top])

    # RMS arc per bar
    rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=512)[0]
    rt = librosa.times_like(rms, sr=sr)
    bars = []
    for bar in range(N_BARS):
        lo, hi = beat0 + bar * 4 * T, beat0 + (bar + 1) * 4 * T
        m = (rt >= lo) & (rt < hi)
        bars.append(round(float(rms[m].mean()), 4))
    print("\nRMS per bar:", bars)

    data = {
        "file": "bgm-tech-house.mp3",
        "license": "Mixkit Stock Music Free License (no attribution required)",
        "bpm": round(bpm, 4),
        "T": round(T, 6),
        "fps": FPS,
        "framesPerBeat": round(T * FPS, 4),
        "source_beat0_s": round(beat0, 4),
        "source_end_s": round(end_t, 4),
        "window_s": round(end_t - beat0, 4),
        "n_bars": N_BARS,
        "total_beats": total_beats,
        "total_frames": round((end_t - beat0) * FPS),
        "residual_ms": round(float(np.abs(resid).max()) * 1000, 2),
        "beats": rows,
        "rms_bars": bars,
    }
    OUT_JSON.write_text(json.dumps(data, indent=1), encoding="utf-8")
    print("\nwrote", OUT_JSON)

    # cut the exact window, 20ms fade in, 400ms fade out
    dur = end_t - beat0
    OUT_AUDIO.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([
        "ffmpeg", "-y", "-loglevel", "error",
        "-ss", f"{beat0:.4f}", "-t", f"{dur:.4f}", "-i", str(BGM),
        "-af", f"afade=t=in:st=0:d=0.02,afade=t=out:st={dur-0.45:.3f}:d=0.45",
        "-c:a", "libmp3lame", "-b:a", "192k", str(OUT_AUDIO),
    ], check=True)
    print("wrote", OUT_AUDIO, f"{OUT_AUDIO.stat().st_size/1024:.0f} KB")


if __name__ == "__main__":
    main()
