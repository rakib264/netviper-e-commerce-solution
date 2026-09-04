'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import { useTranslation } from '@/components/providers/LocalizationProvider';
import AdvertisementsPanel from '@/components/admin/advertisements/AdvertisementsPanel';
import DealsPanel from '@/components/admin/deals/DealsPanel';
import ComboBundlesPanel from '@/components/admin/combo-bundles/ComboBundlesPanel';
import QuickDealsPanel from '@/components/admin/events/QuickDealsPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarClock, ImageIcon, Layers, Megaphone, Tag } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';

const TABS = ['deals', 'quick-deals', 'combos', 'advertisement'] as const;
type MarketingTab = (typeof TABS)[number];

/**
 * Marketing & Deals — the rules engine behind every reward, the time-boxed
 * Quick Deals events, plus the promotional advertisement bands. The active tab
 * lives in the query string so `/admin/marketing?tab=advertisement` is linkable
 * from Home Sections and from the old standalone advertisement and events
 * routes, both of which now redirect here.
 */
function AdminMarketingContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const requested = searchParams.get('tab');
  const fromUrl: MarketingTab = TABS.includes(requested as MarketingTab)
    ? (requested as MarketingTab)
    : 'deals';

  // Local state leads and the URL follows. Deriving the active tab straight
  // from `useSearchParams` makes the tab unable to move until the router
  // commits, which reads as an unresponsive click.
  const [activeTab, setActiveTab] = useState<MarketingTab>(fromUrl);

  // Keep up with browser back/forward, which changes the URL without a click.
  useEffect(() => {
    setActiveTab((current) => (current === fromUrl ? current : fromUrl));
  }, [fromUrl]);

  const handleTabChange = useCallback(
    (value: string) => {
      setActiveTab(value as MarketingTab);
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', value);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <span className="mt-1 flex h-9 w-9 items-center justify-center bg-primary-50 text-primary-700">
          <Megaphone className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {t('admin.marketing.page.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('admin.marketing.page.subtitle')}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="deals" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            {t('admin.marketing.tabs.deals')}
          </TabsTrigger>
          <TabsTrigger value="quick-deals" className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            {t('admin.marketing.quickDeals.tab')}
          </TabsTrigger>
          <TabsTrigger value="combos" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            {t('admin.marketing.combos.tab')}
          </TabsTrigger>
          <TabsTrigger value="advertisement" className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            {t('admin.marketing.tabs.advertisement')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="deals">
          <DealsPanel />
        </TabsContent>

        <TabsContent value="quick-deals">
          <QuickDealsPanel />
        </TabsContent>

        <TabsContent value="combos">
          <ComboBundlesPanel />
        </TabsContent>

        <TabsContent value="advertisement">
          <AdvertisementsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AdminMarketingPage() {
  return (
    <AdminLayout>
      {/* useSearchParams needs a boundary in the App Router. */}
      <Suspense fallback={null}>
        <AdminMarketingContent />
      </Suspense>
    </AdminLayout>
  );
}
