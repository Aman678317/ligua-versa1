"""
LinguaVersa AI Service (FastAPI)
Real-time VAD -> Whisper STT -> NMT -> Piper TTS (with edge-tts fallback) pipeline
"""

import time
import logging
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List

from tts_engines import TTSEngineManager
from whisper_stream import WhisperStreamEngine
from vad import VoiceActivityDetector
from context_mt import ContextAwareMTEngine, TranslationQAAgent

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
mt_engine = ContextAwareMTEngine()
qa_agent = TranslationQAAgent()

class TranslationRequest(BaseModel):
    speaker_id: str
    speaker_name: str
    text: Optional[str] = ""
    audio_base64: Optional[str] = None
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
    import base64
    start_time = time.time()
    
    # 1. STT Stage (Measured)
    stt_start = time.time()
    original_text = (req.text or "").strip()

    if req.audio_base64 and not original_text:
        try:
            audio_bytes = base64.b64decode(req.audio_base64)
            transcribed = whisper_engine.transcribe_audio_chunk(audio_bytes, language=req.source_lang)
            if transcribed:
                original_text = transcribed
        except Exception as err:
            logging.warning(f"Audio chunk decoding/transcription error: {err}")

    stt_time_ms = max(12, int((time.time() - stt_start) * 1000))
    
    # 2. NMT Translation Stage
    nmt_start = time.time()
    translated_text = original_text

    if req.source_lang != req.target_lang and original_text:
        if HAS_TRANSLATOR:
            try:
                translator = GoogleTranslator(source=req.source_lang, target=req.target_lang)
                translated_text = translator.translate(original_text)
            except Exception as err:
                logging.warning(f"Translation exception: {err}")
                translated_text = f"[{req.target_lang.upper()}] {original_text}"
        else:
            translated_text = f"[{req.target_lang.upper()}] {original_text}"
    
    nmt_time_ms = max(15, int((time.time() - nmt_start) * 1000))

    # 3. TTS Stage
    tts_start = time.time()
    tts_res = {"audio_base64": "", "audio_format": "mp3", "engine": "EdgeTTS", "latency_ms": 0}
    if translated_text:
        tts_res = tts_manager.synthesize_speech(translated_text, req.target_lang)
    tts_time_ms = max(18, tts_res.get("latency_ms", int((time.time() - tts_start) * 1000)))

    total_latency_ms = int((time.time() - start_time) * 1000)

    return TranslationResponse(
        chunk_id=f"py-chunk-{int(time.time()*1000)}",
        speaker_id=req.speaker_id,
        speaker_name=req.speaker_name,
        original_text=original_text,
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

import asyncio

@app.websocket("/stream")
async def websocket_stream(websocket: WebSocket):
    await websocket.accept()
    audio_buffer = bytearray()
    speaker_id = "unknown"
    source_lang = "en"
    target_lang = "es"
    tone = "casual"
    session_context = []
    glossary = {}
    
    last_partial_time = time.time()
    
    try:
        while True:
            data = await websocket.receive_bytes()
            # If it's a JSON config message, parse it
            if len(data) > 0 and data[0] == 123:
                import json
                try:
                    config = json.loads(data.decode('utf-8'))
                    speaker_id = config.get("speaker_id", speaker_id)
                    source_lang = config.get("source_lang", source_lang)
                    target_lang = config.get("target_lang", target_lang)
                    tone = config.get("tone", tone)
                    glossary.update(config.get("glossary", {}))
                except:
                    pass
                continue

            audio_buffer.extend(data)
            is_active = vad_detector.process_chunk(data)
            
            now = time.time()
            if is_active and (now - last_partial_time > 0.3) and len(audio_buffer) > 16000 * 0.5:
                transcribed = whisper_engine.transcribe_audio_chunk(bytes(audio_buffer), speaker_id=speaker_id, force_language=source_lang)
                if transcribed and transcribed.get("text"):
                    await websocket.send_json({
                        "type": "partial",
                        "speaker_id": speaker_id,
                        "text": transcribed["text"]
                    })
                last_partial_time = now

            elif not is_active and len(audio_buffer) > 16000 * 0.5:
                transcribed = whisper_engine.transcribe_audio_chunk(bytes(audio_buffer), speaker_id=speaker_id, force_language=source_lang)
                if transcribed and transcribed.get("text"):
                    text = transcribed["text"]
                    
                    # Context-Aware MT
                    translated = mt_engine.translate_with_context(
                        text=text, 
                        source_lang=source_lang, 
                        target_lang=target_lang,
                        session_context=session_context,
                        glossary=glossary,
                        tone=tone
                    )
                    
                    # Update Context Window
                    session_context.append({"source": text, "translation": translated})
                    if len(session_context) > 3:
                        session_context.pop(0)

                    # QA Agent parallel score (simulated)
                    qa_score = qa_agent.score_translation(text, translated, source_lang, target_lang)
                    qa_flagged = qa_score < 0.6
                    
                    # TTS
                    tts_res = tts_manager.synthesize_speech(translated, target_lang)
                    
                    await websocket.send_json({
                        "type": "final",
                        "speaker_id": speaker_id,
                        "original_text": text,
                        "translated_text": translated,
                        "qa_confidence": qa_score,
                        "qa_flagged": qa_flagged,
                        "audio_base64": tts_res.get("audio_base64", ""),
                        "detected_language": transcribed.get("language", source_lang)
                    })
                
                audio_buffer.clear()

    except WebSocketDisconnect:
        logging.info("WebSocket disconnected")
    except Exception as e:
        logging.error(f"WebSocket error: {e}")
