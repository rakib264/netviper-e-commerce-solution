import { ImageResponse } from 'next/og';

import { BRAND } from '@/lib/seo/brand';
import { markDataUri } from '@/lib/seo/brand-art';

/**
 * The default social card, generated from `lib/seo/brand.ts`.
 *
 * Laid out with flex boxes and `<img>` rather than raw SVG text, because the
 * `next/og` renderer supports only a subset of SVG and silently drops what it
 * cannot handle — a card that renders blank in production and fine in review is
 * the worst possible outcome for an image nobody looks at directly.
 *
 * `buildMetadata` points every page at `BRAND.ogImage` (the pre-rendered
 * `public/brand/og-image.png`) rather than at this route, so a scraper that
 * refuses to wait on a generated image still gets a card. This route is the
 * live-regenerating counterpart, and the two are the same drawing.
 */
export const alt = `${BRAND.name} — ${BRAND.ogTagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  const { background, foreground } = BRAND.art;
  const { minDays, maxDays } = BRAND.delivery.dhaka;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 64,
          padding: '0 88px',
          background,
          // No `fontFamily`: the storefront's font is a runtime stylesheet from
          // the DB, and satori needs an embedded font buffer rather than a
          // stylesheet, so there is nothing themed to point at here. Left unset,
          // `next/og` uses its own bundled face — which is also why this file
          // must not name a family, per `tests/typography-centralization`.
        }}
      >
        <img src={markDataUri(BRAND.art)} width={260} height={260} alt="" />

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 82, fontWeight: 700, color: foreground, lineHeight: 1.1 }}>
            {BRAND.name}
          </div>
          <div style={{ fontSize: 32, color: foreground, opacity: 0.92, marginTop: 18 }}>
            {BRAND.ogTagline}
          </div>
          <div
            style={{
              width: 300,
              height: 3,
              background: foreground,
              opacity: 0.35,
              margin: '32px 0',
            }}
          />
          <div style={{ fontSize: 27, color: foreground, opacity: 0.78 }}>
            {`Delivered across ${BRAND.areaServed.primaryCity} in ${minDays}–${maxDays} days`}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
