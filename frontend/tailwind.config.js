export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      boxShadow: {
        soft: '0 10px 30px rgba(15, 23, 42, 0.08)'
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        },
        pop: {
          '0%': { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-6px)' },
          '40%': { transform: 'translateX(6px)' },
          '60%': { transform: 'translateX(-4px)' },
          '80%': { transform: 'translateX(4px)' }
        }
      },
      animation: {
        'fade-up': 'fade-up 520ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'scale-in 420ms cubic-bezier(0.16, 1, 0.3, 1) both',
        pop: 'pop 240ms cubic-bezier(0.16, 1, 0.3, 1) both',
        shake: 'shake 360ms cubic-bezier(0.16, 1, 0.3, 1) both'
      }
    }
  },
  plugins: []
};
