"""Cut real keystrokes out of a real keyboard recording.

"音效廉价"的根因：片子给一个**电脑打字产品**配了**机械打字机**的拟音
（typewriter-hit-*：峰值 88Hz/1064Hz，是金属杆砸滚筒的声音），而且每一击都是
同一个采样循环播放 —— 这是"廉价"最典型的听感：同一块音色被复制粘贴。

正确做法不是合成一个更好的键盘音，而是用**真实键盘录音里的真实击键**：
`keyboard.mp3` 是一段 19.6 秒的真实键盘实录，能切出 220 个独立的击键瞬态，
彼此音色、力度、音高都不同。按片子的打字节奏挑出 N 个，每个都不同，
轻重交替就自然出现了。

Usage: python analysis/cut-keystrokes.py
输出：public/audio/norm/key-NN.mp3 + analysis/keystrokes.json（含每个的音量）
"""
import json
import pathlib
import subprocess

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = ROOT / "public" / "audio" / "keyboard.mp3"
OUT = ROOT / "public" / "audio" / "norm"
OUT.mkdir(parents=True, exist_ok=True)
SR = 22050


def load(p):
    raw = subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(p), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
        capture_output=True, check=True,
    ).stdout
    return np.frombuffer(raw[: len(raw) // 4 * 4], np.float32).copy()


def main():
    a = load(SRC)
    win = int(0.01 * SR)
    env = np.convolve(np.abs(a), np.ones(win) / win, mode="same")
    thr = env.max() * 0.22

    onsets = []
    i = 0
    while i < len(env):
        if env[i] > thr:
            j = i
            while j < len(env) and env[j] > thr:
                j += 1
            onsets.append(i)
            i = j + int(0.02 * SR)  # refractory: one onset per keystroke
        else:
            i += 1

    # cut each keystroke: 12 ms of lead-in, 140 ms of body
    lead = int(0.012 * SR)
    body = int(0.140 * SR)
    cuts = []
    for n, on in enumerate(onsets):
        s = max(0, on - lead)
        e = min(len(a), s + body)
        seg = a[s:e].copy()
        if len(seg) < int(0.05 * SR):
            continue
        # normalise every hit to the same RMS so the edit reads as even typing
        rms = float(np.sqrt((seg ** 2).mean()) + 1e-9)
        seg = seg * (10 ** (-18.0 / 20) / rms)
        # gentle 4 ms fade at both ends so cuts never click
        f = int(0.004 * SR)
        if len(seg) > 2 * f:
            seg[:f] *= np.linspace(0, 1, f)
            seg[-f:] *= np.linspace(1, 0, f)
        peak = float(np.abs(seg).max())
        if peak > 0:
            seg = seg * min(1.0, (10 ** (-6.0 / 20)) / peak)
        name = f"key-{n + 1:03d}.mp3"
        raw = (np.clip(seg, -1, 1) * 32767).astype(np.int16).tobytes()
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-f", "s16le", "-ar", str(SR), "-ac", "1",
             "-i", "-", "-c:a", "libmp3lame", "-b:a", "192k", str(OUT / name)],
            input=raw, check=True,
        )
        cuts.append({"file": name, "at_s": round(on / SR, 4)})

    (ROOT / "analysis" / "keystrokes.json").write_text(json.dumps(cuts, indent=1), encoding="utf-8")
    print(f"wrote {len(cuts)} distinct keystrokes to public/audio/norm/key-*.mp3")
    print(f"first: {[c['file'] for c in cuts[:6]]}")


if __name__ == "__main__":
    main()
