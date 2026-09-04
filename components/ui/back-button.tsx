'use client';

import { useTranslation } from '@/components/providers/LocalizationProvider';
import { cn } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

/**
 * The one back affordance.
 *
 * Storefront pages each rolled their own: an outlined `Button` box on blogs and
 * deals, a ghost button with an 18px arrow and a hover fill on cart and
 * wishlist. A boxed control is the wrong weight for navigation that sits above
 * a page title — it competes with the page's real CTA — so this is unboxed:
 * tracked micro-caps in the button role, a 14px arrow that steps back on hover,
 * and colour as the only state change. The padding keeps a comfortable hit area
 * without drawing a box, and `-ml-1` pulls the glyph back to the page's optical
 * left edge so it aligns with the heading beneath it.
 */
const BACK_BUTTON = [
  'group inline-flex items-center gap-2 -ml-1 px-1 py-1.5',
  'font-button text-[0.6875rem] uppercase tracking-[0.18em] text-muted-foreground',
  'transition-colors duration-200 ease-out hover:text-foreground',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground',
].join(' ');

const ARROW =
  'shrink-0 transition-transform duration-200 ease-out motion-safe:group-hover:-translate-x-0.5';

type BackButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'children'
> & {
  /** Defaults to the shared `common.back` copy. */
  label?: string;
  /**
   * Renders a link to a known destination instead of a history step. Use it
   * where "back" has a canonical target (a listing behind a detail page), so
   * the control still works for someone who arrived from a shared URL.
   */
  href?: string;
};

export default function BackButton({
  label,
  href,
  className,
  onClick,
  ...props
}: BackButtonProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const text = label ?? t('common.back');

  const content = (
    <>
      <ArrowLeft size={14} className={ARROW} aria-hidden="true" />
      {text}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cn(BACK_BUTTON, className)}>
        {content}
      </Link>
    );
  }

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (event) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    router.back();
  };

  return (
    <button
      type="button"
      {...props}
      onClick={handleClick}
      className={cn(BACK_BUTTON, className)}
    >
      {content}
    </button>
  );
}
