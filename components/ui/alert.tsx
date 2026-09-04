import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const alertVariants = cva(
  'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4',
  {
    variants: {
      variant: {
        // Default variant
        default: 'bg-beige-50 text-secondary-800 border-sandy-200 [&>svg]:text-secondary-600',
        
        // Semantic variants
        destructive: 'border-destructive/50 bg-destructive/5 text-destructive [&>svg]:text-destructive',
        success: 'border-success/50 bg-success/5 text-success [&>svg]:text-success',
        warning: 'border-sandy-400/50 bg-sandy-50 text-sandy-800 [&>svg]:text-sandy-600',
        info: 'border-info/50 bg-info/5 text-info [&>svg]:text-info',
        
        // Primary and secondary variants using forest green & gold palette
        primary: 'border-primary-300 bg-primary-50 text-primary-800 [&>svg]:text-primary-600',
        secondary: 'border-secondary-300 bg-secondary-50 text-secondary-800 [&>svg]:text-secondary-600',
        
        // Supporting color variants
        beige: 'border-beige-300 bg-beige-100 text-secondary-700 [&>svg]:text-secondary-600',
        sandy: 'border-sandy-300 bg-sandy-100 text-sandy-800 [&>svg]:text-sandy-600',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-1 font-title font-medium leading-none tracking-tight', className)}
    {...props}
  />
));
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm font-paragraph [&_p]:leading-relaxed', className)}
    {...props}
  />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertDescription, AlertTitle };

