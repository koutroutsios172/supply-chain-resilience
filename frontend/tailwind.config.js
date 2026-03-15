/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: '#060912',
        panel: '#0d1117',
        surface: '#161b27',
        border: '#1e2535',
        amber: {
          glow: '#f59e0b',
          dim: '#92400e',
        }
      },
      fontFamily: {
        mono: ['IBM Plex Mono', 'monospace'],
        sans: ['Syne', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
