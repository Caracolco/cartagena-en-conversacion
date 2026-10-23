/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 950: '#081629', 900: '#0B1F3A', 800: '#13315C', 700: '#1D4479', 600: '#2F5B94', 300: '#9DB3D1', 100: '#E6ECF5', 50: '#F3F6FA' },
        accent: { DEFAULT: '#C8102E', dark: '#9E0C24', soft: '#FBE9EC' },
        ink: { DEFAULT: '#1B2433', muted: '#5B6678', faint: '#8A94A6' },
        line: '#E3E8EF',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
      },
      boxShadow: { card: '0 1px 2px rgba(11,31,58,.06), 0 4px 16px rgba(11,31,58,.05)' },
    },
  },
  plugins: [],
};
