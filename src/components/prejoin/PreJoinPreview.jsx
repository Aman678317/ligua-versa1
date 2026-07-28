import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Video as VideoIcon, VideoOff, Settings, Volume2, 
  Sparkles, ShieldCheck, ArrowRight, CameraOff, AlertCircle, User, Image as ImageIcon
} from 'lucide-react';
import PermissionBanner from '../call/PermissionBanner';
import { AudioMixer } from '../../utils/AudioMixer';

export default function PreJoinPreview({ roomCode, currentUser, sessionStatus = 'VALID', selectedLanguage, setSelectedLanguage, languages, onJoinCall, onCancel }) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isBlurActive, setIsBlurActive] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [permissionErrorType, setPermissionErrorType] = useState(null);

  // Hardware Devices State
  const [videoDevices, setVideoDevices] = useState([]);
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState('');
  const [selectedAudioDevice, setSelectedAudioDevice] = useState('');

  // Guest Name & Waiting Room State
  const [guestName, setGuestName] = useState(currentUser?.name || '');
  const [isWaitingForHost, setIsWaitingForHost] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const videoRef = useRef(null);
  const audioMixerRef = useRef(null);

  // 1. Media Stream Capture & Device Enumeration
  const requestDevicesAndStream = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(d => d.kind === 'videoinput');
      const audioInputs = devices.filter(d => d.kind === 'audioinput');

      setVideoDevices(videoInputs);
      setAudioDevices(audioInputs);

      if (videoInputs.length > 0 && !selectedVideoDevice) setSelectedVideoDevice(videoInputs[0].deviceId);
      if (audioInputs.length > 0 && !selectedAudioDevice) setSelectedAudioDevice(audioInputs[0].deviceId);

      const constraints = {
        video: selectedVideoDevice ? { deviceId: { exact: selectedVideoDevice } } : true,
        audio: selectedAudioDevice ? { deviceId: { exact: selectedAudioDevice } } : true
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      setPermissionErrorType(null);

      const mixer = new AudioMixer();
      audioMixerRef.current = mixer;
      mixer.initialize(stream);
    } catch (err) {
      console.warn('[PreJoin Media Capture Error]', err);
      try {
        const audioOnly = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        setLocalStream(audioOnly);
        setIsVideoOn(false);
        setPermissionErrorType(null);
      } catch (audioErr) {
        setPermissionErrorType(audioErr.name || err.name || 'NotAllowedError');
      }
    }
  };

  useEffect(() => {
    requestDevicesAndStream();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (audioMixerRef.current) {
        audioMixerRef.current.stop();
      }
    };
  }, [selectedVideoDevice, selectedAudioDevice]);

  // Attach stream to video node with optional blur
  const animFrameId = useRef(null);

  useEffect(() => {
    if (!videoRef.current || !localStream || !isVideoOn) return;

    if (!isBlurActive) {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      videoRef.current.srcObject = localStream;
      videoRef.current.play().catch(() => {});
      return;
    }

    // Apply Blur Effect for Preview
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    
    const hiddenVideo = document.createElement('video');
    hiddenVideo.muted = true;
    hiddenVideo.srcObject = localStream;
    hiddenVideo.play().catch(() => {});

    const draw = () => {
      if (ctx && hiddenVideo.readyState >= 2) {
         ctx.filter = 'blur(10px)';
         ctx.drawImage(hiddenVideo, 0, 0, 640, 480);
      }
      animFrameId.current = requestAnimationFrame(draw);
    };
    draw();

    const processedStream = canvas.captureStream(30);
    videoRef.current.srcObject = processedStream;
    videoRef.current.play().catch(() => {});

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      hiddenVideo.srcObject = null;
    };
  }, [localStream, isVideoOn, isBlurActive]);

  // Audio level meter loop
  useEffect(() => {
    const levelInterval = setInterval(() => {
      if (audioMixerRef.current && !isMuted) {
        setAudioLevel(audioMixerRef.current.getVolumeLevel());
      } else {
        setAudioLevel(0);
      }
    }, 100);

    return () => clearInterval(levelInterval);
  }, [isMuted]);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => t.enabled = isMuted);
    }
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(t => t.enabled = !isVideoOn);
    }
    setIsVideoOn(!isVideoOn);
  };

  const handleJoinClick = () => {
    const finalName = guestName.trim() || 'Guest Participant';
    onJoinCall(roomCode, { name: finalName, spokenLanguage: selectedLanguage, blurBackground: isBlurActive });
  };

  if (sessionStatus === 'LOADING') {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[#05060B] flex items-center justify-center p-4 sm:p-8 font-sans">
        <div className="max-w-md w-full p-8 bg-[#0A0E1A]/90 backdrop-blur-xl rounded-3xl border border-white/10 text-center space-y-6 shadow-2xl">
          <div className="w-12 h-12 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin mx-auto"></div>
          <div>
            <h2 className="text-xl font-bold text-white">Validating Call Link...</h2>
            <p className="text-xs text-slate-400 mt-2">Checking session status and room availability.</p>
          </div>
        </div>
      </div>
    );
  }

  if (sessionStatus && sessionStatus !== 'VALID') {
    const errorMessages = {
      EXPIRED: { title: 'Call Link Expired', desc: 'This call link is no longer active (links expire after 24 hours).' },
      FULL: { title: 'Call is Full', desc: 'This call already has the maximum 2 participants connected.' },
      ENDED: { title: 'Call Has Ended', desc: 'This call session has already concluded.' },
      INVALID: { title: 'Invalid Call Link', desc: 'The requested call session link does not exist.' }
    };
    const info = errorMessages[sessionStatus] || errorMessages.INVALID;

    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[#05060B] flex items-center justify-center p-4 sm:p-8 font-sans">
        <div className="max-w-md w-full p-8 bg-[#0A0E1A]/90 backdrop-blur-xl rounded-3xl border border-white/10 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-white">{info.title}</h2>
            <p className="text-xs text-slate-400 mt-2">{info.desc}</p>
          </div>
          <button
            onClick={onCancel}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg transition-all"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#05060B] flex items-center justify-center p-4 sm:p-8 font-sans selection:bg-[#00E5C7] selection:text-slate-950">
      
      <div className="w-full max-w-5xl bg-[#0A0E1A]/90 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Column: Live Greenroom Self-View Box */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          
          <div className="relative w-full h-[320px] sm:h-[380px] bg-slate-950 rounded-2xl border border-white/10 overflow-hidden shadow-2xl flex items-center justify-center group">
            {isVideoOn && localStream ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-slate-400">
                <div className="w-24 h-24 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-3xl font-bold text-slate-200">
                  {guestName ? guestName.charAt(0).toUpperCase() : <User className="w-10 h-10" />}
                </div>
                <span className="text-xs font-semibold text-slate-400">Camera turned off</span>
              </div>
            )}

            {/* Bottom Overlay Media Controls */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-3 bg-slate-950/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 shadow-lg">
              <button
                onClick={toggleMute}
                className={`p-3 rounded-xl transition-all ${
                  isMuted ? 'bg-rose-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-cyan-400'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <button
                onClick={toggleVideo}
                className={`p-3 rounded-xl transition-all ${
                  !isVideoOn ? 'bg-rose-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-cyan-400'
                }`}
                title={isVideoOn ? 'Turn Camera Off' : 'Turn Camera On'}
              >
                {isVideoOn ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>
              
              <button
                onClick={() => setIsBlurActive(!isBlurActive)}
                className={`p-3 rounded-xl transition-all ${
                  isBlurActive ? 'bg-indigo-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-cyan-400'
                }`}
                title="Toggle Background Blur"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Live Audio Meter Indicator */}
            <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2 text-xs text-slate-200">
              <Volume2 className={`w-4 h-4 ${audioLevel > 15 ? 'text-[#00E5C7]' : 'text-slate-500'}`} />
              <div className="w-20 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#00E5C7] to-cyan-400 transition-all duration-75"
                  style={{ width: `${Math.min(100, audioLevel * 1.5)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Explicit Permission Error Banner */}
          {permissionErrorType && (
            <PermissionBanner
              errorType={permissionErrorType}
              onRetry={requestDevicesAndStream}
            />
          )}

          {/* Hardware Device Selection Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Camera Device</label>
              <select
                value={selectedVideoDevice}
                onChange={(e) => setSelectedVideoDevice(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#00E5C7]/50"
              >
                {videoDevices.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0, 5)}`}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Microphone Device</label>
              <select
                value={selectedAudioDevice}
                onChange={(e) => setSelectedAudioDevice(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#00E5C7]/50"
              >
                {audioDevices.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label || `Microphone ${d.deviceId.slice(0, 5)}`}</option>
                ))}
              </select>
            </div>
          </div>

        </div>

        {/* Right Column: Pre-Join Call Settings & Join Action */}
        <div className="lg:col-span-5 flex flex-col space-y-6">
          
          <div>
            <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[#00E5C7] text-xs font-mono uppercase font-bold">
              Ready to Join
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">Greenroom Check</h2>
            <p className="text-xs text-slate-400 mt-1">Meeting Code: <span className="font-mono text-cyan-300 font-bold">{roomCode}</span></p>
          </div>

          {/* Guest Display Name Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Your Display Name</label>
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Enter your name to join..."
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00E5C7]/50"
            />
          </div>

          {/* Preferred Spoken Language Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#00E5C7]" /> Your Spoken Language (for Live Translation)
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E5C7]/50"
            >
              {languages.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.flag} {lang.name} ({lang.nativeName})</option>
              ))}
            </select>
          </div>

          {/* Join Action Buttons */}
          <div className="pt-4 space-y-3">
            <button
              onClick={handleJoinClick}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#00E5C7] to-cyan-500 hover:from-cyan-400 hover:to-[#00E5C7] text-slate-950 font-extrabold text-base flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/20 transition-all transform active:scale-98"
            >
              <span>Join now</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <button
              onClick={onCancel}
              className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white font-bold text-xs transition-colors"
            >
              Cancel & Return Home
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
