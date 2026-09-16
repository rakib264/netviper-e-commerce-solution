import { ImageResponse } from 'next/og';

import { BRAND } from '@/lib/seo/brand';
import { markDataUri } from '@/lib/seo/brand-art';

/**
 * The browser-tab icon, generated from `lib/seo/brand.ts`.
 *
 * Generated rather than committed so a rebrand needs no designer for it: change
 * `BRAND.art` and the icon follows. The committed `public/brand/*.png` files are
 * the same drawing rendered ahead of time by `yarn brand:assets`, for the
 * places that need a plain static URL — the manifest and the JSON-LD
 * `ImageObject`.
 */
export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <img
        src={markDataUri(BRAND.art)}
        width={size.width}
        height={size.height}
        alt=""
      />
    ),
    size,
  );
}
