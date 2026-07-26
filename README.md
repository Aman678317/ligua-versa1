# LinguaVersa — Live Speech Translation Video Calling Platform

A real-time video-calling platform where every participant speaks and hears their own language in real time — featuring live speech-to-speech translation, dual-language captions, AI meeting summaries, host controls, screen sharing, and an admin telemetry dashboard.

---

## 🌟 Key Features

- **Real-Time Live Speech Translation**: End-to-end P75 speech-to-translated-speech latency under 2.5 seconds (Whisper-v3 STT → NMT → Piper TTS primary + edge-tts fallback).
- **Dual-Language Live Captions**: Displays spoken original language and target translated language simultaneously with speech wave pulse and latency meter.
- **Marvel HUD Sci-Fi Command Center Visuals**: 3D Holographic Earth globe, voice-amplitude reactive particles, pulsing AI core orb, and 20px glass blur panels.
- **Audio Ducking System**: Automatically ducks original spoken audio volume to 30% during active translated voice playback.
- **Host Security Controls**: Waiting room queue, lock meeting toggle, mute-all broadcast, and participant removal.
- **In-Call Collaboration**: Live translated chat, floating emoji reactions, and live poll creation & voting.
- **AI Post-Call Summaries**: Executive overview, discussion points, interactive action items checklist with assignees, and searchable dual transcript.
- **Admin Telemetry Dashboard**: Real-time monitoring of P75 latency, pipeline stage breakdown (STT, NMT, TTS), translated minutes, and live language distribution.

---

## 🏗️ Architecture

- **Frontend**: React 18 + Vite, Three.js 3D Canvas visualizers, TailwindCSS styling.
- **Backend Server**: Express & Socket.io WebSocket Gateway (`meeting.gateway.ts`), Prisma ORM.
- **AI Microservice**: Python FastAPI service (`ai-service/`) for VAD, Whisper STT streaming, and Piper/Edge-TTS synthesis.

---

## 🚀 Quick Start

### 1. Start Node Backend & React Frontend
```bash
npm install
npm run server   # Express & WebSocket server on http://localhost:3001
npm run dev      # Vite frontend on http://localhost:5173
```

### 2. Start Python AI Microservice & Run Pytest Suite
```bash
cd ai-service
pip install fastapi uvicorn pytest
pytest tests/test_pipeline.py
uvicorn main:app --port 8000
```
