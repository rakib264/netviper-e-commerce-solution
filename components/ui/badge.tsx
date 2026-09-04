import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-label font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        // Primary variant - Deep Forest Green
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary-700 shadow-sm',
        
        // Secondary variant - Metallic Gold
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary-700 shadow-sm',
        
        // Supporting color variants
        beige: 'border-transparent bg-beige-300 text-secondary-800 hover:bg-beige-400',
        sandy: 'border-transparent bg-sandy text-secondary-900 hover:bg-sandy-400',
        
        // Semantic variants
        destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90',
        success: 'border-transparent bg-success text-success-foreground hover:bg-success/90',
        warning: 'border-transparent bg-sandy-600 text-white hover:bg-sandy-700',
        info: 'border-transparent bg-info text-info-foreground hover:bg-info/90',
        
        // Outline variants
        outline: 'border-primary bg-transparent text-primary hover:bg-primary-50',
        'outline-secondary': 'border-secondary bg-transparent text-secondary hover:bg-secondary-50',
        'outline-beige': 'border-beige-400 bg-transparent text-secondary-700 hover:bg-beige-50',
        'outline-sandy': 'border-sandy bg-transparent text-sandy-700 hover:bg-sandy-50',
        'outline-destructive': 'border-destructive/30 bg-transparent text-destructive hover:bg-destructive/5',
        'outline-success': 'border-success/30 bg-transparent text-success hover:bg-success/5',
        
        // Subtle variants
        subtle: 'border-transparent bg-primary-100 text-primary-800 hover:bg-primary-200',
        'subtle-secondary': 'border-transparent bg-secondary-100 text-secondary-800 hover:bg-secondary-200',
        'subtle-beige': 'border-transparent bg-beige-100 text-secondary-700 hover:bg-beige-200',
        'subtle-sandy': 'border-transparent bg-sandy-100 text-sandy-800 hover:bg-sandy-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
