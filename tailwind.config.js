/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0ffe0',
          100: '#e0ffb0',
          500: '#ccff00',
          600: '#b8e600',
          700: '#a4cc00',
          800: '#8fb300',
          900: '#7a9900'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};