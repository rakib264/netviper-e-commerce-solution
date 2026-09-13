'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import CourierIntegrationsPanel from '@/components/admin/courier/CourierIntegrationsPanel';
import { useTranslation } from '@/components/providers/LocalizationProvider';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function CourierIntegrationsPage() {
  const { t } = useTranslation();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <Link
            href="/admin/courier"
            className="inline-flex items-center text-sm font-navigation text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t('admin.courier.backToCourier')}
          </Link>
        </div>

        <header>
          <h1 className="typography-section-title text-hierarchy-title">
            {t('admin.courier.integrations.title')}
          </h1>
          <p className="mt-1 typography-caption text-hierarchy-subtitle">
            {t('admin.courier.integrations.subtitle')}
          </p>
        </header>

        <CourierIntegrationsPanel />
      </div>
    </AdminLayout>
  );
}
