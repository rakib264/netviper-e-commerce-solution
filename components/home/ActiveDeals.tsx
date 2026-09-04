'use client';

import DealsShowcase from '@/components/deals/DealsShowcase';
import HomeSection, { type HomeSectionRhythm } from '@/components/home/HomeSection';
import SectionHeading from '@/components/home/SectionHeading';
import type { HomepageSectionProps } from '@/components/home/section-props';
import { settingBoolean } from '@/components/home/section-props';
import type { ActiveDealSummary } from '@/lib/deals/showcase';
import { HOME_SECTION_HEADING_GAP } from '@/lib/home/section-spacing';

interface ActiveDealsProps extends HomepageSectionProps {
  /** Running deals, resolved on the server. */
  initialDeals?: ActiveDealSummary[] | null;
  /** Which step of the shared vertical scale this band uses. */
  rhythm?: HomeSectionRhythm;
}

/**
 * Landing slot for the running deals.
 *
 * Position is not decided here — it comes from the homepage section registry, so
 * an admin can drag this band anywhere on the page and toggle it off without a
 * code change. It ships directly below the hero, which is why the registry hands
 * it the `after-hero` rhythm in that position.
 */
export default function ActiveDeals({
  eyebrow,
  title,
  subtitle,
  settings,
  initialDeals,
  rhythm = 'default',
  className,
}: ActiveDealsProps) {
  const fullWidth = settingBoolean(settings, 'fullWidth', false);
  const autoplay = settingBoolean(settings, 'autoplay', true);

  return (
    <HomeSection
      rhythm={rhythm}
      // `fullWidth` widens the band past the page container but keeps a gutter —
      // the deal panels are cards, not edge-to-edge artwork.
      bleed={fullWidth}
      contentClassName={fullWidth ? 'px-4 md:px-8' : undefined}
      className={className}
    >
      {(eyebrow || title || subtitle) && (
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
          className={HOME_SECTION_HEADING_GAP}
        />
      )}
      <DealsShowcase
        variant="marketing"
        autoplay={autoplay}
        initialDeals={initialDeals}
      />
    </HomeSection>
  );
}
