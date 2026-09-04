'use client';

import ComboBundleCard from '@/components/combo-bundles/ComboBundleCard';
import type { ResolvedComboBundle } from '@/lib/combo-bundles/types';
import { cn } from '@/lib/utils';

/**
 * Horizontal rail of offers.
 *
 * A scroll-snap list, not a carousel: no library, no autoplay, no scroll
 * listeners — which is what keeps the drag native on touch and the whole row
 * reachable by keyboard. Matches the curated-section rail so the homepage has
 * one scrolling behaviour rather than several.
 */
export default function ComboBundleRail({
  combos,
  className,
}: {
  combos: ResolvedComboBundle[];
  className?: string;
}) {
  if (combos.length === 0) return null;

  return (
    <ul
      className={cn(
        'flex snap-x snap-mandatory gap-x-5 overflow-x-auto pb-2 lg:gap-x-7',
        '[-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      {combos.map((combo, index) => (
        <li
          key={combo._id}
          className="w-[72%] shrink-0 snap-start sm:w-[44%] lg:w-[30%] xl:w-[23%]"
        >
          <ComboBundleCard
            combo={combo}
            priority={index === 0}
            sizes="(max-width: 640px) 72vw, (max-width: 1024px) 44vw, 23vw"
          />
        </li>
      ))}
    </ul>
  );
}
