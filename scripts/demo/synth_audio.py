"""
Music bed and sound effects for the demo video, synthesised from code (no samples, no licences).

    python3 scripts/demo/synth_audio.py OUT_DIR [SECONDS]

Writes OUT_DIR/music.wav (ambient pad, 48 kHz stereo) and click.wav, whoosh.wav, chime.wav.
Requires numpy. Used by scripts/record-demo.mjs.
"""
import sys
import wave

import numpy as np

SR = 48000
rng = np.random.default_rng(7)


def write(path, x):
    x = np.clip(x, -1, 1)
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype("<i2").tobytes())


def env_adsr(n, a, r):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    e[:na] = np.linspace(0, 1, na) ** 2
    e[-nr:] *= np.linspace(1, 0, nr) ** 2
    return e


def onepole_lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):  # short signals only
        acc = (1 - a) * x[i] + a * acc
        y[i] = acc
    return y


def reverb(x, seconds=2.6, mix=0.35):
    """Convolution with a decaying-noise impulse (separate per channel for width)."""
    n = int(seconds * SR)
    t = np.arange(n) / SR
    out = []
    for ch in range(2):
        ir = rng.standard_normal(n) * np.exp(-t * 3.2)
        ir[: int(0.012 * SR)] = 0
        ir /= np.sqrt(np.sum(ir ** 2))
        src = x[:, ch]
        L = len(src) + n - 1
        N = 1 << (L - 1).bit_length()
        wet = np.fft.irfft(np.fft.rfft(src, N) * np.fft.rfft(ir, N), N)[: len(src)]
        out.append((1 - mix) * src + mix * wet)
    return np.stack(out, axis=1)


def music(seconds):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    # A minor → F → C → G, voiced low and open; one chord every quarter of the bed
    chords = [[110.0, 164.81, 220.0, 261.63], [87.31, 130.81, 174.61, 220.0], [130.81, 196.0, 261.63, 329.63], [98.0, 146.83, 196.0, 246.94]]
    seg = seconds / len(chords)
    out = np.zeros((n, 2))
    for k, ch in enumerate(chords):
        start, end = k * seg - 1.2, (k + 1) * seg + 1.2  # overlapping crossfades
        i0, i1 = max(0, int(start * SR)), min(n, int(end * SR))
        tt = t[i0:i1]
        e = env_adsr(i1 - i0, 1.6, 1.8)
        for j, f in enumerate(ch):
            for side, det in ((0, -0.18), (1, 0.21)):
                ff = f + det * (j + 1)
                # soft, slightly bright pad: fundamental + a few rolled-off harmonics, slow shimmer
                s = np.sin(2 * np.pi * ff * tt) + 0.32 * np.sin(4 * np.pi * ff * tt) + 0.12 * np.sin(6 * np.pi * ff * tt)
                s *= 0.85 + 0.15 * np.sin(2 * np.pi * (0.11 + 0.03 * j) * tt + j)
                out[i0:i1, side] += s * e * (0.055 if j else 0.07)
    # sparse high "star" plucks on chord tones, panned
    beat = 0.75
    for m in range(int(seconds / beat)):
        if rng.random() < 0.45:
            continue
        k = min(len(chords) - 1, int(m * beat / seg))
        f = chords[k][rng.integers(1, 4)] * 4
        i0 = int(m * beat * SR)
        L = min(n - i0, int(1.4 * SR))
        tt = np.arange(L) / SR
        p = np.sin(2 * np.pi * f * tt) * np.exp(-tt * 3.0) * 0.035
        pan = rng.uniform(0.2, 0.8)
        out[i0 : i0 + L, 0] += p * (1 - pan)
        out[i0 : i0 + L, 1] += p * pan
    # low air: filtered noise swell
    air = np.cumsum(rng.standard_normal(n)) ; air -= np.convolve(air, np.ones(4800) / 4800, mode="same"); air /= np.max(np.abs(air)) + 1e-9
    out += np.stack([air, np.roll(air, 2400)], axis=1) * 0.018
    out = reverb(out, 3.0, 0.4)
    out *= env_adsr(n, 1.5, 2.5)[:, None]
    return out / (np.max(np.abs(out)) + 1e-9) * 0.7


def click():
    L = int(0.09 * SR)
    t = np.arange(L) / SR
    tick = np.sin(2 * np.pi * 1850 * t) * np.exp(-t * 90) * 0.6
    noise = onepole_lp(rng.standard_normal(L), 6000) * np.exp(-t * 160) * 0.5
    thump = np.sin(2 * np.pi * 140 * t) * np.exp(-t * 60) * 0.5
    x = tick + noise + thump
    return reverb(np.stack([x, x], axis=1), 0.4, 0.15) * 0.8


def whoosh(seconds=1.1):
    L = int(seconds * SR)
    t = np.arange(L) / SR
    n = rng.standard_normal(L)
    # band sweep via time-varying one-pole lowpass minus a slower one (crude band-pass)
    fc = 300 + 5000 * np.sin(np.pi * t / seconds) ** 2
    y, lo, a2 = np.empty(L), 0.0, np.exp(-2 * np.pi * 180 / SR)
    acc = 0.0
    for i in range(L):
        a = np.exp(-2 * np.pi * fc[i] / SR)
        acc = (1 - a) * n[i] + a * acc
        lo = (1 - a2) * acc + a2 * lo
        y[i] = acc - lo
    y *= np.sin(np.pi * t / seconds) ** 1.5
    st = np.stack([y * (0.6 + 0.4 * t / seconds), y * (1.0 - 0.4 * t / seconds)], axis=1)
    st = reverb(st, 1.2, 0.3)
    return st / (np.max(np.abs(st)) + 1e-9) * 0.5


def chime():
    L = int(1.6 * SR)
    t = np.arange(L) / SR
    x = (np.sin(2 * np.pi * 1318.5 * t) + 0.6 * np.sin(2 * np.pi * 1975.5 * t) + 0.25 * np.sin(2 * np.pi * 2637 * t)) * np.exp(-t * 3.5)
    x *= np.minimum(1, t / 0.004)
    st = reverb(np.stack([x, x], axis=1), 1.5, 0.35)
    return st / (np.max(np.abs(st)) + 1e-9) * 0.35


if __name__ == "__main__":
    out = sys.argv[1]
    secs = float(sys.argv[2]) if len(sys.argv) > 2 else 30.0
    write(f"{out}/music.wav", music(secs))
    write(f"{out}/click.wav", click())
    write(f"{out}/whoosh.wav", whoosh())
    write(f"{out}/chime.wav", chime())
    print(f"synth: music {secs:.1f}s, click, whoosh, chime → {out}")
