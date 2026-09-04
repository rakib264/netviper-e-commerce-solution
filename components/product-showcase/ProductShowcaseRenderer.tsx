'use client';

import SectionHeading from '@/components/home/SectionHeading';
import ProductCardByStyle from '@/components/product-showcase/cards';
import ShowcaseMedia from '@/components/product-showcase/ShowcaseMedia';
import SplitProductCard from '@/components/product-showcase/SplitProductCard';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  resolveSplitPanelMedia,
  type ShowcaseCardStyle,
  type ShowcaseProduct,
  type ShowcasePromo,
  type ShowcaseSection,
  type SplitPanel,
} from '@/lib/product-showcase/types';
import {
  HOME_SECTION_CONTAINER,
  HOME_SECTION_HEADING_GAP,
  HOME_SECTION_SPACING,
} from '@/lib/home/section-spacing';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

export interface ResolvedShowcaseTab {
  id: string;
  title: string;
  value: string;
  promotion?: ShowcasePromo;
  products: ShowcaseProduct[];
}

export interface ResolvedShowcaseSection extends ShowcaseSection {
  resolvedTabs?: ResolvedShowcaseTab[];
  resolvedSplitLeftProduct?: ShowcaseProduct | null;
  resolvedSplitRightProduct?: ShowcaseProduct | null;
}

/**
 * The one call-to-action treatment used across promo cards and split panels: a
 * hairline rectangle on the artwork that fills on hover. Rectangular by house
 * rule, and outlined rather than solid so it sits on the image instead of
 * punching a hole in it.
 */
function MediaCta({
  label,
  href,
  className,
}: {
  label: string;
  href: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex h-10 items-center border border-white/60 px-5 font-button text-[0.625rem] uppercase tracking-[0.2em] text-white',
        'transition-colors duration-300 ease-out',
        'hover:border-card hover:bg-card hover:text-card-foreground',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
        'sm:h-11 sm:px-6 sm:text-[0.6875rem]',
        className,
      )}
    >
      {label}
    </Link>
  );
}

/** Graded wash: dense at the foot for text, clear of the artwork above it. */
const MEDIA_SCRIM =
  'pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 from-0% via-black/25 via-45% to-transparent to-80%';

function PromoCard({
  promotion,
}: {
  promotion?: ShowcasePromo;
}) {
  if (!promotion) return null;
  if (!promotion.image && !promotion.video && !promotion.title) return null;

  const video = (promotion.video || '').trim();
  const image = (promotion.image || '').trim();
  const hasMedia = Boolean(video || image);

  return (
    <div className="group relative flex h-full min-h-[20rem] flex-col justify-end overflow-hidden bg-primary p-6 md:min-h-0 lg:p-8">
      {hasMedia ? (
        <ShowcaseMedia
          mediaType={video ? 'video' : 'image'}
          url={video || image}
          poster={image}
          alt={promotion.title || ''}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
      ) : null}

      <div aria-hidden="true" className={MEDIA_SCRIM} />

      <div className="relative z-10 flex flex-col items-start">
        {promotion.kicker ? (
          <p className="font-label text-[0.625rem] uppercase leading-none tracking-[0.24em] text-white/70">
            {promotion.kicker}
          </p>
        ) : null}
        {promotion.title ? (
          <h3
            className={cn(
              'max-w-[18ch] font-navigation text-xl font-medium leading-[1.15] tracking-[-0.01em] text-white lg:text-2xl',
              promotion.kicker && 'mt-3',
            )}
          >
            {promotion.title}
          </h3>
        ) : null}
        {promotion.subtitle ? (
          <p className="mt-2 max-w-[26ch] font-paragraph text-sm text-white/80">
            {promotion.subtitle}
          </p>
        ) : null}
        {promotion.ctaLabel ? (
          <MediaCta
            label={promotion.ctaLabel}
            href={promotion.ctaLink || '/products'}
            className="mt-5 sm:mt-6"
          />
        ) : null}
      </div>
    </div>
  );
}

/** Column count for the grid fallback, so a short rail never leaves dead space. */
const GRID_COLUMNS: Record<number, string> = {
  1: 'sm:grid-cols-2 lg:grid-cols-3',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
};

/**
 * Below this many tiles a carousel is worse than a grid: the arrows do nothing
 * and the last 40% of the row is empty. Above it, the rail earns its keep.
 */
const CAROUSEL_MIN_ITEMS = 5;

const ITEM_BASIS = 'md:basis-1/3 lg:basis-1/4 xl:basis-1/5';

function ShowcaseTiles({
  promotion,
  products,
  cardStyle,
}: {
  promotion?: ShowcasePromo;
  products: ShowcaseProduct[];
  cardStyle: ShowcaseCardStyle;
}) {
  const hasPromo = Boolean(
    promotion && (promotion.image || promotion.video || promotion.title),
  );

  return (
    <>
      {hasPromo ? <PromoCard promotion={promotion} /> : null}
      {products.map((product) => (
        <ProductCardByStyle key={product._id} style={cardStyle} product={product} />
      ))}
    </>
  );
}

/** Static grid — used when there are too few tiles to justify a carousel. */
function ShowcaseGrid({
  promotion,
  products,
  cardStyle,
  total,
}: {
  promotion?: ShowcasePromo;
  products: ShowcaseProduct[];
  cardStyle: ShowcaseCardStyle;
  total: number;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-x-4 gap-y-8 sm:gap-x-5',
        GRID_COLUMNS[total] || 'sm:grid-cols-2 lg:grid-cols-4',
      )}
    >
      <ShowcaseTiles
        promotion={promotion}
        products={products}
        cardStyle={cardStyle}
      />
    </div>
  );
}

function ShowcaseCarousel({
  promotion,
  products,
  cardStyle,
}: {
  promotion?: ShowcasePromo;
  products: ShowcaseProduct[];
  cardStyle: ShowcaseCardStyle;
}) {
  const [api, setApi] = useState<CarouselApi>();
  /** `size` is the visible fraction of the rail; `offset` is how far along it is. */
  const [thumb, setThumb] = useState({ size: 0.25, offset: 0 });

  const syncThumb = useCallback((carouselApi: CarouselApi) => {
    if (!carouselApi) return;
    const slideCount = carouselApi.slideNodes().length;
    const inView = carouselApi.slidesInView().length || 1;
    const size = slideCount > 0 ? Math.min(1, inView / slideCount) : 1;
    const progress = Math.max(0, Math.min(1, carouselApi.scrollProgress() ?? 0));

    setThumb((previous) => {
      const next = {
        size: Math.round(size * 1000) / 1000,
        offset: Math.round(progress * (1 - size) * 1000) / 1000,
      };
      // Embla emits `scroll` every frame; bail unless the value actually moved so
      // the whole rail (and every memoised card in it) is not re-rendered at 60fps.
      return previous.size === next.size && previous.offset === next.offset
        ? previous
        : next;
    });
  }, []);

  useEffect(() => {
    if (!api) return;
    const handler = () => syncThumb(api);
    handler();
    api.on('reInit', handler).on('scroll', handler).on('slidesInView', handler);
    return () => {
      // The previous implementation never detached these, so handlers stacked up
      // on every re-render.
      api.off('reInit', handler).off('scroll', handler).off('slidesInView', handler);
    };
  }, [api, syncThumb]);

  return (
    <Carousel
      opts={{
        align: 'start',
        // Stops the rail from over-scrolling into empty space at the end.
        containScroll: 'trimSnaps',
        breakpoints: {
          '(max-width: 768px)': { active: false },
        },
      }}
      setApi={setApi}
      className="w-full"
    >
      <CarouselContent className="ml-0 grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 md:-ml-4 md:flex md:gap-0">
        {promotion && (promotion.image || promotion.video || promotion.title) ? (
          <CarouselItem className={cn('h-auto pl-0 md:pl-4', ITEM_BASIS)}>
            <PromoCard promotion={promotion} />
          </CarouselItem>
        ) : null}
        {products.map((product) => (
          <CarouselItem
            key={product._id}
            className={cn('h-auto pl-0 md:pl-4', ITEM_BASIS)}
          >
            <ProductCardByStyle style={cardStyle} product={product} />
          </CarouselItem>
        ))}
      </CarouselContent>

      <div className="mt-8 hidden items-center gap-4 md:flex">
        <div
          className="relative h-px w-full bg-border"
          role="presentation"
          aria-hidden="true"
        >
          <div
            style={{
              width: `${thumb.size * 100}%`,
              transform: `translate3d(${(thumb.offset / Math.max(thumb.size, 0.001)) * 100}%,0,0)`,
            }}
            className="h-px bg-foreground transition-transform duration-300 ease-out motion-reduce:transition-none"
          />
        </div>
        <CarouselPrevious className="static h-9 w-9 translate-y-0 rounded-none border-border text-foreground hover:bg-muted" />
        <CarouselNext className="static h-9 w-9 translate-y-0 rounded-none border-border text-foreground hover:bg-muted" />
      </div>
    </Carousel>
  );
}

function ShowcaseRail({
  promotion,
  products,
  cardStyle,
}: {
  promotion?: ShowcasePromo;
  products: ShowcaseProduct[];
  cardStyle: ShowcaseCardStyle;
}) {
  const hasPromo = Boolean(
    promotion && (promotion.image || promotion.video || promotion.title),
  );
  const total = products.length + (hasPromo ? 1 : 0);

  if (total === 0) return null;
  if (total < CAROUSEL_MIN_ITEMS) {
    return (
      <ShowcaseGrid
        promotion={promotion}
        products={products}
        cardStyle={cardStyle}
        total={total}
      />
    );
  }

  return (
    <ShowcaseCarousel
      promotion={promotion}
      products={products}
      cardStyle={cardStyle}
    />
  );
}

export function ProductShowcaseBlock({
  section,
}: {
  section: ResolvedShowcaseSection;
}) {
  const tabs = section.resolvedTabs || [];
  if (!tabs.length) return null;

  const defaultValue = tabs[0]?.value;
  const showTabs = tabs.length > 1;

  return (
    <section className={cn("overflow-x-clip bg-card font-paragraph", HOME_SECTION_SPACING)}>
      <div className={HOME_SECTION_CONTAINER}>
        <Tabs defaultValue={defaultValue} className="block">
          <div className="mb-10 flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="font-navigation text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl">
                {section.title}
              </h2>
              {showTabs ? (
                <TabsList className="h-auto gap-4 bg-transparent p-0">
                  {tabs.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="rounded-none bg-transparent px-0 pb-1.5 font-navigation text-sm text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-[inset_0_-1px_0_0_hsl(var(--foreground))]"
                    >
                      {tab.title}
                    </TabsTrigger>
                  ))}
                </TabsList>
              ) : null}
            </div>
            {section.subtitle ? (
              <p className="max-w-xl font-paragraph text-sm text-muted-foreground md:text-base">
                {section.subtitle}
              </p>
            ) : null}
          </div>

          {tabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="mt-0">
              <ShowcaseRail
                promotion={tab.promotion}
                products={tab.products}
                cardStyle={section.cardStyle}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}

/**
 * A split panel's frame.
 *
 * The height is stated outright at every breakpoint instead of being inherited.
 * The previous version gave each panel `size-full min-h-[420px]` inside a grid
 * whose only height rule was `max-h-[640px]`: a percentage height against an
 * indefinite grid row, capped on the wrapper but not on the row, so the media
 * grew past the cap and spilled out of the section. A definite height plus
 * `overflow-hidden` on the panel itself cannot overflow, and `object-cover`
 * turns the leftover ratio into a crop rather than a stretch.
 */
const PANEL_FRAME = cn(
  'group relative isolate flex w-full flex-col justify-end overflow-hidden bg-muted',
  // Taller than the media-only version: the panel now carries a product card
  // under its copy, and the frame has to hold both without clipping.
  'aspect-[4/5] max-h-[30rem]',
  'sm:aspect-auto sm:h-[28rem] sm:max-h-none',
  'md:h-[30rem] lg:h-[36rem] xl:h-[40rem]',
);

/** A panel is worth rendering if it carries media or any copy of its own. */
function panelHasContent(panel?: SplitPanel | null): boolean {
  if (!panel) return false;
  return Boolean(
    (panel.mediaUrl || '').trim() ||
      (panel.title || '').trim() ||
      (panel.ctaLabel || '').trim(),
  );
}

function SplitPanelView({
  panel,
  product,
  sizes,
  priority,
}: {
  panel: SplitPanel;
  product?: ShowcaseProduct | null;
  sizes: string;
  priority?: boolean;
}) {
  // The stored `mediaType` is only a hint — it is set when an admin uploads
  // through the form, so a pasted or legacy video URL arrives marked as an
  // image and used to render as a broken <img>. The URL decides.
  const media = resolveSplitPanelMedia(panel);

  return (
    <div className={PANEL_FRAME}>
      {media.url ? (
        <ShowcaseMedia
          mediaType={media.mediaType}
          url={media.url}
          poster={media.poster}
          alt={panel.title || ''}
          sizes={sizes}
          priority={priority}
        />
      ) : null}

      <div aria-hidden="true" className={MEDIA_SCRIM} />

      {/*
        One bottom-anchored column rather than two absolutely positioned
        corners. The copy and the product card used to be independent absolutes
        — top-right and bottom-left — which collided on a narrow panel because
        neither knew the other's width. As flow siblings they simply stack, so a
        collision is not expressible.
      */}
      <div className="relative z-10 flex flex-col items-start gap-6 p-5 sm:gap-7 sm:p-7 lg:gap-8 lg:p-10">
        {panel.kicker || panel.title || panel.ctaLabel ? (
          <div className="flex max-w-full flex-col items-start">
            {panel.kicker ? (
              <p className="font-label text-[0.625rem] uppercase leading-none tracking-[0.24em] text-white/70 sm:text-[0.6875rem]">
                {panel.kicker}
              </p>
            ) : null}
            {panel.title ? (
              <h3
                className={cn(
                  // Clamped: an over-long headline would otherwise push the
                  // product card past the top edge of a fixed-height frame.
                  'line-clamp-3 max-w-[16ch] font-navigation text-2xl font-medium leading-[1.1] tracking-[-0.01em] text-white sm:text-3xl lg:text-[2.5rem]',
                  panel.kicker && 'mt-3',
                )}
              >
                {panel.title}
              </h3>
            ) : null}
            {panel.ctaLabel ? (
              <MediaCta
                label={panel.ctaLabel}
                href={panel.ctaLink || '/products'}
                className={cn((panel.kicker || panel.title) && 'mt-5 sm:mt-6')}
              />
            ) : null}
          </div>
        ) : null}

        {product ? (
          <SplitProductCard product={product} className="w-full max-w-[20rem]" />
        ) : null}
      </div>
    </div>
  );
}

export function SplitMediaBlock({
  section,
}: {
  section: ResolvedShowcaseSection;
}) {
  // An unconfigured side used to render as a bare grey half. Dropping it lets a
  // single-panel campaign run the full width instead of looking broken.
  const panels = [
    { panel: section.splitLeft, product: section.resolvedSplitLeftProduct },
    { panel: section.splitRight, product: section.resolvedSplitRightProduct },
  ].filter(
    (entry): entry is {
      panel: SplitPanel;
      product: ShowcaseProduct | null | undefined;
    } => panelHasContent(entry.panel),
  );

  if (panels.length === 0) return null;

  const sizes =
    panels.length > 1
      ? '(max-width: 767px) 100vw, (max-width: 1280px) 50vw, 46rem'
      : '100vw';

  return (
    <section className={cn("bg-card font-paragraph", HOME_SECTION_SPACING)}>
      <div className={HOME_SECTION_CONTAINER}>
        <SectionHeading
          title={section.title}
          subtitle={section.subtitle}
          className={HOME_SECTION_HEADING_GAP}
        />

        <div
          className={cn(
            'grid grid-cols-1 gap-3 sm:gap-4 lg:gap-5',
            panels.length > 1 && 'md:grid-cols-2',
          )}
        >
          {panels.map((entry, index) => (
            <SplitPanelView
              key={index}
              panel={entry.panel}
              product={entry.product}
              sizes={sizes}
              priority={index === 0}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/** One showcase section, rendered by its template. */
export function ShowcaseSectionBlock({
  section,
}: {
  section: ResolvedShowcaseSection;
}) {
  return section.template === 'split_media' ? (
    <SplitMediaBlock section={section} />
  ) : (
    <ProductShowcaseBlock section={section} />
  );
}

/**
 * Render a list of showcase sections back to back.
 *
 * Retained for callers that hold a whole list. The homepage no longer uses it:
 * each showcase owns a slot in the page order, so `section-registry` renders
 * one `ShowcaseSectionBlock` at a time.
 */
export function ProductShowcaseRenderer({
  sections,
}: {
  sections: ResolvedShowcaseSection[];
}) {
  if (!sections?.length) return null;
  return (
    <>
      {sections.map((section) => (
        <ShowcaseSectionBlock key={section._id} section={section} />
      ))}
    </>
  );
}

export default ShowcaseSectionBlock;
