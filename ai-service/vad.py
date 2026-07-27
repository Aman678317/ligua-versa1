"""
Voice Activity Detection (VAD) module for LinguaVersa AI Service
Chunks continuous WebRTC PCM audio stream into spoken speech segments
"""

import math
import struct

class VoiceActivityDetector:
    def __init__(self, sample_rate: int = 16000, threshold: float = 0.015):
        self.sample_rate = sample_rate
        self.threshold = threshold
        self.is_speech_active = False

    def process_chunk(self, audio_bytes: bytes) -> bool:
        """
        Calculates Root Mean Square (RMS) energy level of PCM audio chunk
        to detect human speech activity. Returns True if speech energy exceeds threshold.
        """
        if not audio_bytes or len(audio_bytes) < 320:
            self.is_speech_active = False
            return False

        try:
            # 16-bit signed PCM audio decoding
            num_samples = len(audio_bytes) // 2
            if num_samples == 0:
                return False
                
            samples = struct.unpack(f"<{num_samples}h", audio_bytes[:num_samples * 2])
            
            # Compute RMS energy normalized to [0.0, 1.0]
            sum_squares = sum(s * s for s in samples)
            rms = math.sqrt(sum_squares / float(num_samples)) / 32768.0

            # Active voice detection decision
            self.is_speech_active = rms >= self.threshold
            return self.is_speech_active
        except Exception:
            # Fallback to byte energy if unaligned PCM frame
            energy = sum(abs(b - 128) for b in audio_bytes[:100]) / 100.0
            self.is_speech_active = energy > 12.0
            return self.is_speech_active

