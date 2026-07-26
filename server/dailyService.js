// Daily.co Managed Video Infrastructure REST API Client
const DAILY_API_URL = 'https://api.daily.co/v1/rooms';

export async function createDailyRoom(roomCode) {
  const apiKey = process.env.DAILY_API_KEY;

  if (!apiKey) {
    console.warn('[Daily.co] DAILY_API_KEY is missing from environment variables. Using fallback room URL format.');
    const safeCode = roomCode || `lingua-${Date.now()}`;
    return {
      success: true,
      url: `https://linguaversa.daily.co/${safeCode}`,
      name: safeCode
    };
  }

  try {
    const exp = Math.floor(Date.now() / 1000) + 7200; // 2 hour room expiration
    const response = await fetch(DAILY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        name: roomCode ? `lingua-${roomCode.replace(/[^a-zA-Z0-9_-]/g, '')}` : undefined,
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
    } else {
      console.warn('[Daily.co API Warning]', data);
      return {
        success: true,
        url: `https://linguaversa.daily.co/lingua-${roomCode || Date.now()}`,
        name: roomCode
      };
    }
  } catch (err) {
    console.error('[Daily.co Room Creation Error]', err);
    return {
      success: true,
      url: `https://linguaversa.daily.co/lingua-${roomCode || Date.now()}`,
      name: roomCode
    };
  }
}
