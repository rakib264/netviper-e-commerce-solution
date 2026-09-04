'use client';

import { cn } from '@/lib/utils';
import { useCallback, useMemo, useRef, useState } from 'react';

/**
 * The colour swatch control used by every product card.
 *
 * Design notes:
 *  • 26px visual chip inside a 36px hit area — comfortably past WCAG 2.5.8's
 *    24px minimum, without the row turning into a line of oversized buttons.
 *  • Squared corners to match the rectangular CTAs; a `shape` escape hatch
 *    exists but square is the house style.
 *  • Selection is a ring *outside* the chip, so the colour itself is never
 *    obscured — the old inner-dot treatment made pale colours unreadable.
 *  • Real radiogroup semantics: roving tabindex, arrow/Home/End keys, so the
 *    whole row is one tab stop rather than N.
 */

export interface ColorSwatchOption {
  /** Stable identity used for selection. */
  value: string;
  /** Human-readable name, surfaced as the accessible label and tooltip. */
  label: string;
  /** Resolved CSS colour. */
  color: string;
}

export interface ColorSwatchesProps {
  options: ColorSwatchOption[];
  value?: string;
  onChange: (value: string) => void;
  /** Fired on pointer hover — used to preview the variant image. */
  onPreview?: (value: string) => void;
  /** Collapse beyond this count behind a `+N` affordance. */
  maxVisible?: number;
  shape?: 'square' | 'circle';
  size?: 'sm' | 'md';
  className?: string;
  /** Accessible name for the group. */
  label?: string;
}

const CHIP = {
  sm: 'h-[22px] w-[22px]',
  md: 'h-[26px] w-[26px]',
} as const;

const HIT = {
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
} as const;

export function ColorSwatches({
  options,
  value,
  onChange,
  onPreview,
  maxVisible = 5,
  shape = 'square',
  size = 'md',
  className,
  label = 'Colour',
}: ColorSwatchesProps) {
  const [expanded, setExpanded] = useState(false);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectedValue = value || options[0]?.value;
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === selectedValue),
  );

  const visible = useMemo(
    () => (expanded ? options : options.slice(0, maxVisible)),
    [expanded, options, maxVisible],
  );
  const hiddenCount = options.length - visible.length;

  const focusAt = useCallback(
    (index: number) => {
      const next = (index + options.length) % options.length;
      onChange(options[next].value);
      // Expanding first keeps arrow navigation working past the collapse point.
      if (next >= maxVisible) setExpanded(true);
      requestAnimationFrame(() => itemRefs.current[next]?.focus());
    },
    [maxVisible, onChange, options],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, index: number) => {
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault();
          focusAt(index + 1);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          focusAt(index - 1);
          break;
        case 'Home':
          event.preventDefault();
          focusAt(0);
          break;
        case 'End':
          event.preventDefault();
          focusAt(options.length - 1);
          break;
        default:
          break;
      }
    },
    [focusAt, options.length],
  );

  if (!options.length) return null;

  const radius = shape === 'circle' ? 'rounded-full' : 'rounded-[2px]';

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('flex flex-wrap items-center gap-0.5', className)}
    >
      {visible.map((option, index) => {
        const isSelected = option.value === selectedValue;
        return (
          <button
            key={option.value}
            ref={(node) => {
              itemRefs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={option.label}
            title={option.label}
            // One tab stop for the group; arrows move within it.
            tabIndex={index === selectedIndex ? 0 : -1}
            onKeyDown={(event) => handleKeyDown(event, index)}
            onMouseEnter={() => onPreview?.(option.value)}
            onFocus={() => onPreview?.(option.value)}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onChange(option.value);
            }}
            className={cn(
              'inline-flex shrink-0 items-center justify-center transition-[box-shadow,transform] duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              HIT[size],
              radius,
            )}
          >
            <span
              aria-hidden="true"
              style={{ backgroundColor: option.color }}
              className={cn(
                CHIP[size],
                radius,
                // Hairline keeps white / ivory chips legible on a light card.
                'border border-foreground/15 transition-shadow duration-200',
                isSelected
                  ? 'shadow-[0_0_0_1px_hsl(var(--background)),0_0_0_2px_hsl(var(--foreground))]'
                  : 'group-hover/swatch:shadow-none hover:shadow-[0_0_0_1px_hsl(var(--background)),0_0_0_1.5px_hsl(var(--border))]',
              )}
            />
          </button>
        );
      })}

      {hiddenCount > 0 ? (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setExpanded(true);
          }}
          className={cn(
            'font-caption ml-1 text-xs tabular-nums text-muted-foreground transition-colors hover:text-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          )}
          aria-label={`Show ${hiddenCount} more colours`}
        >
          +{hiddenCount}
        </button>
      ) : null}
    </div>
  );
}

export default ColorSwatches;
