import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic, MicOff, Video as VideoIcon, VideoOff, Monitor, PhoneOff,
  MessageSquare, Shield, BarChart2, Sparkles, Users, LayoutGrid, User,
  Copy, Check, Share2, AlertCircle, Disc, Wifi, WifiOff, Camera
} from 'lucide-react';
import DualCaptionsOverlay from './DualCaptionsOverlay';
import HostControlsModal from './HostControlsModal';
import InCallChat from './InCallChat';
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
// VideoRoom — Native WebRTC multi-peer video call
//
// KEY DESIGN:  The WebRTC manager and socket room join happen ONLY AFTER
//              the local MediaStream is successfully captured. This eliminates
//              the race condition where offers were sent with zero media tracks.
// ─────────────────────────────────────────────────────────────────────────────
export default function VideoRoom({
  roomCode, currentUser, selectedLanguage, setSelectedLanguage,
  languages, userSettings, onLeaveCall
}) {
  const socket = getSocket();

  // ── Media ─────────────────────────────────────────────────────────────────
  const [localStream, setLocalStream]     = useState(null);
  const [isMuted, setIsMuted]             = useState(false);
  const [isVideoOn, setIsVideoOn]         = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const localStreamRef                    = useRef(null);

  // ── Remote peers: { socketId: { stream, name, spokenLanguage } } ──────────
  const [remotePeers, setRemotePeers]     = useState({});
  const webrtcManagerRef                  = useRef(null);

  // ── Room join guard (prevent double-join if stream changes) ───────────────
  const hasJoinedRef   = useRef(false);
  const pendingPeersRef = useRef([]);   // buffer peer IDs before manager ready

  // ── Socket participants (for metadata) ────────────────────────────────────
  const [socketParticipants, setSocketParticipants] = useState([]);

  // ── UI ────────────────────────────────────────────────────────────────────
  const [copiedLink, setCopiedLink]       = useState(false);
  const [isChatOpen, setIsChatOpen]       = useState(false);
  const [isHostControlsOpen, setIsHostControlsOpen] = useState(false);
  const [isPollsOpen, setIsPollsOpen]     = useState(false);
  const [showQrModal, setShowQrModal]     = useState(false);
  const [showCaptions, setShowCaptions]   = useState(true);
  const [layoutMode, setLayoutMode]       = useState('gallery');

  // ── Connection status ─────────────────────────────────────────────────────
  const [connectionStatus, setConnectionStatus] = useState('waiting');
  // 'waiting' | 'connecting' | 'connected' | 'alone'
  const [isReconnecting, setIsReconnecting]     = useState(false);
  const [peerBanner, setPeerBanner]             = useState(null);

  // ── Audio visualiser ──────────────────────────────────────────────────────
  const [volumeLevel, setVolumeLevel]     = useState(0);
  const [frequencyData, setFrequencyData] = useState([]);
  const audioMixerRef                     = useRef(null);

  // ── Chat / Polls / Reactions ──────────────────────────────────────────────
  const [chatMessages, setChatMessages]   = useState([]);
  const [polls, setPolls]                 = useState([]);
  const [floatingReactions, setFloatingReactions] = useState([]);

  // ── Room settings ─────────────────────────────────────────────────────────
  const [waitingRoomList, setWaitingRoomList] = useState([]);
  const [roomSettings, setRoomSettings]   = useState({ isLocked: false, waitingRoomEnabled: false });

  // ── Recording ─────────────────────────────────────────────────────────────
  const [isRecording, setIsRecording]     = useState(false);
  const [recorderName, setRecorderName]   = useState('');
  const mediaRecorderRef                  = useRef(null);
  const recordedChunksRef                 = useRef([]);

  // ── AI captions ───────────────────────────────────────────────────────────
  const [translatingSpeakers, setTranslatingSpeakers] = useState({});
  const [activeDubbingSpeaker, setActiveDubbingSpeaker] = useState(null);
  const captionSyncRef  = useRef(new CaptionSynchronizer());
  const speechServiceRef = useRef(null);
  const [currentCaption, setCurrentCaption] = useState({
    id: 'c-init', speakerId: 'system', speakerName: 'LinguaVersa',
    sourceLang: 'en', targetLang: selectedLanguage,
    originalText: 'Real-time speech translation active — speak into your mic!',
    translatedText: 'リアルタイム翻訳が有効です！',
    timestamp: new Date().toISOString(),
    metrics: { totalLatencyMs: 590 }
  });

  const [isHost, setIsHost] = useState(false);
  const shareableJoinUrl = `${window.location.origin}/join/${roomCode}`;

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1 — Capture local camera + mic
  //          This runs first, before ANYTHING WebRTC-related.
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    let mounted = true;
    let capturedStream = null;

    const capture = async () => {
      try {
        // Try video + audio
        capturedStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 48000 }
        }).catch(() =>
          // Fallback: audio only
          navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .catch(() => null)
        );

        if (!capturedStream || !mounted) return;

        localStreamRef.current = capturedStream;
        setLocalStream(capturedStream);

        // Audio visualiser
        const mixer = new AudioMixer();
        audioMixerRef.current = mixer;
        mixer.initialize(capturedStream);

        console.log('[VideoRoom] ✅ Local stream ready:', capturedStream.getTracks().map(t => `${t.kind}(${t.readyState})`).join(', '));
      } catch (err) {
        console.error('[VideoRoom] getUserMedia failed:', err);
      }
    };

    capture();

    return () => {
      mounted = false;
      if (capturedStream) capturedStream.getTracks().forEach(t => t.stop());
      if (audioMixerRef.current) audioMixerRef.current.stop();
    };
  }, []);

  // Audio spectrum loop
  useEffect(() => {
    const id = setInterval(() => {
      if (audioMixerRef.current) {
        setVolumeLevel(audioMixerRef.current.getVolumeLevel());
        setFrequencyData(audioMixerRef.current.getFrequencySpectrum());
      }
    }, 100);
    return () => clearInterval(id);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // WebRTC callbacks (stable refs — never change, safe to use in closures)
  // ═══════════════════════════════════════════════════════════════════════════
  const handleRemoteStreamAdded = useCallback((peerId, stream) => {
    console.log('[VideoRoom] ✅ Remote stream added for', peerId);
    setRemotePeers(prev => ({ ...prev, [peerId]: { ...(prev[peerId] || {}), stream } }));
    setConnectionStatus('connected');
  }, []);

  const handleRemoteStreamRemoved = useCallback((peerId) => {
    console.log('[VideoRoom] Remote stream removed for', peerId);
    setRemotePeers(prev => { const n = { ...prev }; delete n[peerId]; return n; });
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2 — Once local stream is ready: join socket room + init WebRTC
  //
  //  ⚠ This is the CRITICAL fix: we WAIT for localStream before doing
  //    anything with WebRTC, so offers always carry real media tracks.
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!localStream) return;           // wait until camera/mic is ready
    if (hasJoinedRef.current) return;   // only join once
    hasJoinedRef.current = true;

    console.log('[VideoRoom] Local stream ready — joining room and setting up WebRTC');

    // ── Validate host status ─────────────────────────────────────────────
    fetch(`/api/calls/${roomCode}`)
      .then(r => r.json())
      .then(d => { if (d.session?.hostId === currentUser?.id) setIsHost(true); })
      .catch(() => {});

    // ── Speech translation ───────────────────────────────────────────────
    const speechService = new SpeechTranslationService(socket, selectedLanguage, selectedLanguage, currentUser.name);
    speechServiceRef.current = speechService;
    speechService.start(localStream);

    // ── Create WebRTC manager WITH the actual stream ─────────────────────
    const rtcManager = new WebRTCManager(socket, localStream, handleRemoteStreamAdded, handleRemoteStreamRemoved);
    webrtcManagerRef.current = rtcManager;

    // ── Join the socket room ─────────────────────────────────────────────
    socket.emit('join-room', {
      roomCode,
      user: {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar,
        isHost: false,
        spokenLanguage: selectedLanguage
      }
    });

    // ── existing-peers: server tells us who is ALREADY in the room ───────
    // We (the newcomer) initiate offers to all of them.
    const onExistingPeers = ({ peerSocketIds }) => {
      console.log('[VideoRoom] existing-peers:', peerSocketIds);
      if (peerSocketIds.length === 0) {
        setConnectionStatus('alone');
      } else {
        setConnectionStatus('connecting');
        peerSocketIds.forEach(id => rtcManager.initiateOffer(id));
      }
    };

    // ── user-joined: a NEW peer joined AFTER us — they will offer to us.
    // Just update metadata so we show their name while waiting.
    const onUserJoined = ({ socketId, user }) => {
      console.log('[VideoRoom] user-joined:', socketId, user?.name);
      setConnectionStatus('connecting');
      setRemotePeers(prev => ({
        ...prev,
        [socketId]: { ...(prev[socketId] || {}), name: user?.name || 'Participant', spokenLanguage: user?.spokenLanguage || 'en' }
      }));
    };

    // ── Room participants metadata ────────────────────────────────────────
    const onParticipants = (participants) => {
      setSocketParticipants(participants);
      participants.forEach(p => {
        if (p.socketId !== socket.id) {
          setRemotePeers(prev => ({
            ...prev,
            [p.socketId]: { ...(prev[p.socketId] || {}), name: p.name, spokenLanguage: p.spokenLanguage }
          }));
        }
      });
    };

    // ── Peer left ────────────────────────────────────────────────────────
    const onPeerLeft = ({ socketId }) => {
      rtcManager.closePeerConnection(socketId);
      setRemotePeers(prev => { const n = { ...prev }; delete n[socketId]; return n; });
      setPeerBanner(null);
    };

    const onPeerDisconnected = ({ socketId, user }) => setPeerBanner(user?.name || 'Participant');
    const onPeerReconnected  = () => setPeerBanner(null);

    // ── AI captions ───────────────────────────────────────────────────────
    const onTranslatingStatus = ({ speakerId, isTranslating }) =>
      setTranslatingSpeakers(prev => ({ ...prev, [speakerId]: isTranslating }));

    const onCaptionChunk = (caption) => {
      setCurrentCaption(captionSyncRef.current.pushChunk(caption));
      if (caption.audioBase64 && caption.speakerId !== socket.id) {
        setActiveDubbingSpeaker(caption.speakerId);
        const snd = new Audio(`data:audio/${caption.audioFormat || 'mp3'};base64,${caption.audioBase64}`);
        snd.volume = 0.95;
        const restore = () => setActiveDubbingSpeaker(null);
        snd.onended = restore; snd.onerror = restore;
        snd.play().catch(restore);
      }
    };

    // ── Chat ──────────────────────────────────────────────────────────────
    const onNewChat = (msg) => setChatMessages(prev => [...prev, msg]);

    // ── Reactions ─────────────────────────────────────────────────────────
    const onReaction = ({ emoji }) => {
      const obj = { id: `r-${Date.now()}`, emoji, x: Math.floor(Math.random() * 80) + 10, rotate: Math.floor(Math.random() * 40) - 20 };
      setFloatingReactions(prev => [...prev, obj]);
      setTimeout(() => setFloatingReactions(prev => prev.filter(r => r.id !== obj.id)), 4000);
    };

    // ── Polls ─────────────────────────────────────────────────────────────
    const onPollCreated = (p) => setPolls(prev => [...prev, p]);
    const onPollUpdated = (p) => setPolls(prev => prev.map(x => x.id === p.id ? p : x));

    // ── Host events ───────────────────────────────────────────────────────
    const onHostMuted = () => {
      localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = false; });
      setIsMuted(true);
    };
    const onRemoved = () => { alert('You have been removed by the host.'); onLeaveCall(); };
    const onWaitingUpdate = (list) => setWaitingRoomList(list);
    const onRoomSettings  = (s) => setRoomSettings(s);

    // ── Recording banner ──────────────────────────────────────────────────
    const onRecording = ({ isRecording: r, recorderName: n }) => { setIsRecording(r); setRecorderName(n || 'Host'); };

    // ── Reconnect ─────────────────────────────────────────────────────────
    const onDisconnect = () => { setIsReconnecting(true); setConnectionStatus('connecting'); };
    const onConnect    = () => {
      setIsReconnecting(false);
      socket.emit('rejoin-session', {
        roomCode, user: { name: currentUser.name, spokenLanguage: selectedLanguage }, previousSocketId: socket.id
      });
    };

    // Bind all listeners
    socket.on('existing-peers',            onExistingPeers);
    socket.on('user-joined',               onUserJoined);
    socket.on('room-participants-update',  onParticipants);
    socket.on('peer-left',                 onPeerLeft);
    socket.on('peer-disconnected',         onPeerDisconnected);
    socket.on('peer-reconnected',          onPeerReconnected);
    socket.on('speaker-translating-status', onTranslatingStatus);
    socket.on('live-caption-chunk',        onCaptionChunk);
    socket.on('new-chat-message',          onNewChat);
    socket.on('new-reaction',              onReaction);
    socket.on('poll-created',              onPollCreated);
    socket.on('poll-updated',              onPollUpdated);
    socket.on('host-muted-you',            onHostMuted);
    socket.on('removed-by-host',           onRemoved);
    socket.on('waiting-room-update',       onWaitingUpdate);
    socket.on('room-settings-updated',     onRoomSettings);
    socket.on('recording-status-update',   onRecording);
    socket.on('disconnect',                onDisconnect);
    socket.on('connect',                   onConnect);

    return () => {
      hasJoinedRef.current = false;
      speechService.stop();
      socket.emit('leave-session');
      rtcManager.destroy();

      socket.off('existing-peers',            onExistingPeers);
      socket.off('user-joined',               onUserJoined);
      socket.off('room-participants-update',  onParticipants);
      socket.off('peer-left',                 onPeerLeft);
      socket.off('peer-disconnected',         onPeerDisconnected);
      socket.off('peer-reconnected',          onPeerReconnected);
      socket.off('speaker-translating-status', onTranslatingStatus);
      socket.off('live-caption-chunk',        onCaptionChunk);
      socket.off('new-chat-message',          onNewChat);
      socket.off('new-reaction',              onReaction);
      socket.off('poll-created',              onPollCreated);
      socket.off('poll-updated',              onPollUpdated);
      socket.off('host-muted-you',            onHostMuted);
      socket.off('removed-by-host',           onRemoved);
      socket.off('waiting-room-update',       onWaitingUpdate);
      socket.off('room-settings-updated',     onRoomSettings);
      socket.off('recording-status-update',   onRecording);
      socket.off('disconnect',                onDisconnect);
      socket.off('connect',                   onConnect);
    };
  }, [localStream, roomCode]); // ← ONLY runs once localStream is ready

  // ═══════════════════════════════════════════════════════════════════════════
  // Controls
  // ═══════════════════════════════════════════════════════════════════════════
  const toggleMute = () => {
    const next = !isMuted;
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !next; });
    setIsMuted(next);
  };

  const toggleVideo = () => {
    const next = !isVideoOn;
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = next; });
    setIsVideoOn(next);
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      const camTrack = localStreamRef.current?.getVideoTracks()[0];
      if (camTrack && webrtcManagerRef.current) {
        webrtcManagerRef.current.peerConnections.forEach(pc => {
          pc.getSenders().find(s => s.track?.kind === 'video')?.replaceTrack(camTrack).catch(() => {});
        });
      }
      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        if (webrtcManagerRef.current) {
          webrtcManagerRef.current.peerConnections.forEach(pc => {
            pc.getSenders().find(s => s.track?.kind === 'video')?.replaceTrack(screenTrack).catch(() => {});
          });
        }
        screenTrack.onended = () => {
          setIsScreenSharing(false);
          const camTrack = localStreamRef.current?.getVideoTracks()[0];
          if (camTrack && webrtcManagerRef.current) {
            webrtcManagerRef.current.peerConnections.forEach(pc => {
              pc.getSenders().find(s => s.track?.kind === 'video')?.replaceTrack(camTrack).catch(() => {});
            });
          }
        };
        setIsScreenSharing(true);
      } catch (err) { console.warn('[ScreenShare] Cancelled:', err); }
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.state !== 'inactive' && mediaRecorderRef.current?.stop();
      setIsRecording(false);
      socket.emit('recording-status-changed', { isRecording: false });
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true }).catch(() => localStreamRef.current);
        if (!stream) { alert('Recording requires camera/screen permissions.'); return; }
        recordedChunksRef.current = [];
        const mr = new MediaRecorder(stream, { mimeType: 'video/webm' });
        mediaRecorderRef.current = mr;
        mr.ondataavailable = (e) => { if (e.data?.size > 0) recordedChunksRef.current.push(e.data); };
        mr.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `call-${roomCode}-${Date.now()}.webm` });
          a.click();
        };
        mr.start(1000);
        setIsRecording(true);
        socket.emit('recording-status-changed', { isRecording: true, recorderName: currentUser.name });
      } catch (err) { console.warn('[Recording]', err); }
    }
  };

  const handleCopyLink = () => { navigator.clipboard.writeText(shareableJoinUrl); setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2500); };
  const handleWhatsAppShare = () => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`Join my call!\n${shareableJoinUrl}`)}`, '_blank');
  const triggerReaction = (emoji) => socket.emit('send-reaction', { emoji });
  const sendChat = ({ text, originalLang, file }) => {
    const opt = { id: `o-${Date.now()}`, senderId: socket.id, senderName: currentUser.name, senderAvatar: currentUser.avatar, text, translatedText: text, originalLang: originalLang || selectedLanguage, targetLang: selectedLanguage, file, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setChatMessages(prev => [...prev, opt]);
    socket.emit('send-chat-message', { text, originalLang: selectedLanguage, file });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Build display list
  // ═══════════════════════════════════════════════════════════════════════════
  const localVideoTrack = localStream?.getVideoTracks()[0] || null;
  const allParticipants = [
    { id: socket.id || currentUser.id, name: currentUser.name || 'You', isLocal: true, stream: localStream, videoTrack: localVideoTrack, isVideoActive: isVideoOn && !!localVideoTrack, audio: !isMuted, spokenLanguage: selectedLanguage },
    ...Object.entries(remotePeers).map(([peerId, peer]) => {
      const vt = peer.stream?.getVideoTracks()[0] || null;
      return { id: peerId, name: peer.name || 'Participant', isLocal: false, stream: peer.stream || null, videoTrack: vt, isVideoActive: !!vt, audio: true, spokenLanguage: peer.spokenLanguage || 'en' };
    })
  ];

  const getGridClass = (n) => {
    if (n <= 1) return 'grid-cols-1 max-w-2xl';
    if (n === 2) return 'grid-cols-1 sm:grid-cols-2 max-w-5xl';
    if (n <= 4)  return 'grid-cols-2 max-w-5xl';
    if (n <= 6)  return 'grid-cols-2 md:grid-cols-3 max-w-6xl';
    return 'grid-cols-3 md:grid-cols-4 max-w-7xl';
  };

  const statusColors = {
    alone:      { icon: <Wifi className="w-3.5 h-3.5"/>, text: 'Waiting for others…', cls: 'text-amber-400' },
    connecting: { icon: <div className="w-3 h-3 rounded-full border border-cyan-400 border-t-transparent animate-spin"/>, text: 'Connecting…', cls: 'text-cyan-400' },
    connected:  { icon: <Wifi className="w-3.5 h-3.5"/>, text: 'Live', cls: 'text-emerald-400' },
    waiting:    { icon: <Camera className="w-3.5 h-3.5"/>, text: 'Starting camera…', cls: 'text-slate-400' },
  };
  const st = statusColors[connectionStatus] || statusColors.waiting;

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="relative w-full h-[calc(100vh-4rem)] bg-[#05060B] flex overflow-hidden">
      <VoiceParticles isSpeaking={!isMuted} amplitude={volumeLevel} />
      <SpeechCanvas3D isSpeaking={!isMuted} frequencyData={frequencyData} />
      <EmojiReactionsOverlay floatingReactions={floatingReactions} />

      {/* ── Banners ────────────────────────────────────────────────────────── */}
      {isReconnecting && (
        <div className="absolute top-0 inset-x-0 z-50 bg-amber-600/90 text-slate-950 px-4 py-2 text-xs font-extrabold text-center flex items-center justify-center gap-2 backdrop-blur-md">
          <div className="w-3 h-3 rounded-full border-2 border-slate-950 border-t-transparent animate-spin"/>
          Connection lost — reconnecting…
        </div>
      )}
      {peerBanner && !isReconnecting && (
        <div className="absolute top-0 inset-x-0 z-50 bg-cyan-700/90 text-white px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-2 backdrop-blur-md">
          <AlertCircle className="w-4 h-4 animate-pulse"/> {peerBanner} temporarily disconnected (60 s grace)…
        </div>
      )}
      {isRecording && (
        <div className="absolute top-0 inset-x-0 z-50 bg-red-600/90 text-white px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-2 backdrop-blur-md">
          <Disc className="w-4 h-4 animate-pulse"/> 🔴 RECORDING — {recorderName || currentUser.name}
        </div>
      )}

      {/* ── Main area ──────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col relative h-full overflow-hidden z-10">

        {/* Status bar */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-3 bg-[#0A0E1A]/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 shadow-lg">
          <div className="flex items-center gap-2">
            <ChatBotOrb isProcessing={!isMuted}/>
            <span className="text-xs font-bold text-white tracking-wide max-w-[100px] truncate">{roomCode}</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <Users className="w-3.5 h-3.5 text-[#00E5C7]"/>
            <span>{allParticipants.length} here</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${st.cls}`}>
            {st.icon}<span className="hidden sm:inline">{st.text}</span>
          </div>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <AIStatusIndicator/>
        </div>

        {/* Top right controls */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          <button id="copy-link-btn" onClick={handleCopyLink} title="Copy invite link"
            className="px-3 py-1.5 rounded-xl bg-[#0A0E1A]/80 backdrop-blur-md border border-white/10 text-xs font-bold text-slate-200 hover:text-white flex items-center gap-1.5 transition-all">
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400"/> : <Copy className="w-3.5 h-3.5 text-cyan-400"/>}
            <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
          </button>
          <button id="whatsapp-btn" onClick={handleWhatsAppShare} title="Share via WhatsApp"
            className="p-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition-all">
            <Share2 className="w-4 h-4"/>
          </button>
          <button id="qr-btn" onClick={() => setShowQrModal(true)} title="QR Code"
            className="px-2.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all">QR</button>
          <div className="flex items-center gap-1 bg-[#0A0E1A]/80 backdrop-blur-md p-1 rounded-xl border border-white/10">
            {['gallery','speaker'].map(m => (
              <button key={m} onClick={() => setLayoutMode(m)}
                className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${layoutMode===m ? 'bg-[#00E5C7] text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}>
                {m === 'gallery' ? <LayoutGrid className="w-3.5 h-3.5"/> : <User className="w-3.5 h-3.5"/>} {m.charAt(0).toUpperCase()+m.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* ── Video grid ─────────────────────────────────────────────────── */}
        <div className="flex-1 p-3 md:p-5 flex items-center justify-center overflow-hidden">

          {/* Waiting state — only local, camera starting */}
          {!localStream && (
            <div className="flex flex-col items-center gap-4 text-slate-400">
              <div className="w-16 h-16 rounded-full border-2 border-[#00E5C7] border-t-transparent animate-spin"/>
              <p className="text-sm font-semibold">Starting camera…</p>
              <p className="text-xs text-slate-600">Allow camera & microphone permissions</p>
            </div>
          )}

          {localStream && layoutMode === 'speaker' && Object.keys(remotePeers).length > 0 ? (
            // Speaker layout
            <div className="w-full h-full max-w-6xl flex flex-col gap-3 items-center justify-center">
              {(() => {
                const main = allParticipants.find(p => !p.isLocal) || allParticipants[0];
                return (
                  <div className="relative w-full flex-1 max-h-[72vh] bg-[#0A0E1A]/95 rounded-2xl overflow-hidden border border-[#00E5C7]/40 shadow-2xl">
                    <VideoTile p={main} isMuted={isMuted} volumeLevel={volumeLevel} translatingSpeakers={translatingSpeakers} activeDubbingSpeaker={activeDubbingSpeaker} selectedLanguage={selectedLanguage} socketId={socket.id} large/>
                  </div>
                );
              })()}
              <div className="w-full flex items-center justify-center gap-3 overflow-x-auto py-1">
                {allParticipants.filter((_, i) => i !== (allParticipants.findIndex(p => !p.isLocal) === -1 ? -1 : allParticipants.findIndex(p => !p.isLocal))).slice(0, 6).map(p => (
                  <div key={p.id} className="relative w-36 h-24 bg-[#0A0E1A]/90 rounded-xl overflow-hidden border border-white/10 flex-shrink-0">
                    <VideoTile p={p} isMuted={isMuted} volumeLevel={volumeLevel} translatingSpeakers={translatingSpeakers} activeDubbingSpeaker={activeDubbingSpeaker} selectedLanguage={selectedLanguage} socketId={socket.id} compact/>
                  </div>
                ))}
              </div>
            </div>
          ) : localStream ? (
            // Gallery grid
            <div className={`w-full h-full grid gap-3 md:gap-4 items-center justify-center ${getGridClass(allParticipants.length)}`}>
              {allParticipants.map(p => (
                <VideoTile key={p.id} p={p} isMuted={isMuted} volumeLevel={volumeLevel} translatingSpeakers={translatingSpeakers} activeDubbingSpeaker={activeDubbingSpeaker} selectedLanguage={selectedLanguage} socketId={socket.id}/>
              ))}
            </div>
          ) : null}
        </div>

        {/* Captions */}
        {showCaptions && localStream && (
          <DualCaptionsOverlay currentCaption={currentCaption} targetLangCode={selectedLanguage} languages={languages} userSettings={userSettings}/>
        )}

        {/* ── Bottom control bar ──────────────────────────────────────────── */}
        <div className="h-20 bg-[#0A0E1A]/95 border-t border-white/10 px-3 sm:px-8 flex items-center justify-between z-30 shadow-2xl gap-2">

          {/* Left */}
          <div className="flex items-center gap-2">
            <CtrlBtn id="mute-btn" onClick={toggleMute} active={isMuted} activeColor="rose" title={isMuted ? 'Unmute' : 'Mute'}>
              {isMuted ? <MicOff className="w-5 h-5"/> : <Mic className="w-5 h-5 text-[#00E5C7]"/>}
            </CtrlBtn>
            <CtrlBtn id="video-btn" onClick={toggleVideo} active={!isVideoOn} activeColor="rose" title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}>
              {isVideoOn ? <VideoIcon className="w-5 h-5 text-[#00E5C7]"/> : <VideoOff className="w-5 h-5"/>}
            </CtrlBtn>
            <CtrlBtn id="screen-btn" onClick={toggleScreenShare} active={isScreenSharing} activeColor="indigo" title="Share screen">
              <Monitor className="w-5 h-5"/>
            </CtrlBtn>
            <CtrlBtn id="record-btn" onClick={toggleRecording} active={isRecording} activeColor="red" title={isRecording ? 'Stop recording' : 'Record call'}>
              <Disc className={`w-5 h-5 ${isRecording ? 'text-white' : 'text-rose-400'}`}/>
            </CtrlBtn>
          </div>

          {/* Center */}
          <div className="flex items-center gap-2">
            <button id="captions-btn" onClick={() => setShowCaptions(!showCaptions)}
              className={`px-3 py-2.5 rounded-2xl font-semibold text-xs flex items-center gap-1.5 transition-all border ${showCaptions ? 'bg-[#00E5C7]/20 text-[#00E5C7] border-[#00E5C7]/40' : 'bg-slate-800 text-slate-400 border-white/10 hover:text-white'}`}>
              <Sparkles className="w-4 h-4 text-[#00E5C7]"/><span className="hidden sm:inline">Captions</span>
            </button>
            <div className="hidden md:flex items-center gap-1 bg-slate-900 p-1.5 rounded-2xl border border-white/10">
              {['👏','❤️','🎉','👍','💡'].map(e => (
                <button key={e} onClick={() => triggerReaction(e)} className="hover:scale-125 transition-transform p-1 text-lg">{e}</button>
              ))}
            </div>
            <button id="polls-btn" onClick={() => setIsPollsOpen(true)}
              className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 transition-all" title="Polls">
              <BarChart2 className="w-5 h-5 text-indigo-400"/>
            </button>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            <button id="host-btn" onClick={() => setIsHostControlsOpen(true)}
              className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-[#00E5C7] border border-[#00E5C7]/30 transition-all" title="Host controls">
              <Shield className="w-5 h-5"/>
            </button>
            <button id="chat-btn" onClick={() => setIsChatOpen(!isChatOpen)}
              className={`p-3 rounded-2xl transition-all relative ${isChatOpen ? 'bg-indigo-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10'}`} title="Chat">
              <MessageSquare className="w-5 h-5"/>
              {chatMessages.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#00E5C7] text-slate-950 font-bold text-[9px] rounded-full flex items-center justify-center">{chatMessages.length > 9 ? '9+' : chatMessages.length}</span>}
            </button>
            <button id="end-call-btn" onClick={() => { socket.emit('leave-session'); onLeaveCall(); }}
              className="px-4 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all">
              <PhoneOff className="w-4 h-4"/><span className="hidden sm:inline">End Call</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Panels & Modals ─────────────────────────────────────────────────── */}
      <InCallChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} messages={chatMessages} onSendMessage={sendChat} selectedLanguage={selectedLanguage} languages={languages}/>
      <HostControlsModal isOpen={isHostControlsOpen} onClose={() => setIsHostControlsOpen(false)}
        participants={socketParticipants.filter(p => p.socketId !== socket.id).map(p => ({ socketId: p.socketId, name: p.name || 'Participant' }))}
        waitingRoomList={waitingRoomList} roomSettings={roomSettings}
        onUpdateSettings={(s) => { setRoomSettings(p => ({ ...p, ...s })); socket.emit('update-room-settings', s); }}
        onMuteAll={() => socket.emit('host-mute-all')}
        onAdmitParticipant={(id) => socket.emit('admit-participant', { targetSocketId: id })}
        onRemoveParticipant={(id) => socket.emit('host-remove-participant', { targetSocketId: id })}/>
      <PollsModal isOpen={isPollsOpen} onClose={() => setIsPollsOpen(false)} polls={polls}
        onCreatePoll={({ question, options }) => socket.emit('create-poll', { question, options })}
        onVotePoll={(pollId, optionId) => socket.emit('vote-poll', { pollId, optionId })}/>

      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0A0E1A] border border-white/10 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl relative">
            <button onClick={() => setShowQrModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white text-xl">✕</button>
            <h3 className="text-lg font-bold text-white">📱 Scan to Join</h3>
            <p className="text-xs text-slate-400">Point your phone camera at this QR code to join the call instantly — no app needed.</p>
            <div className="p-4 bg-white rounded-2xl inline-block">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(shareableJoinUrl)}`} alt="QR" className="w-44 h-44 mx-auto"/>
            </div>
            <p className="text-[11px] font-mono text-cyan-300 break-all bg-slate-900/80 p-2 rounded-xl border border-white/5">{shareableJoinUrl}</p>
            <button onClick={handleCopyLink} className="w-full py-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30 text-xs font-bold transition-all">
              {copiedLink ? '✓ Copied!' : 'Copy Join Link'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CtrlBtn — bottom bar control button
// ─────────────────────────────────────────────────────────────────────────────
function CtrlBtn({ id, onClick, active, activeColor = 'rose', title, children }) {
  const colorMap = { rose: 'bg-rose-500 shadow-rose-500/30', indigo: 'bg-indigo-600 shadow-indigo-500/30', red: 'bg-red-600 shadow-red-500/30 animate-pulse' };
  return (
    <button id={id} onClick={onClick} title={title}
      className={`p-3 rounded-2xl transition-all shadow-lg ${active ? `${colorMap[activeColor]} text-white` : 'bg-slate-800 hover:bg-slate-700 text-white border border-white/10'}`}>
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VideoTile — renders one participant's video or avatar
// ─────────────────────────────────────────────────────────────────────────────
function VideoTile({ p, isMuted, volumeLevel, translatingSpeakers, activeDubbingSpeaker, selectedLanguage, socketId, large = false, compact = false }) {
  const videoRef = useRef(null);

  // Attach stream to <video> element whenever it changes
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !p.stream) return;
    if (el.srcObject !== p.stream) {
      el.srcObject = p.stream;
      el.play().catch(() => {});
    }
  }, [p.stream]);

  const isTranslating = translatingSpeakers[p.id] || (p.isLocal && translatingSpeakers[socketId]);
  const isDubbing     = activeDubbingSpeaker === p.id;
  const isSpeaking    = p.isLocal ? (!isMuted && volumeLevel > 0.05) : p.audio;

  let ring = 'border border-white/10';
  if (isDubbing || isTranslating) ring = 'ring-4 ring-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.6)] animate-pulse';
  else if (isSpeaking)            ring = 'ring-4 ring-[#00E5C7] shadow-[0_0_25px_rgba(0,229,199,0.5)]';

  const baseClass = compact ? 'w-full h-full' : large ? 'w-full h-full' : 'relative w-full min-h-[200px] max-h-[350px] md:min-h-[240px] md:max-h-[370px]';

  return (
    <div className={`${compact ? '' : baseClass} bg-[#0A0E1A]/90 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center group transition-all duration-300 ${ring}`}>

      {/* Video — only shown when stream has video track */}
      {p.isVideoActive && p.stream ? (
        <video ref={videoRef} autoPlay playsInline muted={p.isLocal}
          className={`w-full h-full object-cover ${p.isLocal ? '-scale-x-100' : ''}`}/>
      ) : (
        <div className="flex flex-col items-center gap-3 py-6 px-4">
          <div className={`rounded-full bg-gradient-to-br from-indigo-900 to-slate-800 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-200
            ${compact ? 'w-10 h-10 text-base' : large ? 'w-28 h-28 text-5xl' : 'w-20 h-20 text-3xl'}`}>
            {(p.name || 'P').charAt(0).toUpperCase()}
          </div>
          {!compact && <span className={`font-bold text-white ${large ? 'text-lg' : 'text-sm'}`}>{p.name}{p.isLocal ? ' (You)' : ''}</span>}
        </div>
      )}

      {/* Status badges */}
      {!compact && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
          {isDubbing && <Badge cls="bg-indigo-600/90 border-indigo-400/50"><Sparkles className="w-3 h-3"/>DUBBING</Badge>}
          {!isDubbing && isTranslating && <Badge cls="bg-cyan-600/90 border-cyan-400/50"><Sparkles className="w-3 h-3 animate-spin"/>TRANSLATING</Badge>}
          {!isDubbing && !isTranslating && isSpeaking && <Badge cls="bg-[#00E5C7]/90 border-[#00E5C7]/30 text-slate-950"><span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping"/>SPEAKING</Badge>}
        </div>
      )}

      {/* Name tag */}
      {!compact && (
        <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-xl border border-white/10 text-xs font-bold text-white flex items-center gap-2">
          <span>{p.name || 'Participant'}{p.isLocal ? ' (You)' : ''}</span>
          <span className="text-[10px] bg-[#00E5C7]/20 text-[#00E5C7] px-1.5 py-0.5 rounded font-mono uppercase">{p.isLocal ? selectedLanguage : (p.spokenLanguage || 'en')}</span>
          {p.isLocal && isMuted && <MicOff className="w-3.5 h-3.5 text-rose-400"/>}
          {!p.isLocal && !p.audio && <MicOff className="w-3.5 h-3.5 text-rose-400"/>}
        </div>
      )}
    </div>
  );
}

function Badge({ cls, children }) {
  return (
    <span className={`text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full border flex items-center gap-1 shadow-lg backdrop-blur-md ${cls}`}>
      {children}
    </span>
  );
}
