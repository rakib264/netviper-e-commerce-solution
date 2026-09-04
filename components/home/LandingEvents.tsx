'use client';

import EventPreview from '@/components/events/EventPreview';
import HomeSection from '@/components/home/HomeSection';
import SectionHeading from '@/components/home/SectionHeading';
import ViewAllLink from '@/components/home/ViewAllLink';
import {
  settingNumber,
  type HomepageSectionProps,
} from '@/components/home/section-props';
import { useTranslation } from '@/components/providers/LocalizationProvider';
import type { ProductCardProduct } from '@/components/ui/product-card-model';
import { useSectionData } from '@/hooks/use-section-data';
import { HOME_SECTION_HEADING_GAP } from '@/lib/home/section-spacing';


interface Event {
  _id: string;
  title: string;
  subtitle?: string;
  bannerImage?: string;
  discountText: string;
  layoutType?: 'horizontal' | 'vertical';
  cta?: {
    label: string;
    url: string;
    openInNewTab: boolean;
  };
  startDate: string;
  endDate: string;
  products: Array<
    {
      _id: string;
      name: string;
      slug: string;
      price: number;
      comparePrice?: number;
      thumbnailImage?: string;
      averageRating?: number;
      totalReviews?: number;
      quantity?: number;
    } & Pick<ProductCardProduct, 'images' | 'variants'>
  >;
  productsCount: number;
  isActive: boolean;
  status: 'active' | 'upcoming' | 'expired' | 'inactive';
  showInLanding: boolean;
}

interface LandingEventsProps extends HomepageSectionProps {
  /** Live landing events with their products, resolved on the server. */
  initialEvents?: unknown[] | null;
}

export default function LandingEvents({
  eyebrow = 'Limited time',
  title = 'Special Events & Deals',
  subtitle,
  settings,
  initialEvents,
}: LandingEventsProps = {}) {
  const { t } = useTranslation();
  const limit = settingNumber(settings, 'limit', 4);

  const { data, loading } = useSectionData<Event[]>(
    initialEvents as Event[] | null | undefined,
    async (signal) => {
      const response = await fetch('/api/events/landing', { signal });
      if (!response.ok) throw new Error('request failed');
      const payload = await response.json();
      return payload.events || [];
    },
    [],
  );

  const events = (data || []).slice(0, limit);

  if (loading) {
    return (
      <HomeSection className="bg-card" aria-busy>
        <div className="mb-8 h-10 w-72 animate-pulse bg-muted" />
        <div className="h-[20rem] animate-pulse bg-muted" />
        <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="aspect-square animate-pulse bg-muted" />
          ))}
        </div>
      </HomeSection>
    );
  }

  // Nothing live means nothing to show: an empty band with a heading over it
  // reads as a broken section on a storefront homepage.
  if (events.length === 0) return null;

  return (
    <HomeSection className="bg-card">
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        className={HOME_SECTION_HEADING_GAP}
        action={
          <ViewAllLink
            href="/deals"
            label={t('common.viewAll')}
            ariaLabel={t('common.viewAllOf', { section: title })}
          />
        }
      />

      <div className="space-y-16 lg:space-y-24">
        {events.map((event) => (
          <EventPreview key={event._id} event={event} />
        ))}
      </div>
    </HomeSection>
  );
}
