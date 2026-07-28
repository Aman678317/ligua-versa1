"""
Whisper Streaming Speech-To-Text STT module for LinguaVersa
"""

import time
import logging
import io

try:
    from faster_whisper import WhisperModel
    HAS_FASTER_WHISPER = True
except ImportError:
    HAS_FASTER_WHISPER = False

class WhisperStreamEngine:
    def __init__(self, model_size: str = "base"):
        self.model_size = model_size
        self.model = None
        # Cache for speaker language to avoid re-detection
        # speaker_id -> "en"
        self.speaker_language_cache = {}
        
        if HAS_FASTER_WHISPER:
            try:
                # Load lightweight whisper model on CPU for fast streaming
                self.model = WhisperModel(model_size, device="cpu", compute_type="int8")
            except Exception as e:
                logging.warning(f"WhisperModel initialization error: {e}")

    def transcribe_audio_chunk(self, audio_data: bytes, speaker_id: str = None, force_language: str = "auto") -> dict:
        """
        Transcribes streaming PCM audio data using Whisper model.
        Returns a dict: {"text": "...", "language": "en"}
        """
        if not audio_data:
            return {"text": "", "language": ""}

        if self.model and HAS_FASTER_WHISPER:
            try:
                audio_stream = io.BytesIO(audio_data)
                lang = None
                if force_language and force_language != "auto":
                    lang = force_language
                elif speaker_id and speaker_id in self.speaker_language_cache:
                    lang = self.speaker_language_cache[speaker_id]
                
                # Beam size 1 for fastest inference during streaming
                segments, info = self.model.transcribe(audio_stream, language=lang, beam_size=1, condition_on_previous_text=False)
                
                text = " ".join([segment.text for segment in segments]).strip()
                
                # Cache the detected language if not provided
                if not lang and info.language and speaker_id:
                    self.speaker_language_cache[speaker_id] = info.language

                return {
                    "text": text,
                    "language": info.language if info else lang
                }
            except Exception as err:
                logging.warning(f"Whisper inference fallback: {err}")

        # Fallback for plain text or empty raw PCM chunks
        try:
            decoded = audio_data.decode('utf-8', errors='ignore').strip()
            if len(decoded) > 0 and not any(ord(c) < 32 and c not in '\r\n\t' for c in decoded[:20]):
                return {"text": decoded, "language": "en"}
        except Exception:
            pass

        return {"text": "", "language": ""}
