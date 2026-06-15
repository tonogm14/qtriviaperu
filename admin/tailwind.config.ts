import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        brand: {
          50:  '#f5f0ff',
          100: '#ebe0fe',
          200: '#d8c2fe',
          300: '#b795fb',
          400: '#9466f4',
          500: '#7c3aed',
          600: '#6c2bd9',
          700: '#5921b5',
          800: '#481a93',
          900: '#2e0f66',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
