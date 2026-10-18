import whisper
from fastapi import FastAPI, UploadFile, File
import os

app = FastAPI()

def transcribe_audio(audio_file_path: str) -> str:
    """
    Transcribes the given audio file to text using OpenAI's Whisper model.

    Args:
        audio_file_path (str): The path to the audio file to be transcribed.

    Returns:
        str: The transcribed text from the audio.
    """
    # Load the Whisper model
    model = whisper.load_model("turbo")

    # Load audio and pad/trim it to fit 30 seconds
    audio = whisper.load_audio(audio_file_path)
    audio = whisper.pad_or_trim(audio)

    # Make log-Mel spectrogram and move to the same device as the model
    mel = whisper.log_mel_spectrogram(audio, n_mels=model.dims.n_mels).to(model.device)

    # Detect the spoken language
    _, probs = model.detect_language(mel)
    detected_language = max(probs, key=probs.get)
    print(f"Detected language: {detected_language}")

    # Decode the audio
    options = whisper.DecodingOptions()
    result = whisper.decode(model, mel, options)

    # Return the recognized text
    return result.text

@app.post("/transcribe")
async def transcribe(audio_file: UploadFile = File(...)):
    # Save the uploaded audio file
    with open("temp_audio.wav", "wb") as f:
        f.write(await audio_file.read())

    # Transcribe the audio
    text = transcribe_audio("temp_audio.wav")

    # cleanup: remove the temporary audio file
    os.remove("temp_audio.wav")
    
    if not text:
        return {"text": "", "status": "error", "message": "No text could be transcribed from the audio."}

    # Return the transcribed text
    return {"text": text, "status": "success"}
