/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/renderer/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dock: {
          bg: 'rgb(var(--dock-bg) / <alpha-value>)',
          panel: 'rgb(var(--dock-panel) / <alpha-value>)',
          border: 'rgb(var(--dock-border) / <alpha-value>)',
          hover: 'rgb(var(--dock-hover) / <alpha-value>)',
          accent: 'rgb(var(--dock-accent) / <alpha-value>)',
          'accent-hover': 'rgb(var(--dock-accent-hover) / <alpha-value>)',
          text: 'rgb(var(--dock-text) / <alpha-value>)',
          muted: 'rgb(var(--dock-muted) / <alpha-value>)',
          danger: 'rgb(var(--dock-danger) / <alpha-value>)',
          warning: 'rgb(var(--dock-warning) / <alpha-value>)',
        },
        env: {
          production: '#3fb950',
          staging: '#d29922',
          development: '#58a6ff',
          test: '#8b949e',
        },
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease forwards',
        'slide-out': 'slideOut 0.3s ease forwards',
        'fade-in': 'fadeIn 0.2s ease forwards',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideOut: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
