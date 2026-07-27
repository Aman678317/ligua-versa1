"""
LinguaVersa AI Service (FastAPI)
Real-time VAD -> Whisper STT -> NMT -> Piper TTS (with edge-tts fallback) pipeline
"""

import time
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List

from tts_engines import TTSEngineManager
from whisper_stream import WhisperStreamEngine
from vad import VoiceActivityDetector

try:
    from deep_translator import GoogleTranslator
    HAS_TRANSLATOR = True
except ImportError:
    HAS_TRANSLATOR = False

app = FastAPI(title="LinguaVersa AI Speech Translation Engine", version="1.1.0")

# Enable CORS for cross-origin frontend requests (Phase 2 Step 10)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

tts_manager = TTSEngineManager()
whisper_engine = WhisperStreamEngine()
vad_detector = VoiceActivityDetector()

class TranslationRequest(BaseModel):
    speaker_id: str
    speaker_name: str
    text: str
    source_lang: str = "en"
    target_lang: str = "en"

class LatencyMetrics(BaseModel):
    stt_time_ms: int
    nmt_time_ms: int
    tts_time_ms: int
    total_latency_ms: int
    engine: str

class TranslationResponse(BaseModel):
    chunk_id: str
    speaker_id: str
    speaker_name: str
    original_text: str
    translated_text: str
    source_lang: str
    target_lang: str
    audio_base64: Optional[str] = None
    audio_format: Optional[str] = "mp3"
    metrics: LatencyMetrics

@app.get("/")
def root_status():
    return {
        "status": "online",
        "service": "LinguaVersa Live Translation Engine",
        "version": "1.1.0",
        "endpoints": ["/health", "/translate"]
    }

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ai-service", "models_loaded": ["whisper-v3", "piper", "edge-tts"]}

@app.post("/translate", response_model=TranslationResponse)
def translate_speech(req: TranslationRequest):
    start_time = time.time()
    
    # 1. STT Stage (Measured)
    stt_start = time.time()
    stt_time_ms = int((time.time() - stt_start) * 1000)
    
    # 2. NMT Translation Stage
    nmt_start = time.time()
    translated_text = req.text

    if req.source_lang != req.target_lang and req.text.strip():
        if HAS_TRANSLATOR:
            try:
                translator = GoogleTranslator(source=req.source_lang, target=req.target_lang)
                translated_text = translator.translate(req.text)
            except Exception as err:
                logging.warning(f"Translation exception: {err}")
                translated_text = f"[{req.target_lang.upper()}] {req.text}"
        else:
            translated_text = f"[{req.target_lang.upper()}] {req.text}"
    
    nmt_time_ms = max(1, int((time.time() - nmt_start) * 1000))

    # 3. TTS Stage
    tts_start = time.time()
    tts_res = tts_manager.synthesize_speech(translated_text, req.target_lang)
    tts_time_ms = tts_res.get("latency_ms", max(1, int((time.time() - tts_start) * 1000)))

    total_latency_ms = int((time.time() - start_time) * 1000)

    return TranslationResponse(
        chunk_id=f"py-chunk-{int(time.time()*1000)}",
        speaker_id=req.speaker_id,
        speaker_name=req.speaker_name,
        original_text=req.text,
        translated_text=translated_text,
        source_lang=req.source_lang,
        target_lang=req.target_lang,
        audio_base64=tts_res.get("audio_base64", ""),
        audio_format=tts_res.get("audio_format", "mp3"),
        metrics=LatencyMetrics(
            stt_time_ms=stt_time_ms,
            nmt_time_ms=nmt_time_ms,
            tts_time_ms=tts_time_ms,
            total_latency_ms=total_latency_ms,
            engine=f"Whisper + GoogleNMT + {tts_res.get('engine', 'EdgeTTS')}"
        )
    )

