/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Consolas',
          'monospace',
        ],
      },
      colors: {
        ink: {
          950: '#05070d',
          900: '#0a0e1a',
          800: '#0f1424',
          700: '#161c30',
          600: '#1f2640',
        },
        neon: {
          green: '#22f59e',
          cyan: '#22d3ee',
          violet: '#a78bfa',
          pink: '#f472b6',
          amber: '#fbbf24',
        },
      },
      backgroundImage: {
        'grid-fade':
          'radial-gradient(ellipse at top, rgba(34,245,158,0.12), transparent 60%), radial-gradient(ellipse at bottom, rgba(167,139,250,0.10), transparent 60%)',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(34,245,158,0.25), 0 0 30px rgba(34,245,158,0.15)',
        card: '0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px rgba(0,0,0,0.35)',
      },
      keyframes: {
        pulseDot: {
          '0%,100%': { opacity: '0.4', transform: 'scale(0.8)' },
          '50%': { opacity: '1', transform: 'scale(1.2)' },
        },
        scan: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        pulseDot: 'pulseDot 1.6s ease-in-out infinite',
        scan: 'scan 2.4s linear infinite',
      },
    },
  },
  plugins: [],
};
