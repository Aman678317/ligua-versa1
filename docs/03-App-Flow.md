# LinguaVersa — App Flow Document

Maps every major user journey to screens/components and backend events.

## 1. Auth flow
```
Landing (Hero) → AuthModal.jsx (Sign In / Sign Up)
   ├─ Email/password → JWT issued
   └─ Google OAuth → JWT issued
→ DashboardLayout.jsx
```

## 2. Schedule a meeting
```
DashboardLayout.jsx → "Schedule Call" → ScheduleMeetingModal.jsx
   → sets title, time, agenda, default spoken/target language
   → MeetingCreatedModal.jsx shows meeting code + Copy Invite Link + Share on WhatsApp
```

## 3. Join a meeting
```
Invite link (/meet/:meetingCode) → VideoRoom.jsx mounts
   → socket connects to meeting.gateway.ts, joins room
   → if waitingRoom === true: held in waiting queue → host admits via HostControlsModal.jsx
   → WebRTC offer/answer/ICE exchange completes
```

## 4. Live translation pipeline
```
Mic audio → VAD (vad.py) → Whisper STT (whisper_stream.py) → NMT Translation → TTS (tts_engines.py)
   → DualCaptionsOverlay.jsx renders original + target text
   → SoundAudioSystem.js ducks original spoken audio to 30% during TTS playback
```

## 5. End of call & summary
```
Host ends call → Meeting status COMPLETED
   → MeetingSummaryView.jsx displays executive overview, key points, action items, and searchable dual-language transcript
```
