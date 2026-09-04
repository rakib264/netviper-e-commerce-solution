'use client';

import {
  AD_SHAPE_CLASSES,
  type AdCardShape,
} from '@/components/home/advertisements/ad-shapes';
import AdMedia from '@/components/home/advertisements/AdMedia';
import AdOverlay from '@/components/home/advertisements/AdOverlay';
import type { AdvertisementDTO } from '@/lib/advertisements/types';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface AdCardProps {
  ad: AdvertisementDTO;
  shape: AdCardShape;
  sizes: string;
  priority?: boolean;
  autoplayVideo?: boolean;
  className?: string;
}

/**
 * One advertisement: Bunny-hosted media under a minimal overlay.
 *
 * The frame carries its proportion and its height ceiling from
 * `AD_SHAPE_CLASSES`; the copy lives in `AdOverlay`. The title is the card's
 * accessible name rather than painted text, which keeps the artwork clear and
 * stops the band from competing with the editorial sections around it.
 */
export function AdCard({
  ad,
  shape,
  sizes,
  priority = false,
  autoplayVideo = true,
  className,
}: AdCardProps) {
  const href = ad.cta?.url;

  const body = (
    <div
      className={cn(
        'group relative w-full overflow-hidden bg-muted',
        AD_SHAPE_CLASSES[shape],
        className,
      )}
    >
      <AdMedia
        mediaType={ad.mediaType}
        url={ad.mediaUrl}
        poster={ad.posterImage}
        alt={ad.title}
        sizes={sizes}
        priority={priority}
        autoplay={autoplayVideo}
      />

      <AdOverlay ad={ad} shape={shape} />
    </div>
  );

  if (!href) return body;

  return (
    <Link
      href={href}
      aria-label={ad.title}
      // `group` sits on the link too, so the CTA reacts to keyboard focus as
      // well as pointer hover.
      className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
    >
      {body}
    </Link>
  );
}

export default AdCard;
