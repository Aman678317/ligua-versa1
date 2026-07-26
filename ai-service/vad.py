"""
Voice Activity Detection (VAD) module for LinguaVersa AI Service
Chunks continuous WebRTC PCM audio stream into spoken speech segments
"""

class VoiceActivityDetector:
    def __init__(self, sample_rate: int = 16000, threshold: float = 0.5):
        self.sample_rate = sample_rate
        self.threshold = threshold
        self.is_speech_active = False

    def process_chunk(self, audio_bytes: bytes) -> bool:
        """
        Calculates energy level of raw audio chunk to detect speech boundaries.
        Returns True if active human voice is detected.
        """
        if not audio_bytes or len(audio_bytes) < 320:
            return False
        
        # Simple energy calculation simulation
        energy = sum(abs(b - 128) for b in audio_bytes[:100]) / 100.0
        self.is_speech_active = energy > 12.0
        return self.is_speech_active
