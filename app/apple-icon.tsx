import { ImageResponse } from 'next/og';

import { BRAND } from '@/lib/seo/brand';
import { markDataUri } from '@/lib/seo/brand-art';

/** Home-screen icon for iOS. Same drawing as `app/icon.tsx`, Apple's size. */
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
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
