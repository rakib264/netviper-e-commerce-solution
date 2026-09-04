'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import CuratedSectionsAdmin from '@/components/admin/curated-sections/CuratedSectionsAdmin';

export default function CuratedSectionsPage() {
  return (
    <AdminLayout>
      <CuratedSectionsAdmin />
    </AdminLayout>
  );
}
