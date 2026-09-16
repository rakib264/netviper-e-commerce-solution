'use client';

import ComboBundleCard from '@/components/combo-bundles/ComboBundleCard';
import SectionHeading from '@/components/home/SectionHeading';
import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { useTranslation } from '@/components/providers/LocalizationProvider';
import BackButton from '@/components/ui/back-button';
import type { ResolvedComboBundle } from '@/lib/combo-bundles/types';
import { cn } from '@/lib/utils';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Filter = 'all' | 'combo' | 'bundle';

const FILTERS: Array<{ value: Filter; labelKey: string }> = [
  { value: 'all', labelKey: 'combos.filters.all' },
  { value: 'combo', labelKey: 'combos.filters.combos' },
  { value: 'bundle', labelKey: 'combos.filters.bundles' },
];

/**
 * Listing of every live offer.
 *
 * Its own page rather than a section of `/deals`: that page is time-boxed
 * events, and an offer is a permanent catalogue entry with no clock on it. The
 * filter is client-side because the whole live set is small and already loaded
 * — a round trip per tab would be slower than the render.
 */
export default function ComboBundlesListingClient() {
  const { t, tPlural } = useTranslation();
  const [combos, setCombos] = useState<ResolvedComboBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  const load = useCallback(async () => {
    try {
      setFailed(false);
      setLoading(true);
      const response = await fetch('/api/combo-bundles?limit=48', {
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('request failed');
      const data = await response.json();
      setCombos(data.comboBundles || []);
    } catch {
      setFailed(true);
      setCombos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(
    () => ({
      all: combos.length,
      combo: combos.filter((combo) => combo.comboType === 'combo').length,
      bundle: combos.filter((combo) => combo.comboType === 'bundle').length,
    }),
    [combos],
  );

  const visible = useMemo(
    () =>
      filter === 'all'
        ? combos
        : combos.filter((combo) => combo.comboType === filter),
    [combos, filter],
  );

  return (
    <div className="min-h-screen bg-card">
      <Header />

      <main className="mb-20 mt-16 font-paragraph md:mb-0 md:mt-20">
        <div className="luxury-container py-10 md:py-14">
          <BackButton />

          <div className="mt-8 max-w-3xl">
            <SectionHeading
              eyebrow={t('combos.listing.eyebrow')}
              title={t('combos.listing.title')}
              subtitle={t('combos.listing.subtitle')}
              // The page's own heading, so `h1`. It was `h2`, leaving the page
              // with no h1 at all.
              as="h1"
            />
          </div>

          {!loading && !failed && combos.length > 0 ? (
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-border py-4">
              {FILTERS.map((entry) => {
                const count = counts[entry.value];
                const active = filter === entry.value;
                return (
                  <button
                    key={entry.value}
                    type="button"
                    onClick={() => setFilter(entry.value)}
                    aria-pressed={active}
                    disabled={count === 0 && entry.value !== 'all'}
                    className={cn(
                      'font-label text-[0.6875rem] uppercase tracking-[0.16em] transition-colors duration-200',
                      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground',
                      active
                        ? 'text-foreground underline decoration-foreground/40 decoration-1 underline-offset-[6px]'
                        : 'text-muted-foreground hover:text-foreground',
                      count === 0 && entry.value !== 'all' && 'cursor-not-allowed opacity-40',
                    )}
                  >
                    {t(entry.labelKey)}
                    <span className="ml-1.5 text-subtle-foreground">{count}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="luxury-container pb-16 md:pb-24">
          {loading ? (
            <div className="grid grid-cols-2 gap-x-5 gap-y-7 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-7">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
                <div key={index} className="h-[22rem] animate-pulse bg-muted" />
              ))}
            </div>
          ) : failed ? (
            <div className="border border-border bg-muted/40 px-6 py-16 text-center">
              <p className="font-paragraph text-sm text-muted-foreground">
                {t('combos.listing.loadFailed')}
              </p>
              <button
                type="button"
                onClick={load}
                className="mt-4 inline-flex h-11 items-center border border-border bg-card px-6 font-button text-[0.6875rem] uppercase tracking-[0.18em] text-foreground transition-colors duration-300 hover:border-foreground hover:bg-foreground hover:text-background"
              >
                {t('common.tryAgain')}
              </button>
            </div>
          ) : visible.length === 0 ? (
            <div className="border border-border bg-muted/40 px-6 py-16 text-center">
              <p className="font-paragraph text-sm text-muted-foreground">
                {combos.length === 0
                  ? t('combos.listing.empty')
                  : t('combos.listing.emptyFilter')}
              </p>
            </div>
          ) : (
            <>
              <p className="mb-6 font-caption text-xs uppercase tracking-[0.14em] text-muted-foreground">
                {tPlural('combos.listing.offerCount', visible.length)}
              </p>
              <div className="grid grid-cols-2 gap-x-5 gap-y-7 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-7">
                {visible.map((combo, index) => (
                  <ComboBundleCard
                    key={combo._id}
                    combo={combo}
                    priority={index < 4}
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
