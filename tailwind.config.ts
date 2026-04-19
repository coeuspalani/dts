import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:  ['Syne', 'sans-serif'],
        mono:  ['Space Mono', 'monospace'],
      },
      colors: {
        bg:       '#0a0a0f',
        surface:  '#111118',
        surface2: '#16161f',
        border:   'rgba(255,255,255,0.07)',
        accent:   '#7c6af7',
        accent2:  '#5de0b0',
        gold:     '#f5c842',
        muted:    '#7c7b90',
        danger:   '#f05a5a',
      },
      keyframes: {
        fadeUp: { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        pulse2: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.4' } },
      },
      animation: {
        'fade-up': 'fadeUp 0.4s ease forwards',
        'pulse2':  'pulse2 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
export default config
