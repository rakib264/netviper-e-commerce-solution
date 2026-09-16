import {
  AD_COPY_PADDING,
  AD_COPY_WIDTH,
  AD_HEADLINE_CLASSES,
  type AdCardShape,
} from '@/components/home/advertisements/ad-shapes';
import type { AdvertisementDTO } from '@/lib/advertisements/types';
import { cn } from '@/lib/utils';

interface AdOverlayProps {
  ad: Pick<AdvertisementDTO, 'badgeTitle' | 'discountText' | 'cta'>;
  shape: AdCardShape;
}

/**
 * The copy layer of an advertisement card.
 *
 * Deliberately quiet: a hairline-tracked label, one restrained headline and an
 * outlined rectangular call to action, all anchored to the foot of the frame on
 * a short measure. The scrim is a graded wash that clears by the upper third of
 * the card, so the artwork stays legible instead of sitting under a slab of
 * black — the difference between an editorial panel and a generic banner.
 *
 * Shared with the admin preview, so what a merchandiser approves is what ships.
 */
export function AdOverlay({ ad, shape }: AdOverlayProps) {
  const hasCopy = Boolean(ad.badgeTitle || ad.discountText || ad.cta?.label);
  if (!hasCopy) return null;

  return (
    <>
      <div
        aria-hidden="true"
        // Graded stops rather than a single ramp: just dense enough at the
        // foot to carry white text, and fully clear by the lower third so the
        // artwork — not the scrim — is what the band reads as.
        className="absolute inset-0 bg-gradient-to-t from-black/50 from-0% via-black/[0.14] via-40% to-transparent to-70%"
      />

      <div
        className={cn(
          'absolute inset-x-0 bottom-0 flex flex-col items-start',
          AD_COPY_PADDING[shape],
        )}
      >
        <div className={AD_COPY_WIDTH[shape]}>
          {ad.badgeTitle ? (
            <p className="font-label text-[0.625rem] uppercase leading-none tracking-[0.26em] text-white/75 sm:text-[0.6875rem]">
              {ad.badgeTitle}
            </p>
          ) : null}

          {ad.discountText ? (
            <p
              className={cn(
                'font-navigation font-medium leading-[1.1] tracking-[-0.01em] text-white',
                ad.badgeTitle && 'mt-3',
                AD_HEADLINE_CLASSES[shape],
              )}
            >
              {ad.discountText}
            </p>
          ) : null}

          {ad.cta?.label ? (
            <span
              className={cn(
                // A plain rectangle — no radius, no fill, no shadow. The only
                // state change is the border filling in, which is why the
                // transition is colours only.
                'inline-flex h-10 items-center border border-white/70 px-6 font-button text-[0.625rem] uppercase tracking-[0.22em] text-white',
                'transition-colors duration-300 ease-out',
                'group-hover:border-card group-hover:bg-card group-hover:text-card-foreground',
                'group-focus-visible:border-card group-focus-visible:bg-card group-focus-visible:text-card-foreground',
                'sm:h-11 sm:px-7 sm:text-[0.6875rem]',
                (ad.badgeTitle || ad.discountText) && 'mt-5 sm:mt-6',
              )}
            >
              {ad.cta.label}
            </span>
          ) : null}
        </div>
      </div>
    </>
  );
}

export default AdOverlay;
