import React, { useState, useEffect, useRef } from 'react';
import DailyIframe from '@daily-co/daily-js';
import { 
  Mic, MicOff, Video as VideoIcon, VideoOff, Monitor, PhoneOff, 
  MessageSquare, Shield, BarChart2, Sparkles, Users, LayoutGrid, User, Copy, Check, Share2, CameraOff, AlertCircle, Disc
} from 'lucide-react';
import DualCaptionsOverlay from './DualCaptionsOverlay';
import HostControlsModal from './HostControlsModal';
import InCallChat from './InCallChat';
import PermissionBanner from './PermissionBanner';
import { EmojiReactionsOverlay, PollsModal } from './PollsAndReactions';
import SpeechCanvas3D from '../visuals/SpeechCanvas3D';
import VoiceParticles from '../canvas/VoiceParticles';
import { ChatBotOrb } from '../canvas/ChatBotOrb';
import AIStatusIndicator from './AIStatusIndicator';
import { AudioMixer } from '../../utils/AudioMixer';
import { CaptionSynchronizer } from '../../utils/CaptionSynchronizer';
import { SpeechTranslationService } from '../../services/speechTranslation';
import { getSocket } from '../../services/socket';

export default function VideoRoom({ roomCode, currentUser, selectedLanguage, setSelectedLanguage, languages, userSettings, onLeaveCall }) {
  const socket = getSocket();

  // Media & Control States
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isBlurBackground, setIsBlurBackground] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);
  const [layoutMode, setLayoutMode] = useState('gallery');

  // Daily Participants & Stream Tracks State
  const [dailyParticipants, setDailyParticipants] = useState([]);
  const [dailyRoomUrl, setDailyRoomUrl] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Drawers & Modals
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isHostControlsOpen, setIsHostControlsOpen] = useState(false);
  const [isPollsOpen, setIsPollsOpen] = useState(false);

  // Realtime Audio & Caption State
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [frequencyData, setFrequencyData] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [polls, setPolls] = useState([]);
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [waitingRoomList, setWaitingRoomList] = useState([]);
  const [roomSettings, setRoomSettings] = useState({ isLocked: false, waitingRoomEnabled: false });

  // Reconnect & Disconnect UI States
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [peerDisconnectedBanner, setPeerDisconnectedBanner] = useState(null);

  // Call Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recorderName, setRecorderName] = useState('');
  const [cloudRecordingId, setCloudRecordingId] = useState(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  const [currentCaption, setCurrentCaption] = useState({
    id: 'c-init',
    speakerId: 'system',
    speakerName: 'LinguaVersa System',
    sourceLang: 'en',
    targetLang: selectedLanguage,
    originalText: 'Real microphone speech translation is active. Speak into your mic!',
    translatedText: 'リアルタイムの音声翻訳が有効です。マイクに向かって話してください！',
    timestamp: new Date().toISOString(),
    metrics: { sttLatencyMs: 120, nmtLatencyMs: 210, ttsLatencyMs: 260, totalLatencyMs: 590 }
  });

  const dailyCallRef = useRef(null);
  const speechServiceRef = useRef(null);
  const audioMixerRef = useRef(null);
  const captionSyncRef = useRef(new CaptionSynchronizer());
  const [showQrModal, setShowQrModal] = useState(false);
  const shareableJoinUrl = `${window.location.origin}/join/${roomCode}`;

  // 1. FETCH EXISTING DAILY ROOM URL & JOIN (GET ONLY - NEVER RE-CREATE ON JOIN)
  useEffect(() => {
    let callObj = null;

    const initDailyCall = async () => {
      try {
        let roomUrl = '';

        // Check /api/calls/:sessionId first
        const callRes = await fetch(`/api/calls/${roomCode}`).catch(() => null);
        if (callRes && callRes.ok) {
          const callData = await callRes.json();
          if (callData.session && callData.session.dailyRoomUrl) {
            roomUrl = callData.session.dailyRoomUrl;
          }
        }

        // Check /api/meetings/:code if not found in call sessions
        if (!roomUrl) {
          const meetingRes = await fetch(`/api/meetings/${roomCode}`).catch(() => null);
          if (meetingRes && meetingRes.ok) {
            const meetingData = await meetingRes.json();
            if (meetingData.meeting && meetingData.meeting.dailyRoomUrl) {
              roomUrl = meetingData.meeting.dailyRoomUrl;
            }
          }
        }

        if (!roomUrl) {
          const safeCode = roomCode ? `lingua-${roomCode.replace(/[^a-zA-Z0-9_-]/g, '')}` : `lingua-${Date.now()}`;
          roomUrl = `https://linguaversa.daily.co/${safeCode}`;
        }

        setDailyRoomUrl(roomUrl);

        callObj = DailyIframe.createCallObject({
          subscribeToTracksAutomatically: true,
        });
        dailyCallRef.current = callObj;

        const updateParticipants = () => {
          if (!callObj) return;
          const participantsMap = callObj.participants();
          const list = Object.values(participantsMap);
          setDailyParticipants(list);
        };

        callObj.on('joined-meeting', updateParticipants);
        callObj.on('participant-joined', updateParticipants);
        callObj.on('participant-updated', updateParticipants);
        callObj.on('participant-left', updateParticipants);

        await callObj.join({
          url: roomUrl,
          userName: currentUser.name || 'Participant'
        });

        console.log('[Daily.co] Joined Daily room successfully:', roomUrl);

        const localStream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
        if (localStream) {
          const mixer = new AudioMixer();
          audioMixerRef.current = mixer;
          mixer.initialize(localStream);
        }
      } catch (err) {
        console.warn('[Daily.co Join Exception]', err);
      }
    };

    initDailyCall();

    return () => {
      if (dailyCallRef.current) {
        dailyCallRef.current.leave().catch(() => {});
        dailyCallRef.current.destroy().catch(() => {});
      }
      if (audioMixerRef.current) {
        audioMixerRef.current.stop();
      }
    };
  }, [roomCode]);

  // 2. SOCKET ROOM JOIN & REALTIME SPEECH TRANSLATION PIPELINE
  useEffect(() => {
    const speechService = new SpeechTranslationService(
      socket,
      selectedLanguage,
      selectedLanguage,
      currentUser.name
    );
    speechServiceRef.current = speechService;
    speechService.start();

    socket.emit('join-room', {
      roomCode,
      user: {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar,
        isHost: true,
        spokenLanguage: selectedLanguage
      }
    });

    socket.on('live-caption-chunk', (caption) => {
      const synchronized = captionSyncRef.current.pushChunk(caption);
      setCurrentCaption(synchronized);

      // Play synthesized translated audio stream for remote participant
      if (caption.audioBase64 && caption.speakerId !== socket.id) {
        try {
          const snd = new Audio(`data:audio/${caption.audioFormat || 'mp3'};base64,${caption.audioBase64}`);
          snd.volume = 0.9;
          snd.play().catch(e => console.warn('[TTS Playback Error]', e));
        } catch (e) {
          console.warn('[Audio Playback Exception]', e);
        }
      }
    });

    socket.on('new-chat-message', (msg) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    socket.on('new-reaction', ({ emoji }) => {
      const reactionObj = {
        id: `react-${Date.now()}-${Math.random()}`,
        emoji,
        x: Math.floor(Math.random() * 80) + 10,
        rotate: Math.floor(Math.random() * 40) - 20
      };
      setFloatingReactions((prev) => [...prev, reactionObj]);
    });

    socket.on('poll-created', (poll) => {
      setPolls((prev) => [...prev, poll]);
    });

    socket.on('poll-updated', (updatedPoll) => {
      setPolls((prev) => prev.map(p => p.id === updatedPoll.id ? updatedPoll : p));
    });

    socket.on('host-muted-you', () => {
      if (dailyCallRef.current) dailyCallRef.current.setLocalAudio(false);
      setIsMuted(true);
    });

    socket.on('removed-by-host', () => {
      alert('You have been removed from the meeting by the host.');
      onLeaveCall();
    });

    socket.on('disconnect', () => {
      setIsReconnecting(true);
    });

    socket.on('connect', () => {
      setIsReconnecting(false);
      socket.emit('rejoin-session', {
        roomCode,
        user: { name: currentUser.name, spokenLanguage: selectedLanguage },
        previousSocketId: socket.id
      });
    });

    socket.on('peer-disconnected', ({ user }) => {
      setPeerDisconnectedBanner(user?.name || 'Participant');
    });

    socket.on('peer-reconnected', () => {
      setPeerDisconnectedBanner(null);
    });

    socket.on('peer-left', () => {
      setPeerDisconnectedBanner(null);
    });

    socket.on('recording-status-update', ({ isRecording: recordingState, recorderName: rName }) => {
      setIsRecording(recordingState);
      setRecorderName(rName || 'Host');
    });

    return () => {
      speechService.stop();
      socket.emit('leave-session');
      socket.off('live-caption-chunk');
      socket.off('new-chat-message');
      socket.off('new-reaction');
      socket.off('poll-created');
      socket.off('poll-updated');
      socket.off('host-muted-you');
      socket.off('removed-by-host');
      socket.off('disconnect');
      socket.off('connect');
      socket.off('peer-disconnected');
      socket.off('peer-reconnected');
      socket.off('peer-left');
      socket.off('recording-status-update');
    };
  }, [roomCode]);

  // Audio spectrum loop
  useEffect(() => {
    const spectrumInterval = setInterval(() => {
      if (audioMixerRef.current) {
        setVolumeLevel(audioMixerRef.current.getVolumeLevel());
        setFrequencyData(audioMixerRef.current.getFrequencySpectrum());
      }
    }, 100);

    return () => clearInterval(spectrumInterval);
  }, []);

  // Daily Media Control Buttons
  const toggleMute = () => {
    if (dailyCallRef.current) {
      dailyCallRef.current.setLocalAudio(isMuted);
    }
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    if (dailyCallRef.current) {
      dailyCallRef.current.setLocalVideo(!isVideoOn);
    }
    setIsVideoOn(!isVideoOn);
  };

  const toggleScreenShare = async () => {
    if (!dailyCallRef.current) return;
    try {
      if (isScreenSharing) {
        await dailyCallRef.current.stopScreenShare();
        setIsScreenSharing(false);
      } else {
        await dailyCallRef.current.startScreenShare();
        setIsScreenSharing(true);
      }
    } catch (err) {
      console.warn('[ScreenShare Error / OS Picker Cancelled]', err);
      setIsScreenSharing(false);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      } else if (cloudRecordingId) {
        await fetch('/api/recording/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recordingId: cloudRecordingId })
        }).catch(() => {});
        setCloudRecordingId(null);
      }
      setIsRecording(false);
      socket.emit('recording-status-changed', { isRecording: false });
    } else {
      // 1. Attempt Daily Cloud Recording REST API
      try {
        const res = await fetch('/api/recording/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomName: roomCode })
        });
        const data = await res.json();
        if (data.success && data.recordingId) {
          setCloudRecordingId(data.recordingId);
          setIsRecording(true);
          socket.emit('recording-status-changed', { isRecording: true, recorderName: currentUser.name });
          return;
        }
      } catch (e) {
        console.warn('[Cloud Recording unavailable, falling back to MediaRecorder]', e);
      }

      // 2. Client MediaRecorder Fallback
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true }).catch(() => null)
          || await navigator.mediaDevices.getUserMedia({ video: true, audio: true }).catch(() => null);

        if (!stream) {
          alert('Call recording requires screen or microphone permissions.');
          return;
        }

        recordedChunksRef.current = [];
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `LinguaVersa-Call-${roomCode}-${Date.now()}.webm`;
          a.click();
        };

        mediaRecorder.start(1000);
        setIsRecording(true);
        socket.emit('recording-status-changed', { isRecording: true, recorderName: currentUser.name });
      } catch (err) {
        console.warn('[MediaRecorder Error]', err);
      }
    }
  };


  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableJoinUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`Join my LinguaVersa live translated call!\nLink: ${shareableJoinUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const triggerEmojiReaction = (emoji) => {
    socket.emit('send-reaction', { emoji });
  };

  const handleSendChatMessage = ({ text, originalLang, file }) => {
    const optimisticMsg = {
      id: `opt-${Date.now()}`,
      senderId: socket.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      text,
      translatedText: text,
      originalLang: originalLang || selectedLanguage,
      targetLang: selectedLanguage,
      file,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages((prev) => [...prev, optimisticMsg]);
    socket.emit('send-chat-message', { text, originalLang: selectedLanguage, file });
  };

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] bg-[#05060B] flex overflow-hidden selection:bg-none">
      
      {/* Voice Amplitude Particle Background */}
      <VoiceParticles isSpeaking={!isMuted} amplitude={volumeLevel} />
      <SpeechCanvas3D isSpeaking={!isMuted} frequencyData={frequencyData} />

      {/* Floating Emoji Reactions Overlay */}
      <EmojiReactionsOverlay floatingReactions={floatingReactions} />

      {/* Reconnecting & Disconnect Status Banners */}
      {isReconnecting && (
        <div className="absolute top-0 inset-x-0 z-50 bg-amber-600/90 text-slate-950 px-4 py-2 text-xs font-extrabold text-center flex items-center justify-center gap-2 shadow-lg backdrop-blur-md">
          <div className="w-3 h-3 rounded-full border-2 border-slate-950 border-t-transparent animate-spin"></div>
          <span>Connection lost. Reconnecting to call...</span>
        </div>
      )}

      {peerDisconnectedBanner && !isReconnecting && (
        <div className="absolute top-0 inset-x-0 z-50 bg-cyan-600/90 text-white px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-2 shadow-lg backdrop-blur-md">
          <AlertCircle className="w-4 h-4 text-cyan-200 animate-pulse" />
          <span>{peerDisconnectedBanner} lost connection. Waiting for them to reconnect (60s grace period)...</span>
        </div>
      )}

      {/* Persistent Call Recording Notice Banner */}
      {isRecording && (
        <div className="absolute top-0 inset-x-0 z-50 bg-red-600/90 text-white px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-2 shadow-lg backdrop-blur-md">
          <Disc className="w-4 h-4 text-white animate-pulse" />
          <span>🔴 RECORDING IN PROGRESS — Call is being recorded by {recorderName || currentUser.name || 'Host'}</span>
        </div>
      )}

      {/* Main Video Call Content Area */}
      <div className="flex-1 flex flex-col relative h-full overflow-hidden z-10">
        
        {/* Top Status Bar */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-3 bg-[#0A0E1A]/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 shadow-lg">
          <div className="flex items-center gap-2">
            <ChatBotOrb isProcessing={!isMuted} />
            <span className="text-xs font-bold text-white tracking-wide">{roomCode}</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <Users className="w-3.5 h-3.5 text-[#00E5C7]" />
            <span>{dailyParticipants.length || 1} Connected</span>
          </div>
          <span className="text-slate-600">|</span>
          <AIStatusIndicator />
        </div>

        {/* Top Right Share & Layout Controls */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="px-3 py-1.5 rounded-xl bg-[#0A0E1A]/80 backdrop-blur-md border border-white/10 text-xs font-bold text-slate-200 hover:text-white flex items-center gap-1.5 transition-all"
            title="Copy Invite Link"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
            <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
          </button>

          <button
            onClick={handleWhatsAppShare}
            className="p-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition-all"
            title="Share on WhatsApp"
          >
            <Share2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowQrModal(true)}
            className="px-2.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all"
            title="Scan QR Code to Join"
          >
            QR
          </button>

          <div className="flex items-center gap-1 bg-[#0A0E1A]/80 backdrop-blur-md p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setLayoutMode('gallery')}
              className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
                layoutMode === 'gallery' ? 'bg-[#00E5C7] text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Gallery
            </button>
            <button
              onClick={() => setLayoutMode('speaker')}
              className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
                layoutMode === 'speaker' ? 'bg-[#00E5C7] text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" /> Speaker
            </button>
          </div>
        </div>

        {/* Video Grid (Daily Participants + Screen Share Tile) */}
        <div className="flex-1 p-4 md:p-6 flex flex-col items-center justify-center overflow-hidden">
          
          {(() => {
            const screenShareParticipant = dailyParticipants.find(p => p.tracks?.screenVideo?.persistentTrack || (p.tracks?.screenVideo?.state === 'playable' && p.tracks?.screenVideo?.track));
            const screenTrack = screenShareParticipant?.tracks?.screenVideo?.persistentTrack || screenShareParticipant?.tracks?.screenVideo?.track;

            if (screenShareParticipant && screenTrack) {
              return (
                <div className="w-full h-full max-w-6xl flex flex-col gap-3 items-center justify-center overflow-hidden">
                  {/* Hero Screen Share Tile */}
                  <div className="relative w-full flex-1 max-h-[70vh] bg-[#0A0E1A]/95 rounded-2xl overflow-hidden border border-[#00E5C7]/40 shadow-2xl flex items-center justify-center">
                    <video
                      autoPlay
                      playsInline
                      ref={(el) => {
                        if (el && screenTrack && (!el.srcObject || el.srcObject.getVideoTracks()[0] !== screenTrack)) {
                          el.srcObject = new MediaStream([screenTrack]);
                        }
                      }}
                      className="w-full h-full object-contain bg-black"
                    />
                    <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-cyan-500/30 text-xs font-bold text-cyan-200 flex items-center gap-2 shadow-lg">
                      <Monitor className="w-4 h-4 text-[#00E5C7]" />
                      <span>{screenShareParticipant.local ? 'You are presenting' : `${screenShareParticipant.user_name || 'Participant'}'s Shared Screen`}</span>
                    </div>
                  </div>

                  {/* Camera Thumbnails Strip */}
                  <div className="w-full flex items-center justify-center gap-3 overflow-x-auto py-1">
                    {dailyParticipants.map((p) => {
                      const videoTrack = p.tracks?.video?.persistentTrack;
                      const isLocal = p.local;
                      return (
                        <div key={p.session_id} className="relative w-36 h-24 bg-[#0A0E1A]/90 backdrop-blur-md rounded-xl overflow-hidden border border-white/10 flex-shrink-0 flex items-center justify-center">
                          {p.video && videoTrack ? (
                            <video
                              autoPlay
                              playsInline
                              muted={isLocal}
                              ref={(el) => {
                                if (el && videoTrack && (!el.srcObject || el.srcObject.getVideoTracks()[0] !== videoTrack)) {
                                  el.srcObject = new MediaStream([videoTrack]);
                                }
                              }}
                              className={`w-full h-full object-cover ${isLocal ? 'transform -scale-x-100' : ''}`}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-indigo-950 flex items-center justify-center text-xs font-bold text-indigo-200">
                              {p.user_name ? p.user_name.charAt(0).toUpperCase() : 'P'}
                            </div>
                          )}
                          <div className="absolute bottom-1 left-1 bg-slate-950/80 px-1.5 py-0.5 rounded text-[9px] font-bold text-white truncate max-w-[120px]">
                            {p.user_name || 'Participant'} {isLocal ? '(You)' : ''}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }

            const getGridClass = (count) => {
              if (count <= 1) return 'grid-cols-1 max-w-2xl';
              if (count === 2) return 'grid-cols-1 md:grid-cols-2 max-w-5xl';
              if (count === 3) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl';
              return 'grid-cols-2 lg:grid-cols-2 max-w-5xl';
            };

            return (
              <div className={`w-full h-full grid gap-4 items-center justify-center ${getGridClass(dailyParticipants.length)}`}>
                
                {dailyParticipants.length === 0 ? (
                  <div className="relative w-full h-full min-h-[260px] max-h-[360px] bg-[#0A0E1A]/90 backdrop-blur-md rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                      <img src={currentUser.avatar} className="w-24 h-24 rounded-full ring-4 ring-indigo-500/40 object-cover" alt="" />
                      <span className="text-sm font-bold text-white">{currentUser.name} (You)</span>
                    </div>
                  </div>
                ) : (
                  dailyParticipants.map((p) => {
                    const videoTrack = p.tracks?.video?.persistentTrack;
                    const isLocal = p.local;

                    return (
                      <div
                        key={p.session_id}
                        className={`relative w-full h-full min-h-[260px] max-h-[360px] bg-[#0A0E1A]/90 backdrop-blur-md rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center group ${
                          !p.audio ? '' : 'ring-2 ring-[#00E5C7] shadow-cyan-500/30'
                        }`}
                      >
                        {p.video && videoTrack ? (
                          <video
                            autoPlay
                            playsInline
                            muted={isLocal}
                            ref={(el) => {
                              if (el && videoTrack && (!el.srcObject || el.srcObject.getVideoTracks()[0] !== videoTrack)) {
                                el.srcObject = new MediaStream([videoTrack]);
                              }
                            }}
                            className={`w-full h-full object-cover ${isLocal ? 'transform -scale-x-100' : ''}`}
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-24 h-24 rounded-full bg-indigo-950 border border-indigo-500/30 flex items-center justify-center text-3xl font-bold text-indigo-200">
                              {p.user_name ? p.user_name.charAt(0).toUpperCase() : 'P'}
                            </div>
                            <span className="text-sm font-bold text-white">{p.user_name || 'Participant'} {isLocal ? '(You)' : ''}</span>
                          </div>
                        )}

                        {/* Name & Language Badge */}
                        <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-xl border border-white/10 text-xs font-bold text-white flex items-center gap-2">
                          <span>{p.user_name || 'Participant'} {isLocal ? '(You)' : ''}</span>
                          <span className="text-[10px] bg-[#00E5C7]/20 text-[#00E5C7] px-1.5 py-0.5 rounded font-mono uppercase font-bold">
                            {isLocal ? selectedLanguage : 'ja'}
                          </span>
                          {!p.audio && <MicOff className="w-3.5 h-3.5 text-rose-400" />}
                        </div>
                      </div>
                    );
                  })
                )}

              </div>
            );
          })()}

        </div>

        {/* Real-time Dual Captions Overlay */}
        {showCaptions && (
          <DualCaptionsOverlay
            currentCaption={currentCaption}
            targetLangCode={selectedLanguage}
            languages={languages}
            userSettings={userSettings}
          />
        )}

        {/* Bottom Control Bar */}
        <div className="h-20 bg-[#0A0E1A]/95 border-t border-white/10 px-4 sm:px-8 flex items-center justify-between z-30 shadow-2xl">
          
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggleMute}
              className={`p-3 rounded-2xl transition-all shadow-lg ${
                isMuted
                  ? 'bg-rose-500 text-white shadow-rose-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-white border border-white/10'
              }`}
              title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-[#00E5C7]" />}
            </button>

            <button
              onClick={toggleVideo}
              className={`p-3 rounded-2xl transition-all shadow-lg ${
                !isVideoOn
                  ? 'bg-rose-500 text-white shadow-rose-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-white border border-white/10'
              }`}
              title={isVideoOn ? 'Turn Camera Off' : 'Turn Camera On'}
            >
              {isVideoOn ? <VideoIcon className="w-5 h-5 text-[#00E5C7]" /> : <VideoOff className="w-5 h-5" />}
            </button>

            <button
              onClick={toggleScreenShare}
              className={`p-3 rounded-2xl transition-all shadow-lg ${
                isScreenSharing
                  ? 'bg-indigo-600 text-white shadow-indigo-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10'
              }`}
              title="Share Screen"
            >
              <Monitor className="w-5 h-5" />
            </button>

            <button
              onClick={toggleRecording}
              className={`p-3 rounded-2xl transition-all shadow-lg ${
                isRecording
                  ? 'bg-red-600 text-white shadow-red-500/30 animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10'
              }`}
              title={isRecording ? 'Stop Recording' : 'Start Recording Call'}
            >
              <Disc className={`w-5 h-5 ${isRecording ? 'text-white' : 'text-rose-400'}`} />
            </button>
          </div>


          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowCaptions(!showCaptions)}
              className={`px-3.5 py-2.5 rounded-2xl font-semibold text-xs flex items-center gap-2 transition-all border ${
                showCaptions
                  ? 'bg-[#00E5C7]/20 text-[#00E5C7] border-[#00E5C7]/40 shadow-cyan-500/10'
                  : 'bg-slate-800 text-slate-400 border-white/10 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4 text-[#00E5C7]" />
              <span className="hidden sm:inline">Dual Captions</span>
            </button>

            <div className="hidden md:flex items-center gap-1 bg-slate-900 p-1.5 rounded-2xl border border-white/10">
              {['👏', '❤️', '🎉', '👍', '💡'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => triggerEmojiReaction(emoji)}
                  className="hover:scale-125 transition-transform p-1 text-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsPollsOpen(true)}
              className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 transition-all"
              title="In-call Polls"
            >
              <BarChart2 className="w-5 h-5 text-indigo-400" />
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsHostControlsOpen(true)}
              className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-[#00E5C7] border border-[#00E5C7]/30 transition-all shadow-md"
              title="Host Controls"
            >
              <Shield className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`p-3 rounded-2xl transition-all shadow-lg relative ${
                isChatOpen
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10'
              }`}
              title="Translated Chat"
            >
              <MessageSquare className="w-5 h-5" />
              {chatMessages.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#00E5C7] text-slate-950 font-bold text-[9px] rounded-full flex items-center justify-center">
                  {chatMessages.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                socket.emit('leave-session');
                onLeaveCall();
              }}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all"
            >
              <PhoneOff className="w-4 h-4" />
              <span className="hidden sm:inline">End Call</span>
            </button>
          </div>

        </div>

      </div>

      <InCallChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={chatMessages}
        onSendMessage={handleSendChatMessage}
        selectedLanguage={selectedLanguage}
        languages={languages}
      />

      <HostControlsModal
        isOpen={isHostControlsOpen}
        onClose={() => setIsHostControlsOpen(false)}
        participants={dailyParticipants.map(p => ({ socketId: p.session_id, name: p.user_name || 'Participant' }))}
        waitingRoomList={waitingRoomList}
        roomSettings={roomSettings}
        onUpdateSettings={(newSettings) => {
          setRoomSettings(prev => ({ ...prev, ...newSettings }));
          socket.emit('update-room-settings', newSettings);
        }}
        onMuteAll={() => socket.emit('host-mute-all')}
        onAdmitParticipant={(targetSocketId) => socket.emit('admit-participant', { targetSocketId })}
        onRemoveParticipant={(targetSocketId) => socket.emit('host-remove-participant', { targetSocketId })}
      />

      <PollsModal
        isOpen={isPollsOpen}
        onClose={() => setIsPollsOpen(false)}
        polls={polls}
        onCreatePoll={({ question, options }) => socket.emit('create-poll', { question, options })}
        onVotePoll={(pollId, optionId) => socket.emit('vote-poll', { pollId, optionId })}
      />

      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0A0E1A] border border-white/10 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold text-white">Scan QR Code to Join</h3>
            <p className="text-xs text-slate-400">Scan this code with a mobile camera to open the call join link directly.</p>
            
            <div className="p-4 bg-white rounded-2xl inline-block shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(shareableJoinUrl)}`}
                alt="Call QR Code"
                className="w-44 h-44 mx-auto"
              />
            </div>

            <p className="text-[11px] font-mono text-cyan-300 break-all bg-slate-900/80 p-2 rounded-xl border border-white/5">
              {shareableJoinUrl}
            </p>

            <button
              onClick={handleCopyLink}
              className="w-full py-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30 text-xs font-bold transition-all"
            >
              {copiedLink ? 'Copied Link!' : 'Copy Join Link'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
