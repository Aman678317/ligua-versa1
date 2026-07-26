import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Video as VideoIcon, VideoOff, Monitor, PhoneOff, 
  MessageSquare, Shield, Smile, BarChart2, Sparkles, Users, LayoutGrid, User, Sliders
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
import { getSocket } from '../../services/socket';

export default function VideoRoom({ roomCode, currentUser, selectedLanguage, setSelectedLanguage, languages, userSettings, onLeaveCall }) {
  const socket = getSocket();

  // Call & Media States
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isBlurBackground, setIsBlurBackground] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);
  const [layoutMode, setLayoutMode] = useState('gallery'); // 'gallery' | 'speaker'

  // 3D Canvas & Audio Mixer State
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [frequencyData, setFrequencyData] = useState([]);
  const audioMixerRef = useRef(null);
  const captionSyncRef = useRef(new CaptionSynchronizer(2500));

  // Drawers & Modals
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isHostControlsOpen, setIsHostControlsOpen] = useState(false);
  const [isPollsOpen, setIsPollsOpen] = useState(false);

  // Realtime Room State
  const [participants, setParticipants] = useState([
    { socketId: 'self', id: currentUser.id, name: `${currentUser.name} (You)`, avatar: currentUser.avatar, isHost: true, spokenLanguage: selectedLanguage },
    { socketId: 'p-kenji', id: 'user-kenji', name: 'Kenji Sato', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', isHost: false, spokenLanguage: 'ja' },
    { socketId: 'p-priya', id: 'user-priya', name: 'Priya Patel', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', isHost: false, spokenLanguage: 'hi' },
    { socketId: 'p-elena', id: 'user-elena', name: 'Elena Rostova', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150', isHost: false, spokenLanguage: 'de' },
  ]);

  const [waitingRoomList, setWaitingRoomList] = useState([]);
  const [roomSettings, setRoomSettings] = useState({ isLocked: false, waitingRoomEnabled: false });
  const [chatMessages, setChatMessages] = useState([]);
  const [polls, setPolls] = useState([]);
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [currentCaption, setCurrentCaption] = useState({
    id: 'c-init',
    speakerId: 'user-kenji',
    speakerName: 'Kenji Sato',
    sourceLang: 'ja',
    targetLang: selectedLanguage,
    originalText: 'みなさんこんにちは、リアルタイム音声翻訳のテストを行っています。',
    translatedText: selectedLanguage === 'ja' 
      ? 'みなさんこんにちは、リアルタイム音声翻訳のテストを行っています。'
      : selectedLanguage === 'hi'
      ? 'आप सभी को नमस्कार, हम वास्तविक समय भाषण अनुवाद का परीक्षण कर रहे हैं।'
      : 'Hello everyone, we are testing live real-time speech translation.',
    timestamp: new Date().toISOString(),
    metrics: { sttLatencyMs: 140, nmtLatencyMs: 220, ttsLatencyMs: 280, totalLatencyMs: 640 }
  });

  const localVideoRef = useRef(null);

  // Initialize Local Media Stream & Audio Mixer
  useEffect(() => {
    const mixer = new AudioMixer();
    audioMixerRef.current = mixer;

    navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        mixer.initialize(stream);
      })
      .catch((err) => console.log('Camera simulation active:', err));

    // Audio spectrum animation loop
    const spectrumInterval = setInterval(() => {
      if (mixer) {
        setVolumeLevel(mixer.getVolumeLevel());
        setFrequencyData(mixer.getFrequencySpectrum());
      }
    }, 100);

    return () => {
      clearInterval(spectrumInterval);
      mixer.stop();
    };
  }, []);

  // Socket Connection & Realtime Listeners
  useEffect(() => {
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

    socket.on('room-participants-update', (list) => {
      if (list && list.length > 0) setParticipants(list);
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
  }, [roomCode]);

  // Simulate Live Spoken Speech Chunk Broadcast
  useEffect(() => {
    const simulationInterval = setInterval(() => {
      if (isMuted) return;

      const samplePhrases = [
        { text: 'Hello everyone, welcome to LinguaVersa!', lang: 'en', speaker: 'Aman Sharma' },
        { text: 'みなさんこんにちは、LinguaVersaへようこそ！', lang: 'ja', speaker: 'Kenji Sato' },
        { text: 'आप सभी का लिंगुआवर्सा में स्वागत है!', lang: 'hi', speaker: 'Priya Patel' },
        { text: '¡Hola a todos, bienvenidos a LinguaVersa!', lang: 'es', speaker: 'Elena Rostova' }
      ];

      const chosen = samplePhrases[Math.floor(Math.random() * samplePhrases.length)];

      socket.emit('speech-chunk', {
        text: chosen.text,
        sourceLang: chosen.lang,
        targetLang: selectedLanguage,
        speakerName: chosen.speaker,
        speakerId: chosen.speaker
      });
    }, 7000);

    return () => clearInterval(simulationInterval);
  }, [selectedLanguage, isMuted]);

  // Reactions Handler
  const triggerEmojiReaction = (emoji) => {
    socket.emit('send-reaction', { emoji });
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
          <AIStatusIndicator />
        </div>

        {/* Layout Mode Switcher */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-1 bg-[#0A0E1A]/80 backdrop-blur-md p-1 rounded-xl border border-white/10">
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

        {/* Video Grid */}
        <div className="flex-1 p-4 md:p-6 flex items-center justify-center">
          
          {layoutMode === 'gallery' ? (
            /* Gallery Grid */
            <div className="w-full h-full max-w-6xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 items-center justify-center">
              
              {/* Local Participant Video Box */}
              <div className={`relative w-full h-full min-h-[220px] max-h-[340px] bg-[#0A0E1A]/90 backdrop-blur-md rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center group ${
                !isMuted ? 'ring-2 ring-[#00E5C7] shadow-cyan-500/30' : ''
              }`}>
                {isVideoOn ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover transform -scale-x-100 transition-all ${
                      isBlurBackground ? 'blur-md scale-105' : ''
                    }`}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <img src={currentUser.avatar} className="w-20 h-20 rounded-full ring-4 ring-indigo-500/40 object-cover" alt="" />
                    <span className="text-sm font-bold text-white">{currentUser.name}</span>
                  </div>
                )}

                {/* Name Tag */}
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

              {/* Remote Participants */}
              {participants.filter(p => p.socketId !== 'self').map((p, idx) => (
                <div 
                  key={p.socketId || idx}
                  className="relative w-full h-full min-h-[220px] max-h-[340px] bg-[#0A0E1A]/90 backdrop-blur-md rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center group"
                >
                  <img
                    src={p.avatar}
                    alt={p.name}
                    className="w-full h-full object-cover"
                  />

                  {/* Dynamic Active Speaker Ring */}
                  <div className="absolute inset-0 border-2 border-indigo-500/30 rounded-2xl pointer-events-none group-hover:border-[#00E5C7] transition-all"></div>

                  <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-xl border border-white/10 text-xs font-bold text-white flex items-center gap-2">
                    <span>{p.name}</span>
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-mono uppercase">
                      {p.spokenLanguage || 'ja'}
                    </span>
                  </div>
                </div>
              ))}

            </div>
          ) : (
            /* Speaker Focus View */
            <div className="w-full h-full max-w-5xl relative bg-[#0A0E1A]/90 backdrop-blur-md rounded-3xl overflow-hidden border border-white/10 flex items-center justify-center">
              <img
                src={participants[1]?.avatar || currentUser.avatar}
                className="w-full h-full object-cover"
                alt=""
              />
              <div className="absolute bottom-6 left-6 bg-slate-950/90 backdrop-blur-lg px-4 py-2 rounded-2xl border border-[#00E5C7]/40 text-sm font-bold text-white flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-[#00E5C7] animate-pulse" />
                <span>Active Speaker: {participants[1]?.name || 'Kenji Sato'}</span>
              </div>
            </div>
          )}

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
          
          {/* Audio / Video Toggles */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsMuted(!isMuted)}
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
              onClick={() => setIsVideoOn(!isVideoOn)}
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

          {/* Center Call Features (Captions, Reactions, Polls) */}
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

            {/* Quick Emoji Reaction Buttons */}
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

          {/* Right Action Group (Host Controls, Chat, Leave Call) */}
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

      {/* In-Call Chat Drawer */}
      <InCallChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={chatMessages}
        onSendMessage={({ text, originalLang, file }) => {
          socket.emit('send-chat-message', { text, originalLang, file });
        }}
        selectedLanguage={selectedLanguage}
        languages={languages}
      />

      {/* Host Controls Modal */}
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

      {/* Polls Modal */}
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
