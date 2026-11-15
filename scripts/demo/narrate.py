"""
Narration for the demo video, one clip per beat, with Kokoro (open-weight neural text-to-speech,
Apache-2.0, https://github.com/thewh1teagle/kokoro-onnx). Run once; the clips are committed.

    python scripts/demo/narrate.py MODEL_DIR

MODEL_DIR holds kokoro-v1.0.onnx and voices-v1.0.bin. Writes scripts/demo/voice/<beat>.flac and
scripts/demo/voice/lines.json (beat, text, seconds). "Nasa" is spelled that way on purpose: the
phonemiser reads it as one word (and keeps the possessive), where "NASA's" loses the "s".
"""
import json
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

VOICE, SPEED = "af_heart", 1.05
LINES = [
    ("title", "How close is Nasa's fire evidence to the air future crews will breathe?"),
    ("gap", "Nasa's space fire tests on solid materials stop at twenty-two percent oxygen."),
    ("ea", "Future habitats plan thirty-four. Distant."),
    ("pub", "Add published results. Still distant."),
    ("flow", "Assume faster airflow, and it's near."),
    ("moon", "On the Moon: no tests at all."),
    ("src", "Every number is sourced."),
    ("inv", "Then rank all twenty-four Nasa studies for your cabin."),
    ("end", "Evidence proximity. Not a safety rating."),
]

model = Path(sys.argv[1])
out = Path(__file__).parent / "voice"
out.mkdir(exist_ok=True)
k = Kokoro(str(model / "kokoro-v1.0.onnx"), str(model / "voices-v1.0.bin"))
meta = []
for beat, text in LINES:
    audio, sr = k.create(text, voice=VOICE, speed=SPEED, lang="en-us")
    # trim leading/trailing near-silence, keep 40 ms of air
    idx = np.where(np.abs(audio) > 0.01)[0]
    a, b = max(0, idx[0] - int(0.04 * sr)), min(len(audio), idx[-1] + int(0.06 * sr))
    clip = audio[a:b]
    sf.write(out / f"{beat}.flac", clip, sr)
    meta.append({"beat": beat, "text": text, "seconds": round(len(clip) / sr, 3)})
    print(f"{beat:6s} {len(clip) / sr:5.2f}s  {text}")
(out / "lines.json").write_text(json.dumps({"voice": VOICE, "speed": SPEED, "model": "Kokoro v1.0 (kokoro-onnx)", "lines": meta}, indent=1))
print(f"total speech {sum(m['seconds'] for m in meta):.2f}s")
