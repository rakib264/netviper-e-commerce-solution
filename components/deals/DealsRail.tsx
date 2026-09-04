'use client';

import { useTranslation } from '@/components/providers/LocalizationProvider';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

interface DealsRailProps {
  /** One entry per slide. Keys come from the caller. */
  slides: Array<{ key: string; content: ReactNode }>;
  /** Heading rendered to the left of the arrows. */
  label: ReactNode;
  /** Trailing content in the header row, before the arrows. */
  meta?: ReactNode;
  /**
   * How wide one slide is. `peek` leaves the next card's edge visible, which is
   * what tells a customer there is more without a second row of chrome.
   */
  slideWidth?: 'peek' | 'full';
  className?: string;
  ariaLabel: string;
}

/**
 * A horizontal, snap-scrolling rail with prev/next controls in its header.
 *
 * Native scroll-snap does the work, so a touch drag, a trackpad swipe, a
 * keyboard arrow and the buttons all move the same way and there is no
 * animation library in the path. The buttons disable at the ends rather than
 * wrapping — with a handful of deals, looping hides where you are.
 */
export default function DealsRail({
  slides,
  label,
  meta,
  slideWidth = 'peek',
  className,
  ariaLabel,
}: DealsRailProps) {
  const { t } = useTranslation();
  const trackRef = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(slides.length <= 1);

  const syncEdges = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    // Sub-pixel slide widths mean scrollLeft rarely lands exactly on 0 or on
    // the maximum, so both ends carry a tolerance wider than a rounding error.
    const max = track.scrollWidth - track.clientWidth;
    setAtStart(track.scrollLeft <= 2);
    setAtEnd(max <= 2 || track.scrollLeft >= max - 2);
  }, []);

  useEffect(() => {
    syncEdges();
    const track = trackRef.current;
    if (!track) return;
    // Slides can change width when the drawer resizes, so the ends are
    // recomputed on layout as well as on scroll.
    const observer = new ResizeObserver(syncEdges);
    observer.observe(track);
    return () => observer.disconnect();
  }, [syncEdges, slides.length]);

  const scrollByCard = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    const first = track.firstElementChild as HTMLElement | null;
    const step = first ? first.offsetWidth + 8 : track.clientWidth;
    track.scrollBy({ left: direction * step, behavior: 'smooth' });
  };

  const showControls = slides.length > 1;

  return (
    <section aria-label={ariaLabel} className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-baseline gap-2">{label}</div>
        <div className="flex shrink-0 items-center gap-2">
          {meta}
          {showControls && (
            <div className="flex items-center gap-1">
              <RailButton
                onClick={() => scrollByCard(-1)}
                disabled={atStart}
                label={t('cart.deals.scrollPrev')}
              >
                <ChevronLeft className="h-3 w-3" />
              </RailButton>
              <RailButton
                onClick={() => scrollByCard(1)}
                disabled={atEnd}
                label={t('cart.deals.scrollNext')}
              >
                <ChevronRight className="h-3 w-3" />
              </RailButton>
            </div>
          )}
        </div>
      </div>

      {/* No horizontal padding on the track: `snap-start` aligns a slide's edge
          to the scroll-port edge, so an inset parks the resting scroll position
          a few pixels in and the "at the start" arrow never disables. */}
      <ul
        ref={trackRef}
        onScroll={syncEdges}
        tabIndex={0}
        className="flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth pb-0.5 [scrollbar-width:none] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide) => (
          <li
            key={slide.key}
            className={cn(
              'shrink-0 snap-start',
              // A percentage, not a fixed inset, so the sliver of the next card
              // stays ~12% of the row at every width.
              slideWidth === 'peek' ? 'w-[88%]' : 'w-full'
            )}
          >
            {slide.content}
          </li>
        ))}
      </ul>
    </section>
  );
}

function RailButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-5 w-5 items-center justify-center rounded-sm border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
    >
      {children}
    </button>
  );
}
