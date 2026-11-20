"""Original background music for the project trailers (no downloads, no copyright issues).

A tiny synthesizer in numpy: oscillators, envelopes, drums, filters and a convolution reverb.
Each trailer gets its own track in a mood that fits the game (horror, sci-fi, chiptune, lofi...),
generated to the exact length of its video. Output: media-src/trailer-music/<name>.wav

Usage: python scripts/trailer_music.py            (all)
       python scripts/trailer_music.py abduction  (one)
"""
import os
import sys
import wave

import numpy as np

SR = 44100
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'media-src', 'trailer-music')

NOTE = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def midi(name, octave):
    return 12 * (octave + 1) + NOTE[name]


# ---------------- building blocks ----------------
def t_arr(dur):
    return np.arange(int(dur * SR)) / SR


def osc(kind, f, dur, phase=0.0, vib=0.0):
    t = t_arr(dur)
    if vib:
        ph = 2 * np.pi * np.cumsum(f * (1 + vib * np.sin(2 * np.pi * 5.2 * t))) / SR + phase
    else:
        ph = 2 * np.pi * f * t + phase
    if kind == 'sine':
        return np.sin(ph)
    if kind == 'tri':
        return 2 / np.pi * np.arcsin(np.sin(ph))
    if kind == 'square':  # band-limited-ish (soft) square
        return np.tanh(np.sin(ph) * 6) * 0.8
    if kind == 'pulse':  # thinner chiptune pulse (25%)
        return np.where((ph / (2 * np.pi)) % 1 < 0.25, 1.0, -1.0) * 0.6
    if kind == 'saw':  # additive saw, harmonics kept under 12 kHz
        out = np.zeros_like(t)
        n = max(1, min(30, int(12000 / max(f, 1))))
        for k in range(1, n + 1):
            out += np.sin(ph * k) / k
        return out * 0.6
    if kind == 'bell':
        return np.sin(ph) + 0.35 * np.sin(ph * 2.76) * np.exp(-t * 6) + 0.2 * np.sin(ph * 5.4) * np.exp(-t * 10)
    if kind == 'epiano':  # FM electric piano
        mod = np.sin(ph * 1.0) * 1.4 * np.exp(-t * 3)
        return np.sin(ph + mod)
    if kind == 'marimba':
        return np.sin(ph) * np.exp(-t * 7) + 0.4 * np.sin(ph * 4) * np.exp(-t * 22)
    raise ValueError(kind)


def env(n, a=0.01, d=0.1, s=0.7, r=0.1):
    a_n, d_n, r_n = int(a * SR), int(d * SR), int(r * SR)
    e = np.ones(n) * s
    a_n = min(a_n, n)
    e[:a_n] = np.linspace(0, 1, a_n, endpoint=False) if a_n else e[:a_n]
    d_end = min(n, a_n + d_n)
    if d_end > a_n:
        e[a_n:d_end] = np.linspace(1, s, d_end - a_n, endpoint=False)
    if r_n and n > r_n:
        e[-r_n:] *= np.linspace(1, 0, r_n)
    return e


def lowpass(x, cutoff):
    """FFT brick-ish lowpass with a soft knee (fine for music beds)."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / (1 + (f / cutoff) ** 4)
    return np.fft.irfft(X, len(x))


def highpass(x, cutoff):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 - 1 / (1 + (f / max(cutoff, 1)) ** 4)
    return np.fft.irfft(X, len(x))


def reverb(x, decay=1.6, mix=0.25, seed=1):
    rng = np.random.default_rng(seed)
    n = int(decay * SR)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / SR * 6.9 / decay)
    ir = lowpass(ir, 6000)
    ir /= np.sqrt(np.sum(ir ** 2))
    L = len(x) + n
    wet = np.fft.irfft(np.fft.rfft(x, L) * np.fft.rfft(ir, L), L)[: len(x)]
    return x * (1 - mix) + wet * mix * 1.2


class Track:
    def __init__(self, dur, bpm):
        self.n = int(dur * SR)
        self.dur = dur
        self.bpm = bpm
        self.beat = 60 / bpm
        self.buses = {}

    def bus(self, name):
        if name not in self.buses:
            self.buses[name] = np.zeros((self.n, 2))
        return self.buses[name]

    def add(self, name, sig, at, pan=0.0, gain=1.0):
        s = int(at * SR)
        if s >= self.n or s < 0:
            return
        sig = sig[: self.n - s] * gain
        b = self.bus(name)
        lg = np.cos((pan + 1) * np.pi / 4)
        rg = np.sin((pan + 1) * np.pi / 4)
        b[s : s + len(sig), 0] += sig * lg
        b[s : s + len(sig), 1] += sig * rg

    def note(self, name, kind, m, at, dur, gain=0.3, pan=0.0, a=0.005, d=0.1, s=0.6, r=0.08, vib=0.0, detune=0.0):
        f = hz(m)
        sig = osc(kind, f, dur, vib=vib)
        if detune:
            sig = 0.5 * sig + 0.5 * osc(kind, f * (1 + detune), dur, phase=1.3, vib=vib)
        sig *= env(len(sig), a, d, s, r)
        self.add(name, sig, at, pan, gain)

    def kick(self, at, gain=0.9, tone=55):
        dur = 0.35
        t = t_arr(dur)
        f = tone + 90 * np.exp(-t * 30)
        sig = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)
        sig += 0.15 * np.random.default_rng(int(at * 1000)).standard_normal(len(t)) * np.exp(-t * 120)
        self.add('drums', sig, at, 0, gain)

    def snare(self, at, gain=0.45, bright=1.0):
        dur = 0.25
        t = t_arr(dur)
        noise = np.random.default_rng(int(at * 977)).standard_normal(len(t))
        noise = highpass(noise, 1500 * bright)
        sig = noise * np.exp(-t * 18) * 0.7 + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 25) * 0.6
        self.add('drums', sig, at, 0.05, gain)

    def hat(self, at, gain=0.12, open_=False, pan=0.25):
        dur = 0.25 if open_ else 0.06
        t = t_arr(dur)
        noise = highpass(np.random.default_rng(int(at * 733)).standard_normal(len(t)), 7000)
        self.add('drums', noise * np.exp(-t * (12 if open_ else 70)), at, pan, gain)

    def chip_noise(self, at, gain=0.12, dur=0.08):
        t = t_arr(dur)
        rng = np.random.default_rng(int(at * 541))
        steps = np.repeat(rng.choice([-1.0, 1.0], len(t) // 20 + 1), 20)[: len(t)]
        self.add('drums', steps * np.exp(-t * 40), at, 0, gain)

    def mix(self, levels, rev=None):
        out = np.zeros((self.n, 2))
        for name, b in self.buses.items():
            g = levels.get(name, 1.0)
            x = b * g
            if rev and name in rev:
                d, m = rev[name]
                x = np.stack([reverb(x[:, 0], d, m, 1), reverb(x[:, 1], d, m, 2)], 1)
            out += x
        # gentle glue: soft clip + normalise to about -1 dBFS peak, then fades
        out = np.tanh(out * 1.2) / np.tanh(1.2)
        out /= max(1e-9, np.max(np.abs(out))) / 0.89
        fi, fo = int(0.6 * SR), int(min(2.2, self.dur * 0.15) * SR)
        out[:fi] *= np.linspace(0, 1, fi)[:, None]
        out[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 1.5
        return out


def chord_tones(root, quality):
    q = {'m': [0, 3, 7], 'M': [0, 4, 7], 'm7': [0, 3, 7, 10], 'M7': [0, 4, 7, 11], '7': [0, 4, 7, 10], 'sus2': [0, 2, 7], 'sus4': [0, 5, 7], 'dim': [0, 3, 6], 'add9': [0, 4, 7, 14], 'm9': [0, 3, 7, 10, 14]}[quality]
    return [root + i for i in q]


def motif(rng, scale, length, steps_choices=(-2, -1, 1, 2), start=None):
    """a short random-walk melody over scale degrees"""
    i = start if start is not None else rng.integers(2, len(scale) - 3)
    out = []
    for _ in range(length):
        out.append(int(i))
        i = int(np.clip(i + rng.choice(steps_choices), 0, len(scale) - 1))
    return out


# ---------------- moods ----------------
def horror(dur, seed):
    rng = np.random.default_rng(seed)
    T = Track(dur, 70)
    b = T.beat
    root = midi('D', 2)
    # low drone with a slowly opening filter
    drone = osc('saw', hz(root), dur, vib=0.002) * 0.5 + osc('saw', hz(root + 7) * 1.003, dur) * 0.3
    drone = lowpass(drone, 380) * np.minimum(1, t_arr(dur) / 3)
    T.add('pad', drone, 0, 0, 0.55)
    # dissonant shimmer (minor 2nd rubbing high up), swelling
    for k, m in enumerate([root + 36, root + 37, root + 43]):
        sig = osc('sine', hz(m), dur, vib=0.004) * (0.5 + 0.5 * np.sin(2 * np.pi * (0.07 + k * 0.03) * t_arr(dur)))
        T.add('pad', sig, 0, -0.5 + k * 0.5, 0.06)
    # heartbeat
    t = 2 * b
    while t < dur - 2:
        T.kick(t, 0.7, 48)
        T.kick(t + 0.28, 0.45, 48)
        t += 2 * b if t < dur * 0.6 else 1.5 * b
    # music-box melody, sparse and eerie (harmonic minor)
    scale = [midi('D', 5) + i for i in [0, 2, 3, 5, 7, 8, 11, 12, 14, 15]]
    mel = motif(rng, scale, 8)
    t = 4 * b
    k = 0
    while t < dur - 3:
        if rng.random() < 0.8:
            T.note('lead', 'bell', scale[mel[k % len(mel)]], t, 1.6, 0.16, rng.uniform(-0.4, 0.4), a=0.002, d=0.4, s=0.0, r=0.5)
        t += b * rng.choice([1, 1, 2, 0.5])
        k += 1
    # final low hit
    T.kick(dur - 2.2, 1.0, 40)
    T.note('pad', 'saw', root - 12, dur - 2.2, 2.2, 0.35, 0, a=0.01, d=0.5, s=0.4, r=1.2)
    return T.mix({'pad': 1, 'drums': 0.9, 'lead': 1}, rev={'lead': (3.0, 0.5), 'pad': (2.5, 0.3), 'drums': (1.5, 0.2)})


def mystery(dur, seed):
    rng = np.random.default_rng(seed)
    T = Track(dur, 92)
    b = T.beat
    prog = [(midi('A', 3), 'm9'), (midi('F', 3), 'M7'), (midi('C', 4), 'add9'), (midi('G', 3), 'sus4')]
    bar = 4 * b
    t = 0
    i = 0
    while t < dur:
        r, q = prog[i % 4]
        tones = chord_tones(r, q)
        for k, m in enumerate(tones[:4]):
            T.note('pad', 'saw', m, t, bar, 0.05, -0.6 + k * 0.4, a=0.6, d=0.5, s=0.8, r=0.6, detune=0.004)
        # plucked arpeggio 16ths
        arp = tones + [tones[1] + 12]
        for s in range(16):
            T.note('arp', 'tri', arp[(s * 2 + (s // 4)) % len(arp)] + 12, t + s * b / 4, 0.18, 0.11, 0.3 if s % 2 else -0.3, a=0.002, d=0.12, s=0.0, r=0.05)
        T.note('bass', 'sine', r - 12, t, bar * 0.95, 0.35, 0, a=0.01, d=0.3, s=0.6, r=0.2)
        if t >= bar:
            for s in range(8):
                T.hat(t + s * b / 2, 0.07 if s % 2 else 0.11)
            T.kick(t, 0.5)
            T.kick(t + 2.5 * b, 0.35)
            T.snare(t + b, 0.18, 1.6)
            T.snare(t + 3 * b, 0.18, 1.6)
        t += bar
        i += 1
    return T.mix({'pad': 1, 'arp': 1, 'bass': 1, 'drums': 0.8}, rev={'arp': (2.0, 0.35), 'pad': (2.5, 0.35)})


def scifi(dur, seed, root_name='E', bpm=112):
    rng = np.random.default_rng(seed)
    T = Track(dur, bpm)
    b = T.beat
    root = midi(root_name, 2)
    prog = [(root, 'm'), (root + 8, 'M'), (root + 3, 'M'), (root + 10, 'M')]
    bar = 4 * b
    t = 0
    i = 0
    while t < dur:
        r, q = prog[i % 4]
        tones = chord_tones(r + 24, q)
        for k, m in enumerate(tones):
            T.note('pad', 'saw', m, t, bar, 0.045, -0.5 + k * 0.5, a=0.8, d=0.4, s=0.8, r=0.8, detune=0.006)
        # pulsing 8th-note bass with a filter that opens over the track
        for s in range(8):
            T.note('bass', 'saw', r + (12 if s % 4 == 3 else 0), t + s * b / 2, b / 2 * 0.9, 0.22, 0, a=0.003, d=0.1, s=0.5, r=0.03)
        # bell arpeggio
        for s in range(8):
            if rng.random() < 0.85:
                T.note('arp', 'bell', tones[(s * 3) % 3] + 24 + (12 if s == 6 else 0), t + s * b / 2, 0.6, 0.07, rng.uniform(-0.6, 0.6), a=0.002, d=0.3, s=0.0, r=0.3)
        if t >= bar:
            for s in range(4):
                T.kick(t + s * b, 0.55)
                T.hat(t + s * b + b / 2, 0.1, open_=(s == 3))
            T.snare(t + b, 0.25)
            T.snare(t + 3 * b, 0.25)
        t += bar
        i += 1
    bass = T.buses['bass']
    sweep = np.linspace(500, 2400, T.n)
    # filter sweep, done in chunks
    out = np.zeros_like(bass)
    chunk = SR // 2
    for s in range(0, T.n, chunk):
        e = min(T.n, s + chunk)
        for c in range(2):
            out[s:e, c] = lowpass(bass[s:e, c], sweep[s])
    T.buses['bass'] = out
    return T.mix({'pad': 1, 'bass': 0.8, 'arp': 1, 'drums': 0.8}, rev={'pad': (3.0, 0.4), 'arp': (2.5, 0.45), 'drums': (1.0, 0.12)})


def chiptune(dur, seed, root_name='C', bpm=150, minor=False):
    rng = np.random.default_rng(seed)
    T = Track(dur, bpm)
    b = T.beat
    root = midi(root_name, 3)
    if minor:
        prog = [(root, 'm'), (root + 8, 'M'), (root + 3, 'M'), (root + 10, 'M')]
        scale = [root + 12 + i for i in [0, 2, 3, 5, 7, 8, 10, 12, 14, 15, 17, 19]]
    else:
        prog = [(root, 'M'), (root + 9, 'm'), (root + 5, 'M'), (root + 7, 'M')]
        scale = [root + 12 + i for i in [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24]]
    bar = 4 * b
    # one catchy 2-bar riff, repeated with a variation
    rhythm = [0, 0.5, 1, 1.5, 2.5, 3, 3.5, 4, 5, 5.5, 6, 7]
    riff = motif(rng, scale, len(rhythm), steps_choices=(-2, -1, 1, 1, 2, 3))
    t = 0
    i = 0
    while t < dur:
        r, q = prog[i % 4]
        tones = chord_tones(r + 12, q)
        # triangle bass: root / fifth bouncing 8ths
        for s in range(8):
            m = r - 12 + (7 if s % 2 else 0)
            T.note('bass', 'tri', m, t + s * b / 2, b / 2 * 0.85, 0.38, 0, a=0.002, d=0.05, s=0.8, r=0.02)
        # pulse chord stabs on the off-beats
        for s in (1, 3):
            for m in tones:
                T.note('chord', 'pulse', m + 12, t + s * b + b / 2, b * 0.35, 0.035, 0.3, a=0.002, d=0.05, s=0.6, r=0.03)
        # lead (starts after the first bar)
        if i >= 1:
            var = 2 if (i // 2) % 2 else 0
            for k, (off, deg) in enumerate(zip(rhythm, riff)):
                if (i % 2) * 4 <= off < (i % 2) * 4 + 4:
                    at = t + (off - (i % 2) * 4) * b
                    T.note('lead', 'square', scale[min(len(scale) - 1, deg + (var if k % 3 == 0 else 0))], at, b * 0.45, 0.13, -0.15, a=0.002, d=0.05, s=0.7, r=0.03, vib=0.004)
        # drums: chip kick / noise snare / hats
        for s in range(4):
            if s % 2 == 0:
                T.kick(t + s * b, 0.6, 60)
            else:
                T.chip_noise(t + s * b, 0.22, 0.12)
            T.chip_noise(t + s * b + b / 2, 0.06, 0.03)
        t += bar
        i += 1
    # ending: a quick rising arpeggio
    end = dur - 2.0
    for k in range(8):
        T.note('lead', 'square', scale[min(len(scale) - 1, k)], end + k * 0.07, 0.15, 0.12, 0, a=0.002, d=0.05, s=0.6, r=0.03)
    return T.mix({'bass': 1, 'chord': 1, 'lead': 1, 'drums': 0.9}, rev={'lead': (0.8, 0.15), 'chord': (0.8, 0.15)})


def boardgame(dur, seed):
    rng = np.random.default_rng(seed)
    T = Track(dur, 108)
    b = T.beat
    root = midi('F', 3)
    prog = [(root, 'M'), (root + 5, 'M'), (root + 2, 'm'), (root + 7, 'M')]
    scale = [root + 12 + i for i in [0, 2, 4, 7, 9, 12, 14, 16]]
    bar = 4 * b
    mel = motif(rng, scale, 8, steps_choices=(-1, 1, 2, -2, 3))
    t = 0
    i = 0
    while t < dur:
        r, q = prog[i % 4]
        tones = chord_tones(r + 12, q)
        # bouncy marimba comping
        for s, k in [(0, 0), (1, 1), (1.5, 2), (2, 0), (3, 1), (3.5, 2)]:
            T.note('keys', 'marimba', tones[k], t + s * b, 0.5, 0.18, -0.3 + k * 0.3, a=0.001, d=0.3, s=0.0, r=0.2)
        T.note('bass', 'sine', r - 12, t, b * 0.8, 0.45, 0, a=0.003, d=0.2, s=0.4, r=0.1)
        T.note('bass', 'sine', r - 5, t + 2 * b, b * 0.8, 0.4, 0, a=0.003, d=0.2, s=0.4, r=0.1)
        if i >= 1:
            for s in range(8):
                if rng.random() < 0.75:
                    T.note('lead', 'bell', scale[mel[(s + i) % 8]] + 12, t + s * b / 2, 0.5, 0.07, 0.35, a=0.002, d=0.2, s=0.0, r=0.2)
        if i >= 1:
            T.kick(t, 0.45)
            T.kick(t + 2 * b, 0.45)
            # claps
            T.snare(t + b, 0.2, 2.2)
            T.snare(t + 3 * b, 0.2, 2.2)
            for s in range(4):
                T.hat(t + s * b + b / 2, 0.08)
        t += bar
        i += 1
    return T.mix({'keys': 1, 'bass': 0.9, 'lead': 1, 'drums': 0.8}, rev={'keys': (1.2, 0.2), 'lead': (1.6, 0.3)})


def lofi(dur, seed):
    rng = np.random.default_rng(seed)
    T = Track(dur, 80)
    b = T.beat
    root = midi('D', 3)
    prog = [(root + 3, 'M7'), (root + 2, 'm7'), (root, 'm9'), (root + 7, '7')]
    bar = 4 * b
    swing = b * 0.07
    t = 0
    i = 0
    while t < dur:
        r, q = prog[i % 4]
        for k, m in enumerate(chord_tones(r + 12, q)):
            T.note('keys', 'epiano', m, t + k * 0.012, bar * 0.9, 0.09, -0.4 + k * 0.25, a=0.004, d=1.2, s=0.35, r=0.4, vib=0.002)
        T.note('bass', 'sine', r - 12, t, b * 1.6, 0.4, 0, a=0.01, d=0.4, s=0.5, r=0.2)
        T.note('bass', 'sine', r - 12 + 7, t + 2.5 * b, b, 0.3, 0, a=0.01, d=0.3, s=0.5, r=0.2)
        T.kick(t, 0.55, 50)
        T.kick(t + 2.5 * b, 0.4, 50)
        T.snare(t + b, 0.22, 0.9)
        T.snare(t + 3 * b, 0.22, 0.9)
        for s in range(8):
            T.hat(t + s * b / 2 + (swing if s % 2 else 0), 0.06 if s % 2 else 0.09, pan=0.2)
        t += bar
        i += 1
    # vinyl crackle
    crack = np.zeros(T.n)
    pos = rng.integers(0, T.n, int(dur * 9))
    crack[pos] = rng.uniform(-1, 1, len(pos))
    crack = highpass(crack, 2000) * 0.5 + lowpass(rng.standard_normal(T.n), 900) * 0.012
    T.add('fx', crack, 0, 0, 0.5)
    out = T.mix({'keys': 1, 'bass': 1, 'drums': 0.75, 'fx': 1}, rev={'keys': (1.8, 0.3)})
    # warm, slightly dull tone
    return np.stack([lowpass(out[:, 0], 7000), lowpass(out[:, 1], 7000)], 1)


# trailer -> (mood, seed). Lengths are read from the video files.
TRACKS = {
    'abduction': lambda d: horror(d, 7),
    'vr-escape-room': lambda d: mystery(d, 3),
    'warp': lambda d: scifi(d, 11, 'E', 112),
    'vr-uavsim': lambda d: scifi(d, 21, 'B', 100),
    'spikes-rush': lambda d: chiptune(d, 5, 'C', 150),
    'germ-runner': lambda d: chiptune(d, 9, 'A', 144, minor=True),
    'snake': lambda d: chiptune(d, 14, 'G', 128),
    'ludo': lambda d: boardgame(d, 4),
    'cyber-cafe': lambda d: lofi(d, 6),
}
DURATIONS = {'abduction': 20.97, 'vr-escape-room': 20.97, 'warp': 18.0, 'vr-uavsim': 23.9, 'spikes-rush': 20.97, 'germ-runner': 20.97, 'snake': 20.97, 'ludo': 20.97, 'cyber-cafe': 15.07}


def write_wav(path, x):
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    names = sys.argv[1:] or list(TRACKS)
    for name in names:
        x = TRACKS[name](DURATIONS[name])
        path = os.path.join(OUT, name + '.wav')
        write_wav(path, x)
        rms = 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
        print(f'{name:16s} {DURATIONS[name]:5.1f}s  rms {rms:5.1f} dBFS  -> {os.path.relpath(path, ROOT)}')
