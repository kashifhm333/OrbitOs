/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        aerospace: {
          bg: '#050B16',
          sidebar: '#071426',
          nav: '#091A30',
          card: '#0B1B2E',
          elevated: '#10243B',
          cyan: '#00D5FF',
          blue: '#1677FF',
          success: '#00D69A',
          warning: '#FFB547',
          critical: '#FF4D5E',
          text: '#E8F0FA',
          muted: '#8295AC',
          border: '#1A3450',
        },
        space: {
          950: '#050B16',
          900: '#071426',
          850: '#091A30',
          800: '#0B1B2E',
          750: '#10243B',
          700: '#142a42',
          600: '#1A3450',
          500: '#234a70',
        },
        cyan: {
          400: '#22d3ee',
          500: '#06b6d4',
        },
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
        },
        emerald: {
          400: '#34d399',
          500: '#10b981',
        },
        violet: {
          400: '#a78bfa',
          500: '#8b5cf6',
        },
        rose: {
          400: '#fb7185',
          500: '#f43f5e',
        }
      }
    },
  },
  plugins: [],
}
