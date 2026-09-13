'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import ConsignmentBoard from '@/components/admin/courier/ConsignmentBoard';
import CourierIntegrationsPanel from '@/components/admin/courier/CourierIntegrationsPanel';
import CourierOperationsSettings from '@/components/admin/courier/CourierOperationsSettings';
import CourierRecordsTable from '@/components/admin/courier/CourierRecordsTable';
import { useTranslation } from '@/components/providers/LocalizationProvider';
import { cn } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback } from 'react';

/**
 * Courier, as one screen.
 *
 * It was three: `/admin/courier` (a 2034-line record table),
 * `/admin/courier/consignments` (the dispatch desk) and
 * `/admin/courier/integrations` (the credentials) — three sidebar entries and
 * two of them listing the same collection through the same endpoint. One page,
 * three tabs, and only the active tab fetches: opening this costs one request
 * rather than three.
 *
 * The tab lives in the query string so a link can point at one, and so the two
 * retired routes can redirect into the right place.
 */

const TABS = ['consignments', 'records', 'settings'] as const;
type Tab = (typeof TABS)[number];

function CourierWorkspace() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useSearchParams();

  const requested = params.get('tab');
  const tab: Tab = (TABS as readonly string[]).includes(requested ?? '')
    ? (requested as Tab)
    : 'consignments';

  const select = useCallback(
    (next: Tab) => {
      // `replace`, not `push`: switching tabs is not a place in history a back
      // button should have to walk out of.
      router.replace(next === 'consignments' ? '/admin/courier' : `/admin/courier?tab=${next}`, {
        scroll: false,
      });
    },
    [router],
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="typography-section-title text-hierarchy-title">
          {t('admin.courier.workspace.title')}
        </h1>
        <p className="mt-1 typography-caption text-hierarchy-subtitle">
          {t('admin.courier.workspace.subtitle')}
        </p>
      </header>

      <div className="flex flex-wrap gap-1 border-b border-border" role="tablist">
        {TABS.map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={value === tab}
            onClick={() => select(value)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 font-navigation typography-caption transition-colors',
              value === tab
                ? 'border-primary text-hierarchy-title'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t(`admin.courier.workspace.tabs.${value}`)}
          </button>
        ))}
      </div>

      {/* Only the active tab mounts, so its data is the only data fetched. */}
      {tab === 'consignments' && <ConsignmentBoard />}
      {tab === 'records' && <CourierRecordsTable />}
      {tab === 'settings' && (
        <div className="space-y-8">
          <CourierOperationsSettings />
          <CourierIntegrationsPanel />
        </div>
      )}
    </div>
  );
}

export default function CourierPage() {
  return (
    <AdminLayout>
      {/* `useSearchParams` needs a Suspense boundary to stay statically analysable. */}
      <Suspense fallback={null}>
        <CourierWorkspace />
      </Suspense>
    </AdminLayout>
  );
}
