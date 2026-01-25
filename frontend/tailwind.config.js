/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f4f8',
          100: '#e1e8f0',
          500: '#0f3a7d',
          600: '#0a2847',
          700: '#051f35',
          900: '#020f1a',
        },
      },
    },
  },
  plugins: [],
}
