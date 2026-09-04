import { cn } from '@/lib/utils';

/**
 * The single spinner for the whole application.
 *
 * Rule of thumb, applied consistently across the admin:
 *   • spinner  → an *action* is in flight (button pending, inline refresh)
 *   • skeleton → *content* is arriving (page, list, table)
 *
 * A spinner where a skeleton belongs throws the layout away and makes the wait
 * feel longer, so this component is deliberately small and unopinionated: it
 * inherits `currentColor` and carries no colour, spacing or label of its own.
 */
const SIZES = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-8 w-8',
} as const;

export type LoaderSize = keyof typeof SIZES;

export interface LoaderProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: LoaderSize;
  /** Announced to assistive tech. Set `null` when a visible label already says it. */
  label?: string | null;
}

export function Loader({
  size = 'sm',
  label = 'Loading',
  className,
  ...props
}: LoaderProps) {
  return (
    <span
      role="status"
      className={cn('inline-flex shrink-0 items-center justify-center', className)}
      {...props}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        // Reduced motion slows the sweep rather than freezing it — a stationary
        // spinner reads as a broken UI rather than a calm one.
        className={cn(
          SIZES[size],
          'animate-spin motion-reduce:animate-[spin_2.4s_linear_infinite]',
        )}
      >
        <circle
          cx="12"
          cy="12"
          r="9.25"
          stroke="currentColor"
          strokeWidth="2.25"
          className="opacity-20"
        />
        <path
          d="M21.25 12A9.25 9.25 0 0 0 12 2.75"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
        />
      </svg>
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}

export default Loader;
