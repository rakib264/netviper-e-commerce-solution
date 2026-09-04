/**
 * Typography Components
 * 
 * React components that implement the centralized typography system.
 * These components ensure consistent typography usage across the application.
 */

import { responsiveText, textColors, typography, typographyPresets, type TypographyPreset } from '@/lib/typography';
import { cn } from '@/lib/utils';
import React from 'react';

// Utility function to get color class from various color categories
const getColorClass = (color: string | undefined, gradient: string | undefined) => {
  if (gradient && gradient in textColors.gradient) {
    return textColors.gradient[gradient as keyof typeof textColors.gradient];
  }
  
  if (color) {
    // Check in main textColors
    if (color in textColors) {
      return textColors[color as keyof typeof textColors];
    }
    // Check in brand colors
    if (color in textColors.brand) {
      return textColors.brand[color as keyof typeof textColors.brand];
    }
    // Check in hierarchy colors
    if (color in textColors.hierarchy) {
      return textColors.hierarchy[color as keyof typeof textColors.hierarchy];
    }
  }
  
  return textColors.primary;
};

// Base typography component props
interface BaseTypographyProps {
  children: React.ReactNode;
  className?: string;
  color?: keyof typeof textColors | keyof typeof textColors.gradient | keyof typeof textColors.brand | keyof typeof textColors.hierarchy;
  gradient?: keyof typeof textColors.gradient;
  as?: React.ElementType;
}

// Display component for hero titles and major headings
interface DisplayProps extends BaseTypographyProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  weight?: keyof typeof typography.fontWeights;
  spacing?: keyof typeof typography.letterSpacing;
  leading?: keyof typeof typography.lineHeights;
}

export function Display({ 
  children, 
  className, 
  size = 'md', 
  weight = 'bold',
  spacing = 'tight',
  leading = 'tight',
  color = 'primary',
  gradient,
  as: Component = 'h1',
  ...props 
}: DisplayProps) {
  const colorClass = getColorClass(color, gradient);
  const ElementComponent = Component as React.ElementType;
  
  return (
    <ElementComponent
      className={cn(
        'font-display',
        typography.fontSizes.display[size],
        typography.fontWeights[weight],
        typography.letterSpacing[spacing],
        typography.lineHeights[leading],
        colorClass,
        className
      )}
      {...props}
    >
      {children}
    </ElementComponent>
  );
}

// Heading component for section titles
interface HeadingProps extends BaseTypographyProps {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  weight?: keyof typeof typography.fontWeights;
  spacing?: keyof typeof typography.letterSpacing;
  leading?: keyof typeof typography.lineHeights;
}

export function Heading({ 
  children, 
  className, 
  level = 2,
  weight = 'semibold',
  spacing = 'normal',
  leading = 'tight',
  color = 'primary',
  gradient,
  as,
  ...props 
}: HeadingProps) {
  const Component = as || (`h${level}` as React.ElementType);
  const ElementComponent = Component as React.ElementType;
  const headingKey = `h${level}` as keyof typeof typography.fontSizes.heading;
  
  const colorClass = getColorClass(color, gradient);

  return (
    <ElementComponent
      className={cn(
        'font-heading',
        typography.fontSizes.heading[headingKey],
        typography.fontWeights[weight],
        typography.letterSpacing[spacing],
        typography.lineHeights[leading],
        colorClass,
        className
      )}
      {...props}
    >
      {children}
    </ElementComponent>
  );
}

// Text component for body content
interface TextProps extends BaseTypographyProps {
  size?: 'xl' | 'lg' | 'md' | 'sm';
  weight?: keyof typeof typography.fontWeights;
  spacing?: keyof typeof typography.letterSpacing;
  leading?: keyof typeof typography.lineHeights;
}

export function Text({ 
  children, 
  className, 
  size = 'md',
  weight = 'normal',
  spacing = 'normal',
  leading = 'relaxed',
  color = 'secondary',
  gradient,
  as: Component = 'p',
  ...props 
}: TextProps) {
  const ElementComponent = Component as React.ElementType;
  const colorClass = getColorClass(color, gradient);

  return (
    <ElementComponent
      className={cn(
        'font-paragraph',
        typography.fontSizes.body[size],
        typography.fontWeights[weight],
        typography.letterSpacing[spacing],
        typography.lineHeights[leading],
        colorClass,
        className
      )}
      {...props}
    >
      {children}
    </ElementComponent>
  );
}

// Caption component for small text
interface CaptionProps extends BaseTypographyProps {
  weight?: keyof typeof typography.fontWeights;
  spacing?: keyof typeof typography.letterSpacing;
  leading?: keyof typeof typography.lineHeights;
}

export function Caption({ 
  children, 
  className, 
  weight = 'normal',
  spacing = 'normal',
  leading = 'normal',
  color = 'muted',
  gradient,
  as: Component = 'span',
  ...props 
}: CaptionProps) {
  const ElementComponent = Component as React.ElementType;
  const colorClass = getColorClass(color, gradient);

  return (
    <ElementComponent
      className={cn(
        'font-caption',
        typography.fontSizes.ui.caption,
        typography.fontWeights[weight],
        typography.letterSpacing[spacing],
        typography.lineHeights[leading],
        colorClass,
        className
      )}
      {...props}
    >
      {children}
    </ElementComponent>
  );
}

// Label component for form labels and UI labels
interface LabelProps extends BaseTypographyProps {
  weight?: keyof typeof typography.fontWeights;
  spacing?: keyof typeof typography.letterSpacing;
  leading?: keyof typeof typography.lineHeights;
}

export function Label({ 
  children, 
  className, 
  weight = 'medium',
  spacing = 'normal',
  leading = 'normal',
  color = 'primary',
  gradient,
  as: Component = 'label',
  ...props 
}: LabelProps) {
  const ElementComponent = Component as React.ElementType;
  const colorClass = getColorClass(color, gradient);

  return (
    <ElementComponent
      className={cn(
        'font-label',
        typography.fontSizes.ui.label,
        typography.fontWeights[weight],
        typography.letterSpacing[spacing],
        typography.lineHeights[leading],
        colorClass,
        className
      )}
      {...props}
    >
      {children}
    </ElementComponent>
  );
}

// Preset component that uses predefined typography combinations
interface PresetProps extends BaseTypographyProps {
  preset: TypographyPreset;
  variant?: string;
}

export function Preset({ 
  children, 
  className, 
  preset,
  variant,
  color,
  gradient,
  as: Component = 'div',
  ...props 
}: PresetProps) {
  const presetClasses = variant && preset in typographyPresets && variant in typographyPresets[preset]
    ? (typographyPresets[preset] as any)[variant]
    : typographyPresets[preset];

  const ElementComponent = Component as React.ElementType;
  const colorClass = gradient 
    ? textColors.gradient[gradient] 
    : color && typeof color === 'string' && color in textColors 
      ? textColors[color as keyof typeof textColors]
      : '';

  return (
    <ElementComponent
      className={cn(
        presetClasses,
        colorClass,
        className
      )}
      {...props}
    >
      {children}
    </ElementComponent>
  );
}

// Fluid text component using clamp for truly responsive typography
interface FluidTextProps extends BaseTypographyProps {
  size?: keyof typeof responsiveText.clamp;
  weight?: keyof typeof typography.fontWeights;
  spacing?: keyof typeof typography.letterSpacing;
  leading?: keyof typeof typography.lineHeights;
}

export function FluidText({ 
  children, 
  className, 
  size = 'base',
  weight = 'normal',
  spacing = 'normal',
  leading = 'normal',
  color = 'primary',
  gradient,
  as: Component = 'span',
  ...props 
}: FluidTextProps) {
  const ElementComponent = Component as React.ElementType;
  const colorClass = getColorClass(color, gradient);

  return (
    <ElementComponent
      className={cn(
        'font-paragraph',
        responsiveText.clamp[size],
        typography.fontWeights[weight],
        typography.letterSpacing[spacing],
        typography.lineHeights[leading],
        colorClass,
        className
      )}
      {...props}
    >
      {children}
    </ElementComponent>
  );
}

// Utility hook for getting typography classes
export function useTypography(preset: TypographyPreset, variant?: string) {
  return variant && preset in typographyPresets && variant in typographyPresets[preset]
    ? (typographyPresets[preset] as any)[variant]
    : typographyPresets[preset];
}

// Export all typography utilities
export { responsiveText, textColors, typography, typographyPresets };
export type { TypographyPreset };

