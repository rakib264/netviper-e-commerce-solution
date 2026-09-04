import { cn } from '@/lib/utils';

/**
 * The count that sits on the corner of a line-item thumbnail.
 *
 * It must be rendered as a sibling of the image box, never inside it: the box
 * clips its own contents to keep the image inside the rounded corners, and a
 * badge nudged outward with negative offsets gets sliced off by that clip.
 * Anchor it to a `relative` wrapper that wraps the box instead.
 *
 * The quantity is already stated in the row's own text, so this is decorative
 * for assistive tech.
 */
export function QuantityBadge({
  quantity,
  className,
}: {
  quantity: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute -right-1.5 -top-1.5 z-10 inline-flex h-5 min-w-[1.25rem] items-center justify-center',
        'rounded-full bg-foreground px-1.5 font-price text-[11px] leading-none tabular-nums text-background',
        // The ring separates the badge from whatever the photograph happens to
        // be behind it, so two and three digit counts stay legible on any image.
        'ring-2 ring-card',
        className
      )}
    >
      {quantity}
    </span>
  );
}
