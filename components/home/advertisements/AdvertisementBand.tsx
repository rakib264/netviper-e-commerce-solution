'use client';

import {
  AD_SHAPE_CLASSES,
  type AdCardShape,
} from '@/components/home/advertisements/ad-shapes';
import AdCard from '@/components/home/advertisements/AdCard';
import SectionHeading from '@/components/home/SectionHeading';
import {
  settingBoolean,
  settingNumber,
  settingString,
  type HomepageSectionProps,
} from '@/components/home/section-props';
import { useTranslation } from '@/components/providers/LocalizationProvider';
import {
  AD_LAYOUT_MODES,
  MAX_ADS_PER_TYPE,
  type AdLayoutMode,
  type AdvertisementDTO,
  type AdvertisementType,
} from '@/lib/advertisements/types';
import {
  HOME_SECTION_CONTAINER,
  HOME_SECTION_HEADING_GAP,
  HOME_SECTION_SPACING,
} from '@/lib/home/section-spacing';
import { cn } from '@/lib/utils';
import { useSectionData } from '@/hooks/use-section-data';

interface AdvertisementBandProps extends HomepageSectionProps {
  adType: AdvertisementType;
  /**
   * This family's active advertisements, resolved on the server. Both families
   * come out of a single query there, so the homepage costs one read for two
   * bands rather than one request each.
   */
  initialAds?: AdvertisementDTO[] | null;
}

/** Equal-width columns for the wide family, keyed by surviving card count. */
const HORIZONTAL_COLUMNS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
};

/**
 * The vertical family fills the container, exactly like every other band.
 *
 * It used to cap the row width as well as the card height, which kept the 4:5
 * frame narrow but parked the whole band in a centred island with a far deeper
 * gutter than the sections above and below it. Height is now governed solely by
 * the `max-h` ceiling in `AD_SHAPE_CLASSES.tall`, so the columns start and end
 * on the page gutter and the frame crops — `object-cover`, never distorted —
 * rather than the row shrinking away from the edge.
 */
const VERTICAL_COLUMNS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'sm:grid-cols-2',
  // Three panels go straight from the rail to a triptych. Two columns in
  // between would orphan the third card in a half-empty row, and three columns
  // before `lg` leaves a 4:5 frame too narrow to hold its own call to action.
  3: 'lg:grid-cols-3',
};

/** `sizes` hints matching the column classes above, so the CDN serves the right width. */
const HORIZONTAL_SIZE_HINTS: Record<number, string> = {
  1: '100vw',
  2: '(max-width: 640px) 100vw, 50vw',
  3: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
};

/**
 * Vertical columns are now a fraction of the container rather than a fixed cap,
 * so the hints are viewport fractions like the horizontal ones. Below `sm` a
 * multi-card band is the snap rail, whose items are 68% of the row.
 */
const VERTICAL_SIZE_HINTS: Record<number, string> = {
  1: '100vw',
  2: '(max-width: 640px) 68vw, 50vw',
  3: '(max-width: 640px) 68vw, (max-width: 1024px) 46vw, 33vw',
};

/**
 * A vertical band with more than one panel is a snap rail before it is a grid —
 * three 430px blocks stacked in a column is the same usability problem as one
 * 2000px block. CSS scroll-snap only: no carousel library, no scroll listeners,
 * and the rail is keyboard-scrollable as-is.
 *
 * Where the rail gives way to the grid depends on how many panels it holds,
 * which is why the exit classes are keyed by count rather than baked in: two
 * panels resolve into columns at `sm`, three only at `lg`.
 */
const RAIL_BASE =
  'flex snap-x snap-mandatory overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

const RAIL_EXIT: Record<number, string> = {
  2: 'sm:grid sm:snap-none sm:overflow-visible sm:pb-0',
  3: 'lg:grid lg:snap-none lg:overflow-visible lg:pb-0',
};

/** Rail item widths, tracking the same breakpoints as `RAIL_EXIT`. */
const RAIL_ITEM: Record<number, string> = {
  2: 'w-[68%] shrink-0 snap-start sm:w-auto sm:shrink',
  3: 'w-[68%] shrink-0 snap-start sm:w-[46%] lg:w-auto lg:shrink',
};

/**
 * One homepage advertisement band — horizontal or vertical.
 *
 * Both families share this renderer: they differ only in card proportion and in
 * how much of the row they are allowed to occupy, so the heading rhythm, layout
 * modes, media handling and failure behaviour stay identical between them.
 * `full-width` shows a single card edge to edge; `multi` shows up to three.
 */
export function AdvertisementBand({
  adType,
  eyebrow,
  title,
  subtitle,
  settings,
  initialAds,
  className,
}: AdvertisementBandProps) {
  const { t } = useTranslation();

  const rawLayout = settingString(settings, 'layout', 'multi');
  const layout: AdLayoutMode = AD_LAYOUT_MODES.includes(rawLayout as AdLayoutMode)
    ? (rawLayout as AdLayoutMode)
    : 'multi';
  const autoplayVideo = settingBoolean(settings, 'autoplayVideo', true);
  const fullBleed = settingBoolean(settings, 'fullWidth', false);
  const limit =
    layout === 'full-width'
      ? 1
      : Math.min(settingNumber(settings, 'limit', MAX_ADS_PER_TYPE), MAX_ADS_PER_TYPE);

  const { data, loading } = useSectionData<AdvertisementDTO[]>(
    initialAds,
    async (signal) => {
      const response = await fetch(`/api/advertisements?type=${adType}`, { signal });
      if (!response.ok) throw new Error('Request failed');
      const payload = await response.json();
      return Array.isArray(payload.advertisements) ? payload.advertisements : [];
    },
    [adType],
  );

  const ads = data || [];

  const isVertical = adType === 'vertical';
  const shape: AdCardShape = isVertical
    ? 'tall'
    : layout === 'full-width'
      ? 'wide'
      : 'panel';

  // A tall row never goes full-bleed: edge to edge is exactly what stretched the
  // panels, so the setting only reaches the wide family.
  const bleed = fullBleed && !isVertical;

  // Full-bleed drops the container from the media grid only — the heading keeps
  // the page gutter so it stays aligned with every other section title.
  const sectionClass = cn(HOME_SECTION_SPACING, 'font-paragraph', className);
  const outerClass = bleed ? 'px-0' : HOME_SECTION_CONTAINER;
  // Vertical panels are read as one editorial spread, so they sit a step
  // tighter than the horizontal family — enough of a seam to separate two
  // images, not enough to break them into separate cards.
  const gapClass = bleed
    ? 'gap-2 sm:gap-3'
    : isVertical
      ? 'gap-3 sm:gap-4 lg:gap-5'
      : 'gap-3 sm:gap-5 lg:gap-6';

  /** Row container + per-item classes for a given card count. */
  const rowClasses = (count: number) => {
    const columns = Math.min(Math.max(count, 1), 3);
    const rail = isVertical && columns > 1;

    return {
      columns,
      row: cn(
        // `flex` and `grid` are both `display` utilities, and Tailwind emits
        // `.grid` last — so a rail must never carry the bare `grid` class. The
        // `grid` inside `RAIL_EXIT` is in a media query and still wins there.
        rail ? cn(RAIL_BASE, RAIL_EXIT[columns]) : 'grid',
        gapClass,
        isVertical ? VERTICAL_COLUMNS[columns] : HORIZONTAL_COLUMNS[columns],
      ),
      item: rail ? RAIL_ITEM[columns] : undefined,
    };
  };

  if (loading) {
    const { row, item } = rowClasses(layout === 'full-width' ? 1 : 2);

    return (
      <section
        className={sectionClass}
        aria-busy="true"
        aria-label={t('home.advertisements.loadingPromotions')}
      >
        <div className={outerClass}>
          <div className={row}>
            {Array.from({ length: layout === 'full-width' ? 1 : 2 }).map(
              (_, index) => (
                <div key={index} className={item}>
                  <div
                    className={cn(
                      'w-full animate-pulse bg-muted',
                      AD_SHAPE_CLASSES[shape],
                    )}
                  />
                </div>
              ),
            )}
          </div>
        </div>
      </section>
    );
  }

  const visible = ads.slice(0, limit);
  if (visible.length === 0) return null;

  const { columns, row, item } = rowClasses(visible.length);
  const sizes = isVertical
    ? VERTICAL_SIZE_HINTS[columns]
    : HORIZONTAL_SIZE_HINTS[columns];

  return (
    <section className={sectionClass}>
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        className={cn(HOME_SECTION_CONTAINER, HOME_SECTION_HEADING_GAP)}
      />

      <div className={outerClass}>
        <div className={row}>
          {visible.map((ad, index) => (
            <div key={ad._id} className={item}>
              <AdCard
                ad={ad}
                shape={shape}
                sizes={sizes}
                // Only the leading card is worth preloading; the rest lazy-load.
                priority={index === 0}
                autoplayVideo={autoplayVideo}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default AdvertisementBand;
