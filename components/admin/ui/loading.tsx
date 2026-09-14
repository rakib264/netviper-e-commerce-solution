import { cn } from '@/lib/utils';
import { Loader } from '@/components/ui/loader';

/**
 * Shared loading vocabulary for the admin panel.
 *
 * What is left here is deliberately small. Structural skeletons live next to
 * the screen they stand in for — `components/admin/ui/hero-page-skeleton` for
 * the eight list screens, and a colocated file for anything else — because a
 * generic "header, four cards, a table of bars" placeholder described a page
 * this admin does not have, and every screen using it jumped when data landed.
 *
 * Spinners belong to actions in flight, never to a first load.
 */

/**
 * Background-refresh marker: the screen already has content and is quietly
 * replacing it. Deliberately not a skeleton — swapping loaded content back out
 * for placeholders is the flicker this exists to avoid.
 */
export function AdminRefreshIndicator({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-caption text-xs text-muted-foreground',
        className,
      )}
      role="status"
    >
      <Loader size="xs" label={null} />
      {label}
    </span>
  );
}
