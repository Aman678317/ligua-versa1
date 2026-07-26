import { io } from 'socket.io-client';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    // In dev mode, connects to Vite proxy or localhost:3001
    const URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '/';
    socket = io(URL, {
      autoConnect: true,
      transports: ['websocket', 'polling']
    });
  }
  return socket;
};
