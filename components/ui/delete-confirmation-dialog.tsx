'use client';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  entityName: string;
  entityCount?: number;
  isLoading?: boolean;
}

export default function DeleteConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  entityName,
  entityCount = 1,
  isLoading = false,
}: DeleteConfirmationDialogProps) {
  const isMultiple = entityCount > 1;
  const entityLabel = isMultiple ? `${entityName}s` : entityName;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (isLoading) return;
        onOpenChange(next);
      }}
    >
      <AlertDialogContent className="max-w-md rounded-none border-border bg-card">
        <AlertDialogHeader>
          <div className="mb-2 flex items-center space-x-3">
            <div className="bg-muted p-2">
              <AlertTriangle className="text-foreground" size={20} />
            </div>
            <AlertDialogTitle className="text-xl font-semibold text-foreground">
              {title}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="leading-relaxed text-muted-foreground">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            className="rounded-none border-border px-6 py-2 text-foreground hover:bg-muted"
            disabled={isLoading}
          >
            Cancel
          </AlertDialogCancel>
          {/* Use a plain Button so Radix does not auto-close before the async result */}
          <Button
            type="button"
            variant="destructive"
            disabled={isLoading}
            onClick={() => onConfirm()}
            className="rounded-none px-6 py-2"
          >
            {isLoading ? (
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Trash2 size={16} className="mr-2" />
            )}
            Delete {isMultiple ? `${entityCount} ${entityLabel}` : entityLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Hook for delete confirmation dialog
interface DeleteConfirmationOptions {
  title: string;
  description: string;
  entityName?: string;
  entityCount?: number;
  onConfirm: () => void;
}

export function useDeleteConfirmationDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [options, setOptions] = useState<DeleteConfirmationOptions | null>(null);

  const showDeleteConfirmation = (newOptions: DeleteConfirmationOptions) => {
    setOptions(newOptions);
    setIsOpen(true);
  };

  const handleConfirm = async () => {
    if (!options) return;

    setIsLoading(true);
    try {
      await options.onConfirm();
      setIsOpen(false);
    } catch (error) {
      console.error('Delete confirmation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!isLoading) {
      setIsOpen(open);
      if (!open) {
        setOptions(null);
      }
    }
  };

  const DeleteConfirmationComponent = () => {
    if (!options) return null;

    return (
      <DeleteConfirmationDialog
        open={isOpen}
        onOpenChange={handleOpenChange}
        onConfirm={handleConfirm}
        title={options.title}
        description={options.description}
        entityName={options.entityName || 'item'}
        entityCount={options.entityCount || 1}
        isLoading={isLoading}
      />
    );
  };

  return {
    showDeleteConfirmation,
    DeleteConfirmationComponent,
    isLoading,
  };
}
