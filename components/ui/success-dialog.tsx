'use client';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { CheckCircle } from 'lucide-react';
import * as React from 'react';

interface SuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  message: string;
  showCloseButton?: boolean;
  closeButtonText?: string;
  onClose?: () => void;
}

const SuccessDialog = React.forwardRef<HTMLDivElement, SuccessDialogProps>(
  (
    {
      open,
      onOpenChange,
      title = 'Success',
      message,
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

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          ref={ref}
          className={cn(
            'sm:max-w-md',
            'bg-success-50 border-success-200'
          )}
        >
          <DialogHeader className="flex flex-row items-start space-x-3 space-y-0">
            <div className="flex-shrink-0 mt-1">
              <CheckCircle className="h-6 w-6 text-success-500" />
            </div>
            <div className="flex-1">
              <DialogTitle className={cn('text-left', 'text-success-800')}>
                {title}
              </DialogTitle>
              <p className={cn('mt-2 text-sm', 'text-success-700')}>
                {message}
              </p>
            </div>
          </DialogHeader>
          
          {showCloseButton && (
            <div className="flex justify-end mt-4">
              <Button
                onClick={handleClose}
                variant="default"
                size="sm"
                className="bg-success-600 hover:bg-success-700"
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

SuccessDialog.displayName = 'SuccessDialog';

// Custom hook for easier success dialog usage
export const useSuccessDialog = () => {
  const [successDialog, setSuccessDialog] = React.useState({
    open: false,
    message: '',
    title: 'Success'
  });

  const showSuccess = React.useCallback((message: string, title: string = 'Success') => {
    setSuccessDialog({
      open: true,
      message,
      title
    });
  }, []);

  const SuccessDialogComponent = React.useCallback(() => (
    <SuccessDialog
      open={successDialog.open}
      onOpenChange={(open) => setSuccessDialog(prev => ({ ...prev, open }))}
      title={successDialog.title}
      message={successDialog.message}
    />
  ), [successDialog]);

  return { showSuccess, SuccessDialogComponent };
};

export { SuccessDialog };
