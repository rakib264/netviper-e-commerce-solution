import { cn } from '@/lib/utils';

/**
 * Canonical homepage section header.
 *
 * Every homepage section renders its heading through this component so the scale,
 * weight and semantic font role stay identical across the page. The style follows
 * `ModernCategorySection` / `AllProductsListing`, which are the reference:
 *
 *   eyebrow  -> .luxury-eyebrow  (label role, uppercase, tracked)
 *   title    -> font-navigation  text-3xl / md:text-4xl semibold
 *   subtitle -> font-paragraph   text-sm md:text-base muted
 *
 * Deliberately avoids the `font-display` / `font-title` / `font-heading` roles and
 * the `<Display>` / `<Heading>` helpers: those carry their own size and weight
 * scales, which is what made the homepage inconsistent in the first place.
 */
export interface SectionHeadingProps {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  align?: 'left' | 'center';
  /** Rendered opposite the heading on wide screens (e.g. a "View all" link). */
  action?: React.ReactNode;
  className?: string;
  /**
   * Heading level, for pages that need a different document outline. `h1` is
   * allowed because a few pages use this component for their own page heading
   * rather than for a band inside one — /deals had no h1 at all until it could.
   */
  as?: 'h1' | 'h2' | 'h3';
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'left',
  action,
  className,
  as: Tag = 'h2',
}: SectionHeadingProps) {
  if (!eyebrow && !title && !subtitle && !action) return null;

  const centered = align === 'center';

  return (
    <div
      className={cn(
        'flex flex-col gap-4 md:flex-row md:items-end md:justify-between',
        centered && 'md:flex-col md:items-center',
        className,
      )}
    >
      <div className={cn('max-w-2xl', centered && 'mx-auto text-center')}>
        {eyebrow ? <p className="luxury-eyebrow">{eyebrow}</p> : null}
        {title ? (
          <Tag className="mt-2 font-navigation text-3xl font-semibold text-foreground md:text-4xl">
            {title}
          </Tag>
        ) : null}
        {subtitle ? (
          <p className="mt-3 font-paragraph text-sm text-muted-foreground md:text-base">
            {subtitle}
          </p>
        ) : null}
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export default SectionHeading;
