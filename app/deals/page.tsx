'use client';

import EventPreview from '@/components/events/EventPreview';
import SectionHeading from '@/components/home/SectionHeading';
import Newsletter from '@/components/home/Newsletter';
import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { useTranslation } from '@/components/providers/LocalizationProvider';
import BackButton from '@/components/ui/back-button';
import type { ProductCardProduct } from '@/components/ui/product-card-model';
import { useCallback, useEffect, useState } from 'react';

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
  showInLanding?: boolean;
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
  createdAt: string;
}

/** One measured line of context under the page title, instead of a stat band. */
function DealsSummary({
  active,
  upcoming,
  products,
}: {
  active: number;
  upcoming: number;
  products: number;
}) {
  const { t, tPlural } = useTranslation();

  const facts = [
    tPlural('deals.summary.running', active),
    tPlural('deals.summary.upcoming', upcoming),
    tPlural('deals.summary.products', products),
  ];

  return (
    <dl className="flex flex-wrap items-center gap-x-3 gap-y-1 border-y border-border py-4">
      {facts.map((fact, index) => (
        <div key={fact} className="flex items-center gap-3">
          {index > 0 ? (
            <span aria-hidden="true" className="text-border">
              /
            </span>
          ) : null}
          <dd className="font-caption text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {fact}
          </dd>
        </div>
      ))}
      <span className="sr-only">{t('deals.summary.label')}</span>
    </dl>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="border border-border bg-muted/40 px-6 py-16 text-center">
      <p className="font-paragraph text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function EventGroup({
  title,
  count,
  events,
  emptyMessage,
}: {
  title: string;
  count: string;
  events: Event[];
  emptyMessage: string;
}) {
  return (
    <section>
      <div className="mb-8 flex items-end justify-between gap-4 border-b border-border pb-3">
        <h2 className="font-navigation text-xl font-semibold text-foreground sm:text-2xl">
          {title}
        </h2>
        <p className="font-caption text-xs uppercase tracking-[0.14em] text-muted-foreground">
          {count}
        </p>
      </div>

      {events.length > 0 ? (
        <div className="space-y-16 lg:space-y-24">
          {events.map((event) => (
            <EventPreview key={event._id} event={event} />
          ))}
        </div>
      ) : (
        <EmptyState message={emptyMessage} />
      )}
    </section>
  );
}

export default function DealsPage() {
  const { t, tPlural } = useTranslation();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const fetchEvents = useCallback(async () => {
    try {
      setFailed(false);
      setLoading(true);
      const response = await fetch('/api/events?limit=20');
      if (!response.ok) throw new Error('request failed');
      const data = await response.json();
      setEvents(data.events || []);
    } catch {
      setFailed(true);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const activeEvents = events.filter((event) => event.status === 'active');
  const upcomingEvents = events.filter((event) => event.status === 'upcoming');
  const totalProducts = events.reduce(
    (sum, event) => sum + (event.productsCount || 0),
    0,
  );

  return (
    <div className="min-h-screen bg-card">
      <Header />

      <main className="mb-20 mt-16 font-paragraph md:mb-0 md:mt-20">
        <div className="luxury-container py-10 md:py-14">
          <BackButton />

          <div className="mt-8 max-w-3xl">
            <SectionHeading
              eyebrow={t('deals.eyebrow')}
              title={t('deals.title')}
              subtitle={t('deals.subtitle')}
              as="h2"
            />
          </div>

          {!loading && !failed ? (
            <div className="mt-8">
              <DealsSummary
                active={activeEvents.length}
                upcoming={upcomingEvents.length}
                products={totalProducts}
              />
            </div>
          ) : null}
        </div>

        <div className="luxury-container pb-16 md:pb-24">
          {loading ? (
            <div className="space-y-10">
              <div className="h-[20rem] animate-pulse bg-muted" />
              <div className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className="aspect-square animate-pulse bg-muted"
                  />
                ))}
              </div>
            </div>
          ) : failed ? (
            <div className="border border-border bg-muted/40 px-6 py-16 text-center">
              <p className="font-paragraph text-sm text-muted-foreground">
                {t('deals.messages.failedToLoadEvents')}
              </p>
              <button
                type="button"
                onClick={fetchEvents}
                className="mt-4 inline-flex h-11 items-center border border-border bg-card px-6 font-button text-[0.6875rem] uppercase tracking-[0.18em] text-foreground transition-colors duration-300 hover:border-foreground hover:bg-foreground hover:text-background"
              >
                {t('common.tryAgain')}
              </button>
            </div>
          ) : events.length === 0 ? (
            <EmptyState message={t('deals.noEventsAvailable')} />
          ) : (
            <div className="space-y-20 lg:space-y-28">
              <EventGroup
                title={t('deals.activeEvents2')}
                count={tPlural('deals.summary.running', activeEvents.length)}
                events={activeEvents}
                emptyMessage={t('deals.noActiveEventsAtTheMoment')}
              />

              <EventGroup
                title={t('deals.upcomingEvents')}
                count={tPlural('deals.summary.upcoming', upcomingEvents.length)}
                events={upcomingEvents}
                emptyMessage={t('deals.noUpcomingEventsScheduledStayTuned')}
              />
            </div>
          )}
        </div>

        {/*
          The real signup form, rather than the decorative "Subscribe Now"
          button that used to sit here and do nothing when pressed.
        */}
        <Newsletter
          eyebrow={t('deals.newsletter.eyebrow')}
          title={t('deals.newsletter.title')}
          subtitle={t('deals.newsletter.subtitle')}
        />
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
