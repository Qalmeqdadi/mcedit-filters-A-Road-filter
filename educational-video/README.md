# Year 7 AI Revision – narrated video

`AI-Revision-Year7.mp4` is a 3-minute narrated video (1080p) that covers the
"Y7 AI Revision Notes" slides: what AI is, key vocabulary, AI in the UAE, the
Five Big Ideas, self-driving cars, responsible AI, prompting (4 ingredients and
PREP), common mistakes, staying safe, AI art, and the self-check list.

## Rebuilding

The narration and on-screen text are in `scenes.py`. To rebuild after an edit:

```bash
W=/path/to/workdir            # needs models/kokoro.onnx + models/voices.bin
#   https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.int8.onnx
#   https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
pip install kokoro-onnx soundfile
python3 build.py $W                 # narration.wav + page.html + timeline.json
node capture.js $W stills           # optional: one PNG per scene to check layout
node capture.js $W video 30 4       # -> $W/video.mp4 (needs playwright + ffmpeg)
```
