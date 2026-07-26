# LinguaVersa — Implementation Plan Roadmap

## Phased Execution Overview

1. **Phase 0 — P0 Reliability & Fallbacks**: Piper primary + `edge-tts` fallback (`tts_engines.py`), latency metering (`AiMetric`), TURN relay configuration (`render.yaml`).
2. **Phase 1 + Design Pass — Host Controls & Sci-Fi HUD Visuals**: Host controls (`HostControlsModal.jsx`), waiting room admit queue, lock room, Marvel HUD 3D canvas suite (`HoloEarth.jsx`, `VoiceParticles.jsx`, `ChatBotOrb.jsx`, `AIBrain.jsx`).
3. **Phase 2 — Screen Share & Video Layouts**: WebRTC track swapping (`VideoRoom.jsx`), gallery/speaker layout modes, active speaker glowing teal border, virtual background blur.
4. **Phase 3 — Collaboration**: Floating emoji reactions (`EmojiReactionsOverlay`), translated chat file attachments (`InCallChat.jsx`), live polls (`PollsModal`), Prisma models (`Poll`, `PollOption`, `PollVote`).
5. **Phase 4 — Recording & Summary Polish**: Executive AI meeting summary (`MeetingSummaryView.jsx`), key points, interactive action items checklist, searchable dual transcript.
6. **Phase 5 — Virtual Backgrounds**: Canvas virtual blur background toggle.
7. **Phase 6 — Calendar & Invites Polish**: `ScheduleMeetingModal.jsx` & `MeetingCreatedModal.jsx` with meeting code, Copy Link, and WhatsApp sharing.
8. **Phase 7 — Admin Telemetry & Metrics**: `AdminAnalytics.jsx`, P75 latency meter (<2.5s target tracking), stage latency breakdown, translated minutes, language distribution graphs.
