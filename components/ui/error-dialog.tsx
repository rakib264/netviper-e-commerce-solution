'use client';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';
import * as React from 'react';

interface ErrorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  message: string;
  variant?: 'error' | 'warning' | 'info';
  showCloseButton?: boolean;
  closeButtonText?: string;
  onClose?: () => void;
}

const ErrorDialog = React.forwardRef<HTMLDivElement, ErrorDialogProps>(
  (
    {
      open,
      onOpenChange,
      title = 'Error',
      message,
      variant = 'error',
      showCloseButton = true,
      closeButtonText = 'OK',
      onClose,
    },
    ref
  ) => {
    const handleClose = () => {
      onOpenChange(false);
      onClose?.();
    };

    const getIcon = () => {
      switch (variant) {
        case 'warning':
          return <AlertCircle className="h-6 w-6 text-warning-500" />;
        case 'info':
          return <AlertCircle className="h-6 w-6 text-info-500" />;
        default:
          return <AlertCircle className="h-6 w-6 text-destructive-500" />;
      }
    };

    const getTitleColor = () => {
      switch (variant) {
        case 'warning':
          return 'text-warning-800';
        case 'info':
          return 'text-info-800';
        default:
          return 'text-destructive-800';
      }
    };

    const getMessageColor = () => {
      switch (variant) {
        case 'warning':
          return 'text-warning-700';
        case 'info':
          return 'text-info-700';
        default:
          return 'text-destructive-700';
      }
    };

    const getBackgroundColor = () => {
      switch (variant) {
        case 'warning':
          return 'bg-warning-50 border-warning-200';
        case 'info':
          return 'bg-info-50 border-info-200';
        default:
          return 'bg-destructive-50 border-destructive-200';
      }
    };

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          ref={ref}
          className={cn(
            'sm:max-w-md',
            getBackgroundColor()
          )}
        >
          <DialogHeader className="flex flex-row items-start space-x-3 space-y-0">
            <div className="flex-shrink-0 mt-1">
              {getIcon()}
            </div>
            <div className="flex-1">
              <DialogTitle className={cn('text-left', getTitleColor())}>
                {title}
              </DialogTitle>
              <p className={cn('mt-2 text-sm', getMessageColor())}>
                {message}
              </p>
            </div>
          </DialogHeader>
          
          {showCloseButton && (
            <div className="flex justify-end mt-4">
              <Button
                onClick={handleClose}
                variant={variant === 'error' ? 'destructive' : 'default'}
                size="sm"
              >
                {closeButtonText}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }
);

ErrorDialog.displayName = 'ErrorDialog';

// Custom hook for easier error dialog usage
export const useErrorDialog = () => {
  const [errorDialog, setErrorDialog] = React.useState({
    open: false,
    message: '',
    title: '',
    variant: 'error' as 'error' | 'warning' | 'info'
  });

  const showError = React.useCallback((message: string, title: string = 'Error', variant: 'error' | 'warning' | 'info' = 'error') => {
    setErrorDialog({
      open: true,
      message,
      title,
      variant
    });
  }, []);

  const ErrorDialogComponent = React.useCallback(() => (
    <ErrorDialog
      open={errorDialog.open}
      onOpenChange={(open) => setErrorDialog(prev => ({ ...prev, open }))}
      title={errorDialog.title}
      message={errorDialog.message}
      variant={errorDialog.variant}
    />
  ), [errorDialog]);

  return { showError, ErrorDialogComponent };
};

export { ErrorDialog };
