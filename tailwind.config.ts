import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        panel: '#1f1f22',
        panelAlt: '#2a2a2e',
        accent: '#759900',
      },
      keyframes: {
        'bad-flash': {
          '0%, 100%': { backgroundColor: 'rgba(220, 38, 38, 0.45)' },
          '50%': { backgroundColor: 'rgba(220, 38, 38, 0.85)' },
        },
      },
      animation: {
        'bad-flash': 'bad-flash 0.4s ease-in-out 3',
      },
    },
  },
  plugins: [],
};

export default config;
