#!/usr/bin/env python3
"""Narrador de ERA Factory con Kokoro TTS (kokoro-onnx 0.6.1).

Lee un trabajo en JSON por stdin y escribe un WAV (24 kHz, mono, 16 bits)
por segmento. Informa por stdout, una línea JSON por evento:
  {"event": "loaded"}
  {"event": "segment", "id": ..., "index": 1, "total": 6, "duration": 12.3}
  {"event": "done"}
  {"event": "error", "message": ...}   (y sale con código 1)

Trabajo:
  {"model": ".../kokoro-v1.0.int8.onnx", "voices": ".../voices-v1.0.bin",
   "voice": "em_alex", "lang": "es", "speed": 1.0,
   "segments": [{"id": "hook", "text": "...", "out": ".../hook.wav"}]}
"""
import json
import sys
import wave

import numpy as np


def emit(**event):
    sys.stdout.write(json.dumps(event, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def write_wav(path, samples, sample_rate):
    pcm = (np.clip(samples, -1.0, 1.0) * 32767).astype("<i2")
    with wave.open(path, "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(sample_rate)
        f.writeframes(pcm.tobytes())


def main():
    job = json.load(sys.stdin)
    from kokoro_onnx import Kokoro  # import tardío: un error de instalación se reporta como evento

    kokoro = Kokoro(job["model"], job["voices"])
    if job["voice"] not in kokoro.get_voices():
        raise ValueError(f"La voz {job['voice']} no existe en el archivo de voces.")
    emit(event="loaded")
    segments = job["segments"]
    for index, seg in enumerate(segments, start=1):
        samples, sample_rate = kokoro.create(
            seg["text"], voice=job["voice"], speed=float(job.get("speed", 1.0)), lang=job["lang"]
        )
        if len(samples) == 0:
            raise ValueError(f"El segmento {seg['id']} no produjo audio.")
        write_wav(seg["out"], samples, sample_rate)
        emit(event="segment", id=seg["id"], index=index, total=len(segments),
             duration=round(len(samples) / sample_rate, 3))
    emit(event="done")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # cualquier fallo vuelve a Node como mensaje legible
        emit(event="error", message=f"{type(exc).__name__}: {exc}")
        sys.exit(1)
