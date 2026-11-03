/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        space: {
          900: '#070b19',
          800: '#0c1329',
          700: '#141d3d',
          600: '#1e2c59',
          500: '#2b3f7f',
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
        }
      }
    },
  },
  plugins: [],
}

