'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import HeroCarouselAdmin from '@/components/admin/hero-carousel/HeroCarouselAdmin';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function HeroCarouselAdminPage() {
  return (
    <AdminLayout>
      <div className="mb-4">
        <Link
          href="/admin/landing-management"
          className="inline-flex items-center text-sm font-navigation text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Landing management
        </Link>
      </div>
      <HeroCarouselAdmin />
    </AdminLayout>
  );
}
