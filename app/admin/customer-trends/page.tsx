'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import GeoRetargetingCenter from '@/components/admin/customer-trends/GeoRetargetingCenter';

export default function CustomerTrendsPage() {
  return (
    <AdminLayout>
      <div className="p-6">
        <GeoRetargetingCenter />
      </div>
    </AdminLayout>
  );
}
