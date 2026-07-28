import express from 'express';
import { createServer } from 'http';
import crypto from 'crypto';
import { Server } from 'socket.io';
import cors from 'cors';
import { mockLanguages, mockMeetings, mockSummaries, mockAnalytics, mockUsers } from './db.js';
import { processSpeechTranslation, generateAiSummary } from './aiService.js';
import { PrismaClient } from '@prisma/client';
import { enqueueSummaryJob } from './summaryQueue.js';

const prisma = new PrismaClient();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [
      'http://localhost:5173',
      'http://localhost:5175',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5175',
      'https://ligua-versa0.vercel.app'
    ];

const corsOptions = {
  origin: (origin, callback) => {
    if (
      !origin ||
      process.env.NODE_ENV !== 'production' ||
      allowedOrigins.includes(origin) ||
      /\.vercel\.app$/.test(origin)
    ) {
      callback(null, true);
    } else {
      callback(null, true); // Allow production origins to prevent connection rejection
    }
  },
  credentials: true
};

const app = express();
app.use(cors(corsOptions));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Configurable Group Call Room Capacity (expanded to 16+ participants)
const MAX_ROOM_PARTICIPANTS = process.env.MAX_ROOM_PARTICIPANTS ? parseInt(process.env.MAX_ROOM_PARTICIPANTS) : 16;

// In-Memory Realtime Room State
const rooms = new Map();
const callSessions = new Map();
const disconnectTimers = new Map();

function getRoom(meetingCode) {
  if (!rooms.has(meetingCode)) {
    rooms.set(meetingCode, {
      code: meetingCode,
      isLocked: false,
      waitingRoomEnabled: false,
      maxParticipants: MAX_ROOM_PARTICIPANTS,
      participants: new Map(),
      waitingRoom: new Map(),
      messages: [],
      polls: [],
      reactions: [],
      liveCaptions: []
    });
  }
  return rooms.get(meetingCode);
}


// Root Endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'LinguaVersa Realtime Backend Server',
    version: '1.2.0',
    endpoints: ['/api/languages', '/api/meetings', '/api/calls', '/api/summaries', '/api/analytics', '/api/contacts']
  });
});

// REST API Endpoints
app.get('/api/languages', (req, res) => {
  res.json({ success: true, languages: mockLanguages });
});

// Shareable Call Session Endpoints (/api/calls)
app.post('/api/calls', async (req, res) => {
  const { hostId, title } = req.body;
  const sessionId = `call-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h expiry

  const session = {
    sessionId,
    code: sessionId,
    title: title || 'Instant Translated Video Call',
    status: 'WAITING', // WAITING, ACTIVE, ENDED
    hostId: hostId || null,
    createdAt: new Date().toISOString(),
    expiresAt,
    maxParticipants: MAX_ROOM_PARTICIPANTS,
    participantsCount: 0
  };

  callSessions.set(sessionId, session);
  res.json({
    success: true,
    sessionId,
    code: sessionId,
    joinUrl: `/join/${sessionId}`,
    expiresAt,
    session
  });
});

app.get('/api/calls/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = callSessions.get(sessionId);

  if (!session) {
    // Fallback: check if it matches a standard meeting code
    const meeting = mockMeetings.find(m => m.code === sessionId);
    if (meeting) {
      return res.json({
        success: true,
        valid: true,
        status: 'VALID',
        session: {
          sessionId: meeting.code,
          code: meeting.code,
          title: meeting.title,
          status: 'ACTIVE',
          maxParticipants: MAX_ROOM_PARTICIPANTS
        }
      });
    }

    return res.status(404).json({
      success: false,
      valid: false,
      status: 'INVALID',
      message: 'This call session does not exist.'
    });
  }

  // Check 24-hour expiration
  if (new Date() > new Date(session.expiresAt)) {
    session.status = 'EXPIRED';
    return res.json({
      success: false,
      valid: false,
      status: 'EXPIRED',
      message: 'This call link has expired.'
    });
  }

  if (session.status === 'ENDED') {
    return res.json({
      success: false,
      valid: false,
      status: 'ENDED',
      message: 'This call has already ended.'
    });
  }

  const room = rooms.get(sessionId);
  if (room && room.participants.size >= (session.maxParticipants || MAX_ROOM_PARTICIPANTS)) {
    return res.json({
      success: true,
      valid: false,
      status: 'FULL',
      message: `This call is currently full (maximum ${session.maxParticipants || MAX_ROOM_PARTICIPANTS} participants).`
    });
  }

  res.json({
    success: true,
    valid: true,
    status: 'VALID',
    session
  });
});

app.get('/api/meetings', (req, res) => {
  res.json({ success: true, meetings: mockMeetings });
});

app.post('/api/meetings', async (req, res) => {
  const { hostId, title, description, scheduledStart, settings } = req.body;
  const meetingCode = `lingua-${Math.floor(100 + Math.random() * 900)}-${Math.floor(100 + Math.random() * 900)}`;

  const newMeeting = {
    id: `meeting-${Date.now()}`,
    code: meetingCode,
    title: title || 'Instant Video Call',
    description: description || 'Live translated session',
    status: 'LIVE',
    hostId: hostId || null,
    scheduledStart: scheduledStart || new Date().toISOString(),
    participantsCount: 1,
    settings: settings || {
      waitingRoomEnabled: false,
      isLocked: false,
      muteOnJoin: false,
      allowScreenShare: true,
      allowChat: true,
      allowReactions: true,
    }
  };
  mockMeetings.unshift(newMeeting);
  res.json({ success: true, meeting: newMeeting });
});

app.get('/api/meetings/:code', async (req, res) => {
  const code = req.params.code;
  let meeting = mockMeetings.find(m => m.code === code);
  
  if (!meeting) {
    const session = callSessions.get(code);
    if (session) {
      return res.json({
        success: true,
        meeting: {
          id: session.sessionId,
          code: session.code,
          title: session.title,
          status: session.status,
          hostId: session.hostId
        }
      });
    }

    meeting = {
      id: `meeting-dynamic-${code}`,
      code: code,
      title: `Call (${code})`,
      status: 'LIVE',
      hostId: req.query.hostId || null,
      settings: { waitingRoomEnabled: false, isLocked: false, allowScreenShare: true, allowChat: true }
    };
    mockMeetings.unshift(meeting);
  }

  res.json({ success: true, meeting });
});

app.get('/api/summaries', (req, res) => {
  res.json({ success: true, summaries: mockSummaries });
});

app.post('/api/summaries/generate', async (req, res) => {
  const { meetingTitle, transcript } = req.body;
  const summary = await generateAiSummary(meetingTitle || 'Live Translated Meeting', transcript || []);
  mockSummaries.unshift(summary);
  res.json({ success: true, summary });
});

app.get('/api/analytics', (req, res) => {
  res.json({ success: true, analytics: mockAnalytics });
});

app.get('/api/contacts', (req, res) => {
  res.json({ success: true, contacts: mockUsers });
});

// SOCKET.IO WEBRTC SIGNALLING & REALTIME COLLABORATION PIPELINE
io.on('connection', (socket) => {
  let currentRoomCode = null;
  let currentUser = null;

  socket.on('join-room', ({ roomCode, user }) => {
    currentRoomCode = roomCode;
    currentUser = user;
    const room = getRoom(roomCode);

    // Max participant check for shareable call sessions
    const maxAllowed = room.maxParticipants || MAX_ROOM_PARTICIPANTS;
    if (room.participants.size >= maxAllowed && !room.participants.has(socket.id)) {
      socket.emit('error-message', { message: `This call is currently full (maximum ${maxAllowed} participants).` });
      socket.emit('room-status', { status: 'FULL' });
      return;
    }

    if (room.waitingRoomEnabled && !user.isHost) {
      room.waitingRoom.set(socket.id, { socketId: socket.id, ...user });
      socket.join(`${roomCode}-waiting`);
      socket.emit('waiting-room-status', { status: 'WAITING', message: 'The host will let you in shortly.' });
      io.to(roomCode).emit('waiting-room-update', Array.from(room.waitingRoom.values()));
      return;
    }

    if (room.isLocked && !user.isHost) {
      socket.emit('error-message', { message: 'This meeting has been locked by the host.' });
      return;
    }

    socket.join(roomCode);
    room.participants.set(socket.id, { socketId: socket.id, ...user });

    // Update session status to ACTIVE
    if (callSessions.has(roomCode)) {
      const session = callSessions.get(roomCode);
      session.status = 'ACTIVE';
      session.participantsCount = room.participants.size;
    }

    // Determine perfect negotiation role
    // The first user (or host) is typically "impolite", subsequent users are "polite".
    // This resolves offer/answer glare when both sides try to connect.
    const isFirstParticipant = room.participants.size === 1;
    const negotiationRole = isFirstParticipant ? 'impolite' : 'polite';
    
    // Update participant record with role
    const participantData = room.participants.get(socket.id);
    participantData.negotiationRole = negotiationRole;
    room.participants.set(socket.id, participantData);

    // Initialize DB Call Session if not exists
    if (!room.call_session_id) {
      prisma.callSession.create({
        data: {
          participant_a_id: user?.id || crypto.randomUUID(),
          participant_b_id: crypto.randomUUID(), // Placeholder until participant B joins
          tone_setting: 'casual'
        }
      }).then(session => {
        room.call_session_id = session.id;
      }).catch(err => console.error("Failed to create CallSession:", err));
    }

    // Send existing peer IDs and our own role so they can initiate WebRTC offers
    const existingPeerIds = Array.from(room.participants.entries())
      .filter(([id, _]) => id !== socket.id)
      .map(([id, data]) => ({ socketId: id, negotiationRole: data.negotiationRole }));
    
    socket.emit('existing-peers', { peerSocketIds: existingPeerIds, myRole: negotiationRole });

    io.to(roomCode).emit('room-participants-update', Array.from(room.participants.values()));
    socket.emit('room-chat-history', room.messages);
    socket.emit('room-polls-history', room.polls);
    socket.to(roomCode).emit('user-joined', { socketId: socket.id, user, negotiationRole });
  });

  socket.on('recording-status-changed', ({ isRecording, recorderName }) => {
    if (!currentRoomCode) return;
    io.to(currentRoomCode).emit('recording-status-update', { isRecording, recorderName });
  });


  socket.on('admit-participant', ({ targetSocketId }) => {
    if (!currentRoomCode) return;
    const room = getRoom(currentRoomCode);
    const waitingUser = room.waitingRoom.get(targetSocketId);

    if (waitingUser) {
      room.waitingRoom.delete(targetSocketId);
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (targetSocket) {
        targetSocket.leave(`${currentRoomCode}-waiting`);
        targetSocket.join(currentRoomCode);
        room.participants.set(targetSocketId, waitingUser);

        targetSocket.emit('waiting-room-status', { status: 'ADMITTED' });
        io.to(currentRoomCode).emit('room-participants-update', Array.from(room.participants.values()));
        io.to(currentRoomCode).emit('waiting-room-update', Array.from(room.waitingRoom.values()));
      }
    }
  });

  socket.on('update-room-settings', ({ isLocked, waitingRoomEnabled }) => {
    if (!currentRoomCode) return;
    const room = getRoom(currentRoomCode);
    if (isLocked !== undefined) room.isLocked = isLocked;
    if (waitingRoomEnabled !== undefined) room.waitingRoomEnabled = waitingRoomEnabled;

    io.to(currentRoomCode).emit('room-settings-updated', {
      isLocked: room.isLocked,
      waitingRoomEnabled: room.waitingRoomEnabled
    });
  });

  socket.on('host-mute-all', () => {
    if (!currentRoomCode) return;
    io.to(currentRoomCode).emit('host-muted-you');
  });

  socket.on('host-remove-participant', ({ targetSocketId }) => {
    if (!currentRoomCode) return;
    const room = getRoom(currentRoomCode);
    room.participants.delete(targetSocketId);

    const targetSocket = io.sockets.sockets.get(targetSocketId);
    if (targetSocket) {
      targetSocket.emit('removed-by-host');
      targetSocket.leave(currentRoomCode);
    }
    io.to(currentRoomCode).emit('room-participants-update', Array.from(room.participants.values()));
  });

  socket.on('webrtc-offer', ({ targetSocketId, offer }) => {
    io.to(targetSocketId).emit('webrtc-offer', { senderSocketId: socket.id, offer });
  });

  socket.on('webrtc-answer', ({ targetSocketId, answer }) => {
    io.to(targetSocketId).emit('webrtc-answer', { senderSocketId: socket.id, answer });
  });

  socket.on('webrtc-ice-candidate', ({ targetSocketId, candidate }) => {
    io.to(targetSocketId).emit('webrtc-ice-candidate', { senderSocketId: socket.id, candidate });
  });

  socket.on('webrtc-log-error', ({ targetSocketId, state, timestamp }) => {
    console.warn(`[WebRTC Log Error] Socket ${socket.id} -> Target ${targetSocketId} ICE State: ${state} at ${timestamp}`);
  });

  socket.on('speech-chunk', async (data) => {
    if (!currentRoomCode) return;
    const { text, audioBase64, sourceLang, targetLang, speakerName, speakerId } = data;
    const room = getRoom(currentRoomCode);

    const actualSpeakerId = speakerId || socket.id;
    const actualSpeakerName = speakerName || (currentUser ? currentUser.name : 'Participant');
    const actualSourceLang = sourceLang || (currentUser ? currentUser.spokenLanguage : 'en') || 'en';

    // Notify room that AI translation/synthesis is in progress for this speaker
    io.to(currentRoomCode).emit('speaker-translating-status', {
      speakerId: actualSpeakerId,
      speakerName: actualSpeakerName,
      isTranslating: true
    });

    for (const [pSocketId, participant] of room.participants.entries()) {
      const listenerLang = participant.spokenLanguage || participant.targetLanguage || targetLang || 'en';
      try {
        const translationResult = await processSpeechTranslation({
          speakerId: actualSpeakerId,
          speakerName: actualSpeakerName,
          text: text || '',
          audioBase64: audioBase64 || null,
          sourceLang: actualSourceLang,
          targetLang: listenerLang
        });

        room.liveCaptions.push(translationResult);

        // Deliver translated caption & TTS specifically to this participant
        io.to(pSocketId).emit('live-caption-chunk', translationResult);

        // Async save to DB
        if (room.call_session_id) {
          prisma.callUtterance.create({
            data: {
              call_session_id: room.call_session_id,
              speaker_id: actualSpeakerId.substring(0, 36) || crypto.randomUUID(), // Ensure max 36 chars if not uuid
              source_lang: actualSourceLang,
              target_lang: listenerLang,
              source_text: text || '',
              translated_text: translationResult.translatedText || '',
              qa_confidence: translationResult.qaConfidence || 1.0,
              qa_flagged: translationResult.qaFlagged || false
            }
          }).catch(err => console.error("Failed to save utterance:", err));
        }
      } catch (err) {
        console.warn('[speech-chunk error for participant]', pSocketId, err);
      }
    }

    // Done translating status
    setTimeout(() => {
      io.to(currentRoomCode).emit('speaker-translating-status', {
        speakerId: actualSpeakerId,
        speakerName: actualSpeakerName,
        isTranslating: false
      });
    }, 400);
  });

  // REAL CHAT AUTO-TRANSLATION PIPELINE
  socket.on('send-chat-message', async ({ text, originalLang, file }) => {
    if (!currentRoomCode || !text.trim()) return;
    const room = getRoom(currentRoomCode);
    const messageId = `msg-${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    for (const [participantSocketId, participant] of room.participants.entries()) {
      let translatedText = text;
      const targetLang = participant.spokenLanguage || participant.targetLanguage || 'en';

      try {
        if (targetLang !== (originalLang || 'en')) {
          const transResult = await processSpeechTranslation({
            speakerId: socket.id,
            speakerName: currentUser ? currentUser.name : 'Participant',
            text,
            sourceLang: originalLang || 'en',
            targetLang
          });
          translatedText = transResult.translatedText;
        }
      } catch (err) {
        console.warn('[Chat Translation Fallback]', err);
        translatedText = text;
      }

      const recipientMsgObj = {
        id: messageId,
        senderId: socket.id,
        senderName: currentUser ? currentUser.name : 'Participant',
        senderAvatar: currentUser ? currentUser.avatar : null,
        text,
        translatedText,
        originalLang: originalLang || 'en',
        targetLang,
        file,
        timestamp
      };

      io.to(participantSocketId).emit('new-chat-message', recipientMsgObj);
    }

    room.messages.push({
      id: messageId,
      senderId: socket.id,
      senderName: currentUser ? currentUser.name : 'Participant',
      text,
      originalLang: originalLang || 'en',
      timestamp
    });
  });

  socket.on('send-reaction', ({ emoji }) => {
    if (!currentRoomCode) return;
    io.to(currentRoomCode).emit('new-reaction', {
      senderId: socket.id,
      senderName: currentUser ? currentUser.name : 'Participant',
      emoji
    });
  });

  socket.on('create-poll', ({ question, options }) => {
    if (!currentRoomCode) return;
    const room = getRoom(currentRoomCode);
    const newPoll = {
      id: `poll-${Date.now()}`,
      question,
      options: options.map(opt => ({ id: `opt-${Math.random()}`, text: opt, votes: 0 })),
      votedUsers: []
    };
    room.polls.push(newPoll);
    io.to(currentRoomCode).emit('poll-created', newPoll);
  });

  socket.on('vote-poll', ({ pollId, optionId }) => {
    if (!currentRoomCode) return;
    const room = getRoom(currentRoomCode);
    const poll = room.polls.find(p => p.id === pollId);
    if (poll && !poll.votedUsers.includes(socket.id)) {
      poll.votedUsers.push(socket.id);
      const option = poll.options.find(o => o.id === optionId);
      if (option) option.votes += 1;
      io.to(currentRoomCode).emit('poll-updated', poll);
    }
  });

  socket.on('draw-line', (data) => {
    if (!currentRoomCode) return;
    socket.to(currentRoomCode).emit('draw-line', data);
  });

  socket.on('youtube-sync', (data) => {
    if (!currentRoomCode) return;
    socket.to(currentRoomCode).emit('youtube-sync', data);
  });

  // Reconnect Session Handler
  socket.on('rejoin-session', ({ roomCode, user, previousSocketId }) => {
    currentRoomCode = roomCode;
    currentUser = user;
    const room = getRoom(roomCode);

    // Clear grace period timer if active
    if (previousSocketId && disconnectTimers.has(previousSocketId)) {
      clearTimeout(disconnectTimers.get(previousSocketId));
      disconnectTimers.delete(previousSocketId);
      room.participants.delete(previousSocketId);
    }

    socket.join(roomCode);
    room.participants.set(socket.id, { socketId: socket.id, ...user, status: 'CONNECTED' });

    if (callSessions.has(roomCode)) {
      const session = callSessions.get(roomCode);
      session.status = 'ACTIVE';
    }

    socket.emit('rejoin-accepted', {
      status: 'REJOINED',
      participants: Array.from(room.participants.values()),
      messages: room.messages,
      polls: room.polls
    });

    socket.to(roomCode).emit('peer-reconnected', { socketId: socket.id, user });
    io.to(roomCode).emit('room-participants-update', Array.from(room.participants.values()));
  });

  // Explicit Leave Session Handler (Deliberate Hangup)
  socket.on('leave-session', () => {
    if (!currentRoomCode) return;
    const room = getRoom(currentRoomCode);
    
    if (disconnectTimers.has(socket.id)) {
      clearTimeout(disconnectTimers.get(socket.id));
      disconnectTimers.delete(socket.id);
    }

    room.participants.delete(socket.id);
    room.waitingRoom.delete(socket.id);

    if (room.participants.size === 0) {
      if (callSessions.has(currentRoomCode)) {
        callSessions.get(currentRoomCode).status = 'ENDED';
      }
      rooms.delete(currentRoomCode);
    }

    socket.to(currentRoomCode).emit('peer-left', { socketId: socket.id, reason: 'explicit-hangup' });
    io.to(currentRoomCode).emit('room-participants-update', Array.from(room.participants.values()));
    socket.leave(currentRoomCode);
  });

  socket.on('disconnect', () => {
    if (currentRoomCode) {
      const room = getRoom(currentRoomCode);
      const leavingUser = currentUser;

      // Notify peer that connection was lost temporarily
      socket.to(currentRoomCode).emit('peer-disconnected', {
        socketId: socket.id,
        user: leavingUser,
        gracePeriodSec: 60
      });

      // Start 60-second grace period timer before declaring participant permanently left
      const timer = setTimeout(() => {
        disconnectTimers.delete(socket.id);
        room.participants.delete(socket.id);
        room.waitingRoom.delete(socket.id);

        if (room.participants.size === 0) {
          if (callSessions.has(currentRoomCode)) {
            callSessions.get(currentRoomCode).status = 'ENDED';
          }
          rooms.delete(currentRoomCode);
        }

        io.to(currentRoomCode).emit('peer-left', { socketId: socket.id, reason: 'grace-period-expired' });
        io.to(currentRoomCode).emit('room-participants-update', Array.from(room.participants ? room.participants.values() : []));
        io.to(currentRoomCode).emit('waiting-room-update', Array.from(room.waitingRoom ? room.waitingRoom.values() : []));
      }, 60000);

      disconnectTimers.set(socket.id, timer);
    }
  });
});

// Glossary API Endpoints
app.get('/api/glossary', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  try {
    const terms = await prisma.glossaryTerm.findMany({
      where: { owner_id: userId, owner_type: 'user' }
    });
    res.json(terms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/glossary', async (req, res) => {
  const { userId, source_term, target_lang, preferred_translation } = req.body;
  try {
    const term = await prisma.glossaryTerm.upsert({
      where: {
        owner_type_owner_id_source_term_target_lang: {
          owner_type: 'user',
          owner_id: userId,
          source_term,
          target_lang
        }
      },
      update: { preferred_translation },
      create: {
        owner_type: 'user',
        owner_id: userId,
        source_term,
        target_lang,
        preferred_translation
      }
    });
    res.json(term);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/glossary/:id', async (req, res) => {
  try {
    await prisma.glossaryTerm.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/meetings/end', async (req, res) => {
  const { callSessionId, targetLangA, targetLangB } = req.body;
  if (!callSessionId) return res.status(400).json({ error: "Missing session ID" });
  
  try {
    const utterances = await prisma.callUtterance.findMany({
      where: { call_session_id: callSessionId },
      orderBy: { timestamp: 'asc' }
    });
    
    await enqueueSummaryJob(callSessionId, utterances, targetLangA, targetLangB);
    res.json({ success: true, message: "Summary generation enqueued." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// WebRTC TURN Credentials API
app.get('/api/turn-credentials', async (req, res) => {
  // In a production app, we would fetch from Twilio Network Traversal or Metered API here.
  // We'll return secure Metered OpenRelay credentials, simulating a dynamic fetch.
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turns:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' }
  ];

  res.json({ success: true, iceServers });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 LinguaVersa Core Server running on port ${PORT}`);
  if (!process.env.DAILY_API_KEY) {
    console.error('================================================================');
    console.error('[CRITICAL BOOT ERROR] DAILY_API_KEY is NOT set in process.env!');
    console.error('Video calls will fail to create authenticated Daily.co rooms.');
    console.error('Please configure DAILY_API_KEY in your environment or Render dashboard.');
    console.error('================================================================');
  }
});
