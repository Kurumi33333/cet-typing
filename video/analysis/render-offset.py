"""Measure this pipeline's output-audio offset (aesthetic rule S5).

The rendered MP4's audio track is decoded back to WAV and cross-correlated
against the source BGM with numpy only (no scipy needed). The lag that maximises
correlation is the total pipeline offset (AAC priming + container) in seconds.

Usage: python analysis/render-offset.py
"""
import json
import pathlib
import subprocess
import sys

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
BGM = ROOT / "public" / "audio" / "bgm.mp3"
RENDER = ROOT / "out" / "promo-v1.mp4"
WAV = ROOT / "out" / "qa" / "_render-audio.wav"
SRC_WAV = ROOT / "out" / "qa" / "_source-audio.wav"
FPS = 30


def decode(src, dst, extra=None):
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", str(src)]
    if extra:
        cmd += extra
    cmd += ["-vn", "-ac", "1", "-ar", "22050", "-acodec", "pcm_s16le", str(dst)]
    subprocess.run(cmd, check=True)


def load(path):
    import wave

    with wave.open(str(path), "rb") as w:
        sr = w.getframerate()
        raw = w.readframes(w.getnframes())
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0, sr


def main():
    if not RENDER.exists():
        sys.exit(f"render missing: {RENDER}")
    decode(BGM, SRC_WAV)
    decode(RENDER, WAV)
    src, sr = load(SRC_WAV)
    out, sr2 = load(WAV)
    assert sr == sr2, (sr, sr2)
    print(f"source {len(src)/sr:.3f}s  render {len(out)/sr:.3f}s  sr={sr}")

    # normalised cross-correlation over ±0.5 s of lag
    max_lag = int(0.5 * sr)
    a = src - src.mean()
    b = out - out.mean()
    # compare a 6-second window from the middle of the music (dense, distinctive)
    start = int(10 * sr)
    window = a[start:start + int(6 * sr)]
    ref = window / (np.linalg.norm(window) + 1e-9)

    best = None
    for lag in range(-max_lag, max_lag + 1):
        lo = start + lag
        if lo < 0 or lo + len(window) > len(b):
            continue
        seg = b[lo:lo + len(window)]
        n = np.linalg.norm(seg) + 1e-9
        score = float(np.dot(ref, seg / n))
        if best is None or score > best[1]:
            best = (lag, score)
    lag, score = best
    off_s = lag / sr
    print(f"best lag = {lag} samples = {off_s*1000:.1f} ms = {off_s*FPS:.2f} frames   corr={score:.4f}")

    out_path = ROOT / "analysis" / "render-offset.json"
    out_path.write_text(
        json.dumps(
            {
                "render": str(RENDER.name),
                "fps": FPS,
                "offset_ms": round(off_s * 1000, 2),
                "offset_frames": round(off_s * FPS, 3),
                "correlation": round(score, 4),
                "note": "positive = rendered audio arrives LATER than the source",
            },
            indent=1,
        ),
        encoding="utf-8",
    )
    print("wrote", out_path)


if __name__ == "__main__":
    main()
