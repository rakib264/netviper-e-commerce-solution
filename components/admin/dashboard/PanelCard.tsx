'use client';

import { useTranslation } from '@/components/providers/LocalizationProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import React from 'react';

interface PanelCardProps {
  title: string;
  description?: string;
  /** Rendered top-right — a "see more" link, a badge, a filter. */
  action?: React.ReactNode;
  /** When true the body is replaced by the empty state. */
  isEmpty?: boolean;
  emptyMessage?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * The shell every operations panel sits in, so they share one header rhythm,
 * one empty state and one density instead of each card inventing its own.
 */
export default function PanelCard({
  title,
  description,
  action,
  isEmpty,
  emptyMessage,
  className,
  children,
}: PanelCardProps) {
  const { t } = useTranslation();

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div className="min-w-0">
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription className="mt-1">{description}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent className="flex-1 pt-0">
        {isEmpty ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            {emptyMessage ?? t('admin.dashboard.empty')}
          </p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
