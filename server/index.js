import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { mockLanguages, mockMeetings, mockSummaries, mockAnalytics, mockUsers } from './db.js';
import { processSpeechTranslation, generateAiSummary } from './aiService.js';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// In-Memory Realtime Room State
const rooms = new Map();

function getRoom(meetingCode) {
  if (!rooms.has(meetingCode)) {
    rooms.set(meetingCode, {
      code: meetingCode,
      isLocked: false,
      waitingRoomEnabled: false,
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
    version: '1.1.0',
    endpoints: ['/api/languages', '/api/meetings', '/api/summaries', '/api/analytics', '/api/contacts']
  });
});

// REST API Endpoints
app.get('/api/languages', (req, res) => {
  res.json({ success: true, languages: mockLanguages });
});

app.get('/api/meetings', (req, res) => {
  res.json({ success: true, meetings: mockMeetings });
});

app.post('/api/meetings', (req, res) => {
  const { title, description, scheduledStart, settings } = req.body;
  const newMeeting = {
    id: `meeting-${Date.now()}`,
    code: `lingua-${Math.floor(100 + Math.random() * 900)}-${Math.floor(100 + Math.random() * 900)}`,
    title: title || 'Instant Video Call',
    description: description || 'Live translated WebRTC session',
    status: 'LIVE',
    hostId: 'user-aman',
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

app.get('/api/meetings/:code', (req, res) => {
  const meeting = mockMeetings.find(m => m.code === req.params.code) || {
    id: `meeting-dynamic-${req.params.code}`,
    code: req.params.code,
    title: `Call (${req.params.code})`,
    status: 'LIVE',
    hostId: 'user-aman',
    settings: { waitingRoomEnabled: false, isLocked: false, allowScreenShare: true, allowChat: true }
  };
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

// SOCKET.IO REALTIME WEBRTC & LIVE SPEECH ENGINE
io.on('connection', (socket) => {
  let currentRoomCode = null;
  let currentUser = null;

  socket.on('join-room', ({ roomCode, user }) => {
    currentRoomCode = roomCode;
    currentUser = user;
    const room = getRoom(roomCode);

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

    io.to(roomCode).emit('room-participants-update', Array.from(room.participants.values()));
    socket.emit('room-chat-history', room.messages);
    socket.emit('room-polls-history', room.polls);
    socket.to(roomCode).emit('user-joined', { socketId: socket.id, user });
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
    const { text, sourceLang, targetLang, speakerName, speakerId } = data;

    const translationResult = await processSpeechTranslation({
      speakerId: speakerId || socket.id,
      speakerName: speakerName || 'Participant',
      text,
      sourceLang: sourceLang || 'en',
      targetLang: targetLang || 'en'
    });

    const room = getRoom(currentRoomCode);
    room.liveCaptions.push(translationResult);

    io.to(currentRoomCode).emit('live-caption-chunk', translationResult);
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

  socket.on('disconnect', () => {
    if (currentRoomCode) {
      const room = getRoom(currentRoomCode);
      room.participants.delete(socket.id);
      room.waitingRoom.delete(socket.id);

      io.to(currentRoomCode).emit('user-left', { socketId: socket.id });
      io.to(currentRoomCode).emit('room-participants-update', Array.from(room.participants.values()));
      io.to(currentRoomCode).emit('waiting-room-update', Array.from(room.waitingRoom.values()));
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`[LinguaVersa Server] Running on http://localhost:${PORT}`);
});
