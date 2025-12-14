import sys
import os
import argparse
import torch
from faster_whisper import WhisperModel

def transcribe_audio(file_path, model_path):
    device = "cuda" if torch.cuda.is_available() else "cpu"
    compute_type = "float16" if device == "cuda" else "int8"
    try:
        model = WhisperModel(model_path, device=device, compute_type=compute_type)
        segments, info = model.transcribe(file_path, beam_size=5)
        full_text = "".join(segment.text for segment in segments)
        print(full_text.strip())
    except Exception as e:
        print(f"An error occurred: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("file_path", help="Path to audio file")
    parser.add_argument("--model_dir", required=True, help="Path to Faster-Whisper model")
    args = parser.parse_args()

    transcribe_audio(args.file_path, args.model_dir)