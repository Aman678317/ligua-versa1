// Real-Time Browser Speech Recognition Engine for LinguaVersa
// Captures live microphone speech input and emits speech-chunk events over WebSockets

export class SpeechTranslationService {
  constructor(socket, sourceLang = 'en', targetLang = 'en', speakerName = 'Participant') {
    this.socket = socket;
    this.sourceLang = sourceLang;
    this.targetLang = targetLang;
    this.speakerName = speakerName;
    this.recognition = null;
    this.mediaRecorder = null;
    this.isListening = false;
    this.lastEmittedText = '';

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
          const transcript = event.results[i][0].transcript.trim();
          if (transcript && transcript !== this.lastEmittedText) {
            this.lastEmittedText = transcript;
            this.emitSpeechChunk(transcript, null, !event.results[i].isFinal);
          }
        }
      };

      this.recognition.onerror = (err) => {
        if (err.error !== 'no-speech') {
          console.warn('[SpeechRecognition Error]', err);
        }
      };

      this.recognition.onend = () => {
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

  start(localAudioStream = null) {
    if (this.isListening) return;
    this.isListening = true;

    if (this.recognition) {
      try {
        this.recognition.start();
      } catch (e) {
        console.warn('[SpeechRecognition Start Exception]', e);
      }
    }

    if (localAudioStream && window.MediaRecorder) {
      try {
        const audioTrack = localAudioStream.getAudioTracks()[0];
        if (audioTrack) {
          const stream = new MediaStream([audioTrack]);
          this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

          this.mediaRecorder.ondataavailable = async (event) => {
            if (event.data && event.data.size > 0 && this.isListening) {
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64Data = reader.result.split(',')[1];
                if (base64Data) {
                  this.emitSpeechChunk(this.lastEmittedText || '', base64Data, false);
                }
              };
              reader.readAsDataURL(event.data);
            }
          };

          this.mediaRecorder.start(2000); // 2-second audio chunks
        }
      } catch (err) {
        console.warn('[MediaRecorder audio chunking error]', err);
      }
    }
  }

  stop() {
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {}
    }
  }

  emitSpeechChunk(text, audioBase64 = null, isInterim = false) {
    if (!this.socket) return;
    if (!text && !audioBase64) return;

    this.socket.emit('speech-chunk', {
      text,
      audioBase64,
      isInterim,
      sourceLang: this.sourceLang,
      targetLang: this.targetLang,
      speakerName: this.speakerName,
      speakerId: this.socket.id || 'self'
    });
  }
}
