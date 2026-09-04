'use client';

import ComboBundleRail from '@/components/combo-bundles/ComboBundleRail';
import { COMBO_LISTING_HREF } from '@/components/combo-bundles/combo-presentation';
import HomeSection from '@/components/home/HomeSection';
import SectionHeading from '@/components/home/SectionHeading';
import ViewAllLink from '@/components/home/ViewAllLink';
import {
  settingBoolean,
  settingNumber,
  settingString,
  type HomepageSectionProps,
} from '@/components/home/section-props';
import { useTranslation } from '@/components/providers/LocalizationProvider';
import { useSectionData } from '@/hooks/use-section-data';
import type { ResolvedComboBundle } from '@/lib/combo-bundles/types';
import { HOME_SECTION_HEADING_GAP } from '@/lib/home/section-spacing';

interface ComboBundlesSectionProps extends HomepageSectionProps {
  /** Live combo/bundle offers, resolved on the server. */
  initialCombos?: ResolvedComboBundle[] | null;
}

/**
 * Homepage band of combo/bundle offers.
 *
 * Reads its heading copy and limit from the Home Sections config like every
 * other slot, so the section can be retitled, reordered and switched off
 * without a code change. Renders nothing when no offer is live — an empty rail
 * under a heading reads as a broken homepage.
 */
export default function ComboBundlesSection({
  eyebrow = 'Bundled',
  title = 'Combos & Bundles',
  subtitle,
  settings,
  initialCombos,
}: ComboBundlesSectionProps = {}) {
  const { t } = useTranslation();
  const limit = settingNumber(settings, 'limit', 8);
  const featuredOnly = settingBoolean(settings, 'featuredOnly', false);
  const ctaText = settingString(settings, 'ctaText', '');
  const ctaLink = settingString(settings, 'ctaLink', COMBO_LISTING_HREF);

  const { data, loading } = useSectionData<ResolvedComboBundle[]>(
    initialCombos,
    async (signal) => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (featuredOnly) params.set('featured', 'true');
      const response = await fetch(`/api/combo-bundles?${params.toString()}`, {
        signal,
      });
      if (!response.ok) throw new Error('request failed');
      const payload = await response.json();
      return payload.comboBundles || [];
    },
    [limit, featuredOnly],
  );

  const combos = (data || []).slice(0, limit);

  if (loading) {
    return (
      <HomeSection className="bg-card" aria-busy>
        <div className="mb-8 h-10 w-64 animate-pulse bg-muted" />
        <div className="flex gap-x-5 overflow-hidden lg:gap-x-7">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className="h-[22rem] w-[72%] shrink-0 animate-pulse bg-muted sm:w-[44%] lg:w-[30%] xl:w-[23%]"
            />
          ))}
        </div>
      </HomeSection>
    );
  }

  if (combos.length === 0) return null;

  return (
    <HomeSection className="bg-card">
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        className={HOME_SECTION_HEADING_GAP}
        action={
          <ViewAllLink
            href={ctaLink || COMBO_LISTING_HREF}
            label={ctaText || t('common.viewAll')}
            ariaLabel={t('common.viewAllOf', { section: title })}
          />
        }
      />

      <ComboBundleRail combos={combos} />
    </HomeSection>
  );
}
