/**
 * The homepage's vertical rhythm, in one place.
 *
 * Before this, eleven homepage sections carried six different paddings —
 * `py-8 lg:py-16`, `py-10 md:py-14`, `py-12 md:py-16`, `py-16 md:py-24`,
 * `py-16 lg:py-24`, `py-14 sm:py-20 lg:py-28` — and they mixed `md:` and `lg:`
 * as the step breakpoint, so two adjacent bands could change size at different
 * viewport widths. The result read as uneven rather than composed.
 *
 * One scale now, stepping at `sm` and `lg` so the rhythm grows smoothly through
 * tablet instead of jumping once at desktop:
 *
 *   mobile   56px   (py-14)
 *   ≥640px   80px   (py-20)
 *   ≥1024px  112px  (py-28)
 *
 * Use `HOME_SECTION_SPACING` for a normal band. The tighter and looser variants
 * exist for the two cases where equal padding is wrong, not as a free choice:
 * see each constant.
 */

/** The default band. Every product, category, editorial and promo section. */
export const HOME_SECTION_SPACING = 'py-14 sm:py-20 lg:py-28';

/**
 * A band that sits directly under the hero.
 *
 * The hero already ends in its own generous bottom padding, so a full-size top
 * pad reads as a gap rather than a separation.
 */
export const HOME_SECTION_SPACING_AFTER_HERO = 'pb-14 pt-10 sm:pb-20 sm:pt-14 lg:pb-28 lg:pt-16';

/**
 * A band with a background of its own (a tint, a gradient, an image).
 *
 * A tinted block needs more internal room than a band on the page ground,
 * otherwise its own edges crowd the content.
 */
export const HOME_SECTION_SPACING_FILLED = 'py-16 sm:py-24 lg:py-32';

/** Space between a section's heading and its content. */
export const HOME_SECTION_HEADING_GAP = 'mb-8 sm:mb-10 lg:mb-12';

/** Gutter-respecting page width, shared with the rest of the storefront. */
export const HOME_SECTION_CONTAINER = 'luxury-container';
