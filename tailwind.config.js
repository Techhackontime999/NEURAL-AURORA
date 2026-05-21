/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Satoshi', 'Geist', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Cabinet Grotesk', 'Satoshi', 'sans-serif'],
      },
      colors: {
        neural: {
          950: '#050508',
          900: '#0a0a12',
          800: '#12121f',
           700: '#1a1a2e',
           600: '#2a2a45',
           500: '#3a3a5c',
           400: '#52527a',
          blue: '#00f0ff',
          purple: '#b829dd',
          gold: '#f0c040',
          rose: '#ff006e',
        },
      },
      animation: {
        'pulse-slow': 'pulse 6s cubic-bezier(0.16, 1, 0.3, 1) infinite',
        'float': 'float 8s cubic-bezier(0.16, 1, 0.3, 1) infinite',
        'shimmer': 'shimmer 3s cubic-bezier(0.16, 1, 0.3, 1) infinite',
        'aurora': 'aurora 15s cubic-bezier(0.16, 1, 0.3, 1) infinite',
        'spotlight': 'spotlight 2s cubic-bezier(0.16, 1, 0.3, 1) 0.75s forwards',
        'fade-up': 'fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        aurora: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '25%': { transform: 'translate(-10%, 5%) scale(1.05)' },
          '50%': { transform: 'translate(5%, -5%) scale(0.95)' },
          '75%': { transform: 'translate(-5%, 10%) scale(1.02)' },
        },
        spotlight: {
          '0%': { opacity: '0', transform: 'translate(-72%, -62%) scale(0.5)' },
          '100%': { opacity: '1', transform: 'translate(-50%, -40%) scale(1)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
