/**
 * NestJS / Socket.io Meeting Gateway for LinguaVersa
 * Real-time WebRTC signaling, Chat auto-translation broadcast, and Host Security events
 */

export interface JoinRoomPayload {
  roomCode: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
    isHost: boolean;
    spokenLanguage: string;
  };
}

export interface WebRTCSignalingPayload {
  targetSocketId: string;
  offer?: any;
  answer?: any;
  candidate?: any;
}

export interface SpeechChunkPayload {
  text: string;
  sourceLang: string;
  targetLang: string;
  speakerName: string;
  speakerId: string;
}

export class MeetingGateway {
  // Event Names Contract per TRD Section 4
  static readonly EVENTS = {
    JOIN_ROOM: 'join-room',
    WEBRTC_OFFER: 'webrtc-offer',
    WEBRTC_ANSWER: 'webrtc-answer',
    WEBRTC_ICE_CANDIDATE: 'webrtc-ice-candidate',
    SPEECH_CHUNK: 'speech-chunk',
    LIVE_CAPTION_CHUNK: 'live-caption-chunk',
    SEND_CHAT_MESSAGE: 'send-chat-message',
    NEW_CHAT_MESSAGE: 'new-chat-message',
    SEND_REACTION: 'send-reaction',
    HOST_MUTE_ALL: 'host-mute-all',
    ADMIT_PARTICIPANT: 'admit-participant',
    HOST_REMOVE_PARTICIPANT: 'host-remove-participant'
  };
}
