/**
 * The brand mark, as SVG source.
 *
 * Shared by `scripts/generate-brand-assets.mjs`, which renders it to the static
 * PNGs in `public/brand/`, and by the `next/og` routes in `app/`, which embed it
 * in generated social cards. One drawing, so a regenerated favicon and a
 * freshly rendered OG card cannot end up showing different logos.
 *
 * Deliberately free of every import, including `@/lib/seo/brand` — colours
 * arrive as arguments. That keeps the module loadable by the plain-Node build
 * script (which has no path-alias resolution) as well as by the bundler.
 */

export interface MarkColors {
  background: string;
  foreground: string;
}

/**
 * A steaming noodle bowl on a 512 grid.
 *
 * Heavy strokes and no fine detail, because the same artwork has to stay
 * readable at 48px in a browser tab. `size` scales the viewport only — every
 * output is the same drawing rather than a separately tuned one per size.
 */
export function markSvg(
  colors: MarkColors,
  { size = 512, rounded = true, mono = false }: {
    size?: number;
    rounded?: boolean;
    mono?: boolean;
  } = {},
): string {
  const bg = mono ? 'none' : colors.background;
  const fg = mono ? '#000000' : colors.foreground;
  // In monochrome the noodles have to be cut *out* of the bowl rather than
  // drawn over it — there is no second colour to draw them in.
  const noodleStroke = mono ? 'none' : colors.background;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  ${rounded && !mono ? `<rect width="512" height="512" rx="112" fill="${bg}"/>` : ''}
  <g fill="none" stroke="${fg}" stroke-width="18" stroke-linecap="round">
    <path d="M186 168c0-26 22-26 22-52s-22-26-22-52"/>
    <path d="M256 152c0-30 24-30 24-60s-24-30-24-60"/>
    <path d="M326 168c0-26 22-26 22-52s-22-26-22-52"/>
  </g>
  <path d="M92 268h328c0 92-73.4 166-164 166S92 360 92 268Z" fill="${fg}"/>
  <rect x="74" y="244" width="364" height="34" rx="17" fill="${fg}"/>
  <g fill="none" stroke="${noodleStroke}" stroke-width="16" stroke-linecap="round">
    <path d="M150 318c26 18 52 18 78 0s52-18 78 0 52 18 78 0"/>
    <path d="M172 366c22 14 44 14 66 0s44-14 66 0"/>
  </g>
  <g stroke="${fg}" stroke-width="16" stroke-linecap="round">
    <path d="M300 236 436 118"/>
    <path d="M336 252 462 142"/>
  </g>
</svg>`;
}

/** The mark as a `data:` URI, for `<img>` inside a `next/og` ImageResponse. */
export function markDataUri(
  colors: MarkColors,
  options?: { size?: number; rounded?: boolean; mono?: boolean },
): string {
  const svg = markSvg(colors, options);
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}
