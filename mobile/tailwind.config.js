/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        ink: '#081D39',
        cyan: {
          DEFAULT: '#00E5FF',
          light: '#66e0ff',
          dark: '#00b8d4',
          dim: 'rgba(0,229,255,0.1)',
          glow: 'rgba(0,229,255,0.2)',
        },
        lime: {
          DEFAULT: '#72C70D',
          dark: '#5a6b08',
          dim: 'rgba(114,199,13,0.12)',
        },
        ember: {
          DEFAULT: '#FF8A0B',
          dark: '#e07500',
          dim: 'rgba(255,138,11,0.12)',
        },
        purple: {
          DEFAULT: '#8FA6FF',
          dim: 'rgba(143,166,255,0.12)',
        },
        rose: '#FF7C8B',
        gold: '#FFBE5C',
        slate: '#95B2C9',
        surface: {
          DEFAULT: '#0a1f3a',
          card: '#0e2240',
          elevated: '#132b4d',
          overlay: 'rgba(4,10,18,0.8)',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Cairo"', '"Tajawal"', '"Inter"', 'system-ui', 'sans-serif'],
        arabic: ['"Cairo"', '"Tajawal"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Mono"', 'monospace'],
      },
      borderRadius: {
        'none': '0px',
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '24px',
        '3xl': '32px',
        'full': '9999px',
      },
      boxShadow: {
        'xs': '0 1px 2px rgba(8,29,57,0.25)',
        'sm': '0 2px 8px rgba(8,29,57,0.28)',
        'card': '0 10px 28px rgba(8,29,57,0.28)',
        'md': '0 14px 32px rgba(8,29,57,0.32)',
        'lg': '0 18px 42px rgba(8,29,57,0.38)',
        'xl': '0 26px 58px rgba(8,29,57,0.46)',
        'cyan': '0 4px 18px rgba(0,229,255,0.16)',
        'cyan-lg': '0 10px 28px rgba(0,229,255,0.2)',
        'lime': '0 8px 20px rgba(114,199,13,0.18)',
        'ember': '0 8px 22px rgba(255,138,11,0.2)',
      },
    },
  },
  plugins: [],
};