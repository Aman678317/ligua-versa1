/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#0f172a',
        },
        dark: {
          bg: '#0B0F19',
          card: '#131B2E',
          surface: '#1A243B',
          border: 'rgba(255, 255, 255, 0.08)',
        },
        accent: {
          cyan: '#06B6D4',
          indigo: '#6366F1',
          purple: '#8B5CF6',
          emerald: '#10B981',
          rose: '#F43F5E',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s infinite ease-in-out',
        'wave': 'wave 1.2s infinite ease-in-out',
        'morph': 'morph 8s ease-in-out infinite',
        'morph-reverse': 'morphReverse 10s ease-in-out infinite',
        'blob': 'blob 10s infinite',
        'pulse-slow': 'pulseSlow 6s infinite',
        'pulseSlow': 'pulseSlow 15s ease-in-out infinite',
        'hudMount': 'hudMount 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scanline': 'scanline 8s linear infinite',
      },
      keyframes: {
        hudMount: {
          '0%': { opacity: '0', transform: 'translateY(20px) scale(0.98)', filter: 'blur(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)', filter: 'blur(0)' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
        wave: {
          '0%, 100%': { height: '6px' },
          '50%': { height: '24px' },
        },
        morph: {
          '0%': { borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%', transform: 'rotate(0deg)' },
          '50%': { borderRadius: '30% 60% 70% 40% / 50% 60% 30% 60%', transform: 'rotate(180deg)' },
          '100%': { borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%', transform: 'rotate(360deg)' },
        },
        morphReverse: {
          '0%': { borderRadius: '40% 60% 70% 30% / 40% 70% 30% 60%', transform: 'rotate(360deg)' },
          '50%': { borderRadius: '70% 30% 40% 60% / 30% 40% 60% 70%', transform: 'rotate(180deg)' },
          '100%': { borderRadius: '40% 60% 70% 30% / 40% 70% 30% 60%', transform: 'rotate(0deg)' },
        },
        blob: {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
        },
        pulseSlow: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        }
      }
    },
  },
  plugins: [],
}
