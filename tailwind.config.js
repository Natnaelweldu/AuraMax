/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primaryBg: '#15131a',
        cardFill: '#1c1a24',
        accentMint: '#C9A15A',
        accentBlue: '#52E9D4',
        // Brass — calibrated / stored / measured data. The "settled" accent.
        brass: {
          50: '#FBF6EC',
          100: '#F5E9CE',
          200: '#EAD29D',
          300: '#DDBB72',
          400: '#C9A15A',
          500: '#B8873F',
          600: '#96692E',
          700: '#74501F',
          800: '#523714',
          900: '#3D2810',
          950: '#2E1D09',
        },
        // Phosphor — live measurement in progress. Reserved for active/scanning states only.
        phosphor: {
          50: '#EBFDFA',
          100: '#CFFAF2',
          200: '#9FF3E6',
          300: '#8FF5E4',
          400: '#52E9D4',
          500: '#22C7B4',
          600: '#159485',
          700: '#0F6E64',
          800: '#0A4A43',
          950: '#052B27',
        },
        graphite: {
          950: '#0F0E13',
          900: '#15131A',
          800: '#1C1A24',
          700: '#26232F',
          600: '#332F3F',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
