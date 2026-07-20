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
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          900: '#1E3A5F',
        },
        surface: {
          DEFAULT: '#0F172A',
          card: '#1E293B',
          elevated: '#334155',
          overlay: 'rgba(15,23,42,0.85)',
        },
        accent: {
          yellow: '#F59E0B',
          green: '#10B981',
          red: '#EF4444',
          purple: '#8B5CF6',
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
