/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef9f8',
          100: '#d6f0ee',
          500: '#118a84',
          600: '#0d746f',
          700: '#0b5f5b',
        },
        ink: {
          500: '#64748b',
          700: '#334155',
          900: '#0f172a',
        },
        accent: {
          blue: '#2563eb',
          amber: '#d97706',
          green: '#059669',
          rose: '#e11d48',
        },
        surface: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          900: '#0f172a',
        },
      },
    },
  },
  plugins: [],
}
