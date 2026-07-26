// Audio Ducking and Sound System for LinguaVersa
// Controls original spoken audio volume ducking when translated TTS voice is active

export class SoundAudioSystem {
  constructor() {
    this.originalVoiceVolume = 0.3; // 30% original volume during translation playback (ducking)
    this.translatedTtsVolume = 1.0; // 100% TTS volume
    this.isDuckingActive = false;
  }

  setOriginalVolume(volume) {
    this.originalVoiceVolume = Math.max(0, Math.min(1, volume));
  }

  setTtsVolume(volume) {
    this.translatedTtsVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Applies audio ducking to original media element during TTS playback
   */
  applyDucking(originalAudioElement, isTtsPlaying) {
    if (!originalAudioElement) return;

    if (isTtsPlaying) {
      originalAudioElement.volume = this.originalVoiceVolume;
      this.isDuckingActive = true;
    } else {
      originalAudioElement.volume = 1.0;
      this.isDuckingActive = false;
    }
  }

  playTranslatedTts(audioUrl) {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    audio.volume = this.translatedTtsVolume;
    audio.play().catch(e => console.log('Audio playback simulation:', e));
  }
}
