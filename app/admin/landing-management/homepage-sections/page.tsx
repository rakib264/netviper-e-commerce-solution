'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import HomepageSectionsManager from '@/components/admin/landing/HomepageSectionsManager';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function HomepageSectionsPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <Link
            href="/admin/landing-management"
            className="inline-flex items-center gap-1.5 font-navigation text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Landing management
          </Link>
          <h1 className="mt-3 font-navigation text-2xl font-semibold tracking-tight text-foreground">
            Homepage sections
          </h1>
          <p className="mt-1 font-paragraph text-sm text-muted-foreground">
            Control which blocks appear on the homepage, the order they appear in,
            and the copy above each one.
          </p>
        </div>

        <HomepageSectionsManager />
      </div>
    </AdminLayout>
  );
}
