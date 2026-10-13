# Original ambient/corporate score, synthesised (no third-party audio). Usage: python3 make_music.py <seconds> <out.wav>
import sys, wave, numpy as np
SR = 44100
dur = float(sys.argv[1]); out = sys.argv[2]
n = int(SR * dur); t = np.arange(n) / SR
mix = np.zeros(n)
def note(f): return 440 * 2 ** ((f - 69) / 12)
# Am9 – Fmaj7 – Cadd9 – G6 (MIDI), 8 s per chord
chords = [[45, 57, 60, 64, 71], [41, 57, 60, 64, 69], [48, 55, 60, 64, 74], [43, 55, 59, 64, 71]]
bar = 8.0
for i in range(int(dur // bar) + 1):
    c = chords[i % 4]; s0 = int(i * bar * SR); s1 = min(n, int((i + 1) * bar * SR + 2.5 * SR))
    if s0 >= n: break
    tt = np.arange(s1 - s0) / SR
    env = np.minimum(1, tt / 2.2) * np.exp(-np.maximum(0, tt - bar) / 0.9)
    for k, m in enumerate(c):
        f = note(m)
        tone = sum((0.55 ** h) * np.sin(2 * np.pi * f * (h + 1) * tt + h) for h in range(4))
        tone += 0.5 * np.sin(2 * np.pi * f * 1.003 * tt)  # gentle detune chorus
        amp = 0.16 if k == 0 else 0.07
        mix[s0:s1] += amp * env * tone
# soft plucked arpeggio, 8th notes at 100 bpm
step = 60 / 100 / 2
for j in range(int(dur / step)):
    chord = chords[int(j * step // bar) % 4]
    m = chord[1:][[0, 1, 2, 3, 2, 1][j % 6]] + 12
    s0 = int(j * step * SR); L = int(1.2 * SR)
    if s0 + L > n: break
    tt = np.arange(L) / SR
    mix[s0:s0 + L] += 0.035 * np.exp(-tt * 5) * np.sin(2 * np.pi * note(m) * tt) * (0.6 + 0.4 * np.sin(j))
# simple reverb: convolve with decaying noise
rng = np.random.default_rng(7)
ir = rng.standard_normal(int(SR * 1.8)) * np.exp(-np.arange(int(SR * 1.8)) / (SR * 0.45))
wet = np.fft.irfft(np.fft.rfft(mix, n + len(ir)) * np.fft.rfft(ir, n + len(ir)))[:n]
y = mix * 0.7 + wet / np.max(np.abs(wet)) * np.max(np.abs(mix)) * 0.45
# fades
y *= np.minimum(1, t / 3) * np.minimum(1, (dur - t) / 4)
y = y / np.max(np.abs(y)) * 0.85
st = np.stack([y, np.roll(y, int(0.012 * SR))], 1)
with wave.open(out, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((st * 32767).astype(np.int16).tobytes())
print("music", out, dur)
