import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Video as VideoIcon, VideoOff, Monitor, PhoneOff, 
  MessageSquare, Shield, BarChart2, Sparkles, Users, LayoutGrid, User, Copy, Check, Share2, CameraOff, AlertCircle
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
import { WebRTCManager } from '../../services/webrtc';
import { SpeechTranslationService } from '../../services/speechTranslation';
import { getSocket } from '../../services/socket';

export default function VideoRoom({ roomCode, currentUser, selectedLanguage, setSelectedLanguage, languages, userSettings, onLeaveCall }) {
  const socket = getSocket();

  // Call & Media States
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isBlurBackground, setIsBlurBackground] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);
  const [layoutMode, setLayoutMode] = useState('gallery');

  // Permission & Stream States
  const [permissionErrorType, setPermissionErrorType] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [participants, setParticipants] = useState([]);

  // Copy & Share Link State
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

  const localVideoRef = useRef(null);
  const webrtcManagerRef = useRef(null);
  const speechServiceRef = useRef(null);
  const audioMixerRef = useRef(null);
  const captionSyncRef = useRef(new CaptionSynchronizer(2500));

  const shareableJoinUrl = `${window.location.origin}/meet/${roomCode}`;

  // 1. MEDIA PERMISSIONS & getUserMedia
  const requestMediaPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      setPermissionErrorType(null);

      const mixer = new AudioMixer();
      audioMixerRef.current = mixer;
      mixer.initialize(stream);
    } catch (err) {
      console.warn('[getUserMedia Full Media Grant Failed]', err);

      try {
        const audioOnlyStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        setLocalStream(audioOnlyStream);
        setIsVideoOn(false);
        setPermissionErrorType(null);

        const mixer = new AudioMixer();
        audioMixerRef.current = mixer;
        mixer.initialize(audioOnlyStream);
      } catch (audioErr) {
        const errName = audioErr.name || err.name || 'NotAllowedError';
        setPermissionErrorType(errName);
      }
    }
  };

  useEffect(() => {
    requestMediaPermissions();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (audioMixerRef.current) {
        audioMixerRef.current.stop();
      }
    };
  }, []);

  // 2. DEDICATED STREAM ATTACHMENT EFFECT FOR LOCAL SELF-VIEW VIDEO
  useEffect(() => {
    if (localVideoRef.current && localStream && isVideoOn) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(err => console.warn('[Local Video Play Exception]', err));
      console.log('[LinguaVersa Media] Local stream successfully attached to video element:', localStream.id);
    }
  }, [localStream, isVideoOn]);

  // Callback Ref to handle video node mount immediately
  const handleLocalVideoRef = (el) => {
    localVideoRef.current = el;
    if (el && localStream && isVideoOn && el.srcObject !== localStream) {
      el.srcObject = localStream;
      el.play().catch(() => {});
      console.log('[LinguaVersa Media] Local stream attached via ref callback:', localStream.id);
    }
  };

  // 3. SOCKET ROOM JOIN & MULTI-PEER WEBRTC
  useEffect(() => {
    const webrtc = new WebRTCManager(
      socket,
      localStream,
      (remoteSocketId, remoteStream) => {
        setRemoteStreams(prev => {
          const next = new Map(prev);
          next.set(remoteSocketId, remoteStream);
          return next;
        });
      },
      (remoteSocketId) => {
        setRemoteStreams(prev => {
          const next = new Map(prev);
          next.delete(remoteSocketId);
          return next;
        });
      }
    );
    webrtcManagerRef.current = webrtc;

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

    socket.on('user-joined', ({ socketId }) => {
      webrtc.initiateOffer(socketId);
    });

    socket.on('room-participants-update', (list) => {
      if (list) setParticipants(list);
    });

    socket.on('waiting-room-update', (queue) => {
      setWaitingRoomList(queue);
    });

    socket.on('live-caption-chunk', (caption) => {
      const synchronized = captionSyncRef.current.pushChunk(caption);
      setCurrentCaption(synchronized);
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
      setIsMuted(true);
    });

    socket.on('removed-by-host', () => {
      alert('You have been removed from the meeting by the host.');
      onLeaveCall();
    });

    return () => {
      webrtc.destroy();
      speechService.stop();
      socket.off('user-joined');
      socket.off('room-participants-update');
      socket.off('waiting-room-update');
      socket.off('live-caption-chunk');
      socket.off('new-chat-message');
      socket.off('new-reaction');
      socket.off('poll-created');
      socket.off('poll-updated');
      socket.off('host-muted-you');
      socket.off('removed-by-host');
    };
  }, [roomCode, localStream]);

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

  // Toggle Mute / Camera Track
  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
    }
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !isVideoOn;
      });
    }
    setIsVideoOn(!isVideoOn);
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

  // Optimistic Chat Handler
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
      
      {/* Voice Amplitude Reactive Particle Background */}
      <VoiceParticles isSpeaking={!isMuted} amplitude={volumeLevel} />
      <SpeechCanvas3D isSpeaking={!isMuted} frequencyData={frequencyData} />

      {/* Floating Emoji Reactions Canvas */}
      <EmojiReactionsOverlay floatingReactions={floatingReactions} />

      {/* Main Video Call Content Area */}
      <div className="flex-1 flex flex-col relative h-full overflow-hidden z-10">
        
        {/* Top Floating Status Bar */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-3 bg-[#0A0E1A]/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 shadow-lg">
          <div className="flex items-center gap-2">
            <ChatBotOrb isProcessing={!isMuted} />
            <span className="text-xs font-bold text-white tracking-wide">{roomCode}</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <Users className="w-3.5 h-3.5 text-[#00E5C7]" />
            <span>{participants.length || 1} Connected</span>
          </div>
          <span className="text-slate-600">|</span>
          <AIStatusIndicator />
        </div>

        {/* Top Right Share & Layout Bar */}
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

        {/* Explicit Permission Banner */}
        <PermissionBanner
          errorType={permissionErrorType}
          onRetry={requestMediaPermissions}
        />

        {/* Video Grid */}
        <div className="flex-1 p-4 md:p-6 flex items-center justify-center">
          
          <div className={`w-full h-full max-w-6xl grid gap-4 items-center justify-center ${
            remoteStreams.size === 0 ? 'grid-cols-1 max-w-2xl' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2'
          }`}>
            
            {/* LOCAL PARTICIPANT VIDEO TILE ("YOU") */}
            <div className={`relative w-full h-full min-h-[260px] max-h-[360px] bg-[#0A0E1A]/90 backdrop-blur-md rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center group ${
              !isMuted ? 'ring-2 ring-[#00E5C7] shadow-cyan-500/30' : ''
            }`}>
              {isVideoOn && localStream ? (
                <video
                  ref={handleLocalVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover transform -scale-x-100 transition-all ${
                    isBlurBackground ? 'blur-md scale-105' : ''
                  }`}
                />
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <img src={currentUser.avatar} className="w-24 h-24 rounded-full ring-4 ring-indigo-500/40 object-cover" alt="" />
                  <span className="text-sm font-bold text-white">{currentUser.name} (You)</span>
                </div>
              )}

              <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-xl border border-white/10 text-xs font-bold text-white flex items-center gap-2">
                <span>{currentUser.name} (You)</span>
                <span className="text-[10px] bg-[#00E5C7]/20 text-[#00E5C7] px-1.5 py-0.5 rounded font-mono uppercase font-bold">
                  {selectedLanguage}
                </span>
                {isMuted && <MicOff className="w-3.5 h-3.5 text-rose-400" />}
              </div>

              {isScreenSharing && (
                <div className="absolute inset-0 bg-indigo-950/90 flex flex-col items-center justify-center text-white space-y-2">
                  <Monitor className="w-12 h-12 text-[#00E5C7] animate-bounce" />
                  <span className="font-bold text-sm">You are sharing your screen</span>
                </div>
              )}
            </div>

            {/* REAL REMOTE WEBRTC PARTICIPANTS */}
            {Array.from(remoteStreams.entries()).map(([remoteSocketId, stream]) => {
              const peerInfo = participants.find(p => p.socketId === remoteSocketId) || { name: 'Peer', spokenLanguage: 'ja' };

              return (
                <div 
                  key={remoteSocketId}
                  className="relative w-full h-full min-h-[260px] max-h-[360px] bg-[#0A0E1A]/90 backdrop-blur-md rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center group"
                >
                  <video
                    autoPlay
                    playsInline
                    ref={(el) => {
                      if (el && el.srcObject !== stream) {
                        el.srcObject = stream;
                      }
                    }}
                    className="w-full h-full object-cover"
                  />

                  <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-xl border border-white/10 text-xs font-bold text-white flex items-center gap-2">
                    <span>{peerInfo.name}</span>
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-mono uppercase font-bold">
                      {peerInfo.spokenLanguage || 'ja'}
                    </span>
                  </div>
                </div>
              );
            })}

          </div>

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
              onClick={() => setIsScreenSharing(!isScreenSharing)}
              className={`p-3 rounded-2xl transition-all shadow-lg ${
                isScreenSharing
                  ? 'bg-indigo-600 text-white shadow-indigo-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10'
              }`}
              title="Share Screen"
            >
              <Monitor className="w-5 h-5" />
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
              onClick={onLeaveCall}
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
        participants={participants}
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

    </div>
  );
}
