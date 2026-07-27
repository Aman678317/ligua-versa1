// Daily.co Managed Video Infrastructure REST API Client
const DAILY_API_URL = 'https://api.daily.co/v1/rooms';

const sanitizeRoomCode = (roomCode) => {
  return roomCode ? `lingua-${roomCode.replace(/[^a-zA-Z0-9_-]/g, '')}` : `lingua-${Date.now()}`;
};

export async function getDailyRoom(roomCode) {
  const apiKey = process.env.DAILY_API_KEY;
  if (!apiKey) {
    return { success: false, url: null, degraded: true };
  }

  const roomName = sanitizeRoomCode(roomCode);
  try {
    const response = await fetch(`${DAILY_API_URL}/${roomName}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, url: data.url, name: data.name };
    }
    return { success: false, error: 'Room not found' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function createDailyRoom(roomCode) {
  const apiKey = process.env.DAILY_API_KEY;

  if (!apiKey) {
    console.error('================================================================');
    console.error('[CRITICAL ERROR] DAILY_API_KEY is NOT configured!');
    console.error('Video calls will NOT connect across devices until it is set.');
    console.error('================================================================');
    return {
      success: false,
      url: 'https://linguaversa.daily.co/fallback-room', // placeholder
      degraded: true
    };
  }

  const roomName = sanitizeRoomCode(roomCode);

  try {
    const exp = Math.floor(Date.now() / 1000) + 7200; // 2 hour room expiration
    const response = await fetch(DAILY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        name: roomName,
        properties: {
          exp,
          enable_chat: false,
          enable_screenshare: true,
          start_video_off: false,
          start_audio_off: false
        }
      })
    });

    const data = await response.json();
    if (response.ok && data.url) {
      console.log(`[Daily.co] Room created successfully: ${data.url}`);
      return { success: true, url: data.url, name: data.name };
    }

    // If Daily's create-room API call fails because the room already exists
    // fetch the EXISTING room via GET and return its real url
    console.warn(`[Daily.co] Room creation notice (${response.status}):`, data.error || data.info || data);

    const existingRoom = await getDailyRoom(roomCode);
    if (existingRoom.success) {
      console.log(`[Daily.co] Retrieved existing real room URL: ${existingRoom.url}`);
      return { success: true, url: existingRoom.url, name: existingRoom.name };
    }

    return {
      success: false,
      error: 'Failed to create or fetch room'
    };
  } catch (err) {
    console.error('[Daily.co Room Creation Error]', err);
    return {
      success: false,
      error: err.message
    };
  }
}

export async function startDailyRecording(roomName) {
  const apiKey = process.env.DAILY_API_KEY;
  if (!apiKey) {
    return { success: false, isPaidRequired: true, message: 'DAILY_API_KEY environment variable is missing.' };
  }

  try {
    const response = await fetch('https://api.daily.co/v1/recordings/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ room_name: roomName })
    });

    const data = await response.json();
    if (response.ok) {
      return { success: true, recordingId: data.recording_id, data };
    } else {
      console.warn('[Daily.co Recording API Warning]', data);
      return { 
        success: false, 
        isPaidRequired: response.status === 402 || (data.info && data.info.includes('paid')),
        message: data.error || data.info || 'Cloud recording requires a paid Daily.co plan.' 
      };
    }
  } catch (err) {
    console.error('[Daily.co Start Recording Error]', err);
    return { success: false, message: err.message };
  }
}

export async function stopDailyRecording(recordingId) {
  const apiKey = process.env.DAILY_API_KEY;
  if (!apiKey || !recordingId) {
    return { success: false, message: 'Missing API key or recordingId' };
  }

  try {
    const response = await fetch(`https://api.daily.co/v1/recordings/${recordingId}/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });

    const data = await response.json();
    return { success: response.ok, data };
  } catch (err) {
    console.error('[Daily.co Stop Recording Error]', err);
    return { success: false, message: err.message };
  }
}

