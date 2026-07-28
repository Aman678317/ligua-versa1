import { io } from 'socket.io-client';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.');

    // When on local network (dev or phone on same WiFi), connect to same host on port 3001
    // In production, use the configured backend URL
    const URL = isLocal
      ? `http://${hostname}:3001`
      : (import.meta.env.VITE_BACKEND_URL || 'https://ligua-versa1.onrender.com');

    socket = io(URL, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 15000
    });
  }
  return socket;
};

