"""Compose the film's own keynote-style score, locked to the 124 BPM beat grid.

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

Output: public/audio/hifi/bgm-keynote.wav  (48 kHz stereo 24-bit)
Usage:  python analysis/compose-bgm.py
"""
import pathlib
import subprocess

import numpy as np
from scipy import signal

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "audio" / "hifi" / "bgm-keynote.wav"
SR = 48000
BPM = 124.0005
B = 60.0 / BPM  # seconds per beat
TOTAL_BEATS = 80
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


# ------------------------------------------------------------------ chords
# C G Am F | C G Am F | F(build) C(finale)
CH = {
    "C": [48, 55, 64, 67, 72],
    "G": [43, 55, 62, 67, 71],
    "Am": [45, 57, 64, 69, 72],
    "F": [41, 53, 60, 65, 69],
}
PROG = ["C", "G", "Am", "F", "C", "G", "Am", "F", "F", "C"]  # one chord per 8 beats


def chord_at(beat):
    return PROG[min(len(PROG) - 1, int(beat // 8))]


ARP_NOTES = {
    "C": [60, 64, 67, 72, 76, 72, 67, 64],
    "G": [59, 62, 67, 71, 74, 71, 67, 62],
    "Am": [57, 60, 64, 69, 72, 69, 64, 60],
    "F": [57, 60, 65, 69, 72, 69, 65, 60],
}

# ------------------------------------------------------------------ voices


def kick(gain=1.0):
    n = int(0.42 * SR)
    t = np.arange(n) / SR
    f = 46 + 110 * np.exp(-t * 38)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 9.5)
    click = hp(rng.standard_normal(n), 2500) * np.exp(-t * 220) * 0.09
    return (body + click) * gain


def clap():
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    x = bp(rng.standard_normal(n), 1100, 5200)
    bursts = sum(np.exp(-np.clip(t - d, 0, None) * 90) * (t >= d) for d in (0, 0.011, 0.023))
    return x * (bursts * 0.45 + np.exp(-t * 14) * 0.5) * 0.7


def hat(open_=False):
    n = int((0.25 if open_ else 0.06) * SR)
    t = np.arange(n) / SR
    x = hp(rng.standard_normal(n), 7500)
    return x * np.exp(-t * (14 if open_ else 70)) * 0.35


def pluck(freq, dur=0.35, bright=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = 0.55 * saw(freq, n, 0.0) + 0.45 * saw(freq, n, 0.006, 0.31)
    x = x * np.exp(-t * 9.0)
    # filter envelope: bright at the attack, closing down
    y = np.zeros(n)
    blocks = 6
    edges = np.linspace(0, n, blocks + 1).astype(int)
    for i in range(blocks):
        fc = (900 + 5200 * bright * np.exp(-i * 0.85))
        y[edges[i]: edges[i + 1]] = lp(x, fc)[edges[i]: edges[i + 1]]
    return y * 0.55


def marimba(freq, dur=0.9):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * freq * t) * np.exp(-t * 5.5)
    x += 0.45 * np.sin(2 * np.pi * freq * 4.0 * t) * np.exp(-t * 24)
    x += 0.15 * np.sin(2 * np.pi * freq * 9.2 * t) * np.exp(-t * 60)
    x[: int(0.002 * SR)] *= np.linspace(0, 1, int(0.002 * SR))
    return x * 0.8


def bell(freq, dur=3.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    mod = np.sin(2 * np.pi * freq * 3.5 * t) * 2.4 * np.exp(-t * 3.0)
    x = np.sin(2 * np.pi * freq * t + mod) * np.exp(-t * 1.5)
    return x * 0.55


def sub(freq, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * freq * t) + 0.25 * np.sin(2 * np.pi * freq * 2 * t)
    a = np.minimum(1, t / 0.006) * np.minimum(1, (dur - t) / 0.02)
    return x * a * 0.9


def pad(chord, dur, bright=1.0):
    n = int(dur * SR)
    out = np.zeros(n)
    for m in chord:
        f = midi(m)
        out += saw(f, n, 0.0035, 0.1) + saw(f, n, -0.004, 0.55) + saw(f, n, 0.0012, 0.8)
    out = lp(out / (len(chord) * 3), 700 + 1900 * bright)
    t = np.arange(n) / SR
    a = np.minimum(1, t / 1.3) * np.minimum(1, (dur - t) / 0.9)
    return out * a * 0.9


def noise_riser(beats, top=14000):
    n = int(beats * B * SR)
    t = np.linspace(0, 1, n)
    x = rng.standard_normal(n)
    out = np.zeros(n)
    edges = np.linspace(0, n, 25).astype(int)
    for i in range(24):
        fc = 400 * (top / 400) ** ((i + 1) / 24)
        seg = bp(x, fc * 0.55, fc)
        out[edges[i]: edges[i + 1]] = seg[edges[i]: edges[i + 1]]
    return out * (t ** 2.2) * 0.8


def impact(dur=3.2):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 34 + 70 * np.exp(-t * 7)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.5)
    air = lp(hp(rng.standard_normal(n), 300), 9000) * np.exp(-t * 3.2) * 0.35
    crack = hp(rng.standard_normal(n), 1800) * np.exp(-t * 60) * 0.5
    return boom * 1.1 + air + crack


# ------------------------------------------------------------------ build
drums = stereo_zeros()
bass = stereo_zeros()
mel = stereo_zeros()
padb = stereo_zeros()
fx = stereo_zeros()
sc = np.ones(N)  # sidechain envelope for pad/bass/arp

kick_s = kick()


def duck(beat_pos, depth=0.55, rel=0.32):
    s = bt(beat_pos)
    n = int(rel * SR)
    cur = 1 - depth * np.exp(-np.arange(n) / SR * 11)
    e = min(N, s + n)
    sc[s:e] = np.minimum(sc[s:e], cur[: e - s])


# kick pattern: beats 12–31, 32–57, 62–72 four-on-the-floor; dropouts before slams
def kick_on(b):
    if 12 <= b < 31:
        return True
    if 32 <= b < 58:
        return True
    if 58 <= b < 71.5:
        return True
    return False


for b in range(0, 80):
    if kick_on(b):
        add(drums, kick_s, bt(b), 0.95 if b >= 32 else 0.78)
        duck(b)
# backbeat claps
for b in range(0, 80):
    if (b % 2 == 1) and ((20 <= b < 31) or (33 <= b < 58) or (65 <= b < 71)):
        add(drums, clap(), bt(b), 0.55, pan=0.08)
# hats: offbeat open, 16ths later
for b8 in range(0, 160):
    b = b8 / 2
    if 16 <= b < 31 or 32 <= b < 44 or 50 <= b < 58 or 64 <= b < 71.5:
        if b8 % 2 == 1:
            add(drums, hat(True), bt(b), 0.42, pan=0.15)
    if 36 <= b < 44 or 52 <= b < 58 or 66 <= b < 71.5:
        for q in (0.25,):
            add(drums, hat(False), bt(b + q), 0.22, pan=-0.2)
# snare-roll into the finale (beats 62–64, 16ths with rising gain) and into slam 2
for k in range(16):
    add(drums, clap(), bt(62 + k / 8), 0.12 + 0.5 * (k / 15) ** 1.5, pan=0.0)
for k in range(8):
    add(drums, clap(), bt(30 + k / 4), 0.10 + 0.4 * (k / 7) ** 1.5, pan=0.0)

# sub bass: root pulses on the off-8ths from 12, whole-note under the slams
for b in range(8, 76):
    ch = chord_at(b)
    root = CH[ch][0] - 12 if CH[ch][0] > 40 else CH[ch][0]
    active = (12 <= b < 31) or (32 <= b < 58) or (60 <= b < 71.5) or (72 <= b < 76)
    if not active:
        continue
    if 72 <= b < 76:
        if b == 72:
            add(bass, sub(midi(CH["C"][0] - 12), 4 * B), bt(72), 0.8)
        continue
    for sub8 in (0.5, 0.75) if b % 2 == 0 else (0.5,):
        add(bass, sub(midi(root), 0.17), bt(b + sub8), 0.55 if b >= 32 else 0.42)

# pad: one chord per 8 beats, gentle swell
for blk in range(0, 10):
    s_b = blk * 8
    if s_b >= 80:
        break
    ch = PROG[blk]
    dur = 8 * B + 0.6
    bright = 0.55 + 0.45 * min(1, s_b / 56)
    # lexicon (44–50): darker
    if 40 <= s_b < 48:
        bright *= 0.7
    p = pad(CH[ch], dur, bright)
    add(padb, p, bt(s_b), 0.42 if s_b < 64 else 0.55, pan=0.0)
# slam 3: bright chord held to the end of the film and beyond
fin = pad(CH["C"] + [76, 79, 84], 8 * B + 1.0, 1.4)
add(padb, fin, bt(72), 0.8)

# hook: a marimba note lands with every word (beats 1,2,3 and 5,6,7) — C major pentatonic climb
for b, m in zip([1, 2, 3, 5, 6, 7], [76, 79, 84, 79, 84, 88]):
    add(mel, marimba(midi(m)), bt(b), 0.6, pan=(-0.25 if b < 4 else 0.25))
    add(mel, marimba(midi(m)), bt(b + 0.75), 0.18, pan=(0.35 if b < 4 else -0.35))

# arpeggio plucks, 8th notes from 8, 16ths later; brighter as it goes
for b4 in range(32, 4 * 76):
    b = b4 / 4
    sec16 = (20 <= b < 31) or (32 <= b < 44) or (50 <= b < 58) or (64 <= b < 71.5)
    sec8 = (8 <= b < 20) or (44 <= b < 50) or (58 <= b < 64)
    if not (sec16 or sec8):
        continue
    if sec8 and (b4 % 2 != 0):
        continue
    ch = chord_at(b)
    notes = ARP_NOTES[ch]
    idx = int(round(b * 4)) % len(notes)
    if sec16 is False:
        idx = int(round(b * 2)) % len(notes)
    prog_bright = 0.45 + 0.55 * min(1, b / 60)
    if 44 <= b < 50:
        prog_bright *= 0.5
    vel = 0.5 + 0.18 * ((int(b * 4) % 4) == 0)
    add(mel, pluck(midi(notes[idx]), 0.38, prog_bright), bt(b), vel * (0.8 if b < 20 else 1.0),
        pan=0.45 * np.sin(b * 1.7))

# bells on each chord change (every 8 beats) + the finale shimmer
for blk in range(1, 10):
    s_b = blk * 8
    ch = chord_at(s_b)
    top = CH[ch][3] + 12
    add(mel, bell(midi(top), 3.0), bt(s_b), 0.32, pan=0.3)
for k, m in enumerate([84, 88, 91, 96]):
    add(mel, bell(midi(m), 3.6), bt(72 + 0.25 * k), 0.34, pan=(-0.5, 0.5, -0.25, 0.25)[k])

# risers and impacts
for rs, re_ in ((5.5, 8), (28.5, 32), (62, 64), (64, 72)):
    r = noise_riser(re_ - rs)
    add(fx, r, bt(rs), 0.55 if re_ - rs > 3 else 0.42)
for ib in (8, 32, 72):
    add(fx, impact(), bt(ib), 0.95 if ib == 72 else 0.85)
    duck(ib, 0.8, 0.9)
# silence before the finale: kick/hat gap handled by kick_on; a reverse-swell tick
add(fx, hat(True), bt(71.5), 0.3)

# ------------------------------------------------------------------ mix
ir_big = reverb_ir(2.6, 7000, 3)
ir_small = reverb_ir(0.9, 9000, 4)

mel_rev = convolve_reverb(mel, ir_big) * 0.30
pad_rev = convolve_reverb(padb, ir_big) * 0.35
fx_rev = convolve_reverb(fx, ir_big) * 0.22
drum_rev = convolve_reverb(drums, ir_small) * 0.10


def pingpong(x, beats=0.75, fb=0.38, mix=0.32, taps=4):
    d = int(beats * B * SR)
    out = np.zeros_like(x)
    for k in range(1, taps + 1):
        g = mix * (fb ** (k - 1))
        src = x[:, 0] if k % 2 else x[:, 1]
        sh = np.zeros(N)
        sh[k * d:] = src[: N - k * d]
        out[:, 1 if k % 2 else 0] += lp(sh, 5200) * g
    return out


mel_dly = pingpong(mel)

mix_ = (
    drums * 1.0
    + drum_rev
    + bass * sc[:, None] * 1.0
    + padb * (0.35 + 0.65 * sc)[:, None] * 0.95
    + pad_rev * 0.9
    + mel * (0.55 + 0.45 * sc)[:, None]
    + mel_rev
    + mel_dly
    + fx
    + fx_rev
)

# gentle glue: soft clip then normalise
mix_ = np.tanh(mix_ * 0.9) / np.tanh(0.9)
peak = np.abs(mix_).max()
mix_ *= (10 ** (-2.5 / 20)) / peak
# make sure the file ends clean
tail = int(1.5 * SR)
mix_[-tail:] *= np.linspace(1, 0, tail)[:, None]

OUT.parent.mkdir(parents=True, exist_ok=True)
subprocess.run(
    ["ffmpeg", "-y", "-loglevel", "error", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-",
     "-c:a", "pcm_s24le", str(OUT)],
    input=mix_.astype(np.float32).tobytes(), check=True,
)
print("wrote", OUT, f"{N / SR:.1f}s")
