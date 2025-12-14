import torch
import argparse
from TTS.api import TTS
import os
from piper import PiperVoice
import wave

TONE_TO_VOICE_FILE = {
    "friendly": "services/tts/voices/friendly.wav",
    "excited": "services/tts/voices/excited.wav",
    "empathetic": "services/tts/voices/empathetic.wav",
    "serious": "services/tts/voices/serious.wav",
    "playful": "services/tts/voices/playful.wav",
    "default": "services/tts/voices/friendly.wav"
}
MODEL_NAME = "model/multilingual/multi-dataset/xtts_v2"
BASE = os.path.dirname(os.path.abspath(__file__))

def synthesize(text, tone, output_path, model, model_dir):
    match model:
        case "piper":
            try:
                os.makedirs(os.path.dirname(output_path), exist_ok=True)
                use_cuda = True if torch.cuda.is_available() else False
                voice = PiperVoice.load(model_path=model_dir, use_cuda=use_cuda)

                with wave.open(output_path, "wb") as wf:
                    voice.synthesize_wav(text, wf)
                
                print("success")
            except Exception as e:
                print(f"Error in TTS synthesis: {e}")
        case _:
            print(f"Unknown model: {model}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Synthesize speech with a specific tone.")
    parser.add_argument("--text", required=True, help="The text to synthesize.")
    parser.add_argument("--tone", required=False, help="The emotional tone for the synthesis.")
    parser.add_argument("--output", required=False, help="The output path for the audio file.")
    parser.add_argument("--model", required=True, default="piper", help="The model to use for synthesis.")
    parser.add_argument("--model_dir", required=False)
    
    args = parser.parse_args()
    
    synthesize(args.text, args.tone, args.output, args.model, args.model_dir)