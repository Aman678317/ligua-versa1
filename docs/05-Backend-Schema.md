# LinguaVersa — Backend Schema Document

Source of truth: `prisma/schema.prisma` (PostgreSQL / SQLite via Prisma).

## Conventions
- **UUID Primary Keys**: `@default(uuid())` everywhere.
- **Soft Delete**: `deletedAt DateTime?` on user-facing models.
- **Timestamps**: `createdAt` / `updatedAt` tracking across all entities.

## Core Models Overview
- Identity: `User`, `Profile`, `Session`, `Device`, `RoleDefinition`, `Permission`, `UserRole`, `RolePermission`.
- Organization: `Organization`, `Team`, `TeamMember`.
- Core Meetings: `Meeting`, `MeetingSettings`, `MeetingTranslationSettings`, `MeetingParticipant`.
- Chat & Messages: `Message`, `File`, `TranslationHistory`.
- Live Speech & Translation: `TranslationSession`, `TranslationChunk`, `SpeechAudio`, `SpeechHistory`, `Language`, `LanguageModel`, `AiMetric`.
- Polls: `Poll`, `PollOption`, `PollVote`.
- Telemetry & Error Logging: `SystemMetric`, `TranslationMetric`, `MeetingMetric`, `ErrorLog`, `ChatAnalytics`.
