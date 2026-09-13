'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import ConsignmentBoard from '@/components/admin/courier/ConsignmentBoard';
import { useTranslation } from '@/components/providers/LocalizationProvider';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Settings2 } from 'lucide-react';
import Link from 'next/link';

export default function CourierConsignmentsPage() {
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

        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="typography-section-title text-hierarchy-title">
              {t('admin.courier.consignments.title')}
            </h1>
            <p className="mt-1 typography-caption text-hierarchy-subtitle">
              {t('admin.courier.consignments.subtitle')}
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/courier/integrations">
              <Settings2 className="mr-2 h-3.5 w-3.5" />
              {t('admin.courier.consignments.configure')}
            </Link>
          </Button>
        </header>

        <ConsignmentBoard />
      </div>
    </AdminLayout>
  );
}
