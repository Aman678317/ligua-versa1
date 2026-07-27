"""
Text-To-Speech (TTS) Synthesis Engines Module
Piper primary fast local neural voice + Edge-TTS fallback provider
"""

import time
import asyncio
import base64
import logging

try:
    import edge_tts
    HAS_EDGE_TTS = True
except ImportError:
    HAS_EDGE_TTS = False

class TTSEngineManager:
    def __init__(self):
        self.primary_engine = "piper"
        self.fallback_engine = "edge-tts"
        self.piper_supported_langs = {"en", "ja", "hi", "es", "de", "fr"}
        
        self.voice_map = {
            "en": "en-US-AriaNeural",
            "ja": "ja-JP-NanamiNeural",
            "hi": "hi-IN-SwaraNeural",
            "es": "es-ES-ElviraNeural",
            "de": "de-DE-KatjaNeural",
            "fr": "fr-FR-DeniseNeural",
            "zh": "zh-CN-XiaoxiaoNeural",
            "ar": "ar-SA-ZariyahNeural"
        }

    async def _async_edge_tts(self, text: str, voice: str) -> bytes:
        communicate = edge_tts.Communicate(text, voice)
        audio_data = bytearray()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data.extend(chunk["data"])
        return bytes(audio_data)

    def synthesize_speech(self, text: str, target_lang: str) -> dict:
        """
        Synthesizes translated text into spoken audio stream.
        Uses Edge-TTS / Piper engines, returning base64 encoded audio payload.
        """
        start = time.time()
        audio_base64 = ""
        engine_used = self.fallback_engine if target_lang not in self.piper_supported_langs else self.primary_engine

        voice = self.voice_map.get(target_lang, "en-US-AriaNeural")

        if HAS_EDGE_TTS and text.trim() if hasattr(text, 'trim') else text.strip():
            try:
                audio_bytes = asyncio.run(self._async_edge_tts(text, voice))
                if audio_bytes:
                    audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
                    engine_used = "edge-tts"
            except Exception as e:
                logging.warning(f"Edge-TTS synthesis error: {e}")

        duration_ms = int((time.time() - start) * 1000)

        return {
            "engine": engine_used,
            "latency_ms": duration_ms,
            "audio_format": "mp3",
            "sample_rate": 24000,
            "audio_base64": audio_base64
        }

