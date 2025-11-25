import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        // Keep existing shadcn colors for compatibility
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",

        // NEW: Indian EdTech + Modern AI Design System
        // Primary - Indian-inspired gradient (Saffron to Orange)
        primary: {
          50: '#fef6ee',
          100: '#fdecd5',
          200: '#fad5aa',
          300: '#f7b574',
          400: '#f38b3c',
          500: '#f06d1f',  // Main brand color
          600: '#e15110',
          700: '#bb3d0f',
          800: '#953114',
          900: '#792b14',
          DEFAULT: '#f06d1f',
          foreground: '#ffffff',
        },

        // Secondary - Deep Purple/Indigo (AI theme)
        secondary: {
          50: '#f3f1ff',
          100: '#ebe5ff',
          200: '#d9ceff',
          300: '#bea6ff',
          400: '#9f75ff',
          500: '#843dff',  // AI accent
          600: '#7916ff',
          700: '#6b04fd',
          800: '#5a03d5',
          900: '#4b05ad',
          DEFAULT: '#843dff',
          foreground: '#ffffff',
        },

        // Accent - Success Green (Progress, achievements)
        accent: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',  // Success color
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          DEFAULT: '#22c55e',
          foreground: '#ffffff',
        },

        // Warning - Indian saffron
        warning: {
          500: '#ff9933',
          600: '#ff7700',
          DEFAULT: '#ff9933',
          foreground: '#ffffff',
        },

        // Success - reuse accent green
        success: {
          500: '#22c55e',
          600: '#16a34a',
          DEFAULT: '#22c55e',
          foreground: '#ffffff',
        },

        // Background - Soft gradients
        bg: {
          DEFAULT: '#fafbfc',
          subtle: '#f5f7fa',
          elevated: '#ffffff',
        }
      },
      fontFamily: {
        sans: ['Inter var', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Cal Sans', 'Inter var', 'Inter', 'system-ui', 'sans-serif'], // For headings
        mono: ['JetBrains Mono', 'monospace'],
        hindi: ['Noto Sans Devanagari', 'system-ui', 'sans-serif'],
        math: ['STIX Two Math', 'serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        'display': ['4.5rem', { lineHeight: '1', letterSpacing: '-0.02em' }],
      },
      animation: {
        // Keep existing
        'fade-in': 'fadeIn 300ms ease-in-out',
        'slide-in': 'slideIn 200ms ease-out',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',

        // NEW: Smooth entrances
        'slide-up': 'slideUp 400ms ease-out',
        'slide-down': 'slideDown 400ms ease-out',
        'scale-in': 'scaleIn 200ms ease-out',

        // Loading states
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',

        // AI interactions
        'glow': 'glow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',

        // Progress
        'progress': 'progress 1.5s ease-in-out',
      },
      keyframes: {
        // Keep existing
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },

        // NEW: Enhanced animations
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(132, 61, 255, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(132, 61, 255, 0.6)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        progress: {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
} satisfies Config;
