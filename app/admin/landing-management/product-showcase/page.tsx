'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import ProductShowcaseAdmin from '@/components/admin/product-showcase/ProductShowcaseAdmin';

export default function ProductShowcaseAdminPage() {
  return (
    <AdminLayout>
      <ProductShowcaseAdmin />
    </AdminLayout>
  );
}
