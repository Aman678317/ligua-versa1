import { io } from 'socket.io-client';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    let URL;
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      // Local dev checks: localhost, 127.0.0.1, or local WiFi IP (192.168.x.x, 10.x.x.x, 172.x.x.x)
      const isLocal = hostname === 'localhost' ||
                      hostname === '127.0.0.1' ||
                      hostname.startsWith('192.168.') ||
                      hostname.startsWith('10.') ||
                      hostname.startsWith('172.');

      URL = isLocal
        ? `http://${hostname}:3001`
        : (import.meta.env.VITE_BACKEND_URL || 'https://ligua-versa1.onrender.com');
    } else {
      URL = 'http://localhost:3001';
    }

    console.log('[Socket] Initializing connection to backend:', URL);

    socket = io(URL, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      timeout: 20000
    });

    socket.on('connect', () => {
      console.log('[Socket] ✅ Connected to backend server:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] ❌ Connection error to backend:', err.message);
    });

    socket.on('disconnect', (reason) => {
      console.warn('[Socket] Disconnected from backend server:', reason);
    });
  }
  return socket;
};
