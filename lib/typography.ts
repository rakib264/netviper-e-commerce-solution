/**
 * Centralized Typography System - Enhanced for Premium Experience
 *
 * This file defines a comprehensive, responsive typography system for the food ecommerce application.
 * It provides consistent font scales, line heights, letter spacing, and responsive behavior
 * across all breakpoints with refined sizing for a premium, professional look.
 */

export const typography = {
  // Font scales optimized for different screen sizes - refined for premium feel
  fontSizes: {
    // Display headings - for hero sections and major headings (slightly smaller for elegance)
    display: {
      xs: 'text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl',   // 20px -> 48px
      sm: 'text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl',    // 18px -> 36px
      md: 'text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl',   // 16px -> 30px
      lg: 'text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl',    // 14px -> 24px
    },

    // Headings - for section titles and content headings (refined sizing)
    heading: {
      h1: 'text-lg sm:text-xl md:text-2xl lg:text-3xl',                // 18px -> 30px
      h2: 'text-base sm:text-lg md:text-xl lg:text-2xl',               // 16px -> 24px
      h3: 'text-sm sm:text-base md:text-lg lg:text-xl',                // 14px -> 20px
      h4: 'text-sm sm:text-sm md:text-base lg:text-lg',                // 14px -> 18px
      h5: 'text-xs sm:text-sm md:text-sm lg:text-base',                // 12px -> 16px
      h6: 'text-xs sm:text-xs md:text-sm lg:text-sm',                  // 12px -> 14px
    },

    // Body text - for paragraphs and general content (refined for readability)
    body: {
      xl: 'text-sm sm:text-base md:text-base lg:text-lg',              // 14px -> 18px
      lg: 'text-sm sm:text-sm md:text-base lg:text-base',              // 14px -> 16px
      md: 'text-xs sm:text-sm md:text-sm lg:text-sm',                  // 12px -> 14px
      sm: 'text-xs sm:text-xs md:text-xs lg:text-xs',                  // 12px -> 12px
    },

    // UI elements - for buttons, labels, captions (refined for premium UX)
    ui: {
      button: {
        lg: 'text-sm sm:text-sm md:text-base lg:text-base',            // 14px -> 16px
        md: 'text-xs sm:text-sm md:text-sm lg:text-sm',                // 12px -> 14px
        sm: 'text-xs sm:text-xs md:text-xs lg:text-xs',                // 12px -> 12px
      },
      label: 'text-xs sm:text-xs md:text-sm lg:text-sm',               // 12px -> 14px
      caption: 'text-xs sm:text-xs md:text-xs lg:text-xs',             // 12px -> 12px
      badge: 'text-xs',                                                // 12px consistent
      micro: 'text-[10px] sm:text-[11px]',                            // 10px -> 11px for fine details
    },
  },

  // Line heights for optimal readability
  lineHeights: {
    tight: 'leading-tight',      // 1.25
    snug: 'leading-snug',        // 1.375
    normal: 'leading-normal',    // 1.5
    relaxed: 'leading-relaxed',  // 1.625
    loose: 'leading-loose',      // 2
  },

  // Letter spacing for different text types
  letterSpacing: {
    tighter: 'tracking-tighter', // -0.05em
    tight: 'tracking-tight',     // -0.025em
    normal: 'tracking-normal',   // 0em
    wide: 'tracking-wide',       // 0.025em
    wider: 'tracking-wider',     // 0.05em
    widest: 'tracking-widest',   // 0.1em
  },

  // Font weights
  fontWeights: {
    thin: 'font-thin',           // 100
    extralight: 'font-extralight', // 200
    light: 'font-light',         // 300
    normal: 'font-normal',       // 400
    medium: 'font-medium',       // 500
    semibold: 'font-semibold',   // 600
    bold: 'font-bold',           // 700
    extrabold: 'font-extrabold', // 800
    black: 'font-black',         // 900
  },
} as const;

// Predefined typography combinations for common use cases
export const typographyPresets = {
  // Hero section typography
  hero: {
    title: `${typography.fontSizes.display.xs} ${typography.fontWeights.bold} ${typography.lineHeights.tight} ${typography.letterSpacing.tight}`,
    subtitle: `${typography.fontSizes.body.lg} ${typography.fontWeights.medium} ${typography.lineHeights.relaxed} ${typography.letterSpacing.normal}`,
    description: `${typography.fontSizes.body.md} ${typography.fontWeights.normal} ${typography.lineHeights.relaxed} ${typography.letterSpacing.normal}`,
  },

  // Section headers
  section: {
    title: `${typography.fontSizes.heading.h1} ${typography.fontWeights.bold} ${typography.lineHeights.tight} ${typography.letterSpacing.tight}`,
    subtitle: `${typography.fontSizes.body.lg} ${typography.fontWeights.medium} ${typography.lineHeights.normal} ${typography.letterSpacing.normal}`,
    description: `${typography.fontSizes.body.md} ${typography.fontWeights.normal} ${typography.lineHeights.relaxed} ${typography.letterSpacing.normal}`,
  },

  // Card typography
  card: {
    title: `${typography.fontSizes.heading.h3} ${typography.fontWeights.semibold} ${typography.lineHeights.snug} ${typography.letterSpacing.normal}`,
    subtitle: `${typography.fontSizes.body.sm} ${typography.fontWeights.medium} ${typography.lineHeights.normal} ${typography.letterSpacing.normal}`,
    description: `${typography.fontSizes.body.sm} ${typography.fontWeights.normal} ${typography.lineHeights.relaxed} ${typography.letterSpacing.normal}`,
  },

  // Product typography
  product: {
    name: `${typography.fontSizes.heading.h4} ${typography.fontWeights.semibold} ${typography.lineHeights.snug} ${typography.letterSpacing.normal}`,
    price: `${typography.fontSizes.heading.h4} ${typography.fontWeights.bold} ${typography.lineHeights.normal} ${typography.letterSpacing.normal}`,
    description: `${typography.fontSizes.body.sm} ${typography.fontWeights.normal} ${typography.lineHeights.relaxed} ${typography.letterSpacing.normal}`,
  },

  // Button typography
  button: {
    lg: `${typography.fontSizes.ui.button.lg} ${typography.fontWeights.semibold} ${typography.lineHeights.normal} ${typography.letterSpacing.wide}`,
    md: `${typography.fontSizes.ui.button.md} ${typography.fontWeights.semibold} ${typography.lineHeights.normal} ${typography.letterSpacing.wide}`,
    sm: `${typography.fontSizes.ui.button.sm} ${typography.fontWeights.medium} ${typography.lineHeights.normal} ${typography.letterSpacing.wide}`,
  },

  // Stats and metrics
  stats: {
    number: `${typography.fontSizes.heading.h2} ${typography.fontWeights.bold} ${typography.lineHeights.tight} ${typography.letterSpacing.tight}`,
    label: `${typography.fontSizes.ui.caption} ${typography.fontWeights.medium} ${typography.lineHeights.normal} ${typography.letterSpacing.wide}`,
  },

  // Navigation
  nav: {
    primary: `${typography.fontSizes.body.md} ${typography.fontWeights.medium} ${typography.lineHeights.normal} ${typography.letterSpacing.normal}`,
    secondary: `${typography.fontSizes.body.sm} ${typography.fontWeights.normal} ${typography.lineHeights.normal} ${typography.letterSpacing.normal}`,
  },

  // Form elements
  form: {
    label: `${typography.fontSizes.ui.label} ${typography.fontWeights.medium} ${typography.lineHeights.normal} ${typography.letterSpacing.normal}`,
    input: `${typography.fontSizes.body.md} ${typography.fontWeights.normal} ${typography.lineHeights.normal} ${typography.letterSpacing.normal}`,
    helper: `${typography.fontSizes.ui.caption} ${typography.fontWeights.normal} ${typography.lineHeights.normal} ${typography.letterSpacing.normal}`,
  },
} as const;

// Utility function to get typography classes
export function getTypography(preset: keyof typeof typographyPresets, variant?: string): string {
  const presetValue = typographyPresets[preset];

  if (variant && typeof presetValue === 'object' && variant in presetValue) {
    return (presetValue as any)[variant];
  }

  return typeof presetValue === 'string' ? presetValue : '';
}

// Responsive text utilities
export const responsiveText = {
  // Clamp utilities for fluid typography
  clamp: {
    xs: 'text-[clamp(0.75rem,2vw,0.875rem)]',     // 12px -> 14px
    sm: 'text-[clamp(0.875rem,2.5vw,1rem)]',      // 14px -> 16px
    base: 'text-[clamp(1rem,3vw,1.125rem)]',      // 16px -> 18px
    lg: 'text-[clamp(1.125rem,3.5vw,1.25rem)]',   // 18px -> 20px
    xl: 'text-[clamp(1.25rem,4vw,1.5rem)]',       // 20px -> 24px
    '2xl': 'text-[clamp(1.5rem,5vw,2rem)]',       // 24px -> 32px
    '3xl': 'text-[clamp(1.875rem,6vw,2.5rem)]',   // 30px -> 40px
    '4xl': 'text-[clamp(2.25rem,7vw,3rem)]',      // 36px -> 48px
    '5xl': 'text-[clamp(2.5rem,8vw,4rem)]',       // 40px -> 64px
    '6xl': 'text-[clamp(3rem,10vw,5rem)]',        // 48px -> 80px
  },
} as const;

// Enhanced color combinations for text - aligned with forest green & gold theme
export const textColors = {
  // Primary text colors using theme-aware classes
  primary: 'text-foreground',                    // Main text color (theme-aware)
  secondary: 'text-muted-foreground',            // Secondary text (theme-aware)
  muted: 'text-muted-foreground/70',             // Muted text (theme-aware)

  // Brand colors using the forest green & gold palette
  brand: {
    primary: 'text-primary-600',                 // Deep forest green
    secondary: 'text-secondary-600',             // Metallic gold
    beige: 'text-beige-600',                     // Beige accent
    sandy: 'text-sandy-600',                     // Sandy brown
  },

  // Semantic colors
  accent: 'text-primary-600',
  success: 'text-success-600',
  warning: 'text-warning-600',
  error: 'text-destructive-500',
  info: 'text-info-600',

  // Contextual colors
  white: 'text-white',
  inverse: 'text-background',

  // Enhanced gradients using forest green & gold palette
  gradient: {
    primary: 'bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent',
    warm: 'bg-gradient-to-r from-primary-500 via-sandy-500 to-secondary-500 bg-clip-text text-transparent',
    earth: 'bg-gradient-to-r from-secondary-700 via-primary-600 to-sandy-600 bg-clip-text text-transparent',
    elegant: 'bg-gradient-to-r from-secondary-800 via-primary-700 to-primary-500 bg-clip-text text-transparent',
    luxury: 'bg-gradient-to-r from-primary-600 via-sandy-400 to-beige-600 bg-clip-text text-transparent',
  },

  // Contextual hierarchy for different content types
  hierarchy: {
    title: 'text-foreground',                    // Main titles
    subtitle: 'text-muted-foreground',           // Subtitles
    body: 'text-foreground/90',                  // Body text
    caption: 'text-muted-foreground/80',         // Captions
    label: 'text-foreground/95',                 // Form labels
    placeholder: 'text-muted-foreground/60',     // Placeholder text
    disabled: 'text-muted-foreground/40',        // Disabled text
  },
} as const;

export type TypographyPreset = keyof typeof typographyPresets;
export type FontSize = keyof typeof typography.fontSizes;
export type ResponsiveClamp = keyof typeof responsiveText.clamp;
