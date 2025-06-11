/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Vortex brand colors
        'vortex-green': '#7CB342',
        'vortex-green-dark': '#6A9E39',
        // Custom color palette for Warren
        'midnight': {
          50: '#e6e9f0',
          100: '#c0c7db',
          200: '#96a2c4',
          300: '#6c7dac',
          400: '#4d619b',
          500: '#2e4589',
          600: '#293e81',
          700: '#223676',
          800: '#1c2e6c',
          900: '#102059',
        },
        'electric': {
          50: '#e8f2ff',
          100: '#c5deff',
          200: '#9ec9ff',
          300: '#77b3ff',
          400: '#5aa3ff',
          500: '#3d93ff',
          600: '#3786ff',
          700: '#2f76ff',
          800: '#2766ff',
          900: '#1a4aff',
        },
        'coral': {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      animation: {
        'gradient-x': 'gradient-x 15s ease infinite',
        'gradient-y': 'gradient-y 15s ease infinite',
        'gradient-xy': 'gradient-xy 15s ease infinite',
      },
      keyframes: {
        'gradient-x': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          }
        },
        'gradient-y': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'center top'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'center bottom'
          }
        },
        'gradient-xy': {
          '0%, 100%': {
            'background-size': '400% 400%',
            'background-position': 'left center'
          },
          '25%': {
            'background-size': '400% 400%',
            'background-position': 'right center'
          },
          '50%': {
            'background-size': '400% 400%',
            'background-position': 'right bottom'
          },
          '75%': {
            'background-size': '400% 400%',
            'background-position': 'left bottom'
          }
        }
      }
    },
  },
  plugins: [],
}