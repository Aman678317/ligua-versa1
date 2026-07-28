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
        self.primary_engine = "xtts"
        self.fallback_engine_1 = "edge-tts"
        self.fallback_engine_2 = "piper"
        
        self.piper_supported_langs = {"en", "ja", "hi", "es", "de", "fr"}
        self.xtts_supported_langs = {"en", "es", "fr", "de", "it", "pt", "pl", "tr", "ru", "nl", "cs", "ar", "zh", "ja", "hu", "ko", "hi"}
        
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
        
        try:
            # from TTS.api import TTS
            # self.xtts_model = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to("cpu")
            self.xtts_model = None # Stub for heavy model
            self.has_xtts = True
        except ImportError:
            self.has_xtts = False

    async def _async_edge_tts(self, text: str, voice: str) -> bytes:
        communicate = edge_tts.Communicate(text, voice)
        audio_data = bytearray()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data.extend(chunk["data"])
        return bytes(audio_data)

    def synthesize_speech(self, text: str, target_lang: str, speaker_wav_path: str = None) -> dict:
        """
        Synthesizes translated text into spoken audio stream.
        Fallback chain: XTTS -> Edge-TTS -> Piper
        """
        start = time.time()
        audio_base64 = ""
        engine_used = ""
        text_clean = text.trim() if hasattr(text, 'trim') else text.strip()
        voice = self.voice_map.get(target_lang, "en-US-AriaNeural")

        # 1. Try XTTS
        if self.has_xtts and target_lang in self.xtts_supported_langs and speaker_wav_path:
            try:
                # audio_bytes = self.xtts_model.tts(text=text_clean, speaker_wav=speaker_wav_path, language=target_lang)
                raise Exception("XTTS inference stubbed / missing wav")
            except Exception as e:
                logging.warning(f"XTTS synthesis error: {e}. Falling back to edge-tts.")
                engine_used = "fallback"

        # 2. Try Edge-TTS
        if engine_used != "xtts":
            if HAS_EDGE_TTS and text_clean:
                try:
                    audio_bytes = asyncio.run(self._async_edge_tts(text_clean, voice))
                    if audio_bytes:
                        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
                        engine_used = "edge-tts"
                except Exception as e:
                    logging.warning(f"Edge-TTS synthesis error: {e}. Falling back to piper.")
                    engine_used = "fallback"
        
        # 3. Try Piper
        if engine_used != "xtts" and engine_used != "edge-tts":
            if target_lang in self.piper_supported_langs:
                try:
                    raise Exception("Piper not fully implemented yet")
                except Exception as e:
                    logging.warning(f"Piper synthesis error: {e}")
                    engine_used = "none"

        duration_ms = int((time.time() - start) * 1000)

        return {
            "engine": engine_used,
            "latency_ms": duration_ms,
            "audio_format": "mp3",
            "sample_rate": 24000,
            "audio_base64": audio_base64
        }

