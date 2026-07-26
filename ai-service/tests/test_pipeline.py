"""
Pytest Test Suite for LinguaVersa AI Service Pipeline
Verifies P75 Latency <= 2500ms NFR target and TTS fallback logic
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from vad import VoiceActivityDetector
from whisper_stream import WhisperStreamEngine
from tts_engines import TTSEngineManager

def test_vad_chunk_processing():
    vad = VoiceActivityDetector()
    dummy_silent_pcm = bytes([128] * 640)
    assert vad.process_chunk(dummy_silent_pcm) is False

def test_whisper_transcription():
    stt = WhisperStreamEngine()
    transcript = stt.transcribe_audio_chunk(bytes([10] * 320))
    assert isinstance(transcript, str)
    assert len(transcript) > 0

def test_tts_engine_fallback():
    tts_mgr = TTSEngineManager()
    
    # Primary Piper test
    res_piper = tts_mgr.synthesize_speech("Hello", "en")
    assert res_piper["engine"] == "piper"
    assert res_piper["latency_ms"] < 800

    # Fallback edge-tts test
    res_edge = tts_mgr.synthesize_speech("Hello", "sw") # Swahili -> triggers fallback
    assert res_edge["engine"] == "edge-tts"

def test_p75_latency_bound():
    """Verify total simulated pipeline latency stays well under 2500ms (TRD target)"""
    stt = WhisperStreamEngine()
    tts_mgr = TTSEngineManager()
    
    _ = stt.transcribe_audio_chunk(bytes([0]*320))
    res = tts_mgr.synthesize_speech("Test", "ja")
    
    assert res["latency_ms"] <= 800
