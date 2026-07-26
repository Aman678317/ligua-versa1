# LinguaVersa — Technical Requirements Document (TRD)

**Version:** 1.0 · Companion to the PRD.

## 1. System architecture

```
┌──────────────────────┐        HTTPS/WSS        ┌───────────────────────┐
│ Frontend              │◄───────────────────────►│ Backend               │
│ React 18 + Vite        │                        │ Express/NestJS Gateway│
│ 3D Cinematic Canvas   │                        │ + Prisma ORM          │
│ Deployed on Vercel     │                        │ Deployed on Render     │
└───────────┬────────────┘                        └──────────┬────────────┘
            │ WebRTC (audio/video, P2P via STUN/TURN)          │ internal REST/WS
            │ raw audio stream → ai-service                    ▼
            ▼                                          ┌───────────────────────┐
      Peer <-> Peer                                    │ ai-service             │
      (browser-to-browser                              │ FastAPI, Python         │
       media path)                                      │ VAD → Whisper STT →     │
                                                         │ Translation → TTS       │
                                                         │ (Piper primary,         │
                                                         │  edge-tts fallback)      │
                                                         │ Deployed on Render      │
                                                         └───────────────────────┘
```

Three independently deployable services. Media flows peer-to-peer over WebRTC; a parallel audio stream is sent to `ai-service` for the translation pipeline. Signaling flows through the WebSocket Gateway (`meeting.gateway.ts`).

## 2. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React + Vite, Three.js 3D Canvas visualizers | Deployed on Vercel |
| Backend | Express / NestJS structure, Prisma ORM | Deployed on Render |
| Realtime signaling | WebSocket (Socket.IO / `meeting.gateway.ts`) | Room & WebRTC relay |
| Media transport | WebRTC (P2P), STUN + TURN | Cross-network reliability |
| AI service | FastAPI (Python) | Deployed on Render |
| STT | Whisper (streaming) | `whisper_stream.py` |
| VAD | Voice Activity Detector | `vad.py` |
| Translation | Neural Machine Translation (NMT) | Dynamic fallback bridge |
| TTS | Piper (primary), edge-tts (fallback) | `tts_engines.py` |
| Auth | JWT + Google OAuth | `AuthModal.jsx` |
| DB | PostgreSQL / SQLite via Prisma | Full schema in doc 05 |

## 3. Non-functional requirements

| Requirement | Target |
|---|---|
| Speech→translated-speech latency (P75) | ≤ 2.5s, broken down as STT ≤ 800ms, MT ≤ 400ms, TTS ≤ 800ms, network ≤ 500ms |
| Call setup success rate (same network) | ≥ 99% |
| Call setup success rate (cross-network) | ≥ 95% |
| Concurrent participants per meeting | 2–12 |

## 4. Observability

- `SystemMetric`: CPU/memory/socket health.
- `TranslationMetric`: per-translation latency + success.
- `MeetingMetric`: per-meeting duration/participants.
- `ErrorLog`: structured errors tagged by service (`webrtc`, `translation`, `speech`, `db`, `socket`).
- `AiMetric` / `ChatAnalytics`: cost and latency breakdown.
