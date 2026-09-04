'use client';

import {
    Toast,
    ToastClose,
    ToastDescription,
    ToastProvider,
    ToastTitle,
    ToastViewport,
} from '@/components/ui/toast';
import { useHydration } from '@/hooks/use-hydration';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, AlertTriangle, CheckCircle, Heart, Info, ShoppingBag } from 'lucide-react';

export function Toaster() {
  const { toasts } = useToast();
  const isHydrated = useHydration();

  if (!isHydrated) {
    return null;
  }

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const getIcon = () => {
          switch (variant) {
            case 'success':
              return <CheckCircle className="h-5 w-5 text-primary-foreground drop-shadow-sm" />;
            case 'error':
              return <AlertCircle className="h-5 w-5 text-destructive-600 drop-shadow-sm" />;
            case 'warning':
              return <AlertTriangle className="h-5 w-5 text-warning-600 drop-shadow-sm" />;
            case 'info':
              return <Info className="h-5 w-5 text-info-600 drop-shadow-sm" />;
            case 'cart':
              return <ShoppingBag className="h-5 w-5 text-primary-600 drop-shadow-sm" />;
            case 'wishlist':
              return <Heart className="h-5 w-5 text-secondary-600 drop-shadow-sm fill-current" />;
            default:
              return null;
          }
        };

        const getCloseButtonStyle = () => {
          switch (variant) {
            case 'cart':
              return 'text-primary-600 bg-primary-50/80 border-primary-200/50 hover:bg-primary-100 hover:text-primary-700 focus:ring-primary-500/50';
            case 'wishlist':
              return 'text-secondary-600 bg-secondary-50/80 border-secondary-200/50 hover:bg-secondary-100 hover:text-secondary-700 focus:ring-secondary-500/50';
            case 'success':
              // Tinted with the foreground token rather than a colour of its
              // own, so the close affordance follows Primary too.
              return 'text-primary-foreground bg-primary-foreground/15 border-primary-foreground/25 hover:bg-primary-foreground/25 hover:text-primary-foreground focus:ring-primary-foreground/50';
            case 'error':
              return 'text-destructive-600 bg-destructive-50/80 border-destructive-200/50 hover:bg-destructive-100 hover:text-destructive-700 focus:ring-destructive-500/50';
            case 'warning':
              return 'text-warning-600 bg-warning-50/80 border-warning-200/50 hover:bg-warning-100 hover:text-warning-700 focus:ring-warning-500/50';
            case 'info':
              return 'text-info-600 bg-info-50/80 border-info-200/50 hover:bg-info-100 hover:text-info-700 focus:ring-info-500/50';
            default:
              return 'text-muted-foreground bg-muted/80 border-border/50 hover:bg-accent hover:text-foreground focus:ring-ring/50';
          }
        };

        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex items-start gap-3">
              {getIcon()}
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose className={getCloseButtonStyle()} />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}

// Export toast hook for easy use
export { useToast } from '@/hooks/use-toast';
