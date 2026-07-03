/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#eff6ff',
          100: '#dbeafe',
          600: '#1d4ed8',
          700: '#1e3a8a',
          800: '#1e3a8a',
          900: '#1e3a8a',
        },
        brand: {
          navy:  '#1E3A8A',
          blue:  '#3B82F6',
          light: '#F8FAFC',
        },
      },
      animation: {
        'fade-in':     'fadeIn 0.6s ease-out',
        'slide-up':    'slideUp 0.5s ease-out',
        'slide-right': 'slideRight 0.4s ease-out',
        'pulse-slow':  'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      keyframes: {
        fadeIn:     { '0%': { opacity: '0' },                        '100%': { opacity: '1' } },
        slideUp:    { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideRight: { '0%': { opacity: '0', transform: 'translateX(-20px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
