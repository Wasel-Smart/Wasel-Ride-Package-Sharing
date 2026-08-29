/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          400: '#58DDFF',
          500: '#00E5FF',
          600: '#00E5FF',
          700: '#0e2240',
          900: '#081D39',
        },
        surface: {
          DEFAULT: '#0e2240',
          card: '#132b4d',
          elevated: '#1a3055',
          overlay: 'rgba(8,29,57,0.85)',
        },
        accent: {
          yellow: '#FFBE5C',
          green: '#72C70D',
          red: '#FF7C8B',
          purple: '#8FA6FF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'System'],
        display: ['Poppins-SemiBold', 'System'],
        mono: ['JetBrainsMono', 'System'],
      },
      borderRadius: {
        xl: '16px',
        '2xl': '24px',
        '3xl': '32px',
      },
    },
  },
  plugins: [],
};
