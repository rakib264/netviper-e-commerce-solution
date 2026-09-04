'use client';

import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/components/providers/LocalizationProvider';
import Link from 'next/link';

/**
 * Branded 404 for an unknown category slug. Living in this segment means
 * `notFound()` in `page.tsx` returns a real 404 status without falling back to
 * the framework's unstyled default.
 */
export default function CategoryNotFound() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background font-paragraph">
      <Header />

      <main className="luxury-container mb-20 flex flex-col items-start py-20 md:py-28 lg:mb-0">
        <p className="luxury-eyebrow">404</p>
        <h1 className="mt-3 font-navigation text-3xl font-semibold text-foreground md:text-4xl">
          {t('categories.detail.notFound.title')}
        </h1>
        <p className="mt-4 max-w-xl font-paragraph text-sm leading-relaxed text-muted-foreground md:text-base">
          {t('categories.detail.notFound.description')}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="rounded-sm">
            <Link href="/categories">{t('categories.detail.notFound.browseCategories')}</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-sm">
            <Link href="/products">{t('categories.detail.notFound.browseProducts')}</Link>
          </Button>
        </div>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
