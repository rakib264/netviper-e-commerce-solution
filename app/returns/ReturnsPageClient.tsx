'use client';

import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { useTranslation } from '@/components/providers/LocalizationProvider';
import ReturnPolicySummary from '@/components/returns/ReturnPolicySummary';
import ReturnRequestForm from '@/components/returns/ReturnRequestForm';
import ReturnTracker from '@/components/returns/ReturnTracker';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ReturnPolicyContent } from '@/lib/returns/policy-content';
import { useEffect, useState } from 'react';

type Tab = 'policy' | 'request' | 'track';

/**
 * Returns and exchanges.
 *
 * Three things a customer comes here to do — read the policy, open a request,
 * check on one — as three tabs, in the page shell every other storefront page
 * uses. What this replaced was ~1700 lines built around a full-bleed orange
 * hero, four marketing panels ("Lightning Fast Process", "85% faster"), a
 * four-step illustrated explainer and a closing help band, with the actual form
 * somewhere in the middle. None of that copy helped anyone return a bag.
 */
export default function ReturnsPageClient() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('policy');
  const [policy, setPolicy] = useState<ReturnPolicyContent | null>(null);
  const [submittedReference, setSubmittedReference] = useState('');
  const [trackReference, setTrackReference] = useState('');

  // Deep link from a return notification: `/returns?request=REQ-…` opens the
  // tracker on that request.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('request');
    if (requested) {
      setTrackReference(requested);
      setTab('track');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/returns/policy', { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((payload) => setPolicy(payload.policy))
      .catch((error) => {
        if ((error as Error)?.name !== 'AbortError') setPolicy(null);
      });

    return () => controller.abort();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="luxury-container pb-24 pt-8 md:pb-16 md:pt-12">
        <header className="mb-8 md:mb-10">
          <h1 className="typography-section-title text-hierarchy-title">
            {t('returns.flow.title')}
          </h1>
          <p className="mt-1 typography-caption text-hierarchy-subtitle">
            {t('returns.flow.subtitle')}
          </p>
        </header>

        <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
          <TabsList className="mb-8 h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-border bg-transparent p-0">
            {(['policy', 'request', 'track'] as const).map((value) => (
              <TabsTrigger
                key={value}
                value={value}
                className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 text-muted-foreground shadow-none data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                {t(`returns.flow.tabs.${value}`)}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="policy" className="mt-0">
            <ReturnPolicySummary policy={policy} />
          </TabsContent>

          <TabsContent value="request" className="mt-0">
            {submittedReference ? (
              <div className="max-w-xl space-y-5 rounded-lg border border-border bg-card p-6">
                <div>
                  <h2 className="typography-card-title text-hierarchy-title">
                    {t('returns.flow.submitted.heading')}
                  </h2>
                  <p className="mt-1.5 typography-body text-muted-foreground">
                    {t('returns.flow.submitted.body')}
                  </p>
                </div>

                <div className="rounded-md bg-muted px-4 py-3">
                  <p className="typography-micro text-muted-foreground">
                    {t('returns.flow.submitted.reference')}
                  </p>
                  <p className="mt-0.5 font-mono typography-label text-hierarchy-title">
                    {submittedReference}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => {
                      setTrackReference(submittedReference);
                      setTab('track');
                    }}
                  >
                    {t('returns.flow.submitted.trackNow')}
                  </Button>
                  <Button variant="outline" onClick={() => setSubmittedReference('')}>
                    {t('returns.flow.submitted.newRequest')}
                  </Button>
                </div>
              </div>
            ) : (
              <ReturnRequestForm onSubmitted={setSubmittedReference} />
            )}
          </TabsContent>

          <TabsContent value="track" className="mt-0">
            {/* Keyed on the reference so arriving from the confirmation or a
                notification remounts the tracker with it prefilled. */}
            <ReturnTracker
              key={trackReference || 'blank'}
              initialReference={trackReference}
            />
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
