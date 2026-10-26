"""Rebuild every sound asset at full quality into public/audio/hifi/.

Why: the first normalizer (normalize-sfx.py) down-mixed every effect to MONO at
22.05 kHz and re-encoded it as mp3 — that discards everything above ~11 kHz and
all stereo width, which is exactly the "muffled, low-bitrate" sound the film had.
The BGM was also an mp3 re-encoded from an mp3 (256k -> 192k).

This script goes back to the original library files and writes:
  * every SFX            -> 48 kHz / stereo / 24-bit-quality 32f -> pcm_s24le WAV
  * 206+ real keystrokes -> same, cut from the real keyboard recording
  * the BGM slice        -> 48 kHz stereo WAV cut straight from the 256k source
Scaling only, never shifting, so the attack lags in src/analysis/sfx-lags.json
and the beat grid stay valid. Gain/limit logic mirrors normalize-sfx.py.

Usage: python analysis/hifi-audio.py
"""
import json
import pathlib
import subprocess

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = ROOT / "public" / "audio"
OUT = SRC / "hifi"
OUT.mkdir(parents=True, exist_ok=True)
SR = 48000
BGM_SRC = pathlib.Path.home() / ".agents/skills/video-shotcraft/assets/audio/bgm/bgm-tech-house.mp3"

TARGET_RMS_DB = -18.0
PEAK_CEIL_DB = -3.0


def load(path, sr=SR, ch=2):
    raw = subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(path), "-ac", str(ch), "-ar", str(sr), "-f", "f32le", "-"],
        capture_output=True, check=True,
    ).stdout
    a = np.frombuffer(raw[: len(raw) // 4 // ch * 4 * ch], np.float32).copy()
    return a.reshape(-1, ch)


def save(path, a):
    pcm = np.clip(a, -1, 1).astype(np.float32)
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-",
         "-c:a", "pcm_s24le", str(path)],
        input=pcm.tobytes(), check=True,
    )


def soft_limit(x):
    ceil = 10 ** (PEAK_CEIL_DB / 20)
    knee = ceil * 0.85
    ax = np.abs(x)
    return np.where(ax <= knee, x, np.sign(x) * (knee + (ceil - knee) * np.tanh((ax - knee) / (ceil - knee))))


def mono(a):
    return a.mean(axis=1)


def main():
    lags = json.loads((ROOT / "src" / "analysis" / "sfx-lags.json").read_text(encoding="utf-8"))
    n = 0
    for path in sorted(SRC.glob("*.mp3")):
        if path.name in ("bgm.mp3", "keyboard.mp3"):
            continue
        a = load(path)
        start = int(lags.get(path.name, 0) / 30 * SR)
        win = mono(a)[start: start + int(0.2 * SR)]
        if len(win) < 32:
            win = mono(a)[: int(0.2 * SR)]
        rms = float(np.sqrt((win ** 2).mean()) + 1e-9)
        out = soft_limit(a * (10 ** (TARGET_RMS_DB / 20) / rms))
        save(OUT / (path.stem + ".wav"), out)
        n += 1
    print(f"{n} effects")

    # real keystrokes, onsets found exactly as cut-keystrokes.py does (22.05k mono)
    kb = SRC / "keyboard.mp3"
    m = load(kb, 22050, 1)[:, 0]
    win = int(0.01 * 22050)
    env = np.convolve(np.abs(m), np.ones(win) / win, mode="same")
    thr = env.max() * 0.22
    onsets = []
    i = 0
    while i < len(env):
        if env[i] > thr:
            j = i
            while j < len(env) and env[j] > thr:
                j += 1
            onsets.append(i)
            i = j + int(0.02 * 22050)
        else:
            i += 1
    a = load(kb)
    lead, body, fade = int(0.012 * SR), int(0.140 * SR), int(0.004 * SR)
    k = 0
    for idx, on in enumerate(onsets):
        s = max(0, int(on / 22050 * SR) - lead)
        seg = a[s: s + body].copy()
        if len(seg) < int(0.05 * SR):
            continue
        rms = float(np.sqrt((mono(seg) ** 2).mean()) + 1e-9)
        seg *= 10 ** (-18.0 / 20) / rms
        seg[:fade] *= np.linspace(0, 1, fade)[:, None]
        seg[-fade:] *= np.linspace(1, 0, fade)[:, None]
        peak = float(np.abs(seg).max())
        if peak > 0:
            seg *= min(1.0, 10 ** (-4.0 / 20) / peak)
        save(OUT / f"key-{idx + 1:03d}.wav", seg)
        k += 1
    print(f"{k} keystrokes")

    # BGM: straight from the 256k source, the same window the beat grid was fitted to
    beat = json.loads((ROOT / "src" / "analysis" / "beat-data.json").read_text(encoding="utf-8"))
    t0, dur = beat["source_beat0_s"], beat["window_s"]
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-ss", str(t0), "-t", str(dur), "-i", str(BGM_SRC),
         "-ar", str(SR), "-ac", "2", "-c:a", "pcm_s24le", str(OUT / "bgm.wav")],
        check=True,
    )
    print("bgm.wav", dur, "s from", BGM_SRC.name)


if __name__ == "__main__":
    main()
