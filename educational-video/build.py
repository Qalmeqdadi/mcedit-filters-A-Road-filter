"""Build narration audio + an animated HTML timeline for the AI revision video.

Usage: python3 build.py <workdir>
  <workdir>/models/kokoro.onnx and voices.bin must exist (Kokoro TTS v1.0).
Outputs into <workdir>: narration.wav, page.html, timeline.json
"""
import hashlib, json, os, sys

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scenes import SCENES

WORK = sys.argv[1]
VOICE, SPEED, LANG = "af_heart", 1.05, "en-us"
SR = 24000
LEAD_IN = 0.6      # silence before the first scene speaks
BEAT_GAP = 0.28    # pause between beats inside a scene
SCENE_GAP = 0.75    # pause at the end of a scene (transition)
TAIL = 1.8         # hold the last frame

os.makedirs(os.path.join(WORK, "tts"), exist_ok=True)
_kokoro = None


def tts(text):
    global _kokoro
    key = hashlib.sha1(f"{VOICE}|{SPEED}|{text}".encode()).hexdigest()[:16]
    path = os.path.join(WORK, "tts", key + ".wav")
    if not os.path.exists(path):
        if _kokoro is None:
            from kokoro_onnx import Kokoro
            _kokoro = Kokoro(os.path.join(WORK, "models/kokoro.onnx"), os.path.join(WORK, "models/voices.bin"))
        samples, sr = _kokoro.create(text, voice=VOICE, speed=SPEED, lang=LANG)
        assert sr == SR
        sf.write(path, samples, sr)
    data, _ = sf.read(path, dtype="float32")
    # trim leading/trailing near-silence so the gaps are what we choose
    idx = np.where(np.abs(data) > 0.01)[0]
    if len(idx):
        data = data[max(0, idx[0] - 600): idx[-1] + 1200]
    return data


chunks, t = [np.zeros(int(LEAD_IN * SR), np.float32)], LEAD_IN
timeline = []
for si, scene in enumerate(SCENES):
    start = t - (LEAD_IN if si == 0 else 0)
    beat_times = []
    for bi, (text, reveal) in enumerate(scene["beats"]):
        if bi:
            chunks.append(np.zeros(int(BEAT_GAP * SR), np.float32)); t += BEAT_GAP
        audio = tts(text)
        beat_times.append(round(t, 3))
        chunks.append(audio); t += len(audio) / SR
    gap = TAIL if si == len(SCENES) - 1 else SCENE_GAP
    chunks.append(np.zeros(int(gap * SR), np.float32)); t += gap
    timeline.append({"start": round(start, 3), "end": round(t, 3), "beats": beat_times})
    print(f"scene {si:2d}: {start:6.1f}s -> {t:6.1f}s")

audio = np.concatenate(chunks)
audio = audio / max(1e-6, np.abs(audio).max()) * 0.89
sf.write(os.path.join(WORK, "narration.wav"), audio, SR)
total = len(audio) / SR
print(f"TOTAL: {total:.1f}s")

here = os.path.dirname(os.path.abspath(__file__))
css = open(os.path.join(here, "style.css")).read()
js = open(os.path.join(here, "render.js")).read()
scenes_html = "\n".join(
    f'<section class="scene" id="s{i}">{s["html"]}</section>' for i, s in enumerate(SCENES))
page = f"""<!doctype html><html><head><meta charset="utf-8"><style>{css}</style></head>
<body><div id="stage">
<div class="badge">Year 7 · AI Revision</div>
{scenes_html}
<div class="progress"><div id="bar"></div></div>
</div>
<script>const TIMELINE = {json.dumps(timeline)}; const TOTAL = {total:.3f};</script>
<script>{js}</script></body></html>"""
open(os.path.join(WORK, "page.html"), "w").write(page)
json.dump({"total": total, "scenes": timeline}, open(os.path.join(WORK, "timeline.json"), "w"), indent=1)
