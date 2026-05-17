// tailwind.config.js
// Note: Tailwind is used minimally — design system relies on CSS custom properties.
// Tailwind handles utilities that CSS vars don't easily replace (flex, grid, spacing utils).
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // Disable Tailwind's default color palette to reduce CSS output
  theme: {
    extend: {
      // All design tokens live in src/styles/tokens.css as CSS custom properties.
      // We expose them to Tailwind utilities as well for convenience.
      colors: {
        brand: {
          50:  'var(--brand-50)',
          100: 'var(--brand-100)',
          200: 'var(--brand-200)',
          300: 'var(--brand-300)',
          400: 'var(--brand-400)',
          500: 'var(--brand-500)',
          600: 'var(--brand-600)',
          700: 'var(--brand-700)',
          800: 'var(--brand-800)',
          900: 'var(--brand-900)',
        },
      },
      fontFamily: {
        display: ['Syne', 'system-ui', 'sans-serif'],
        body:    ['Source Serif 4', 'Georgia', 'serif'],
        mono:    ['JetBrains Mono', 'Fira Code', 'monospace'],
        ui:      ['Syne', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm:   'var(--radius-sm)',
        md:   'var(--radius-md)',
        lg:   'var(--radius-lg)',
        xl:   'var(--radius-xl)',
        '2xl':'var(--radius-2xl)',
      },
    },
  },
  // Only generate utilities used in our codebase
  plugins: [],
}
