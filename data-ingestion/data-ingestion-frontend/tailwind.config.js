/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-yellow': '#FFD700',
        'brand-green': '#32CD32',
        'ocean-deep': '#0d1b2a',
        'ocean-surface': '#1b263b',
        'dark-text': '#edf2f7',
        'dark-subtext': '#a0aec0',
      }
    }
  },
  plugins: [],
}
