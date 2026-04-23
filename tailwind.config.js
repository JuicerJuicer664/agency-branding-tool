/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--color-background)',       // near-black #0F0F0F
        foreground: 'var(--color-foreground)',        // white
        border: 'var(--color-border)',                // white/10
        input: 'var(--color-input)',                  // zinc-900 approx #242424
        ring: 'var(--color-ring)',                    // gold #D4AF37

        card: {
          DEFAULT: 'var(--color-card)',               // zinc-900 approx #242424
          foreground: 'var(--color-card-foreground)', // gray-200
        },
        popover: {
          DEFAULT: 'var(--color-popover)',            // zinc-800 approx #2D2D2D
          foreground: 'var(--color-popover-foreground)', // gray-100
        },
        primary: {
          DEFAULT: 'var(--color-primary)',            // zinc-900 #1A1A1A
          foreground: 'var(--color-primary-foreground)', // white
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',          // zinc-800 approx #2D2D2D
          foreground: 'var(--color-secondary-foreground)', // gray-100
        },
        accent: {
          DEFAULT: 'var(--color-accent)',             // gold #D4AF37
          foreground: 'var(--color-accent-foreground)', // black
        },
        muted: {
          DEFAULT: 'var(--color-muted)',              // zinc-900 approx #242424
          foreground: 'var(--color-muted-foreground)', // gray-400 approx #B8B8B8
        },
        destructive: {
          DEFAULT: 'var(--color-destructive)',        // red-500
          foreground: 'var(--color-destructive-foreground)', // white
        },
        success: {
          DEFAULT: 'var(--color-success)',            // green-500
          foreground: 'var(--color-success-foreground)', // black
        },
        warning: {
          DEFAULT: 'var(--color-warning)',            // amber-500
          foreground: 'var(--color-warning-foreground)', // black
        },
        error: {
          DEFAULT: 'var(--color-error)',              // red-500
          foreground: 'var(--color-error-foreground)', // white
        },
        surface: {
          DEFAULT: 'var(--color-surface)',            // zinc-900 approx #242424
          foreground: 'var(--color-surface-foreground)', // gray-200
        },
      },
      fontFamily: {
        heading: ['Playfair Display', 'serif'],
        body: ['Source Sans Pro', 'sans-serif'],
        caption: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'display-1': ['3rem', { lineHeight: '1.1' }],
        'display-2': ['2.25rem', { lineHeight: '1.2' }],
        'display-3': ['1.75rem', { lineHeight: '1.25' }],
        'display-4': ['1.375rem', { lineHeight: '1.3' }],
        'display-5': ['1.125rem', { lineHeight: '1.4' }],
      },
      spacing: {
        '1.5': '6px',
        '3': '12px',
        '4.5': '18px',
        '6': '24px',
        '9': '36px',
        '12': '48px',
        '18': '72px',
        '24': '96px',
        '36': '144px',
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '12px',
        md: '12px',
        lg: '18px',
        xl: '24px',
      },
      boxShadow: {
        'elevation-sm': '0 2px 4px rgba(0,0,0,0.4)',
        'elevation-md': '0 6px 12px rgba(0,0,0,0.4)',
        'elevation-lg': '0 12px 24px rgba(0,0,0,0.5)',
        'elevation-xl': '0 24px 48px rgba(0,0,0,0.6)',
        'elevation-2xl': '0 32px 64px -12px rgba(0,0,0,0.6)',
      },
      transitionTimingFunction: {
        luxury: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
      transitionDuration: {
        250: '250ms',
      },
      zIndex: {
        base: '0',
        card: '1',
        dropdown: '50',
        'canvas-overlay': '75',
        navigation: '100',
        modal: '200',
        toast: '300',
      },
    },
  },
  plugins: [],
};