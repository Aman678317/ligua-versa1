import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic, MicOff, Video as VideoIcon, VideoOff, Monitor, PhoneOff,
  MessageSquare, Shield, BarChart2, Sparkles, Users, LayoutGrid, User,
  Copy, Check, Share2, AlertCircle, Disc, Wifi, Camera, Image as ImageIcon,
  Coffee, Clock
} from 'lucide-react';
import DualCaptionsOverlay from './DualCaptionsOverlay';
import HostControlsModal from './HostControlsModal';
import InCallChat from './InCallChat';
import RoomActivities from './RoomActivities';
import { EmojiReactionsOverlay, PollsModal } from './PollsAndReactions';
import VoiceConsentModal from '../modals/VoiceConsentModal';

import AIStatusIndicator from './AIStatusIndicator';
import { AudioMixer } from '../../utils/AudioMixer';
import { CaptionSynchronizer } from '../../utils/CaptionSynchronizer';
import { SpeechTranslationService } from '../../services/speechTranslation';
import { WebRTCManager } from '../../services/webrtc';
import { getSocket } from '../../services/socket';

// ─────────────────────────────────────────────────────────────────────────────
// Synthetic Stream Fallback (for insecure HTTP mobile contexts or blocked permissions)
// ─────────────────────────────────────────────────────────────────────────────
function createDummyStream() {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, 640, 480);
  ctx.fillStyle = '#38BDF8';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Camera Offline / Blocked', 320, 240);

  let videoTrack = null;
  try {
    if (canvas.captureStream) {
      videoTrack = canvas.captureStream(10).getVideoTracks()[0];
    }
  } catch (e) {
    console.warn('[VideoRoom] canvas.captureStream not supported:', e);
  }

  let audioTrack = null;
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const dst = audioCtx.createMediaStreamDestination();
    osc.connect(dst);
    osc.start();
    audioTrack = dst.stream.getAudioTracks()[0];
    if (audioTrack) audioTrack.enabled = false;
  } catch (e) {
    console.warn('[VideoRoom] AudioContext fallback failed:', e);
  }

  const tracks = [];
  if (videoTrack) tracks.push(videoTrack);
  if (audioTrack) tracks.push(audioTrack);
  return new MediaStream(tracks);
}

export default function VideoRoom({
  roomCode, currentUser, selectedLanguage, setSelectedLanguage,
  languages, userSettings, onLeaveCall
}) {
  const socket = getSocket();

  // ── Media ──────────────────────────────────────────────────────────────────
  const [localStream, setLocalStream]     = useState(null);
  const [isMuted, setIsMuted]             = useState(false);
  const [isVideoOn, setIsVideoOn]         = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isBlurActive, setIsBlurActive]   = useState(userSettings?.initialBlur || false);
  const localStreamRef                    = useRef(null);
  const processedStreamRef                = useRef(null);
  const animFrameId                       = useRef(null);

  // ── Remote peers ───────────────────────────────────────────────────────────
  const [remotePeers, setRemotePeers]     = useState({});
  const webrtcManagerRef                  = useRef(null);
  const hasJoinedRef                      = useRef(false);

  // ── Socket participants ────────────────────────────────────────────────────
  const [socketParticipants, setSocketParticipants] = useState([]);

  // ── UI ─────────────────────────────────────────────────────────────────────
  const [copiedLink, setCopiedLink]       = useState(false);
  const [isChatOpen, setIsChatOpen]       = useState(false);
  const [isActivitiesOpen, setIsActivitiesOpen] = useState(false);
  const [isHostControlsOpen, setIsHostControlsOpen] = useState(false);
  const [isPollsOpen, setIsPollsOpen]     = useState(false);
  const [showQrModal, setShowQrModal]     = useState(false);
  const [showCaptions, setShowCaptions]   = useState(true);
  const [layoutMode, setLayoutMode]       = useState('gallery');

  // ── Connection status ──────────────────────────────────────────────────────
  const [connectionStatus, setConnectionStatus] = useState('waiting');
  const [isReconnecting, setIsReconnecting]     = useState(false);
  const [peerBanner, setPeerBanner]             = useState(null);

  // ── Audio visualiser ───────────────────────────────────────────────────────
  const [volumeLevel, setVolumeLevel]     = useState(0);
  const [frequencyData, setFrequencyData] = useState([]);
  const audioMixerRef                     = useRef(null);

  // ── Chat / Polls / Reactions ───────────────────────────────────────────────
  const [chatMessages, setChatMessages]   = useState([]);
  const [polls, setPolls]                 = useState([]);
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [waitingRoomList, setWaitingRoomList] = useState([]);
  const [roomSettings, setRoomSettings]   = useState({ isLocked: false, waitingRoomEnabled: false });

  // ── Recording ──────────────────────────────────────────────────────────────
  const [isRecording, setIsRecording]     = useState(false);
  const [recorderName, setRecorderName]   = useState('');
  const mediaRecorderRef                  = useRef(null);
  const recordedChunksRef                 = useRef([]);

  // ── AI captions ────────────────────────────────────────────────────────────
  const [translatingSpeakers, setTranslatingSpeakers] = useState({});
  const [activeDubbingSpeaker, setActiveDubbingSpeaker] = useState(null);
  const captionSyncRef  = useRef(new CaptionSynchronizer());
  const speechServiceRef = useRef(null);
  const [currentCaption, setCurrentCaption] = useState({
    id: 'c-init', speakerId: 'system', speakerName: 'LinguaVersa',
    sourceLang: 'en', targetLang: selectedLanguage,
    originalText: 'Real-time translation active — speak into your mic!',
    translatedText: 'リアルタイム翻訳が有効です！',
    timestamp: new Date().toISOString(), metrics: { totalLatencyMs: 590 }
  });

  const [isHost, setIsHost] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(true);
  const [voiceCloningEnabled, setVoiceCloningEnabled] = useState(false);
  
  const shareableJoinUrl = `${window.location.origin}/join/${roomCode}`;

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1 — Capture camera/mic (with automatic dummy fallback)
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    let mounted = true;

    const capture = async () => {
      let captured = null;
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          captured = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: { echoCancellation: true, noiseSuppression: true }
          }).catch(() =>
            navigator.mediaDevices.getUserMedia({ audio: true, video: false }).catch(() => null)
          );
        }
      } catch (err) {
        console.warn('[VideoRoom] Camera capture warning:', err);
      }

      // If camera/mic capture returned null or threw, generate synthetic stream so call ALWAYS connects
      if (!captured) {
        console.warn('[VideoRoom] Using dummy stream fallback for connection');
        captured = createDummyStream();
      }

      if (!mounted) return;
      localStreamRef.current = captured;
      setLocalStream(captured);

      try {
        const mixer = new AudioMixer();
        audioMixerRef.current = mixer;
        mixer.initialize(captured);
      } catch (e) {
        console.warn('[VideoRoom] AudioMixer init failed:', e);
      }

      console.log('[VideoRoom] ✅ Local stream initialized:',
        captured.getTracks().map(t => `${t.kind}(${t.readyState})`).join(', '));
    };

    capture();
    return () => {
      mounted = false;
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      audioMixerRef.current?.stop();
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
  // Virtual Background (Blur) Effect
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!localStreamRef.current) return;
    
    if (!isBlurActive) {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      if (processedStreamRef.current) {
        processedStreamRef.current.getTracks().forEach(t => t.stop());
        processedStreamRef.current = null;
      }
      setLocalStream(localStreamRef.current);
      if (webrtcManagerRef.current && hasJoinedRef.current) {
        webrtcManagerRef.current.updateLocalStream(localStreamRef.current);
      }
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    
    const video = document.createElement('video');
    video.muted = true;
    video.srcObject = localStreamRef.current;
    video.play().catch(() => {});

    const draw = () => {
      if (ctx && video.readyState >= 2) {
         ctx.filter = 'blur(10px)';
         ctx.drawImage(video, 0, 0, 640, 480);
      }
      animFrameId.current = requestAnimationFrame(draw);
    };
    draw();

    const processedStream = canvas.captureStream(30);
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      processedStream.addTrack(audioTrack);
    }
    
    processedStreamRef.current = processedStream;
    setLocalStream(processedStream);
    
    if (webrtcManagerRef.current && hasJoinedRef.current) {
      webrtcManagerRef.current.updateLocalStream(processedStream);
    }
    
    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      video.srcObject = null;
    };
  }, [isBlurActive, localStreamRef.current]);

  // ═══════════════════════════════════════════════════════════════════════════
  // WebRTC callbacks
  // ═══════════════════════════════════════════════════════════════════════════
  const handleRemoteStreamAdded = useCallback((peerId, stream, trackCount, hasVideo, iceState) => {
    console.log(`[VideoRoom] Remote stream update for ${peerId}: ${trackCount} track(s), hasVideo=${hasVideo}, iceState=${iceState}`);
    setRemotePeers(prev => ({
      ...prev,
      [peerId]: {
        ...(prev[peerId] || {}),
        stream,
        trackCount: trackCount || 0,
        hasVideo:   hasVideo || false,
        iceState:   iceState || 'checking',
      }
    }));
    setConnectionStatus('connected');
  }, []);

  const handleRemoteStreamRemoved = useCallback((peerId) => {
    setRemotePeers(prev => { const n = { ...prev }; delete n[peerId]; return n; });
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2 — Join room + init WebRTC ONLY after local stream is ready
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!localStream) return;
    if (hasJoinedRef.current) return;
    hasJoinedRef.current = true;

    console.log('[VideoRoom] Stream ready — joining room and initializing WebRTC');

    fetch(`/api/calls/${roomCode}`)
      .then(r => r.json())
      .then(d => { if (d.session?.hostId === currentUser?.id) setIsHost(true); })
      .catch(() => {});

    let rtcManager = null;

    const initWebRTC = (iceServers) => {
      try {
        const speechService = new SpeechTranslationService(socket, selectedLanguage, selectedLanguage, currentUser.name);
        speechServiceRef.current = speechService;
        speechService.start(localStream);
      } catch (e) {
        console.warn('[VideoRoom] SpeechTranslation init warning:', e);
      }

      const handleIceStateChange = (peerId, state) => {
        setRemotePeers(prev => ({
          ...prev,
          [peerId]: { ...(prev[peerId] || {}), iceState: state }
        }));
      };

      rtcManager = new WebRTCManager(socket, localStream, iceServers, handleRemoteStreamAdded, handleRemoteStreamRemoved, handleIceStateChange);
      webrtcManagerRef.current = rtcManager;

      socket.emit('join-room', {
        roomCode,
        user: { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar, isHost: false, spokenLanguage: selectedLanguage }
      });

      const onExistingPeers = ({ peerSocketIds, myRole }) => {
        console.log('[VideoRoom] existing-peers:', peerSocketIds, 'myRole:', myRole);
        if (myRole) rtcManager.setRole(myRole);

        if (peerSocketIds.length === 0) {
          setConnectionStatus('alone');
        } else {
          setConnectionStatus('connecting');
          peerSocketIds.forEach(id => rtcManager.initiateOffer(id));
        }
      };

      const onUserJoined = ({ socketId, user, negotiationRole }) => {
        console.log('[VideoRoom] user-joined:', socketId, user?.name);
        setConnectionStatus('connecting');
        setRemotePeers(prev => ({
          ...prev,
          [socketId]: { ...(prev[socketId] || {}), name: user?.name || 'Participant', spokenLanguage: user?.spokenLanguage || 'en' }
        }));
        rtcManager.initiateOffer(socketId);
      };

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

      const onPeerLeft = ({ socketId }) => {
        rtcManager.closePeerConnection(socketId);
        setRemotePeers(prev => { const n = { ...prev }; delete n[socketId]; return n; });
        setPeerBanner(null);
      };

      const onPeerDisconnected = ({ user })  => setPeerBanner(user?.name || 'Participant');
      const onPeerReconnected  = ()          => setPeerBanner(null);

      const onTranslating = ({ speakerId, isTranslating }) =>
        setTranslatingSpeakers(prev => ({ ...prev, [speakerId]: isTranslating }));

      const onCaption = (caption) => {
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

      const onNewChat   = (msg) => setChatMessages(prev => [...prev, msg]);
      const onReaction  = ({ emoji }) => {
        const obj = { id: `r-${Date.now()}`, emoji, x: Math.floor(Math.random() * 80) + 10, rotate: Math.floor(Math.random() * 40) - 20 };
        setFloatingReactions(prev => [...prev, obj]);
        setTimeout(() => setFloatingReactions(prev => prev.filter(r => r.id !== obj.id)), 4000);
      };
      const onPollCreated   = (p)  => setPolls(prev => [...prev, p]);
      const onPollUpdated   = (p)  => setPolls(prev => prev.map(x => x.id === p.id ? p : x));
      const onHostMuted     = ()   => { localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = false; }); setIsMuted(true); };
      const onRemoved       = ()   => { alert('You have been removed by the host.'); onLeaveCall(); };
      const onWaitingUpdate = (l)  => setWaitingRoomList(l);
      const onRoomSettings  = (s)  => setRoomSettings(s);
      const onRecording     = ({ isRecording: r, recorderName: n }) => { setIsRecording(r); setRecorderName(n || 'Host'); };
      const onDisconnect    = ()   => { setIsReconnecting(true); setConnectionStatus('connecting'); };
      const onConnect       = ()   => {
        setIsReconnecting(false);
        socket.emit('rejoin-session', { roomCode, user: { name: currentUser.name, spokenLanguage: selectedLanguage }, previousSocketId: socket.id });
      };

      socket.on('existing-peers',             onExistingPeers);
      socket.on('user-joined',                onUserJoined);
      socket.on('room-participants-update',   onParticipants);
      socket.on('peer-left',                  onPeerLeft);
      socket.on('peer-disconnected',          onPeerDisconnected);
      socket.on('peer-reconnected',           onPeerReconnected);
      socket.on('speaker-translating-status', onTranslating);
      socket.on('live-caption-chunk',         onCaption);
      socket.on('new-chat-message',           onNewChat);
      socket.on('new-reaction',               onReaction);
      socket.on('poll-created',               onPollCreated);
      socket.on('poll-updated',               onPollUpdated);
      socket.on('host-muted-you',             onHostMuted);
      socket.on('removed-by-host',            onRemoved);
      socket.on('waiting-room-update',        onWaitingUpdate);
      socket.on('room-settings-updated',      onRoomSettings);
      socket.on('recording-status-update',    onRecording);
      socket.on('disconnect',                 onDisconnect);
      socket.on('connect',                    onConnect);

      return {
        onExistingPeers, onUserJoined, onParticipants, onPeerLeft, onPeerDisconnected, onPeerReconnected,
        onTranslating, onCaption, onNewChat, onReaction, onPollCreated, onPollUpdated, onHostMuted,
        onRemoved, onWaitingUpdate, onRoomSettings, onRecording, onDisconnect, onConnect
      };
    };

    let cleanupHandlers = null;

    // Fetch TURN credentials securely from backend
    fetch(import.meta.env.VITE_BACKEND_URL + '/api/turn-credentials')
      .then(r => r.json())
      .then(d => {
        cleanupHandlers = initWebRTC(d.iceServers || undefined);
      })
      .catch(err => {
        console.error('[VideoRoom] Failed to fetch TURN servers', err);
        cleanupHandlers = initWebRTC(undefined);
      });

    return () => {
      hasJoinedRef.current = false;
      speechServiceRef.current?.stop();
      socket.emit('leave-session');
      if (rtcManager) rtcManager.destroy();

      if (cleanupHandlers) {
        socket.off('existing-peers',             cleanupHandlers.onExistingPeers);
        socket.off('user-joined',                cleanupHandlers.onUserJoined);
        socket.off('room-participants-update',   cleanupHandlers.onParticipants);
        socket.off('peer-left',                  cleanupHandlers.onPeerLeft);
        socket.off('peer-disconnected',          cleanupHandlers.onPeerDisconnected);
        socket.off('peer-reconnected',           cleanupHandlers.onPeerReconnected);
        socket.off('speaker-translating-status', cleanupHandlers.onTranslating);
        socket.off('live-caption-chunk',         cleanupHandlers.onCaption);
        socket.off('new-chat-message',           cleanupHandlers.onNewChat);
        socket.off('new-reaction',               cleanupHandlers.onReaction);
        socket.off('poll-created',               cleanupHandlers.onPollCreated);
        socket.off('poll-updated',               cleanupHandlers.onPollUpdated);
        socket.off('host-muted-you',             cleanupHandlers.onHostMuted);
        socket.off('removed-by-host',            cleanupHandlers.onRemoved);
        socket.off('waiting-room-update',        cleanupHandlers.onWaitingUpdate);
        socket.off('room-settings-updated',      cleanupHandlers.onRoomSettings);
        socket.off('recording-status-update',    cleanupHandlers.onRecording);
        socket.off('disconnect',                 cleanupHandlers.onDisconnect);
        socket.off('connect',                    cleanupHandlers.onConnect);
      }
    };
  }, [localStream, roomCode, socket.id]);

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
      const cam = localStreamRef.current?.getVideoTracks()[0];
      webrtcManagerRef.current?.peerConnections.forEach(pc =>
        pc.getSenders().find(s => s.track?.kind === 'video')?.replaceTrack(cam).catch(() => {})
      );
      setIsScreenSharing(false);
    } else {
      try {
        const ss = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        const st = ss.getVideoTracks()[0];
        webrtcManagerRef.current?.peerConnections.forEach(pc =>
          pc.getSenders().find(s => s.track?.kind === 'video')?.replaceTrack(st).catch(() => {})
        );
        st.onended = () => {
          setIsScreenSharing(false);
          const cam = localStreamRef.current?.getVideoTracks()[0];
          webrtcManagerRef.current?.peerConnections.forEach(pc =>
            pc.getSenders().find(s => s.track?.kind === 'video')?.replaceTrack(cam).catch(() => {})
          );
        };
        setIsScreenSharing(true);
      } catch (e) { console.warn('[ScreenShare]', e); }
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
          Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `call-${roomCode}-${Date.now()}.webm` }).click();
        };
        mr.start(1000);
        setIsRecording(true);
        socket.emit('recording-status-changed', { isRecording: true, recorderName: currentUser.name });
      } catch (err) { console.warn('[Recording]', err); }
    }
  };

  const handleCopyLink = () => { navigator.clipboard.writeText(shareableJoinUrl); setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2500); };
  const handleWhatsApp = () => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`Join my call!\n${shareableJoinUrl}`)}`, '_blank');
  const triggerReaction = (emoji) => socket.emit('send-reaction', { emoji });
  const sendChat = ({ text, originalLang, file }) => {
    setChatMessages(prev => [...prev, { id: `o-${Date.now()}`, senderId: socket.id, senderName: currentUser.name, senderAvatar: currentUser.avatar, text, translatedText: text, originalLang: originalLang || selectedLanguage, targetLang: selectedLanguage, file, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    socket.emit('send-chat-message', { text, originalLang: selectedLanguage, file });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Build display list
  // ═══════════════════════════════════════════════════════════════════════════
  const allParticipants = [
    {
      id: socket.id || currentUser.id,
      name: currentUser.name || 'You',
      isLocal: true,
      stream: localStream,
      hasVideo: isVideoOn && !!(localStream?.getVideoTracks()[0]),
      trackCount: localStream?.getTracks().length || 0,
      audio: !isMuted,
      spokenLanguage: selectedLanguage
    },
    ...Object.entries(remotePeers).map(([peerId, peer]) => ({
      id: peerId,
      name: peer.name || 'Participant',
      isLocal: false,
      stream: peer.stream || null,
      hasVideo: peer.hasVideo || false,
      trackCount: peer.trackCount || 0,
      audio: true,
      spokenLanguage: peer.spokenLanguage || 'en'
    }))
  ];

  const getGridClass = (n) => {
    if (n <= 1) return 'grid-cols-1 max-w-2xl';
    if (n === 2) return 'grid-cols-1 sm:grid-cols-2 max-w-5xl';
    if (n <= 4)  return 'grid-cols-2 max-w-5xl';
    if (n <= 6)  return 'grid-cols-2 md:grid-cols-3 max-w-6xl';
    return 'grid-cols-3 md:grid-cols-4 max-w-7xl';
  };

  const stMap = {
    alone:      { text: 'Waiting for others…',   cls: 'text-amber-400' },
    connecting: { text: 'Connecting…',            cls: 'text-cyan-400'  },
    connected:  { text: 'Live',                   cls: 'text-emerald-400' },
    waiting:    { text: 'Starting camera…',       cls: 'text-slate-400' },
  };
  const st = stMap[connectionStatus] || stMap.waiting;

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="relative w-full h-[calc(100vh-4rem)] bg-[#05060B] flex overflow-hidden animate-hudMount">
      <div className="scanline-overlay"></div>

      <EmojiReactionsOverlay floatingReactions={floatingReactions} />

      {/* Banners */}
      {isReconnecting && (
        <div className="absolute top-0 inset-x-0 z-50 bg-amber-600/90 text-slate-950 px-4 py-2 text-xs font-extrabold text-center flex items-center justify-center gap-2 backdrop-blur-md">
          <div className="w-3 h-3 rounded-full border-2 border-slate-950 border-t-transparent animate-spin"/>
          Reconnecting…
        </div>
      )}
      {peerBanner && !isReconnecting && (
        <div className="absolute top-0 inset-x-0 z-50 bg-cyan-700/90 text-white px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-2 backdrop-blur-md">
          <AlertCircle className="w-4 h-4 animate-pulse"/> {peerBanner} disconnected (60 s grace)…
        </div>
      )}
      {isRecording && (
        <div className="absolute top-0 inset-x-0 z-50 bg-red-600/90 text-white px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-2 backdrop-blur-md">
          <Disc className="w-4 h-4 animate-pulse"/> 🔴 RECORDING — {recorderName || currentUser.name}
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col relative h-full overflow-hidden z-10">

        {/* Status bar */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-3 marvel-hud px-4 py-2 rounded-2xl shadow-lg animate-hudMount" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center gap-2">

            <span className="text-xs font-bold text-white max-w-[90px] truncate">{roomCode}</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <Users className="w-3.5 h-3.5 text-[#00E5C7]"/>
            <span>{allParticipants.length}</span>
          </div>
          <span className="text-slate-600">|</span>
          <span className={`text-xs font-semibold ${st.cls}`}>{st.text}</span>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <AIStatusIndicator/>
        </div>

        {/* Top right */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 animate-hudMount" style={{ animationDelay: '0.3s' }}>
          <button id="copy-link-btn" onClick={handleCopyLink}
            className="px-3 py-1.5 rounded-xl marvel-hud text-xs font-bold text-slate-200 hover:text-cyan-400 flex items-center gap-1.5 transition-all">
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400"/> : <Copy className="w-3.5 h-3.5 text-cyan-400"/>}
            <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
          </button>
          <button id="wa-btn" onClick={handleWhatsApp}
            className="p-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition-all">
            <Share2 className="w-4 h-4"/>
          </button>
          <button id="qr-btn" onClick={() => setShowQrModal(true)}
            className="px-2.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all">QR</button>
          <div className="flex items-center gap-1 marvel-hud p-1 rounded-xl">
            {['gallery','speaker'].map(m => (
              <button key={m} onClick={() => setLayoutMode(m)}
                className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${layoutMode===m ? 'bg-[#00E5C7] text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}>
                {m === 'gallery' ? <LayoutGrid className="w-3.5 h-3.5"/> : <User className="w-3.5 h-3.5"/>}
                <span className="hidden sm:inline">{m.charAt(0).toUpperCase()+m.slice(1)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Video grid */}
        <div className="flex-1 p-3 md:p-5 flex items-center justify-center overflow-hidden">
          {!localStream ? (
            <div className="flex flex-col items-center gap-4 text-slate-400">
              <div className="w-16 h-16 rounded-full border-2 border-[#00E5C7] border-t-transparent animate-spin"/>
              <p className="text-sm font-semibold">Starting camera…</p>
              <p className="text-xs text-slate-600">Please allow camera & microphone access</p>
            </div>
          ) : allParticipants.length === 1 ? (
            <div className="w-full h-full flex flex-col items-center justify-center relative bg-[#05060B]">
              <div className="w-[300px] h-[300px] mb-8 relative flex items-center justify-center">
                {/* Background radar waves */}
                <div className="absolute inset-0 rounded-full border-2 border-cyan-500/10 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
                <div className="absolute inset-8 rounded-full border-2 border-cyan-500/20 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" style={{ animationDelay: '1s' }}></div>
                <div className="absolute inset-16 rounded-full border-2 border-cyan-500/30 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" style={{ animationDelay: '2s' }}></div>
                
                {/* Center avatar */}
                <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-[#00E5C7]/50 flex items-center justify-center shadow-[0_0_30px_rgba(0,229,199,0.3)] z-10">
                  <User className="w-12 h-12 text-[#00E5C7]" />
                </div>
                
                {/* Floating elements to convey waiting/relaxing */}
                <div className="absolute top-10 left-10 w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center animate-bounce" style={{ animationDuration: '3s' }}>
                  <Coffee className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="absolute bottom-10 right-10 w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }}>
                  <Clock className="w-6 h-6 text-rose-400" />
                </div>
              </div>
              <div className="flex items-center gap-3 bg-[#0A0E1A]/80 backdrop-blur-sm px-6 py-3 rounded-full border border-white/5">
                <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-lg md:text-xl font-medium text-slate-200">
                  {connectionStatus === 'alone' ? 'Waiting for participant to join...' :
                   connectionStatus === 'connecting' ? 'Connecting to peer...' :
                   connectionStatus === 'failed' ? 'Connection failed. Attempting to reconnect...' :
                   'Please wait...'}
                </p>
              </div>

              {/* Mini Self-View like Google Meet */}
              <div className="absolute bottom-4 right-4 w-56 h-36 md:w-72 md:h-48 bg-[#0A0E1A] rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                <VideoTile p={allParticipants[0]} isMuted={isMuted} volumeLevel={volumeLevel} translatingSpeakers={translatingSpeakers} activeDubbingSpeaker={activeDubbingSpeaker} selectedLanguage={selectedLanguage} socketId={socket.id} compact/>
              </div>
            </div>
          ) : layoutMode === 'speaker' && allParticipants.length > 1 ? (
            // Speaker layout
            <div className="w-full h-full max-w-6xl flex flex-col gap-3 items-center justify-center">
              {(() => {
                const main = allParticipants.find(p => !p.isLocal) || allParticipants[0];
                const strip = allParticipants.filter(p => p.id !== main.id);
                return (
                  <>
                    <div className="relative w-full flex-1 max-h-[72vh] bg-[#0A0E1A]/95 rounded-2xl overflow-hidden border border-[#00E5C7]/40 shadow-2xl">
                      <VideoTile p={main} isMuted={isMuted} volumeLevel={volumeLevel} translatingSpeakers={translatingSpeakers} activeDubbingSpeaker={activeDubbingSpeaker} selectedLanguage={selectedLanguage} socketId={socket.id} large/>
                    </div>
                    <div className="w-full flex items-center justify-center gap-3 overflow-x-auto py-1">
                      {strip.map(p => (
                        <div key={p.id} className="relative w-36 h-24 flex-shrink-0 bg-[#0A0E1A]/90 rounded-xl overflow-hidden border border-white/10">
                          <VideoTile p={p} isMuted={isMuted} volumeLevel={volumeLevel} translatingSpeakers={translatingSpeakers} activeDubbingSpeaker={activeDubbingSpeaker} selectedLanguage={selectedLanguage} socketId={socket.id} compact/>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            // Gallery grid
            <div className={`w-full h-full grid gap-3 md:gap-4 items-center justify-center ${getGridClass(allParticipants.length)}`}>
              {allParticipants.map(p => (
                <VideoTile key={p.id} p={p} isMuted={isMuted} volumeLevel={volumeLevel}
                  translatingSpeakers={translatingSpeakers} activeDubbingSpeaker={activeDubbingSpeaker}
                  selectedLanguage={selectedLanguage} socketId={socket.id} iceState={p.iceState}/>
              ))}
            </div>
          )}
        </div>

        {/* --- Modals and Overlays --- */}
        <VoiceConsentModal
          isOpen={showConsentModal}
          onAccept={() => {
            setVoiceCloningEnabled(true);
            setShowConsentModal(false);
            // Optionally, we could capture the first 5 seconds of audio here for the voice clone reference
          }}
          onDecline={() => {
            setVoiceCloningEnabled(false);
            setShowConsentModal(false);
          }}
        />

        {/* Captions */}
        {showCaptions && localStream && (
          <DualCaptionsOverlay currentCaption={currentCaption} targetLangCode={selectedLanguage} languages={languages} userSettings={userSettings}/>
        )}

        {/* Control bar */}
        <div className="h-20 marvel-hud rounded-t-3xl border-t border-cyan-500/30 px-3 sm:px-8 flex items-center justify-between z-30 shadow-2xl animate-hudMount" style={{ animationDelay: '0.5s' }}>
          {/* Left */}
          <div className="flex items-center gap-2">
            <CtrlBtn id="mute-btn" onClick={toggleMute} active={isMuted} color="rose" title={isMuted ? 'Unmute' : 'Mute'}>
              {isMuted ? <MicOff className="w-5 h-5"/> : <Mic className="w-5 h-5 text-[#00E5C7]"/>}
            </CtrlBtn>
            <CtrlBtn id="video-btn" onClick={toggleVideo} active={!isVideoOn} color="rose" title="Toggle camera">
              {isVideoOn ? <VideoIcon className="w-5 h-5 text-[#00E5C7]"/> : <VideoOff className="w-5 h-5"/>}
            </CtrlBtn>
            <CtrlBtn id="blur-btn" onClick={() => setIsBlurActive(!isBlurActive)} active={isBlurActive} color="indigo" title="Toggle background blur">
              <ImageIcon className={`w-5 h-5 ${isBlurActive ? 'text-white' : 'text-[#00E5C7]'}`}/>
            </CtrlBtn>
            <CtrlBtn id="screen-btn" onClick={toggleScreenShare} active={isScreenSharing} color="indigo" title="Share screen">
              <Monitor className="w-5 h-5"/>
            </CtrlBtn>
            <CtrlBtn id="record-btn" onClick={toggleRecording} active={isRecording} color="red" title="Record">
              <Disc className={`w-5 h-5 ${isRecording ? '' : 'text-rose-400'}`}/>
            </CtrlBtn>
          </div>
          {/* Center */}
          <div className="flex items-center gap-2">
            <button id="captions-btn" onClick={() => setShowCaptions(!showCaptions)}
              className={`px-3 py-2.5 rounded-2xl font-semibold text-xs flex items-center gap-1.5 transition-all border ${showCaptions ? 'bg-[#00E5C7]/20 text-[#00E5C7] border-[#00E5C7]/40' : 'bg-slate-800 text-slate-400 border-white/10 hover:text-white'}`}>
              <Sparkles className="w-4 h-4"/><span className="hidden sm:inline">Captions</span>
            </button>
            <div className="hidden md:flex items-center gap-1 bg-slate-900 p-1.5 rounded-2xl border border-white/10">
              {['👏','❤️','🎉','👍','💡'].map(e => <button key={e} onClick={() => triggerReaction(e)} className="hover:scale-125 transition-transform p-1 text-lg">{e}</button>)}
            </div>
            <button id="polls-btn" onClick={() => setIsPollsOpen(true)} className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10" title="Polls">
              <BarChart2 className="w-5 h-5 text-indigo-400"/>
            </button>
            <button id="activities-btn" onClick={() => setIsActivitiesOpen(!isActivitiesOpen)} className={`p-3 rounded-2xl transition-all ${isActivitiesOpen ? 'bg-amber-500 text-slate-900 font-bold' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10'}`} title="Activities">
              <LayoutGrid className="w-5 h-5"/>
            </button>
          </div>
          {/* Right */}
          <div className="flex items-center gap-2">
            <button id="host-btn" onClick={() => setIsHostControlsOpen(true)} className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-[#00E5C7] border border-[#00E5C7]/30 transition-all" title="Host controls">
              <Shield className="w-5 h-5"/>
            </button>
            <button id="chat-btn" onClick={() => setIsChatOpen(!isChatOpen)} className={`p-3 rounded-2xl transition-all relative ${isChatOpen ? 'bg-indigo-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10'}`} title="Chat">
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

      {/* Panels */}
      <InCallChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} messages={chatMessages} onSendMessage={sendChat} selectedLanguage={selectedLanguage} languages={languages}/>
      <RoomActivities isOpen={isActivitiesOpen} onClose={() => setIsActivitiesOpen(false)} socket={socket} roomCode={roomCode} currentUser={currentUser} />
      <HostControlsModal 
        isOpen={isHostControlsOpen} 
        onClose={() => setIsHostControlsOpen(false)}
        voiceCloningEnabled={voiceCloningEnabled}
        onToggleVoiceCloning={() => setVoiceCloningEnabled(!voiceCloningEnabled)}
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
            <p className="text-xs text-slate-400">No app needed — scan and join instantly.</p>
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
// CtrlBtn
// ─────────────────────────────────────────────────────────────────────────────
function CtrlBtn({ id, onClick, active, color = 'rose', title, children }) {
  const colors = { rose: 'bg-rose-500 shadow-rose-500/30', indigo: 'bg-indigo-600 shadow-indigo-500/30', red: 'bg-red-600 shadow-red-500/30 animate-pulse' };
  return (
    <button id={id} onClick={onClick} title={title}
      className={`p-3 rounded-2xl transition-all shadow-lg ${active ? `${colors[color]} text-white` : 'bg-slate-800 hover:bg-slate-700 text-white border border-white/10'}`}>
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VideoTile — renders one participant's video + audio
// ─────────────────────────────────────────────────────────────────────────────
function VideoTile({ p, isMuted, volumeLevel, translatingSpeakers, activeDubbingSpeaker, selectedLanguage, socketId, large = false, compact = false, iceState }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !p.stream) return;

    el.srcObject = p.stream;
    el.play().catch(() => {});

    const onAddTrack = () => {
      el.srcObject = p.stream;
      el.play().catch(() => {});
    };
    p.stream.addEventListener('addtrack', onAddTrack);
    return () => p.stream.removeEventListener('addtrack', onAddTrack);
  }, [p.stream, p.trackCount]);

  const isTranslating = translatingSpeakers[p.id] || (p.isLocal && translatingSpeakers[socketId]);
  const isDubbing     = activeDubbingSpeaker === p.id;
  const isSpeaking    = p.isLocal ? (!isMuted && volumeLevel > 0.05) : p.audio;

  let ring = 'border border-white/10';
  if (isDubbing || isTranslating) ring = 'ring-4 ring-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.6)] animate-pulse';
  else if (isSpeaking)            ring = 'ring-4 ring-[#00E5C7] shadow-[0_0_25px_rgba(0,229,199,0.5)]';

  const wrapClass = compact ? 'absolute inset-0 w-full h-full' : large ? 'w-full h-full' : 'relative w-full min-h-[200px] max-h-[360px] md:min-h-[240px] md:max-h-[380px]';
  const videoActive = p.hasVideo && p.isVideoActive !== false;

  return (
    <div className={`${wrapClass} bg-[#0A0E1A]/90 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center relative transition-all duration-300 ${ring}`}>
      {/* Video element ALWAYS in DOM so WebRTC audio plays */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={p.isLocal}
        style={{ display: videoActive && p.stream ? 'block' : 'none' }}
        className={`w-full h-full object-cover ${p.isLocal ? '-scale-x-100' : ''}`}
      />

      {/* Avatar fallback */}
      {(!videoActive || !p.stream) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className={`rounded-full bg-gradient-to-br from-indigo-900 to-slate-800 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-200
            ${compact ? 'w-10 h-10 text-base' : large ? 'w-28 h-28 text-5xl' : 'w-20 h-20 text-3xl'}`}>
            {(p.name || 'P').charAt(0).toUpperCase()}
          </div>
          {!compact && <span className={`font-bold text-white ${large ? 'text-lg' : 'text-sm'}`}>{p.name}{p.isLocal ? ' (You)' : ''}</span>}
          {(!compact && !p.isLocal) && (
            <span className="text-xs text-slate-500 animate-pulse">
              {!p.stream ? `Connecting video… (${iceState || 'new'})` : ''}
            </span>
          )}
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

      {/* Name tag and Controls */}
      {!compact && (
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <div className="bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-xl border border-white/10 text-xs font-bold text-white flex items-center gap-2">
            <span>{p.name || 'Participant'}{p.isLocal ? ' (You)' : ''}</span>
            <span className="text-[10px] bg-[#00E5C7]/20 text-[#00E5C7] px-1.5 py-0.5 rounded font-mono uppercase">{p.isLocal ? selectedLanguage : (p.spokenLanguage || 'en')}</span>
            {p.isLocal && isMuted && <MicOff className="w-3.5 h-3.5 text-rose-400"/>}
          </div>
          

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
