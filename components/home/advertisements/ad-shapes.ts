/**
 * Geometry for the advertisement cards, shared by the storefront band, its
 * loading skeleton and the admin preview so all three agree on proportion.
 *
 * Every shape pairs an aspect ratio with an explicit height range. The ratio
 * alone is what made vertical panels unusable: a single tall card in a
 * full-width column resolved to a two-thousand-pixel block on a desktop
 * container. The `max-h-*` clamps let the ratio govern the proportion while the
 * card stays inside a normal viewport, and `min-h-*` keeps a narrow column from
 * collapsing into a letterbox. The media is `object-cover`, so a clamped card
 * crops rather than distorts.
 */

export type AdCardShape = 'wide' | 'panel' | 'tall';

export const AD_SHAPE_CLASSES: Record<AdCardShape, string> = {
  /* A single band running the width of the row. Cinematic, never a screenful. */
  wide: 'aspect-[3/2] min-h-[13rem] max-h-[24rem] sm:aspect-[2/1] sm:max-h-[28rem] lg:aspect-[21/9] lg:max-h-[34rem]',
  /* One of two or three side-by-side horizontal cards. */
  panel:
    'aspect-[4/3] min-h-[12rem] max-h-[21rem] sm:aspect-[16/10] sm:max-h-[23rem] lg:max-h-[26rem]',
  /*
   * A tall vertical panel. Unlike the other two it gets the full page gutter —
   * the band no longer narrows its row — so the ceiling here is the only thing
   * governing height. It is set just under a laptop viewport: at two columns in
   * a 1280–1440px container the 4:5 frame still resolves portrait and only
   * starts cropping past ~1500px, and a three-column row resolves a true 4:5
   * at every width. The ceiling stays under a short laptop viewport, so the
   * band can never grow into the screenful this scale exists to prevent.
   */
  tall: 'aspect-[4/5] min-h-[17rem] max-h-[30rem] sm:max-h-[34rem] lg:max-h-[38rem]',
};

/** Interior padding per shape — the spacing rhythm of the overlay copy. */
export const AD_COPY_PADDING: Record<AdCardShape, string> = {
  wide: 'p-6 sm:p-9 lg:p-12',
  panel: 'p-5 sm:p-7 lg:p-9',
  tall: 'p-5 sm:p-7 lg:p-10',
};

/** Headline scale per shape. Restrained on purpose — the artwork leads. */
export const AD_HEADLINE_CLASSES: Record<AdCardShape, string> = {
  wide: 'text-[1.375rem] sm:text-[1.875rem] lg:text-[2.625rem]',
  panel: 'text-[1.25rem] sm:text-[1.5rem] lg:text-[1.875rem]',
  tall: 'text-[1.25rem] sm:text-[1.375rem] lg:text-[1.75rem]',
};

/** Measure for the copy column, so text never runs the full width of a band. */
export const AD_COPY_WIDTH: Record<AdCardShape, string> = {
  wide: 'max-w-[26ch] lg:max-w-[32ch]',
  panel: 'max-w-[22ch]',
  tall: 'max-w-[18ch] lg:max-w-[22ch]',
};
