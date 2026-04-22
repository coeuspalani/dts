import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Syne', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
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
      screens: {
        xs: '375px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
      },
    },
  },
  plugins: [],
}
export default config
