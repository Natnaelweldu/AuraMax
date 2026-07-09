/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primaryBg: '#0d0e12',
        cardFill: '#12141c',
        accentMint: '#14b8a6',
        accentBlue: '#3b82f6',
      },
    },
  },
  plugins: [],
}
