/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f2faf4',
          100: '#e0f5e6',
          200: '#b9e8c6',
          300: '#88d6a0',
          400: '#54bd76',
          500: '#2fa257',
          600: '#1f8345',
          700: '#1a6839',
          800: '#185330',
          900: '#14442a',
        },
        accent: {
          500: '#e8823b',
          600: '#d5691f',
        },
      },
    },
  },
  plugins: [],
}
