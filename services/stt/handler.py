import sys
from faster_whisper import WhisperModel

MODEL_SIZE = "small"
COMPUTE_DEVICE = "cuda"
COMPUTE_TYPE = "float32"

def transcribe_audio(file_path):
    try:
        model = WhisperModel(MODEL_SIZE, device=COMPUTE_DEVICE, compute_type=COMPUTE_TYPE)
        segments, info = model.transcribe(file_path, beam_size=5)
        full_text = "".join(segment.text for segment in segments)
        print(full_text.strip())
    except Exception as e:
        print(f"An error occurred: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        audio_file_path = sys.argv[1]
        transcribe_audio(audio_file_path)
    else:
        print("Please provide the path to the audio file as a command-line argument.")
        sys.exit(1)