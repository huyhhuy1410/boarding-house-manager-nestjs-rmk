/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#f8fafc',
        teal: {
          DEFAULT: '#0f766e',
          dark: '#0b5f59',
        },
        blue: '#0369a1',
        slate: '#0f172a',
        muted: '#64748b',
        card: '#ffffff',
        border: '#dde7e5',
        soft: '#edf7f5',
        danger: '#b42318',
        warning: '#b54708',
        status: {
          occupied: { bg: '#e6f7f2', text: '#08705f' },
          vacant: { bg: '#e9f5fb', text: '#0369a1' },
          pending: { bg: '#fff4e5', text: '#b54708' },
          cancelled: { bg: '#eef2f6', text: '#64748b' },
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        btn: '11px',
        card: '16px',
        xl: '18px',
      },
      boxShadow: {
        card: '0 8px 30px rgba(15, 23, 42, 0.06)',
      },
      spacing: {
        'sidebar': '248px',
      }
    },
  },
  plugins: [],
}
