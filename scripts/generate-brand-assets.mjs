/**
 * Generate the static brand artwork in `public/brand/` from `lib/seo/brand.ts`.
 *
 *   yarn brand:assets
 *
 * Run this after changing `BRAND.name` or `BRAND.art`. It exists so that a
 * rebrand does not need a designer in the loop for the mechanical pieces: the
 * icon, the Apple touch icon, the monochrome mask and the social card all fall
 * out of the name and three colours.
 *
 * `brand.ts` is imported directly rather than having its values copied here —
 * a duplicated brand name in a build script is exactly the kind of leak this
 * whole module exists to eliminate. Its only imports are `import type`, which
 * Node's type stripping erases, so no alias resolution is needed.
 *
 * Supply a real, designed logo by replacing `public/brand/logo.png` and simply
 * not re-running this script; nothing else reads the generated files directly.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import { BRAND } from '../lib/seo/brand.ts';
import { markSvg } from '../lib/seo/brand-art.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'brand');

const { background, foreground, accent } = BRAND.art;

/** The shared mark, bound to this brand's palette. */
const mark = (options) => markSvg({ background, foreground }, options);

/** The 1200×630 social card: mark on the left, name and tagline on the right. */
function ogSvg() {
  const name = escapeXml(BRAND.name);
  const tagline = escapeXml(BRAND.ogTagline);
  const delivery = escapeXml(
    `Delivered across ${BRAND.areaServed.primaryCity} in ` +
      `${BRAND.delivery.dhaka.minDays}–${BRAND.delivery.dhaka.maxDays} days`,
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${background}"/>
  <circle cx="1120" cy="80" r="220" fill="${foreground}" opacity="0.07"/>
  <circle cx="90" cy="580" r="160" fill="${accent}" opacity="0.10"/>
  <g transform="translate(88, 155) scale(0.62)">
    ${mark({ rounded: false }).replace(/<\/?svg[^>]*>/g, '')}
  </g>
  <text x="440" y="286" font-family="Helvetica, Arial, sans-serif" font-size="82"
        font-weight="700" fill="${foreground}">${name}</text>
  <text x="440" y="350" font-family="Helvetica, Arial, sans-serif" font-size="32"
        fill="${foreground}" opacity="0.92">${tagline}</text>
  <rect x="440" y="392" width="300" height="3" fill="${foreground}" opacity="0.35"/>
  <text x="440" y="446" font-family="Helvetica, Arial, sans-serif" font-size="27"
        fill="${foreground}" opacity="0.78">${delivery}</text>
</svg>`;
}

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function png(svg, width, height, file) {
  await sharp(Buffer.from(svg))
    .resize(width, height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(join(OUT, file));
  console.log(`  public/brand/${file}  ${width}×${height}`);
}

await mkdir(OUT, { recursive: true });
console.log(`Generating brand assets for "${BRAND.name}"…`);

await png(mark(), 512, 512, 'logo.png');
await png(mark(), 180, 180, 'apple-icon.png');
await png(ogSvg(), 1200, 630, 'og-image.png');

// Safari pinned tabs want a flat, single-colour silhouette with no background.
await writeFile(join(OUT, 'mask-icon.svg'), mark({ mono: true, rounded: false }));
console.log('  public/brand/mask-icon.svg');

console.log('Done.');
