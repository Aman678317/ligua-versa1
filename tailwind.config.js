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
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
        wave: {
          '0%, 100%': { height: '6px' },
          '50%': { height: '24px' },
        }
      }
    },
  },
  plugins: [],
}
