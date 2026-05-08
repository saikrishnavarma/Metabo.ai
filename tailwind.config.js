/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#04040a',
        bg2:     '#08091a',
        card:    'rgba(255,255,255,0.04)',
        card2:   'rgba(255,255,255,0.07)',
        line:    'rgba(255,255,255,0.08)',
        accent:  '#9333ea',
        accent2: '#06b6d4',
        muted:   'rgba(255,255,255,0.38)',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"SF Pro Text"', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
