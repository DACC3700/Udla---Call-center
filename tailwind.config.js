/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        udla: {
          gray:   '#2B2D42',
          'gray-mid': '#3D3F57',
          'gray-light': '#F0F0F5',
          orange: '#F4721E',
          'orange-dark': '#D45E0A',
          'orange-light': '#FFF0E6',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
