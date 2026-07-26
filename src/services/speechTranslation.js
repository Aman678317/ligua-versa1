// Real-Time Browser Speech Recognition Engine for LinguaVersa
// Captures live microphone speech input and emits speech-chunk events over WebSockets

export class SpeechTranslationService {
  constructor(socket, sourceLang = 'en', targetLang = 'en', speakerName = 'Participant') {
    this.socket = socket;
    this.sourceLang = sourceLang;
    this.targetLang = targetLang;
    this.speakerName = speakerName;
    this.recognition = null;
    this.isListening = false;

    this.initRecognition();
  }

  initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('[SpeechTranslationService] Web Speech API SpeechRecognition is not supported in this browser.');
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.getLanguageCode(this.sourceLang);

      this.recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            const transcript = event.results[i][0].transcript.trim();
            if (transcript) {
              this.emitSpeechChunk(transcript);
            }
          }
        }
      };

      this.recognition.onerror = (err) => {
        if (err.error !== 'no-speech') {
          console.warn('[SpeechRecognition Error]', err);
        }
      };

      this.recognition.onend = () => {
        // Automatically restart if continuous listening is enabled
        if (this.isListening) {
          try {
            this.recognition.start();
          } catch (e) {}
        }
      };
    } catch (err) {
      console.warn('[SpeechRecognition Initialization Error]', err);
    }
  }

  getLanguageCode(code) {
    const langMap = {
      en: 'en-US',
      ja: 'ja-JP',
      hi: 'hi-IN',
      es: 'es-ES',
      de: 'de-DE',
      fr: 'fr-FR',
      zh: 'zh-CN',
      ar: 'ar-SA'
    };
    return langMap[code] || 'en-US';
  }

  updateConfig({ sourceLang, targetLang, speakerName }) {
    if (sourceLang) this.sourceLang = sourceLang;
    if (targetLang) this.targetLang = targetLang;
    if (speakerName) this.speakerName = speakerName;

    if (this.recognition) {
      this.recognition.lang = this.getLanguageCode(this.sourceLang);
    }
  }

  start() {
    if (!this.recognition || this.isListening) return;

    try {
      this.isListening = true;
      this.recognition.start();
    } catch (e) {
      console.warn('[SpeechRecognition Start Error]', e);
    }
  }

  stop() {
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }
  }

  emitSpeechChunk(text) {
    if (!this.socket || !text) return;

    this.socket.emit('speech-chunk', {
      text,
      sourceLang: this.sourceLang,
      targetLang: this.targetLang,
      speakerName: this.speakerName,
      speakerId: this.socket.id || 'self'
    });
  }
}
