import Link from 'next/link';

import { cn } from '@/lib/utils';

/**
 * The homepage's one "view all" affordance.
 *
 * Every section used to roll its own: a ghost `Button` with an arrow, a
 * hand-drawn underline div and a `whileHover` scale, in sentence case — while
 * All Products used the house treatment, an uppercase tracked `luxury-link`
 * whose rule wipes in on hover. Four variants of the same control on one page
 * is what made the homepage read as assembled rather than designed, so All
 * Products' version is the one that survives and this is it.
 *
 * `luxury-link` carries the casing, tracking, size and hover rule, so callers
 * pass plain sentence-case copy and get the uppercase treatment from CSS.
 */
export interface ViewAllLinkProps {
  href: string;
  label: string;
  /** Accessible name, when the visible label alone would be ambiguous. */
  ariaLabel?: string;
  className?: string;
}

export function ViewAllLink({
  href,
  label,
  ariaLabel,
  className,
}: ViewAllLinkProps) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={cn('luxury-link text-foreground', className)}
    >
      {label}
    </Link>
  );
}

export default ViewAllLink;
