import { io } from 'socket.io-client';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    const URL = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:3001'
      : (import.meta.env.VITE_BACKEND_URL || 'https://ligua-versa1.onrender.com');

    socket = io(URL, {
      autoConnect: true,
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 5,
      timeout: 10000
    });
  }
  return socket;
};
