'use client';

import { cn } from '@/lib/utils';

interface CartCountBadgeProps {
  count: number;
  /**
   * `light` sits on the white utility bar, `dark` on the brand-coloured mobile
   * bar. Each inverts so the badge keeps its contrast against its own backdrop.
   */
  tone?: 'light' | 'dark';
  className?: string;
}

/**
 * Cart count, as a badge pinned to the corner of the bag icon.
 *
 * The ring is the point: it punches a gap between the badge and the icon
 * underneath, which is what stops the two from reading as one cramped blob.
 * It is drawn in the surrounding surface colour, so it reads as negative space.
 */
export function CartCountBadge({ count, tone = 'light', className }: CartCountBadgeProps) {
  // Three digits would stretch the pill past the icon; cap the label instead.
  const label = count > 99 ? '99+' : String(count);

  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute -right-2 -top-1.5 inline-flex h-[17px] min-w-[17px]',
        'items-center justify-center rounded-full px-[5px]',
        'font-label text-[10px] font-semibold leading-none tabular-nums',
        tone === 'dark'
          ? 'bg-white text-primary ring-2 ring-primary'
          : 'bg-primary text-primary-foreground ring-2 ring-card',
        className,
      )}
    >
      {label}
    </span>
  );
}
