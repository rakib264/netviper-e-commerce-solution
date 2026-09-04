import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-button ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95',
  {
    variants: {
      variant: {
        default: 'bg-primary text-white hover:bg-primary/90 focus:ring-ring/40 shadow-sm',
        secondary: 'bg-muted text-foreground hover:bg-accent focus:ring-ring/20 shadow-sm',

        // Supporting color variants
        beige: 'bg-muted text-foreground hover:bg-accent border border-border',
        sandy: 'bg-accent text-foreground hover:bg-muted shadow-sm',

        // Semantic variants
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-lg focus:ring-destructive/50',
        success: 'bg-success text-success-foreground hover:bg-success/90 hover:shadow-lg focus:ring-success/50',
        warning: 'bg-sandy-600 text-white hover:bg-sandy-700 hover:shadow-lg focus:ring-sandy/50',
        info: 'bg-info text-info-foreground hover:bg-info/90 hover:shadow-lg focus:ring-info/50',

        // Outline variants
        outline: 'border border-border bg-transparent text-foreground hover:bg-muted focus:ring-ring/20 transition-colors',
        'outline-secondary': 'border border-border bg-transparent text-muted-foreground hover:bg-muted focus:ring-ring/20 transition-colors',
        'outline-beige': 'border border-border bg-transparent text-foreground hover:bg-muted',
        'outline-sandy': 'border border-border bg-transparent text-foreground hover:bg-muted',
        'outline-destructive': 'border-2 border-destructive bg-transparent text-destructive hover:bg-destructive hover:text-destructive-foreground focus:ring-destructive/50',

        // Ghost variants
        ghost: 'bg-transparent text-foreground hover:bg-muted hover:text-foreground focus:ring-ring/20',
        'ghost-secondary': 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground focus:ring-ring/20',
        'ghost-beige': 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground focus:ring-ring/20',
        'ghost-sandy': 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground focus:ring-ring/20',

        // Link variants
        link: 'bg-transparent text-foreground underline-offset-4 hover:underline focus:ring-ring/20',
        'link-secondary': 'bg-transparent text-muted-foreground underline-offset-4 hover:underline focus:ring-ring/20',

        // Special gradient variants using forest green & gold palette
        gradient: 'bg-primary text-white hover:bg-primary/90 focus:ring-ring/40 shadow-sm',
        'gradient-warm': 'bg-primary/90 text-white hover:bg-primary focus:ring-ring/40 shadow-sm',
        'gradient-earth': 'bg-muted text-white hover:bg-primary/90 focus:ring-ring/40 shadow-sm',
      },
      size: {
        sm: 'h-8 px-3 text-xs rounded-md',
        default: 'h-10 px-4 py-2 text-sm',
        lg: 'h-11 px-8 text-base rounded-lg',
        xl: 'h-12 px-10 text-lg rounded-lg',
        icon: 'h-10 w-10 p-0',
        'icon-sm': 'h-8 w-8 p-0',
        'icon-lg': 'h-12 w-12 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
