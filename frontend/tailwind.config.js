/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'yt-bg':      '#07091a',
        'yt-surface': '#0e1130',
        'yt-surface2':'#151840',
        'yt-border':  '#1e2354',
        'yt-red':     '#38bdf8',   // accent: sky blue
        'yt-text':    '#ffffff',
        'yt-muted':   '#8b9cc8',
      },
      fontFamily: {
        sans: ['Roboto', 'sans-serif'],
        lyra: ['Raleway', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

