/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#08080c', 900: '#0a0a0f', 850: '#0e0e14', 800: '#13131a',
          700: '#1c1c26', 600: '#262633', 500: '#3a3a4a', 400: '#5a5a6e',
          300: '#8a8aa0', 200: '#b8b8c8', 100: '#e4e4ec', 50: '#f4f4f8',
        },
        accent: { DEFAULT: '#e8b86d', soft: '#d4a85a', glow: '#f0c98a' },
        rose: { DEFAULT: '#e88d8d', soft: '#d97a7a' },
      },
      fontFamily: {
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'fade-up': 'fadeUp 0.5s ease-out forwards',
        'fade-in-slow': 'fadeIn 1.2s ease-out forwards',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
