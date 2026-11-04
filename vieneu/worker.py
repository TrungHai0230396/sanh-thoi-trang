"""VieNeu-TTS for the hall's MC: loads the model once, then reads lines.

The Node server (src/tts.js) starts this with vieneu/.venv's Python and talks
in JSON lines: one request per line on stdin, one answer per line on stdout.
Whatever the library prints goes to stderr, so stdout stays the protocol.

  first line  {"ready": true, "voices": [{"id", "description", "gender", "featured"}], "default": "..."}
  request     {"id": 1, "text": "...", "voice": "Trúc Ly", "out": "/abs/path/file.mp3"}
  answer      {"id": 1, "ok": true, "seconds": 2.4, "took": 0.9}
              {"id": 1, "ok": false, "error": "..."}

`python worker.py --download` fetches the model into vieneu/model, loads it
once to check it works, and exits.
"""

import json
import os
import sys
import time
from pathlib import Path

PROTOCOL = sys.stdout
sys.stdout = sys.stderr  # the library's prints must never reach the protocol

HERE = Path(__file__).resolve().parent
MODEL = HERE / "model"
BACKBONE = ("pnnbao-ump/VieNeu-TTS-v3-Turbo", "onnx_update")  # the fp32 CPU graphs
CODEC = "OpenMOSS-Team/MOSS-Audio-Tokenizer-Nano-ONNX"
READY_MARK = MODEL / ".ready"
MAX_CHARS = 300


def send(message):
    PROTOCOL.write(json.dumps(message, ensure_ascii=False) + "\n")
    PROTOCOL.flush()


def fetch_model():
    """Downloads the model as plain files in vieneu/model.

    onnxruntime refuses external weights that resolve outside the model's
    folder, and Hugging Face's cache keeps every file as a link into a shared
    store, so the model cannot be read from that cache.
    """
    from huggingface_hub import snapshot_download

    repo, folder = BACKBONE
    snapshot_download(repo, allow_patterns=[f"{folder}/*"], local_dir=MODEL / "backbone")
    snapshot_download(CODEC, allow_patterns=["*.onnx", "*.data", "*.json"], local_dir=MODEL / "codec")
    READY_MARK.write_text("ok\n")


def load():
    if not READY_MARK.exists():
        fetch_model()
    os.environ["HF_HUB_OFFLINE"] = "1"  # everything is local now; no network during a live

    # vieneu 3.8.3 does not pass a codec folder through to its CPU engine, so
    # the engine is given ours by default.
    from vieneu._v3_turbo_engine import onnx_runtime_lite

    original = onnx_runtime_lite.OnnxV3LiteEngine.__init__

    def with_local_codec(self, *args, **kwargs):
        kwargs.setdefault("codec_dir", str(MODEL / "codec"))
        original(self, *args, **kwargs)

    onnx_runtime_lite.OnnxV3LiteEngine.__init__ = with_local_codec

    from vieneu import Vieneu

    return Vieneu(onnx_dir=str(MODEL / "backbone" / BACKBONE[1]))


def voices_of(tts):
    found = []
    for _, name in tts.list_preset_voices():
        v = tts.get_preset_voice(name)
        found.append({
            "id": name,
            "description": v.get("description", ""),
            "gender": v.get("gender", ""),
            "featured": v.get("featured"),
        })
    return found


def write(path, wav, rate):
    import soundfile as sf

    part = f"{path}.part"
    if path.endswith(".mp3"):
        sf.write(part, wav, rate, format="MP3", subtype="MPEG_LAYER_III")
    else:
        sf.write(part, wav, rate, format="WAV", subtype="PCM_16")
    os.replace(part, path)


def serve(tts):
    names = {v["id"] for v in voices_of(tts)}
    for line in sys.stdin:
        try:
            job = json.loads(line)
        except ValueError:
            continue
        started = time.time()
        try:
            text = str(job.get("text", "")).strip()[:MAX_CHARS]
            if not text:
                raise ValueError("no text")
            voice = job.get("voice") if job.get("voice") in names else None
            wav = tts.infer(text, voice=voice)
            if wav.size == 0:
                raise ValueError("nothing was read")
            write(str(job["out"]), wav, tts.sample_rate)
            send({"id": job.get("id"), "ok": True, "seconds": round(wav.size / tts.sample_rate, 2),
                  "took": round(time.time() - started, 2)})
        except Exception as err:  # one bad line must not stop the MC
            send({"id": job.get("id"), "ok": False, "error": str(err)[:300]})


def main():
    started = time.time()
    tts = load()
    send({"ready": True, "voices": voices_of(tts), "default": tts._default_voice,
          "loaded": round(time.time() - started, 1)})
    if "--download" not in sys.argv:
        serve(tts)


if __name__ == "__main__":
    main()
