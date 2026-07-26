// Client-side WebAudio API Audio Mixer for LinguaVersa
// Captures live mic stream, measures RMS volume, and prepares audio buffers for ai-service

export class AudioMixer {
  constructor() {
    this.audioCtx = null;
    this.analyser = null;
    this.micStream = null;
    this.sourceNode = null;
    this.isRecording = false;
  }

  async initialize(stream) {
    try {
      this.micStream = stream;
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;

      if (stream && stream.getAudioTracks().length > 0) {
        this.sourceNode = this.audioCtx.createMediaStreamSource(stream);
        this.sourceNode.connect(this.analyser);
        this.isRecording = true;
      }
      return true;
    } catch (err) {
      console.warn('[AudioMixer] WebAudio API init fallback:', err);
      return false;
    }
  }

  getVolumeLevel() {
    if (!this.analyser || !this.isRecording) return 0;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const average = sum / dataArray.length;
    return Math.min(100, Math.round((average / 128) * 100));
  }

  getFrequencySpectrum() {
    if (!this.analyser || !this.isRecording) {
      // Mock spectrum animation values if no hardware stream
      return Array.from({ length: 32 }, () => Math.floor(Math.random() * 60) + 10);
    }

    const dataArray = new Uint8Array(32);
    this.analyser.getByteFrequencyData(dataArray);
    return Array.from(dataArray);
  }

  stop() {
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close();
    }
    this.isRecording = false;
  }
}
