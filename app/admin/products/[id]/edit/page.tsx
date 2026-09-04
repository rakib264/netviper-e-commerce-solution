'use client';

import ProductForm from '@/components/admin/products/ProductForm';
import AdminLayout from '@/components/admin/AdminLayout';
import { AdminDetailPageSkeleton } from '@/components/admin/ui/loading';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/admin/products/${params.id}`);
        if (!res.ok) {
          setError('Product not found');
          return;
        }
        setProduct(await res.json());
      } catch {
        setError('Failed to load product');
    } finally {
      setLoading(false);
    }
  };
    if (params.id) load();
  }, [params.id]);

  if (loading) {
    return (
      <AdminLayout>
        <AdminDetailPageSkeleton />
      </AdminLayout>
    );
  }

  if (error || !product) {
    return (
      <AdminLayout>
        <p className="p-6 text-destructive-600">{error || 'Product not found'}</p>
      </AdminLayout>
    );
  }

  return (
    <ProductForm mode="edit" productId={params.id} initialProduct={product} />
  );
}
