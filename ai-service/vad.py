"""
Voice Activity Detection (VAD) module for LinguaVersa AI Service
Uses Silero VAD (ONNX) for robust speech boundary detection.
"""

import os
import urllib.request
import numpy as np
import onnxruntime as ort
import logging

MODEL_URL = "https://github.com/snakers4/silero-vad/raw/master/src/silero_vad/data/silero_vad.onnx"
MODEL_PATH = os.path.join(os.path.dirname(__file__), "silero_vad.onnx")

class VoiceActivityDetector:
    def __init__(self, sample_rate: int = 16000, threshold: float = 0.5):
        self.sample_rate = sample_rate
        self.threshold = threshold
        self.is_speech_active = False
        
        # Download ONNX model if not exists
        if not os.path.exists(MODEL_PATH):
            logging.info("Downloading Silero VAD ONNX model...")
            urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
        
        opts = ort.SessionOptions()
        opts.inter_op_num_threads = 1
        opts.intra_op_num_threads = 1
        
        self.session = ort.InferenceSession(MODEL_PATH, providers=["CPUExecutionProvider"], sess_options=opts)
        
        self.reset_states()

    def reset_states(self):
        self._h = np.zeros((2, 1, 64)).astype('float32')
        self._c = np.zeros((2, 1, 64)).astype('float32')

    def process_chunk(self, audio_bytes: bytes) -> bool:
        """
        Takes raw 16-bit PCM bytes, converts to float32, and runs Silero VAD.
        Returns True if speech probability > threshold.
        """
        if not audio_bytes:
            return False
        
        try:
            # Convert 16-bit PCM to float32 [-1, 1]
            audio_array = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0
            
            # Silero expects chunks of exactly 512 samples for 16kHz
            # If our chunk isn't divisible, we pad it for inference, or just run on multiple blocks
            # For simplicity, we just run on the first block of 512, or pad if smaller
            if len(audio_array) < 512:
                pad = np.zeros(512 - len(audio_array), dtype=np.float32)
                audio_array = np.concatenate([audio_array, pad])
            
            # We'll just evaluate the first 512 window to get a proxy probability for this chunk
            window = audio_array[:512].reshape(1, 512)
            
            ort_inputs = {
                'input': window,
                'sr': np.array([self.sample_rate], dtype=np.int64),
                'h': self._h,
                'c': self._c
            }
            ort_outs = self.session.run(None, ort_inputs)
            out, self._h, self._c = ort_outs
            
            prob = out[0][0]
            self.is_speech_active = prob >= self.threshold
            return self.is_speech_active
        except Exception as e:
            logging.error(f"VAD Error: {e}")
            return False
