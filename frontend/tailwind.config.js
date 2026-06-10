/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          white: '#FFFFFF',
          black: '#0A0A0A',
          gray: {
            100: '#F5F5F5',
            200: '#E0E0E0',
            400: '#9E9E9E',
            600: '#424242',
            700: '#2A2A2A',
            800: '#1A1A1A',
            900: '#111111',
          },
        },
      },
    },
  },
  plugins: [],
}
