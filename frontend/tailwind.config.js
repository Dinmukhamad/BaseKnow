/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef8f6',
          100: '#d5f0eb',
          500: '#0f9f8f',
          600: '#0a8075',
          700: '#08685f',
        },
        surface: {
          50: '#f7f8fa',
          100: '#eef1f4',
          200: '#dce2e8',
          900: '#17202a',
        },
      },
    },
  },
  plugins: [],
}
