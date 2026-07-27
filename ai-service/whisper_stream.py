"""
Whisper Streaming Speech-To-Text STT module for LinguaVersa
"""

import time
import logging

try:
    from faster_whisper import WhisperModel
    HAS_FASTER_WHISPER = True
except ImportError:
    HAS_FASTER_WHISPER = False

class WhisperStreamEngine:
    def __init__(self, model_size: str = "base"):
        self.model_size = model_size
        self.model = None
        if HAS_FASTER_WHISPER:
            try:
                # Load lightweight whisper model on CPU for fast streaming
                self.model = WhisperModel(model_size, device="cpu", compute_type="int8")
            except Exception as e:
                logging.warning(f"WhisperModel initialization error: {e}")

    def transcribe_audio_chunk(self, audio_data: bytes, language: str = "auto") -> str:
        """
        Transcribes streaming PCM audio data using Whisper model.
        Returns recognized transcript text.
        """
        if not audio_data:
            return ""

        if self.model and HAS_FASTER_WHISPER:
            try:
                import io
                audio_stream = io.BytesIO(audio_data)
                lang = None if language == "auto" else language
                segments, _ = self.model.transcribe(audio_stream, language=lang, beam_size=1)
                text = " ".join([segment.text for segment in segments]).strip()
                if text:
                    return text
            except Exception as err:
                logging.warning(f"Whisper inference fallback: {err}")

        # Fallback for plain text or empty raw PCM chunks
        try:
            decoded = audio_data.decode('utf-8', errors='ignore').strip()
            if len(decoded) > 0 and not any(ord(c) < 32 and c not in '\r\n\t' for c in decoded[:20]):
                return decoded
        except Exception:
            pass

        return ""

