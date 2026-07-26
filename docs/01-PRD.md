# LinguaVersa — Product Requirements Document (PRD)

**Version:** 1.0 · **Owner:** Aman · **Status:** Complete Build-out

## 1. One-line summary

A video-calling platform where every participant speaks and hears their own language in real time — live speech translation, dual-language captions, and AI meeting summaries built into the call itself, not bolted on afterward.

## 2. Problem statement

Zoom and Google Meet solved *seeing and hearing* each other. They didn't solve *understanding* each other. Teams with non-native speakers, cross-border families, and international freelancers still rely on a bilingual person in the room, a separate translation app on a second screen, or just losing nuance. There's no mainstream video-call product where translation is a first-class, real-time, in-call feature rather than a post-call transcript.

## 3. Goals

| Goal | Metric |
|---|---|
| Translation feels "live," not laggy | End-to-end speech→translated-speech latency under ~2.5s (P75) |
| Calls don't feel like a beta product | Feature parity with Zoom/Meet basics: waiting room, host controls, screen share, recording, chat |
| Works for the actual target user | Reliable audio/video across different networks (phone on mobile data joining a laptop on Wi-Fi) |
| Trustworthy transcripts | AI meeting summary + searchable history per meeting |

## 4. Target users / personas

1. **Multilingual small teams** — e.g. a Mumbai-based team with clients in Japan/Germany who don't share a working language.
2. **Cross-border families** — grandparent speaks Hindi, grandchild speaks English; want a normal video call, not a chat-app translator bolted on.
3. **Freelancers/consultants** — need call recordings + auto-summaries with action items in their own language, regardless of the call's language.

## 5. Scope

### In scope (v1 — core built)
- Auth: email/password + Google OAuth
- Schedule / instant meetings, meeting codes, invite links
- Video/audio calls (WebRTC) with live speech translation and dual captions
- In-call chat with auto-translated messages
- Contacts, call history, meeting scheduling with reminders
- Recording → transcript → AI summary (key points, action items)
- Admin dashboard with usage/analytics

### In scope (v1.1 — built out)
- Host controls: waiting room, mute-all, remove participant, lock meeting
- Screen share, speaker/gallery layouts, pinning
- Reactions, file sharing in chat, polls
- Virtual backgrounds / blur
- TURN-based connectivity for cross-network calls

### Out of scope (v1)
- Breakout rooms
- Whiteboard / collaborative canvas
- End-to-end encryption (calls are encrypted in transit via WebRTC/DTLS-SRTP, but the ai-service processes audio server-side for translation)
- Native mobile apps (mobile web only)

## 6. Feature → data model traceability

| Feature | Backing models |
|---|---|
| Auth / RBAC | `User`, `Profile`, `Session`, `Device`, `RoleDefinition`, `Permission`, `UserRole`, `RolePermission` |
| Org/team accounts | `Organization`, `Team`, `TeamMember` |
| Meetings & participants | `Meeting`, `MeetingParticipant`, `MeetingSettings`, `MeetingTranslationSettings` |
| Live translation/captions | `Language`, `TranslationHistory`, `SpeechHistory`, `TranslationSession`, `TranslationChunk`, `SpeechAudio` |
| Chat | `Message`, `File`, `TranslationHistory` |
| Recording & summaries | `Recording`, `MeetingSummary` |
| Contacts & invites | `Contact`, `MeetingInvitation` |
| Call history / ringing | `CallHistory`, `CallSession`, `CallEvent` |
| Reminders | `MeetingReminder` |
| Billing | `Subscription`, `Payment` |
| Notifications | `Notification` |
| Analytics/metering | `SystemMetric`, `TranslationMetric`, `MeetingMetric`, `ErrorLog`, `ChatAnalytics`, `AiMetric`, `LanguageModel` |
| User preferences | `Setting` (captions, voice, accessibility, chat prefs) |
| Polls | `Poll`, `PollOption`, `PollVote` |
