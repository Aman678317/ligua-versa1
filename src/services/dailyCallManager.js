// Daily.co Call Manager Service for LinguaVersa Frontend
import DailyIframe from '@daily-co/daily-js';

export class DailyCallManager {
  constructor(roomUrl, userName, onParticipantsUpdate, onTrackStarted, onTrackStopped) {
    this.roomUrl = roomUrl;
    this.userName = userName;
    this.onParticipantsUpdate = onParticipantsUpdate;
    this.onTrackStarted = onTrackStarted;
    this.onTrackStopped = onTrackStopped;
    this.callObject = null;
  }

  async join() {
    try {
      if (this.callObject) {
        await this.callObject.destroy();
      }

      this.callObject = DailyIframe.createCallObject({
        subscribeToTracksAutomatically: true,
      });

      this.setupEventListeners();

      await this.callObject.join({
        url: this.roomUrl,
        userName: this.userName || 'Participant'
      });

      console.log('[DailyCallManager] Joined Daily room successfully:', this.roomUrl);
    } catch (err) {
      console.warn('[DailyCallManager Join Fallback]', err);
    }
  }

  setupEventListeners() {
    if (!this.callObject) return;

    this.callObject.on('joined-meeting', (e) => {
      this.handleParticipantsChange();
    });

    this.callObject.on('participant-joined', (e) => {
      this.handleParticipantsChange();
    });

    this.callObject.on('participant-updated', (e) => {
      this.handleParticipantsChange();
    });

    this.callObject.on('participant-left', (e) => {
      this.handleParticipantsChange();
    });

    this.callObject.on('track-started', (e) => {
      if (e.participant && e.track) {
        this.onTrackStarted(e.participant, e.track);
      }
    });

    this.callObject.on('track-stopped', (e) => {
      if (e.participant && e.track) {
        this.onTrackStopped(e.participant, e.track);
      }
    });
  }

  handleParticipantsChange() {
    if (!this.callObject) return;
    const participantsObj = this.callObject.participants();
    const list = Object.values(participantsObj);
    this.onParticipantsUpdate(list);
  }

  setAudio(enabled) {
    if (this.callObject) {
      this.callObject.setLocalAudio(enabled);
    }
  }

  setVideo(enabled) {
    if (this.callObject) {
      this.callObject.setLocalVideo(enabled);
    }
  }

  async leave() {
    if (this.callObject) {
      try {
        await this.callObject.leave();
        await this.callObject.destroy();
        this.callObject = null;
      } catch (e) {}
    }
  }
}
