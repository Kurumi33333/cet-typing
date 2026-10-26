"""Score v2 — minimal, no melody: drone, soft pulse, textures, three hits (beats 4, 38, 60).

Why synthesize: the stock tracks are club-house loops; this film wants the
product-launch register — a clear pulse, plucked arpeggios, a warm pad, a sub that
you feel, silence before each hit, and three big downbeats that land exactly on
the film's three slams (beats 8, 32, 72). Written offline with numpy/scipy so it is
deterministic (seeded) and sample-accurate to the grid: beat n = n * 60/124.0005 s.

Structure (beats):    0–8  hook: pad + marimba note on every word that lands
                      8    SLAM 1 (sub boom + air)          8–32 groove builds
                     32    SLAM 2                           32–44 full
                     44–50 lexicon: filtered, calmer        50–58 full
                     58–64 break, snare-roll into the finale
                     64–72 riser build                      72   SLAM 3, shimmer tail

Output: public/audio/hifi/bgm-v4.wav  (48 kHz stereo 24-bit)
Usage:  python analysis/compose-bgm.py
"""
import pathlib
import subprocess

import numpy as np
from scipy import signal

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "audio" / "hifi" / "bgm-v4.wav"
SR = 48000
BPM = 124.0005
B = 60.0 / BPM  # seconds per beat
TOTAL_BEATS = 74
N = int((TOTAL_BEATS * B + 1.0) * SR)
rng = np.random.default_rng(7)


def mono_zeros():
    return np.zeros(N)


def stereo_zeros():
    return np.zeros((N, 2))


def bt(n):  # beat -> sample
    return int(round(n * B * SR))


def add(buf, sig, start, gain=1.0, pan=0.0):
    """Mix a mono signal into a stereo buffer at sample `start`; pan -1..1."""
    if start >= N or start + len(sig) <= 0:
        return
    s0 = max(0, start)
    seg = sig[s0 - start: s0 - start + (N - s0)]
    e = s0 + len(seg)
    l = np.cos((pan + 1) * np.pi / 4)
    r = np.sin((pan + 1) * np.pi / 4)
    buf[s0:e, 0] += seg * gain * l * 1.4142
    buf[s0:e, 1] += seg * gain * r * 1.4142


def lp(x, fc, order=2):
    sos = signal.butter(order, min(fc, SR / 2 - 100) / (SR / 2), "low", output="sos")
    return signal.sosfilt(sos, x)


def hp(x, fc, order=2):
    sos = signal.butter(order, fc / (SR / 2), "high", output="sos")
    return signal.sosfilt(sos, x)


def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo / (SR / 2), min(hi, SR / 2 - 100) / (SR / 2)], "band", output="sos")
    return signal.sosfilt(sos, x)


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def env_ad(n, a, d, curve=3.0):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-t * curve / max(d, 1e-3))
    return e


def saw(freq, n, detune=0.0, phase=0.0):
    t = np.arange(n) / SR
    f = freq * (1 + detune)
    return 2 * ((t * f + phase) % 1.0) - 1


def reverb_ir(seconds, damp=6000, seed=1):
    r = np.random.default_rng(seed)
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = np.stack([r.standard_normal(n), r.standard_normal(n)], axis=1)
    decay = np.exp(-t * 6.9 / seconds)[:, None]
    ir = ir * decay
    for c in (0, 1):
        ir[:, c] = lp(ir[:, c], damp)
    ir[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))[:, None]  # soft pre-attack
    return ir / np.sqrt((ir ** 2).sum() / 2)


def convolve_reverb(x, ir):
    out = np.stack([signal.fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in (0, 1)], axis=1)
    return out





def saw(freq, n, detune=0.0, phase=0.0):
    t = np.arange(n) / SR
    return 2 * (((t * freq * (1 + detune)) + phase) % 1.0) - 1

def reverb_ir(seconds, damp=6000, seed=1):
    r = np.random.default_rng(seed)
    n = int(seconds * SR); t = np.arange(n) / SR
    ir = np.stack([r.standard_normal(n), r.standard_normal(n)], axis=1) * np.exp(-t * 6.9 / seconds)[:, None]
    for c in (0, 1):
        ir[:, c] = lp(ir[:, c], damp)
    ir[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))[:, None]
    return ir / np.sqrt((ir ** 2).sum() / 2)

def convolve_reverb(x, ir):
    return np.stack([signal.fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in (0, 1)], axis=1)

def sub(freq, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * freq * t) + 0.25 * np.sin(2 * np.pi * freq * 2 * t)) * np.minimum(1, t / 0.5) * np.minimum(1, (dur - t) / 0.5)

def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)

def sine_pad(notes, dur, bright=1.0, wob=0.0):
    """Detuned saws + sine, low-passed with a slow wobble; open voicings (no triads)."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for m in notes:
        f = midi(m)
        out += saw(f, n, 0.004, 0.2) + saw(f, n, -0.005, 0.6) + 1.2 * np.sin(2 * np.pi * f * t)
    out = out / (len(notes) * 3.2)
    y = np.zeros(n)
    edges = np.linspace(0, n, 17).astype(int)
    for i in range(16):
        fc = (500 + 1500 * bright) * (1 + wob * np.sin(i / 16 * np.pi * 2))
        y[edges[i]: edges[i + 1]] = lp(out, fc)[edges[i]: edges[i + 1]]
    a = np.minimum(1, t / 2.0) * np.minimum(1, (dur - t) / 1.6)
    return y * a

def tick():
    n = int(0.05 * SR)
    t = np.arange(n) / SR
    return bp(rng.standard_normal(n), 2400, 6500) * np.exp(-t * 120) * 0.5

def softkick(g=1.0):
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    f = 42 + 80 * np.exp(-t * 45)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11) * g

def glass(freq, dur=4.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * freq * t) + 0.3 * np.sin(2 * np.pi * freq * 2.01 * t)) * np.exp(-t * 1.1) * np.minimum(1, t / 0.4) * 0.5

def swell(beats, lo=300, hi=9000):
    n = int(beats * B * SR)
    t = np.linspace(0, 1, n)
    x = rng.standard_normal(n)
    out = np.zeros(n)
    edges = np.linspace(0, n, 21).astype(int)
    for i in range(20):
        fc = lo * (hi / lo) ** ((i + 1) / 20)
        out[edges[i]: edges[i + 1]] = bp(x, fc * 0.6, fc)[edges[i]: edges[i + 1]]
    return out * t ** 2.6 * 0.7

def hit(dur=4.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 30 + 60 * np.exp(-t * 6)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.3)
    air = lp(hp(rng.standard_normal(n), 250), 7000) * np.exp(-t * 2.6) * 0.3
    return boom * 1.1 + air

def rev_hit(beats=2.0):
    """reversed tail leading INTO a hit"""
    return hit(beats * B + 0.5)[::-1][: int(beats * B * SR)] * np.linspace(0, 1, int(beats * B * SR)) ** 1.5 * 0.6

drone, pads, pulse, fx = stereo_zeros(), stereo_zeros(), stereo_zeros(), stereo_zeros()
sc = np.ones(N)
HITS = (4, 42, 60)
END = 68

def duck(beat_pos, depth=0.5, rel=0.4, rate=9):
    s = bt(beat_pos); n = int(rel * SR)
    cur = 1 - depth * np.exp(-np.arange(n) / SR * rate)
    e = min(N, s + n)
    sc[s:e] = np.minimum(sc[s:e], cur[: e - s])

# drone: D1 whole film; rises in level at the hits
d = sub(midi(26), (END + 2) * B) * 0.55
add(drone, d, 0, 0.7)
# pads: open fifths/ninths, one per 16 beats; they enter at the first hit
PADS = [(4, [38, 45, 52, 57]), (20, [43, 50, 57, 62]), (42, [38, 45, 52, 59, 64]), (54, [45, 52, 57, 64]), (60, [38, 45, 52, 57, 62, 69])]
for i, (b0, notes) in enumerate(PADS):
    b1 = PADS[i + 1][0] if i + 1 < len(PADS) else END + 2
    add(pads, sine_pad(notes, (b1 - b0) * B + 1.8, 0.55 + 0.1 * i, 0.4), bt(b0), 0.5, pan=0)
# an airy hush before the first hit
add(pads, sine_pad([50, 57, 62], 4 * B + 0.5, 0.35), 0, 0.35)

# pulse: soft kick on the beat from 12 to 36 and 40 to 58, ticks on offbeats; hole before every hit
def pulse_on(b):
    return (12 <= b < 41) or (44 <= b < 58) or (61 <= b < 67)
for b in range(0, 70):
    if pulse_on(b):
        add(pulse, softkick(0.8 if b < 42 else 0.95), bt(b), 0.9)
        duck(b, 0.45, 0.3, 11)
for b8 in range(0, 140):
    b = b8 / 2
    if b8 % 2 == 1 and ((16 <= b < 41) or (46 <= b < 58) or (62 <= b < 67)):
        add(pulse, tick(), bt(b), 0.35, pan=0.2 * np.sin(b))
# sparse glass notes, single tones with long tails — not a melody
for b, m in ((4, 86), (20, 81), (42, 86), (60, 93), (63, 86)):
    add(fx, glass(midi(m)), bt(b + 0.02), 0.28, pan=(-0.3 if m > 85 else 0.3))
# swells into each hit; reversed hit tail right before
for s_b, hb in ((0.5, 4), (36.5, 42), (55.5, 60)):
    add(fx, swell(hb - s_b), bt(s_b), 0.5)
for hb in HITS:
    add(fx, rev_hit(1.5), bt(hb - 1.5), 0.6)
    add(fx, hit(), bt(hb), 0.9 if hb == 60 else 0.8)
    duck(hb, 0.85, 1.1, 5)

ir_big = reverb_ir(3.4, 6500, 3)
pad_rev = convolve_reverb(pads, ir_big) * 0.5
fx_rev = convolve_reverb(fx, ir_big) * 0.35
mix_ = (drone * (0.5 + 0.5 * sc)[:, None]
        + pads * (0.45 + 0.55 * sc)[:, None] + pad_rev
        + pulse + fx + fx_rev)
mix_ = np.tanh(mix_ * 0.9) / np.tanh(0.9)
mix_ *= (10 ** (-2.5 / 20)) / np.abs(mix_).max()
tail = int(2.0 * SR)
mix_[-tail:] *= np.linspace(1, 0, tail)[:, None]
OUT.parent.mkdir(parents=True, exist_ok=True)
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-",
                "-c:a", "pcm_s24le", str(OUT)], input=mix_.astype(np.float32).tobytes(), check=True)
print("wrote", OUT, f"{N / SR:.1f}s")
