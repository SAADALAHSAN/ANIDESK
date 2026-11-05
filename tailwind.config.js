/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--primary, #FF1E27)',
          hover: 'var(--primary-hover, #E0121B)',
          glow: 'var(--glow-color, rgba(255, 30, 39, 0.45))',
          subtle: 'rgba(255, 30, 39, 0.12)',
        },
        anidesk: {
          dark: '#08080C',
          surface: '#0F0F16',
          card: '#151520',
          cardHover: '#1B1B2A',
          border: '#232332',
          borderSubtle: '#1C1C28',
          textMuted: '#9B9BAE',
          textDim: '#606073',
        },
        anifam: {
          red: '#FF1E27',
          softRed: '#FF4755',
          hoverRed: '#E0121B',
          dark: '#08080C',
          surface: '#0F0F16',
          card: '#151520',
          cardHover: '#1B1B2A',
          border: '#232332',
          borderLight: '#323246',
          textMuted: '#9B9BAE',
          textDim: '#606073',
        }
      },
      fontFamily: {
        sans: ['Poppins', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glow-red': '0 0 25px -4px rgba(255, 30, 39, 0.5)',
        'glow-red-lg': '0 0 45px -5px rgba(255, 30, 39, 0.65)',
        'double-bezel': '0 0 0 1px rgba(255, 255, 255, 0.08), 0 8px 24px -4px rgba(0, 0, 0, 0.8)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        slideUp: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        shimmer: 'shimmer 1.8s infinite',
        pulseGlow: 'pulseGlow 2.5s infinite',
      },
    },
  },
  plugins: [],
}
