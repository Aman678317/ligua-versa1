import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',       // listen on ALL interfaces — laptop, phone, tablet on same WiFi
    strictPort: true,
    allowedHosts: 'all',   // allow any hostname (192.168.x.x, ngrok, etc.)
    proxy: {
      // REST API calls
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path,
      },
      // Socket.IO WebSocket + polling — critical for phone connectivity
      // The phone opens http://192.168.0.106:5173 and socket connects to
      // http://192.168.0.106:5173/socket.io — Vite proxies it to port 3001
      '/socket.io': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true,           // MUST be true for WebSocket upgrade
        rewrite: (path) => path,
      },
    },
  },
});
