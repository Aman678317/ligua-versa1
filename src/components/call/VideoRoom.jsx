import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic, MicOff, Video as VideoIcon, VideoOff, Monitor, PhoneOff,
  MessageSquare, Shield, BarChart2, Sparkles, Users, LayoutGrid, User, Copy, Check, Share2, AlertCircle, Disc, Wifi, WifiOff
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
import { WebRTCManager } from '../../services/webrtc';
import { getSocket } from '../../services/socket';

// ─────────────────────────────────────────────────────────────────────────────
// VideoRoom – Native WebRTC multi-peer video call component
// Uses Socket.IO signaling + WebRTC peer mesh (no Daily.co required)
// ─────────────────────────────────────────────────────────────────────────────
export default function VideoRoom({ roomCode, currentUser, selectedLanguage, setSelectedLanguage, languages, userSettings, onLeaveCall }) {
  const socket = getSocket();

  // ── Media & Control States ────────────────────────────────────────────────
  const [isMuted, setIsMuted]               = useState(false);
  const [isVideoOn, setIsVideoOn]           = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showCaptions, setShowCaptions]     = useState(true);
  const [layoutMode, setLayoutMode]         = useState('gallery');

  // ── Local Media Stream ───────────────────────────────────────────────────
  const [localStream, setLocalStream]       = useState(null);
  const localStreamRef                      = useRef(null);

  // ── Remote Peers (WebRTC) ────────────────────────────────────────────────
  // Map: socketId → { stream, name, spokenLanguage }
  const [remotePeers, setRemotePeers]       = useState({});
  const webrtcManagerRef                    = useRef(null);

  // ── Socket Participants (for name/lang metadata) ─────────────────────────
  const [socketParticipants, setSocketParticipants] = useState([]);

  // ── UI State ──────────────────────────────────────────────────────────────
  const [copiedLink, setCopiedLink]         = useState(false);
  const [isChatOpen, setIsChatOpen]         = useState(false);
  const [isHostControlsOpen, setIsHostControlsOpen] = useState(false);
  const [isPollsOpen, setIsPollsOpen]       = useState(false);
  const [showQrModal, setShowQrModal]       = useState(false);

  // ── Audio Visualiser State ────────────────────────────────────────────────
  const [volumeLevel, setVolumeLevel]       = useState(0);
  const [frequencyData, setFrequencyData]   = useState([]);
  const audioMixerRef                       = useRef(null);

  // ── Chat / Polls / Reactions ──────────────────────────────────────────────
  const [chatMessages, setChatMessages]     = useState([]);
  const [polls, setPolls]                   = useState([]);
  const [floatingReactions, setFloatingReactions] = useState([]);

  // ── Waiting Room & Room Settings ─────────────────────────────────────────
  const [waitingRoomList, setWaitingRoomList] = useState([]);
  const [roomSettings, setRoomSettings]     = useState({ isLocked: false, waitingRoomEnabled: false });

  // ── Connection Status ─────────────────────────────────────────────────────
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [peerDisconnectedBanner, setPeerDisconnectedBanner] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // 'connecting' | 'connected' | 'failed'

  // ── Recording ─────────────────────────────────────────────────────────────
  const [isRecording, setIsRecording]       = useState(false);
  const [recorderName, setRecorderName]     = useState('');
  const [cloudRecordingId, setCloudRecordingId] = useState(null);
  const mediaRecorderRef                    = useRef(null);
  const recordedChunksRef                   = useRef([]);

  // ── AI Captions ──────────────────────────────────────────────────────────
  const [translatingSpeakers, setTranslatingSpeakers] = useState({});
  const [activeDubbingSpeaker, setActiveDubbingSpeaker] = useState(null);
  const [currentCaption, setCurrentCaption] = useState({
    id: 'c-init',
    speakerId: 'system',
    speakerName: 'LinguaVersa',
    sourceLang: 'en',
    targetLang: selectedLanguage,
    originalText: 'Real-time speech translation active. Speak into your mic!',
    translatedText: 'リアルタイム翻訳が有効です！',
    timestamp: new Date().toISOString(),
    metrics: { sttLatencyMs: 120, nmtLatencyMs: 210, ttsLatencyMs: 260, totalLatencyMs: 590 }
  });
  const captionSyncRef = useRef(new CaptionSynchronizer());
  const speechServiceRef = useRef(null);

  const [isHost, setIsHost] = useState(false);

  const shareableJoinUrl = `${window.location.origin}/join/${roomCode}`;

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1 — Capture local camera + mic
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let activeStream = null;

    const startCamera = async () => {
      try {
        // Try video + audio first
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
          .catch(() => navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null));

        if (stream) {
          activeStream = stream;
          localStreamRef.current = stream;
          setLocalStream(stream);

          const mixer = new AudioMixer();
          audioMixerRef.current = mixer;
          mixer.initialize(stream);
        }
      } catch (err) {
        console.warn('[Camera] getUserMedia failed:', err);
      }
    };

    startCamera();

    return () => {
      if (activeStream) activeStream.getTracks().forEach(t => t.stop());
      if (audioMixerRef.current) audioMixerRef.current.stop();
    };
  }, []);

  // Audio spectrum loop
  useEffect(() => {
    const interval = setInterval(() => {
      if (audioMixerRef.current) {
        setVolumeLevel(audioMixerRef.current.getVolumeLevel());
        setFrequencyData(audioMixerRef.current.getFrequencySpectrum());
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2 — Remote stream callbacks for WebRTCManager
  // ─────────────────────────────────────────────────────────────────────────
  const handleRemoteStreamAdded = useCallback((peerId, stream) => {
    console.log('[VideoRoom] Remote stream added for peer:', peerId);
    setRemotePeers(prev => ({
      ...prev,
      [peerId]: { ...(prev[peerId] || {}), stream }
    }));
    setConnectionStatus('connected');
  }, []);

  const handleRemoteStreamRemoved = useCallback((peerId) => {
    console.log('[VideoRoom] Remote stream removed for peer:', peerId);
    setRemotePeers(prev => {
      const next = { ...prev };
      delete next[peerId];
      return next;
    });
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 3 — Socket join, WebRTC mesh, and all realtime events
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Validate session host status
    fetch(`/api/calls/${roomCode}`).then(r => r.json()).then(data => {
      if (data.session?.hostId && currentUser?.id) {
        setIsHost(data.session.hostId === currentUser.id);
      }
    }).catch(() => {});

    // ── Speech translation service ────────────────────────────────────────
    const speechService = new SpeechTranslationService(
      socket, selectedLanguage, selectedLanguage, currentUser.name
    );
    speechServiceRef.current = speechService;

    const startSpeech = async () => {
      const stream = localStreamRef.current
        || await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
      if (stream) speechService.start(stream);
      else speechService.start();
    };
    startSpeech();

    // ── Announce ourselves to the room ───────────────────────────────────
    socket.emit('join-room', {
      roomCode,
      user: {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar,
        isHost,
        spokenLanguage: selectedLanguage
      }
    });

    // ── WebRTC Manager ────────────────────────────────────────────────────
    // We init the manager lazily once we have a local stream; if stream isn't
    // ready yet we create it with null and update it once ready.
    const rtcManager = new WebRTCManager(
      socket,
      localStreamRef.current,
      handleRemoteStreamAdded,
      handleRemoteStreamRemoved
    );
    webrtcManagerRef.current = rtcManager;

    // ── When the server tells us who's already in the room ────────────────
    // We (the newcomer) initiate offers to every existing peer.
    socket.on('existing-peers', ({ peerSocketIds }) => {
      console.log('[VideoRoom] Existing peers in room:', peerSocketIds);
      peerSocketIds.forEach(peerId => {
        rtcManager.initiateOffer(peerId);
      });
      if (peerSocketIds.length === 0) {
        setConnectionStatus('connected'); // alone in room
      }
    });

    // ── When a NEW peer joins AFTER us, they initiate the offer to us.
    // We just need to update our participant metadata.
    socket.on('user-joined', ({ socketId, user }) => {
      console.log('[VideoRoom] user-joined:', socketId, user?.name);
      setRemotePeers(prev => ({
        ...prev,
        [socketId]: { ...(prev[socketId] || {}), name: user?.name || 'Participant', spokenLanguage: user?.spokenLanguage || 'en' }
      }));
    });

    // ── Room participants metadata update ─────────────────────────────────
    socket.on('room-participants-update', (participants) => {
      setSocketParticipants(participants);
      // Sync name/lang metadata into remotePeers
      participants.forEach(p => {
        if (p.socketId !== socket.id) {
          setRemotePeers(prev => ({
            ...prev,
            [p.socketId]: { ...(prev[p.socketId] || {}), name: p.name, spokenLanguage: p.spokenLanguage }
          }));
        }
      });
    });

    // ── Peer left cleanup ─────────────────────────────────────────────────
    const handlePeerLeft = ({ socketId }) => {
      rtcManager.closePeerConnection(socketId);
      setRemotePeers(prev => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
      setPeerDisconnectedBanner(null);
    };

    socket.on('peer-left', handlePeerLeft);

    socket.on('peer-disconnected', ({ socketId, user }) => {
      setPeerDisconnectedBanner(user?.name || 'Participant');
    });

    socket.on('peer-reconnected', ({ socketId }) => {
      setPeerDisconnectedBanner(null);
    });

    // ── AI captions ───────────────────────────────────────────────────────
    socket.on('speaker-translating-status', ({ speakerId, isTranslating }) => {
      setTranslatingSpeakers(prev => ({ ...prev, [speakerId]: isTranslating }));
    });

    socket.on('live-caption-chunk', (caption) => {
      const synchronized = captionSyncRef.current.pushChunk(caption);
      setCurrentCaption(synchronized);

      if (caption.audioBase64 && caption.speakerId !== socket.id) {
        try {
          setActiveDubbingSpeaker(caption.speakerId);
          const snd = new Audio(`data:audio/${caption.audioFormat || 'mp3'};base64,${caption.audioBase64}`);
          snd.volume = 0.95;
          const restore = () => setActiveDubbingSpeaker(null);
          snd.onended = restore;
          snd.onerror = restore;
          snd.play().catch(restore);
        } catch (e) {}
      }
    });

    // ── Chat ──────────────────────────────────────────────────────────────
    socket.on('new-chat-message', (msg) => setChatMessages(prev => [...prev, msg]));

    // ── Reactions ─────────────────────────────────────────────────────────
    socket.on('new-reaction', ({ emoji }) => {
      const obj = {
        id: `react-${Date.now()}-${Math.random()}`,
        emoji,
        x: Math.floor(Math.random() * 80) + 10,
        rotate: Math.floor(Math.random() * 40) - 20
      };
      setFloatingReactions(prev => [...prev, obj]);
      setTimeout(() => {
        setFloatingReactions(prev => prev.filter(r => r.id !== obj.id));
      }, 4000);
    });

    // ── Polls ─────────────────────────────────────────────────────────────
    socket.on('poll-created', (poll) => setPolls(prev => [...prev, poll]));
    socket.on('poll-updated', (p) => setPolls(prev => prev.map(x => x.id === p.id ? p : x)));

    // ── Host controls ─────────────────────────────────────────────────────
    socket.on('host-muted-you', () => {
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = false; });
      }
      setIsMuted(true);
    });

    socket.on('removed-by-host', () => {
      alert('You have been removed from the meeting by the host.');
      onLeaveCall();
    });

    socket.on('waiting-room-update', (list) => setWaitingRoomList(list));
    socket.on('room-settings-updated', (s) => setRoomSettings(s));

    // ── Recording banner ──────────────────────────────────────────────────
    socket.on('recording-status-update', ({ isRecording: r, recorderName: rn }) => {
      setIsRecording(r);
      setRecorderName(rn || 'Host');
    });

    // ── Reconnect handling ────────────────────────────────────────────────
    socket.on('disconnect', () => {
      setIsReconnecting(true);
      setConnectionStatus('connecting');
    });

    socket.on('connect', () => {
      setIsReconnecting(false);
      socket.emit('rejoin-session', {
        roomCode,
        user: { name: currentUser.name, spokenLanguage: selectedLanguage },
        previousSocketId: socket.id
      });
    });

    // ─────────────────────────────────────────────────────────────────────
    return () => {
      speechService.stop();
      socket.emit('leave-session');
      rtcManager.destroy();

      socket.off('existing-peers');
      socket.off('user-joined');
      socket.off('room-participants-update');
      socket.off('peer-left');
      socket.off('peer-disconnected');
      socket.off('peer-reconnected');
      socket.off('speaker-translating-status');
      socket.off('live-caption-chunk');
      socket.off('new-chat-message');
      socket.off('new-reaction');
      socket.off('poll-created');
      socket.off('poll-updated');
      socket.off('host-muted-you');
      socket.off('removed-by-host');
      socket.off('waiting-room-update');
      socket.off('room-settings-updated');
      socket.off('recording-status-update');
      socket.off('disconnect');
      socket.off('connect');
    };
  }, [roomCode]);

  // Once localStream arrives, update the WebRTC manager so tracks flow to peers
  useEffect(() => {
    if (localStream && webrtcManagerRef.current) {
      webrtcManagerRef.current.updateLocalStream(localStream);
    }
  }, [localStream]);

  // ─────────────────────────────────────────────────────────────────────────
  // Controls
  // ─────────────────────────────────────────────────────────────────────────
  const toggleMute = () => {
    const next = !isMuted;
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !next; });
    }
    setIsMuted(next);
  };

  const toggleVideo = () => {
    const next = !isVideoOn;
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = next; });
    }
    setIsVideoOn(next);
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Restore camera tracks
      if (localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        if (videoTrack && webrtcManagerRef.current) {
          webrtcManagerRef.current.peerConnections.forEach(pc => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video');
            if (sender) sender.replaceTrack(videoTrack).catch(() => {});
          });
        }
      }
      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        const screenTrack = screenStream.getVideoTracks()[0];

        // Replace video track in all peer connections
        if (webrtcManagerRef.current) {
          webrtcManagerRef.current.peerConnections.forEach(pc => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video');
            if (sender) sender.replaceTrack(screenTrack).catch(() => {});
          });
        }

        screenTrack.onended = () => {
          setIsScreenSharing(false);
          // Restore camera
          const camTrack = localStreamRef.current?.getVideoTracks()[0];
          if (camTrack && webrtcManagerRef.current) {
            webrtcManagerRef.current.peerConnections.forEach(pc => {
              const sender = pc.getSenders().find(s => s.track?.kind === 'video');
              if (sender) sender.replaceTrack(camTrack).catch(() => {});
            });
          }
        };

        setIsScreenSharing(true);
      } catch (err) {
        console.warn('[ScreenShare] User cancelled or error:', err);
        setIsScreenSharing(false);
      }
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      socket.emit('recording-status-changed', { isRecording: false });
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true }).catch(() => null)
          || localStreamRef.current;

        if (!stream) { alert('Recording requires camera/screen permissions.'); return; }

        recordedChunksRef.current = [];
        const mr = new MediaRecorder(stream, { mimeType: 'video/webm' });
        mediaRecorderRef.current = mr;
        mr.ondataavailable = (e) => { if (e.data?.size > 0) recordedChunksRef.current.push(e.data); };
        mr.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = `LinguaVersa-${roomCode}-${Date.now()}.webm`; a.click();
        };
        mr.start(1000);
        setIsRecording(true);
        socket.emit('recording-status-changed', { isRecording: true, recorderName: currentUser.name });
      } catch (err) {
        console.warn('[Recording] Error:', err);
      }
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableJoinUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`Join my LinguaVersa call!\nLink: ${shareableJoinUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const triggerEmojiReaction = (emoji) => socket.emit('send-reaction', { emoji });

  const handleSendChatMessage = ({ text, originalLang, file }) => {
    const optimistic = {
      id: `opt-${Date.now()}`, senderId: socket.id, senderName: currentUser.name,
      senderAvatar: currentUser.avatar, text, translatedText: text,
      originalLang: originalLang || selectedLanguage, targetLang: selectedLanguage, file,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages(prev => [...prev, optimistic]);
    socket.emit('send-chat-message', { text, originalLang: selectedLanguage, file });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Build display participant list
  // ─────────────────────────────────────────────────────────────────────────
  const localVideoTrack = localStream?.getVideoTracks()[0] || null;
  const isLocalVideoActive = isVideoOn && Boolean(localVideoTrack);

  const allParticipants = [
    // Local tile first
    {
      id: socket.id || currentUser.id,
      name: currentUser.name || 'You',
      isLocal: true,
      stream: localStream,
      videoTrack: localVideoTrack,
      isVideoActive: isLocalVideoActive,
      audio: !isMuted,
      spokenLanguage: selectedLanguage
    },
    // Remote peers
    ...Object.entries(remotePeers).map(([peerId, peer]) => {
      const videoTrack = peer.stream?.getVideoTracks()[0] || null;
      return {
        id: peerId,
        name: peer.name || 'Participant',
        isLocal: false,
        stream: peer.stream || null,
        videoTrack,
        isVideoActive: Boolean(videoTrack && peer.stream?.active !== false),
        audio: true,
        spokenLanguage: peer.spokenLanguage || 'en'
      };
    })
  ];

  const getGridClass = (count) => {
    if (count <= 1) return 'grid-cols-1 max-w-2xl';
    if (count === 2) return 'grid-cols-1 md:grid-cols-2 max-w-5xl';
    if (count <= 4) return 'grid-cols-2 max-w-5xl';
    if (count <= 6) return 'grid-cols-2 md:grid-cols-3 max-w-6xl';
    if (count <= 9) return 'grid-cols-3 max-w-6xl';
    return 'grid-cols-3 md:grid-cols-4 max-w-7xl';
  };

  const totalCount = allParticipants.length;
  const remoteCount = totalCount - 1;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-[calc(100vh-4rem)] bg-[#05060B] flex overflow-hidden selection:bg-none">

      {/* Ambient audio/voice background visuals */}
      <VoiceParticles isSpeaking={!isMuted} amplitude={volumeLevel} />
      <SpeechCanvas3D isSpeaking={!isMuted} frequencyData={frequencyData} />

      {/* Floating Emoji Reactions */}
      <EmojiReactionsOverlay floatingReactions={floatingReactions} />

      {/* ── Status Banners ─────────────────────────────────────────────────── */}
      {isReconnecting && (
        <div className="absolute top-0 inset-x-0 z-50 bg-amber-600/90 text-slate-950 px-4 py-2 text-xs font-extrabold text-center flex items-center justify-center gap-2 shadow-lg backdrop-blur-md">
          <div className="w-3 h-3 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
          <span>Connection lost – reconnecting…</span>
        </div>
      )}

      {peerDisconnectedBanner && !isReconnecting && (
        <div className="absolute top-0 inset-x-0 z-50 bg-cyan-600/90 text-white px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-2 shadow-lg backdrop-blur-md">
          <AlertCircle className="w-4 h-4 text-cyan-200 animate-pulse" />
          <span>{peerDisconnectedBanner} temporarily lost connection (60 s grace period)…</span>
        </div>
      )}

      {isRecording && (
        <div className="absolute top-0 inset-x-0 z-50 bg-red-600/90 text-white px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-2 shadow-lg backdrop-blur-md">
          <Disc className="w-4 h-4 animate-pulse" />
          <span>🔴 RECORDING — by {recorderName || currentUser.name || 'Host'}</span>
        </div>
      )}

      {/* ── Main Call Area ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col relative h-full overflow-hidden z-10">

        {/* Top Status Bar */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-3 bg-[#0A0E1A]/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 shadow-lg">
          <div className="flex items-center gap-2">
            <ChatBotOrb isProcessing={!isMuted} />
            <span className="text-xs font-bold text-white tracking-wide truncate max-w-[120px]">{roomCode}</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <Users className="w-3.5 h-3.5 text-[#00E5C7]" />
            <span>{totalCount} Connected</span>
          </div>
          <span className="text-slate-600">|</span>
          {/* WebRTC connection badge */}
          <div className={`flex items-center gap-1 text-xs font-bold ${connectionStatus === 'connected' ? 'text-emerald-400' : connectionStatus === 'failed' ? 'text-rose-400' : 'text-amber-400'}`}>
            {connectionStatus === 'connected'
              ? <><Wifi className="w-3.5 h-3.5" /><span className="hidden sm:inline">Live</span></>
              : connectionStatus === 'failed'
              ? <><WifiOff className="w-3.5 h-3.5" /><span className="hidden sm:inline">Failed</span></>
              : <><div className="w-3 h-3 rounded-full border border-amber-400 border-t-transparent animate-spin" /><span className="hidden sm:inline">Connecting</span></>
            }
          </div>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <AIStatusIndicator />
        </div>

        {/* Top Right – Share & Layout */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          <button
            id="copy-link-btn"
            onClick={handleCopyLink}
            className="px-3 py-1.5 rounded-xl bg-[#0A0E1A]/80 backdrop-blur-md border border-white/10 text-xs font-bold text-slate-200 hover:text-white flex items-center gap-1.5 transition-all"
            title="Copy Invite Link"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
            <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
          </button>

          <button
            id="whatsapp-share-btn"
            onClick={handleWhatsAppShare}
            className="p-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition-all"
            title="Share on WhatsApp"
          >
            <Share2 className="w-4 h-4" />
          </button>

          <button
            id="qr-code-btn"
            onClick={() => setShowQrModal(true)}
            className="px-2.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all"
            title="Scan QR Code to Join"
          >
            QR
          </button>

          <div className="flex items-center gap-1 bg-[#0A0E1A]/80 backdrop-blur-md p-1 rounded-xl border border-white/10">
            <button
              id="gallery-layout-btn"
              onClick={() => setLayoutMode('gallery')}
              className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${layoutMode === 'gallery' ? 'bg-[#00E5C7] text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Gallery
            </button>
            <button
              id="speaker-layout-btn"
              onClick={() => setLayoutMode('speaker')}
              className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${layoutMode === 'speaker' ? 'bg-[#00E5C7] text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              <User className="w-3.5 h-3.5" /> Speaker
            </button>
          </div>
        </div>

        {/* ── Video Grid ──────────────────────────────────────────────────── */}
        <div className="flex-1 p-4 md:p-6 flex items-center justify-center overflow-hidden">

          {layoutMode === 'speaker' && remoteCount > 0 ? (
            // Speaker layout: large main tile + small strip
            <div className="w-full h-full max-w-6xl flex flex-col gap-3 items-center justify-center overflow-hidden">
              {/* Main speaker tile – first remote peer */}
              {(() => {
                const main = allParticipants.find(p => !p.isLocal) || allParticipants[0];
                return (
                  <div className="relative w-full flex-1 max-h-[70vh] bg-[#0A0E1A]/95 rounded-2xl overflow-hidden border border-[#00E5C7]/40 shadow-2xl flex items-center justify-center">
                    <VideoTile p={main} isLocal={main.isLocal} isMuted={isMuted} volumeLevel={volumeLevel}
                      translatingSpeakers={translatingSpeakers} activeDubbingSpeaker={activeDubbingSpeaker}
                      selectedLanguage={selectedLanguage} socketId={socket.id} large />
                  </div>
                );
              })()}
              {/* Strip */}
              <div className="w-full flex items-center justify-center gap-3 overflow-x-auto py-1">
                {allParticipants.filter(p => p !== (allParticipants.find(q => !q.isLocal) || allParticipants[0])).map(p => (
                  <div key={p.id} className="relative w-36 h-24 bg-[#0A0E1A]/90 rounded-xl overflow-hidden border border-white/10 flex-shrink-0">
                    <VideoTile p={p} isLocal={p.isLocal} isMuted={isMuted} volumeLevel={volumeLevel}
                      translatingSpeakers={translatingSpeakers} activeDubbingSpeaker={activeDubbingSpeaker}
                      selectedLanguage={selectedLanguage} socketId={socket.id} compact />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Gallery grid
            <div className={`w-full h-full grid gap-4 items-center justify-center ${getGridClass(totalCount)}`}>
              {allParticipants.map((p) => (
                <VideoTile
                  key={p.id}
                  p={p}
                  isLocal={p.isLocal}
                  isMuted={isMuted}
                  volumeLevel={volumeLevel}
                  translatingSpeakers={translatingSpeakers}
                  activeDubbingSpeaker={activeDubbingSpeaker}
                  selectedLanguage={selectedLanguage}
                  socketId={socket.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* Captions */}
        {showCaptions && (
          <DualCaptionsOverlay
            currentCaption={currentCaption}
            targetLangCode={selectedLanguage}
            languages={languages}
            userSettings={userSettings}
          />
        )}

        {/* ── Bottom Control Bar ───────────────────────────────────────────── */}
        <div className="h-20 bg-[#0A0E1A]/95 border-t border-white/10 px-4 sm:px-8 flex items-center justify-between z-30 shadow-2xl">

          {/* Left controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button id="mute-btn" onClick={toggleMute}
              className={`p-3 rounded-2xl transition-all shadow-lg ${isMuted ? 'bg-rose-500 text-white shadow-rose-500/30' : 'bg-slate-800 hover:bg-slate-700 text-white border border-white/10'}`}
              title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-[#00E5C7]" />}
            </button>

            <button id="video-btn" onClick={toggleVideo}
              className={`p-3 rounded-2xl transition-all shadow-lg ${!isVideoOn ? 'bg-rose-500 text-white shadow-rose-500/30' : 'bg-slate-800 hover:bg-slate-700 text-white border border-white/10'}`}
              title={isVideoOn ? 'Turn Camera Off' : 'Turn Camera On'}
            >
              {isVideoOn ? <VideoIcon className="w-5 h-5 text-[#00E5C7]" /> : <VideoOff className="w-5 h-5" />}
            </button>

            <button id="screenshare-btn" onClick={toggleScreenShare}
              className={`p-3 rounded-2xl transition-all shadow-lg ${isScreenSharing ? 'bg-indigo-600 text-white shadow-indigo-500/30' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10'}`}
              title="Share Screen"
            >
              <Monitor className="w-5 h-5" />
            </button>

            <button id="record-btn" onClick={toggleRecording}
              className={`p-3 rounded-2xl transition-all shadow-lg ${isRecording ? 'bg-red-600 text-white shadow-red-500/30 animate-pulse' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10'}`}
              title={isRecording ? 'Stop Recording' : 'Record Call'}
            >
              <Disc className={`w-5 h-5 ${isRecording ? 'text-white' : 'text-rose-400'}`} />
            </button>
          </div>

          {/* Center controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button id="captions-btn" onClick={() => setShowCaptions(!showCaptions)}
              className={`px-3.5 py-2.5 rounded-2xl font-semibold text-xs flex items-center gap-2 transition-all border ${showCaptions ? 'bg-[#00E5C7]/20 text-[#00E5C7] border-[#00E5C7]/40' : 'bg-slate-800 text-slate-400 border-white/10 hover:text-white'}`}
            >
              <Sparkles className="w-4 h-4 text-[#00E5C7]" />
              <span className="hidden sm:inline">Dual Captions</span>
            </button>

            <div className="hidden md:flex items-center gap-1 bg-slate-900 p-1.5 rounded-2xl border border-white/10">
              {['👏', '❤️', '🎉', '👍', '💡'].map((emoji) => (
                <button key={emoji} onClick={() => triggerEmojiReaction(emoji)}
                  className="hover:scale-125 transition-transform p-1 text-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>

            <button id="polls-btn" onClick={() => setIsPollsOpen(true)}
              className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 transition-all"
              title="Polls"
            >
              <BarChart2 className="w-5 h-5 text-indigo-400" />
            </button>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button id="host-controls-btn" onClick={() => setIsHostControlsOpen(true)}
              className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-[#00E5C7] border border-[#00E5C7]/30 transition-all shadow-md"
              title="Host Controls"
            >
              <Shield className="w-5 h-5" />
            </button>

            <button id="chat-btn" onClick={() => setIsChatOpen(!isChatOpen)}
              className={`p-3 rounded-2xl transition-all shadow-lg relative ${isChatOpen ? 'bg-indigo-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10'}`}
              title="Translated Chat"
            >
              <MessageSquare className="w-5 h-5" />
              {chatMessages.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#00E5C7] text-slate-950 font-bold text-[9px] rounded-full flex items-center justify-center">
                  {chatMessages.length > 9 ? '9+' : chatMessages.length}
                </span>
              )}
            </button>

            <button id="end-call-btn"
              onClick={() => { socket.emit('leave-session'); onLeaveCall(); }}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all"
            >
              <PhoneOff className="w-4 h-4" />
              <span className="hidden sm:inline">End Call</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Side Panels & Modals ───────────────────────────────────────────── */}
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
        participants={socketParticipants.filter(p => p.socketId !== socket.id).map(p => ({ socketId: p.socketId, name: p.name || 'Participant' }))}
        waitingRoomList={waitingRoomList}
        roomSettings={roomSettings}
        onUpdateSettings={(s) => { setRoomSettings(prev => ({ ...prev, ...s })); socket.emit('update-room-settings', s); }}
        onMuteAll={() => socket.emit('host-mute-all')}
        onAdmitParticipant={(id) => socket.emit('admit-participant', { targetSocketId: id })}
        onRemoveParticipant={(id) => socket.emit('host-remove-participant', { targetSocketId: id })}
      />

      <PollsModal
        isOpen={isPollsOpen}
        onClose={() => setIsPollsOpen(false)}
        polls={polls}
        onCreatePoll={({ question, options }) => socket.emit('create-poll', { question, options })}
        onVotePoll={(pollId, optionId) => socket.emit('vote-poll', { pollId, optionId })}
      />

      {/* QR Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0A0E1A] border border-white/10 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl relative">
            <button onClick={() => setShowQrModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white text-xl">✕</button>
            <h3 className="text-lg font-bold text-white">Scan to Join</h3>
            <p className="text-xs text-slate-400">Point your phone camera at this QR code to join instantly.</p>
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
            <button onClick={handleCopyLink}
              className="w-full py-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30 text-xs font-bold transition-all"
            >
              {copiedLink ? '✓ Copied!' : 'Copy Join Link'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VideoTile – renders a single participant's video/avatar
// ─────────────────────────────────────────────────────────────────────────────
function VideoTile({ p, isLocal, isMuted, volumeLevel, translatingSpeakers, activeDubbingSpeaker, selectedLanguage, socketId, large = false, compact = false }) {
  const videoRef = useRef(null);

  // Attach MediaStream to video element whenever stream changes
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !p.stream) return;
    if (el.srcObject !== p.stream) {
      el.srcObject = p.stream;
      el.play().catch(() => {});
    }
  }, [p.stream]);

  const isTranslating = translatingSpeakers[p.id] || (isLocal && translatingSpeakers[socketId]);
  const isDubbing = activeDubbingSpeaker === p.id;
  const isSpeaking = isLocal ? (!isMuted && volumeLevel > 0.05) : p.audio;

  let ringStyle = 'border border-white/10';
  if (isDubbing || isTranslating) {
    ringStyle = 'ring-4 ring-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.7)] animate-pulse';
  } else if (isSpeaking) {
    ringStyle = 'ring-4 ring-[#00E5C7] shadow-[0_0_25px_rgba(0,229,199,0.6)]';
  }

  const sizeClass = compact
    ? 'w-full h-full'
    : large
    ? 'w-full h-full'
    : 'relative w-full min-h-[200px] max-h-[340px] md:min-h-[240px] md:max-h-[360px]';

  return (
    <div className={`${compact ? '' : sizeClass} bg-[#0A0E1A]/90 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center group transition-all duration-300 ${ringStyle}`}>

      {p.isVideoActive && p.stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`w-full h-full object-cover ${isLocal ? 'transform -scale-x-100' : ''}`}
        />
      ) : (
        <div className="flex flex-col items-center gap-3 py-6 px-4">
          <div className={`${compact ? 'w-10 h-10 text-lg' : large ? 'w-28 h-28 text-4xl' : 'w-20 h-20 text-3xl'} rounded-full bg-gradient-to-br from-indigo-900 to-indigo-700 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-200`}>
            {p.name ? p.name.charAt(0).toUpperCase() : 'P'}
          </div>
          {!compact && (
            <span className={`${large ? 'text-base' : 'text-sm'} font-bold text-white`}>
              {p.name} {isLocal ? '(You)' : ''}
            </span>
          )}
        </div>
      )}

      {/* Status badges */}
      {!compact && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
          {isDubbing && (
            <span className="bg-indigo-600/90 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-indigo-400/50 flex items-center gap-1 shadow-lg backdrop-blur-md animate-pulse">
              <Sparkles className="w-3 h-3 text-indigo-200" />
              <span>DUBBING</span>
            </span>
          )}
          {!isDubbing && isTranslating && (
            <span className="bg-cyan-600/90 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-cyan-400/50 flex items-center gap-1 shadow-lg backdrop-blur-md">
              <Sparkles className="w-3 h-3 text-cyan-200 animate-spin" />
              <span>TRANSLATING</span>
            </span>
          )}
          {!isDubbing && !isTranslating && isSpeaking && (
            <span className="bg-[#00E5C7]/90 text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
              <span>SPEAKING</span>
            </span>
          )}
        </div>
      )}

      {/* Name tag */}
      {!compact && (
        <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-xl border border-white/10 text-xs font-bold text-white flex items-center gap-2">
          <span>{p.name || 'Participant'} {isLocal ? '(You)' : ''}</span>
          <span className="text-[10px] bg-[#00E5C7]/20 text-[#00E5C7] px-1.5 py-0.5 rounded font-mono uppercase font-bold">
            {isLocal ? selectedLanguage : (p.spokenLanguage || 'en')}
          </span>
          {isLocal && isMuted && <MicOff className="w-3.5 h-3.5 text-rose-400" />}
          {!isLocal && !p.audio && <MicOff className="w-3.5 h-3.5 text-rose-400" />}
        </div>
      )}
    </div>
  );
}
