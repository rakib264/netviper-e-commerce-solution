import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        'xs': '480px',
      },
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        // Routed through the typography tokens so `font-mono` follows the theme
        // instead of Tailwind's built-in stack. Role families (font-heading,
        // font-title, font-price, ...) are defined in app/globals.css.
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
        // Tailwind's built-in `serif` stack is the last way to render a font
        // outside the theme, so it is redirected at the heading role too.
        serif: ['var(--font-heading)', 'ui-serif', 'Georgia', 'serif'],
      },
      fontSize: {
        // Enhanced responsive font sizes with line heights
        'xs': ['0.75rem', { lineHeight: '1rem' }],     // 12px
        'sm': ['0.875rem', { lineHeight: '1.25rem' }], // 14px
        'base': ['1rem', { lineHeight: '1.5rem' }],    // 16px
        'lg': ['1.125rem', { lineHeight: '1.75rem' }], // 18px
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],  // 20px
        '2xl': ['1.5rem', { lineHeight: '2rem' }],     // 24px
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],  // 36px
        '5xl': ['3rem', { lineHeight: '1' }],          // 48px
        '6xl': ['3.75rem', { lineHeight: '1' }],       // 60px
        '7xl': ['4.5rem', { lineHeight: '1' }],        // 72px
        '8xl': ['6rem', { lineHeight: '1' }],          // 96px
        '9xl': ['8rem', { lineHeight: '1' }],          // 128px

        // Fluid typography using clamp
        'fluid-xs': 'clamp(0.75rem, 2vw, 0.875rem)',     // 12px -> 14px
        'fluid-sm': 'clamp(0.875rem, 2.5vw, 1rem)',      // 14px -> 16px
        'fluid-base': 'clamp(1rem, 3vw, 1.125rem)',      // 16px -> 18px
        'fluid-lg': 'clamp(1.125rem, 3.5vw, 1.25rem)',   // 18px -> 20px
        'fluid-xl': 'clamp(1.25rem, 4vw, 1.5rem)',       // 20px -> 24px
        'fluid-2xl': 'clamp(1.5rem, 5vw, 2rem)',         // 24px -> 32px
        'fluid-3xl': 'clamp(1.875rem, 6vw, 2.5rem)',     // 30px -> 40px
        'fluid-4xl': 'clamp(2.25rem, 7vw, 3rem)',        // 36px -> 48px
        'fluid-5xl': 'clamp(2.5rem, 8vw, 4rem)',         // 40px -> 64px
        'fluid-6xl': 'clamp(3rem, 10vw, 5rem)',          // 48px -> 80px
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        // Every colour resolves to a semantic CSS variable produced by
        // lib/theme/colors.ts from the Primary + Secondary chosen in
        // Settings -> General. Nothing here is a literal, so changing those two
        // values re-themes the entire application.
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        card: {
          DEFAULT: 'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover) / <alpha-value>)',
          foreground: 'hsl(var(--popover-foreground) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
          50: 'hsl(var(--primary-50) / <alpha-value>)',
          100: 'hsl(var(--primary-100) / <alpha-value>)',
          200: 'hsl(var(--primary-200) / <alpha-value>)',
          300: 'hsl(var(--primary-300) / <alpha-value>)',
          400: 'hsl(var(--primary-400) / <alpha-value>)',
          500: 'hsl(var(--primary-500) / <alpha-value>)',
          600: 'hsl(var(--primary-600) / <alpha-value>)',
          700: 'hsl(var(--primary-700) / <alpha-value>)',
          800: 'hsl(var(--primary-800) / <alpha-value>)',
          900: 'hsl(var(--primary-900) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
          foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)',
          50: 'hsl(var(--secondary-50) / <alpha-value>)',
          100: 'hsl(var(--secondary-100) / <alpha-value>)',
          200: 'hsl(var(--secondary-200) / <alpha-value>)',
          300: 'hsl(var(--secondary-300) / <alpha-value>)',
          400: 'hsl(var(--secondary-400) / <alpha-value>)',
          500: 'hsl(var(--secondary-500) / <alpha-value>)',
          600: 'hsl(var(--secondary-600) / <alpha-value>)',
          700: 'hsl(var(--secondary-700) / <alpha-value>)',
          800: 'hsl(var(--secondary-800) / <alpha-value>)',
          900: 'hsl(var(--secondary-900) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          foreground: 'hsl(var(--accent-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
          foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)',
          50: 'hsl(var(--destructive-50) / <alpha-value>)',
          100: 'hsl(var(--destructive-100) / <alpha-value>)',
          200: 'hsl(var(--destructive-200) / <alpha-value>)',
          300: 'hsl(var(--destructive-300) / <alpha-value>)',
          400: 'hsl(var(--destructive-400) / <alpha-value>)',
          500: 'hsl(var(--destructive-500) / <alpha-value>)',
          600: 'hsl(var(--destructive-600) / <alpha-value>)',
          700: 'hsl(var(--destructive-700) / <alpha-value>)',
          800: 'hsl(var(--destructive-800) / <alpha-value>)',
          900: 'hsl(var(--destructive-900) / <alpha-value>)',
        },
        success: {
          DEFAULT: 'hsl(var(--success) / <alpha-value>)',
          foreground: 'hsl(var(--success-foreground) / <alpha-value>)',
          50: 'hsl(var(--success-50) / <alpha-value>)',
          100: 'hsl(var(--success-100) / <alpha-value>)',
          200: 'hsl(var(--success-200) / <alpha-value>)',
          300: 'hsl(var(--success-300) / <alpha-value>)',
          400: 'hsl(var(--success-400) / <alpha-value>)',
          500: 'hsl(var(--success-500) / <alpha-value>)',
          600: 'hsl(var(--success-600) / <alpha-value>)',
          700: 'hsl(var(--success-700) / <alpha-value>)',
          800: 'hsl(var(--success-800) / <alpha-value>)',
          900: 'hsl(var(--success-900) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning) / <alpha-value>)',
          foreground: 'hsl(var(--warning-foreground) / <alpha-value>)',
          50: 'hsl(var(--warning-50) / <alpha-value>)',
          100: 'hsl(var(--warning-100) / <alpha-value>)',
          200: 'hsl(var(--warning-200) / <alpha-value>)',
          300: 'hsl(var(--warning-300) / <alpha-value>)',
          400: 'hsl(var(--warning-400) / <alpha-value>)',
          500: 'hsl(var(--warning-500) / <alpha-value>)',
          600: 'hsl(var(--warning-600) / <alpha-value>)',
          700: 'hsl(var(--warning-700) / <alpha-value>)',
          800: 'hsl(var(--warning-800) / <alpha-value>)',
          900: 'hsl(var(--warning-900) / <alpha-value>)',
        },
        info: {
          DEFAULT: 'hsl(var(--info) / <alpha-value>)',
          foreground: 'hsl(var(--info-foreground) / <alpha-value>)',
          50: 'hsl(var(--info-50) / <alpha-value>)',
          100: 'hsl(var(--info-100) / <alpha-value>)',
          200: 'hsl(var(--info-200) / <alpha-value>)',
          300: 'hsl(var(--info-300) / <alpha-value>)',
          400: 'hsl(var(--info-400) / <alpha-value>)',
          500: 'hsl(var(--info-500) / <alpha-value>)',
          600: 'hsl(var(--info-600) / <alpha-value>)',
          700: 'hsl(var(--info-700) / <alpha-value>)',
          800: 'hsl(var(--info-800) / <alpha-value>)',
          900: 'hsl(var(--info-900) / <alpha-value>)',
        },
        beige: {
          DEFAULT: 'hsl(var(--beige-500) / <alpha-value>)',
          50: 'hsl(var(--beige-50) / <alpha-value>)',
          100: 'hsl(var(--beige-100) / <alpha-value>)',
          200: 'hsl(var(--beige-200) / <alpha-value>)',
          300: 'hsl(var(--beige-300) / <alpha-value>)',
          400: 'hsl(var(--beige-400) / <alpha-value>)',
          500: 'hsl(var(--beige-500) / <alpha-value>)',
          600: 'hsl(var(--beige-600) / <alpha-value>)',
          700: 'hsl(var(--beige-700) / <alpha-value>)',
          800: 'hsl(var(--beige-800) / <alpha-value>)',
          900: 'hsl(var(--beige-900) / <alpha-value>)',
        },
        sandy: {
          DEFAULT: 'hsl(var(--sandy-500) / <alpha-value>)',
          50: 'hsl(var(--sandy-50) / <alpha-value>)',
          100: 'hsl(var(--sandy-100) / <alpha-value>)',
          200: 'hsl(var(--sandy-200) / <alpha-value>)',
          300: 'hsl(var(--sandy-300) / <alpha-value>)',
          400: 'hsl(var(--sandy-400) / <alpha-value>)',
          500: 'hsl(var(--sandy-500) / <alpha-value>)',
          600: 'hsl(var(--sandy-600) / <alpha-value>)',
          700: 'hsl(var(--sandy-700) / <alpha-value>)',
          800: 'hsl(var(--sandy-800) / <alpha-value>)',
          900: 'hsl(var(--sandy-900) / <alpha-value>)',
        },
        'subtle-foreground': 'hsl(var(--subtle-foreground) / <alpha-value>)',
        border: 'hsl(var(--border) / <alpha-value>)',
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
        chart: {
          '1': 'hsl(var(--chart-1) / <alpha-value>)',
          '2': 'hsl(var(--chart-2) / <alpha-value>)',
          '3': 'hsl(var(--chart-3) / <alpha-value>)',
          '4': 'hsl(var(--chart-4) / <alpha-value>)',
          '5': 'hsl(var(--chart-5) / <alpha-value>)',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar) / <alpha-value>)',
          foreground: 'hsl(var(--sidebar-foreground) / <alpha-value>)',
          primary: 'hsl(var(--sidebar-primary) / <alpha-value>)',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground) / <alpha-value>)',
          accent: 'hsl(var(--sidebar-accent) / <alpha-value>)',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground) / <alpha-value>)',
          border: 'hsl(var(--sidebar-border) / <alpha-value>)',
          ring: 'hsl(var(--sidebar-ring) / <alpha-value>)',
        },
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'glow': {
          '0%': { boxShadow: '0 0 5px rgba(59, 130, 246, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.8)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'bounce-in': {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(37, 211, 102, 0.4)' },
          '50%': { boxShadow: '0 0 20px rgba(37, 211, 102, 0.8), 0 0 30px rgba(37, 211, 102, 0.6)' },
        },
        'gentle-pulse': {
          '0%, 100%': {
            transform: 'scale(1)',
            boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)'
          },
          '50%': {
            transform: 'scale(1.02)',
            boxShadow: '0 6px 20px rgba(37, 211, 102, 0.4)'
          },
        },
        'smooth-bounce': {
          '0%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-2px)' },
          '100%': { transform: 'translateY(0px)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slide-up 0.5s ease-out',
        'fade-in': 'fade-in 0.8s ease-out',
        'bounce-in': 'bounce-in 0.6s ease-out',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'gentle-pulse': 'gentle-pulse 3s ease-in-out infinite',
        'smooth-bounce': 'smooth-bounce 2s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;
