'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import React from 'react';

type Tone = 'primary' | 'success' | 'warning' | 'info';

interface ActionConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  isLoading?: boolean;
  tone?: Tone;
  icon?: React.ReactNode;
}

export default function ActionConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmLabel,
  isLoading = false,
  tone = 'primary',
  icon,
}: ActionConfirmationDialogProps) {
  const toneStyles: Record<Tone, { bg: string; hover: string; ring: string; iconBg: string; iconColor: string }> = {
    primary: {
      bg: 'bg-info-600',
      hover: 'hover:bg-info-700',
      ring: 'focus:ring-info-400',
      iconBg: 'bg-info-100',
      iconColor: 'text-info-600',
    },
    success: {
      bg: 'bg-success-600',
      hover: 'hover:bg-success-700',
      ring: 'focus:ring-success-400',
      iconBg: 'bg-success-100',
      iconColor: 'text-success-600',
    },
    warning: {
      bg: 'bg-warning-600',
      hover: 'hover:bg-warning-700',
      ring: 'focus:ring-warning-400',
      iconBg: 'bg-warning-100',
      iconColor: 'text-warning-600',
    },
    info: {
      bg: 'bg-info-600',
      hover: 'hover:bg-info-700',
      ring: 'focus:ring-info-400',
      iconBg: 'bg-info-100',
      iconColor: 'text-info-600',
    },
  };

  const defaultIcon = tone === 'success' ? (
    <CheckCircle size={20} className={toneStyles[tone].iconColor} />
  ) : tone === 'warning' ? (
    <AlertTriangle size={20} className={toneStyles[tone].iconColor} />
  ) : (
    <Info size={20} className={toneStyles[tone].iconColor} />
  );

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md bg-card">
        <AlertDialogHeader>
          <div className="flex items-center space-x-3 mb-2">
            <div className={`p-2 rounded-full ${toneStyles[tone].iconBg}`}>
              {icon ?? defaultIcon}
            </div>
            <AlertDialogTitle className="text-xl font-bold text-foreground">
              {title}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-muted-foreground leading-relaxed">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="px-6 py-2 border-border text-muted-foreground hover:bg-muted" disabled={isLoading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-6 py-2 text-white ${toneStyles[tone].bg} ${toneStyles[tone].hover} focus:outline-none focus:ring-2 ${toneStyles[tone].ring}`}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : null}
            <span className={isLoading ? 'ml-2' : ''}>{confirmLabel}</span>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}


