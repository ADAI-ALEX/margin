"""
Music bed and sound effects for the demo video, synthesised from code (no samples, no licences).

    python3 scripts/demo/synth_audio.py OUT_DIR [SECONDS]

Writes OUT_DIR/music.wav (ambient pad, 48 kHz stereo), click.wav (mouse click), swish300…700.wav
(cursor glides, by duration) and transition.wav (page or card change).
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


def bandnoise(L, lo_fc, hi_fc):
    """Noise between two one-pole corners; hi_fc may be an array (a sweep)."""
    n = rng.standard_normal(L)
    hi = np.broadcast_to(np.asarray(hi_fc, dtype=float), (L,))
    y, acc, lo = np.empty(L), 0.0, 0.0
    a_lo = np.exp(-2 * np.pi * lo_fc / SR)
    for i in range(L):
        a = np.exp(-2 * np.pi * hi[i] / SR)
        acc = (1 - a) * n[i] + a * acc
        lo = (1 - a_lo) * acc + a_lo * lo
        y[i] = acc - lo
    return y


def click():
    """A mouse click: a sharp press and a quieter release 70 ms later."""
    L = int(0.16 * SR)
    t = np.arange(L) / SR
    x = np.zeros(L)
    for start, amp in ((0.0, 1.0), (0.07, 0.45)):
        i0 = int(start * SR)
        tt = t[: L - i0]
        body = bandnoise(len(tt), 1800, 9000) * np.exp(-tt * 420)
        knock = np.sin(2 * np.pi * 2600 * tt) * np.exp(-tt * 300) * 0.35
        x[i0:] += amp * (body + knock)
    x /= np.max(np.abs(x)) + 1e-9
    return reverb(np.stack([x, x], axis=1), 0.25, 0.08) * 0.9


def swish(seconds):
    """Air moving past: the cursor gliding across the screen (short, bright, panned left to right)."""
    L = int(seconds * SR)
    t = np.arange(L) / SR
    u = t / seconds
    y = bandnoise(L, 900, 2500 + 6500 * np.sin(np.pi * u) ** 2)
    y *= np.sin(np.pi * u) ** 2.2
    st = np.stack([y * (1.1 - 0.6 * u), y * (0.5 + 0.6 * u)], axis=1)
    return st / (np.max(np.abs(st)) + 1e-9) * 0.5


def transition(seconds=0.9):
    """A softer, lower swoosh for a page or card change."""
    L = int(seconds * SR)
    t = np.arange(L) / SR
    u = t / seconds
    y = bandnoise(L, 120, 400 + 2600 * np.sin(np.pi * u) ** 2)
    y *= np.sin(np.pi * u) ** 1.6
    st = reverb(np.stack([y, np.roll(y, 300)], axis=1), 1.2, 0.35)
    return st / (np.max(np.abs(st)) + 1e-9) * 0.5


if __name__ == "__main__":
    out = sys.argv[1]
    secs = float(sys.argv[2]) if len(sys.argv) > 2 else 30.0
    write(f"{out}/music.wav", music(secs))
    write(f"{out}/click.wav", click())
    for ms in (300, 400, 500, 600, 700):
        write(f"{out}/swish{ms}.wav", swish(ms / 1000))
    write(f"{out}/transition.wav", transition())
    print(f"synth: music {secs:.1f}s, click, swish 300-700 ms, transition → {out}")
