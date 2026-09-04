'use client';

import ComboAddToCartButton from '@/components/combo-bundles/ComboAddToCartButton';
import {
  COMBO_LISTING_HREF,
  comboItemsHeadingKey,
  comboTypeKey,
  showsSavings,
} from '@/components/combo-bundles/combo-presentation';
import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import {
  useCurrency,
  useTranslation,
} from '@/components/providers/LocalizationProvider';
import type { ResolvedComboBundle } from '@/lib/combo-bundles/types';
import type { RootState } from '@/lib/store/store';
import { cn } from '@/lib/utils';
import { ChevronRight, Minus, Plus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

/**
 * Combo/bundle detail.
 *
 * The page answers three questions in order: what is in it, what does it cost
 * against buying the pieces separately, and can I have it — so the composition
 * table sits above the price block's CTA rather than below the fold. Its own
 * data is refetched client-side (the server half owns metadata and JSON-LD),
 * which is the pattern the product and category pages already use.
 */
export default function ComboBundlePageClient({ slug }: { slug: string }) {
  const { t, tPlural } = useTranslation();
  const { formatPrice } = useCurrency();

  const [combo, setCombo] = useState<ResolvedComboBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const cartLine = useSelector((state: RootState) =>
    state.cart.items.find(
      (item) => item.itemType === 'combo_bundle' && item.comboBundleId === combo?._id,
    ),
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch(
          `/api/combo-bundles/${encodeURIComponent(slug)}`,
          { cache: 'no-store' },
        );
        if (response.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (!response.ok) throw new Error('request failed');
        const data = await response.json();
        if (!cancelled) setCombo(data.comboBundle || null);
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  /* Follow the cart: reopening the page with the offer already in it shows
     the quantity that is actually in the cart, not a fresh 1. */
  useEffect(() => {
    if (cartLine) setQuantity(cartLine.quantity);
  }, [cartLine]);

  if (loading) {
    return (
      <div className="min-h-screen bg-card">
        <Header />
        <main className="luxury-container mb-20 mt-16 py-12 md:mb-0 md:mt-20">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
            <div className="aspect-square animate-pulse bg-muted" />
            <div className="space-y-4">
              <div className="h-8 w-2/3 animate-pulse bg-muted" />
              <div className="h-5 w-1/3 animate-pulse bg-muted" />
              <div className="h-40 animate-pulse bg-muted" />
              <div className="h-12 animate-pulse bg-muted" />
            </div>
          </div>
        </main>
        <Footer />
        <MobileBottomNav />
      </div>
    );
  }

  if (notFound || !combo) {
    return (
      <div className="min-h-screen bg-card">
        <Header />
        <main className="luxury-container mb-20 mt-16 py-24 text-center md:mb-0 md:mt-20">
          <h1 className="font-navigation text-2xl font-semibold text-foreground">
            {t('combos.detail.notFoundTitle')}
          </h1>
          <p className="mt-3 font-paragraph text-sm text-muted-foreground">
            {t('combos.detail.notFoundBody')}
          </p>
          <Link
            href={COMBO_LISTING_HREF}
            className="mt-6 inline-flex h-11 items-center border border-border bg-card px-6 font-button text-[0.6875rem] uppercase tracking-[0.18em] text-foreground transition-colors duration-300 hover:border-foreground hover:bg-foreground hover:text-background"
          >
            {t('combos.detail.backToListing')}
          </Link>
        </main>
        <Footer />
        <MobileBottomNav />
      </div>
    );
  }

  const images = combo.images.length ? combo.images : [''];
  const image = images[Math.min(activeImage, images.length - 1)];
  const savings = showsSavings(combo);
  const atMax = quantity >= combo.maxUnits;

  return (
    <div className="min-h-screen bg-card">
      <Header />

      <main className="mb-20 mt-16 font-paragraph md:mb-0 md:mt-20">
        <div className="luxury-container py-8 md:py-12">
          <nav
            aria-label={t('combos.detail.breadcrumb')}
            className="flex flex-wrap items-center gap-1.5 font-caption text-xs text-muted-foreground"
          >
            <Link href="/" className="transition-colors hover:text-foreground">
              {t('combos.detail.home')}
            </Link>
            <ChevronRight className="h-3 w-3 text-border" aria-hidden="true" />
            <Link
              href={COMBO_LISTING_HREF}
              className="transition-colors hover:text-foreground"
            >
              {t('combos.listing.title')}
            </Link>
            <ChevronRight className="h-3 w-3 text-border" aria-hidden="true" />
            <span className="text-foreground">{combo.name}</span>
          </nav>

          <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-14">
            {/* Gallery */}
            <div>
              <div className="relative aspect-square overflow-hidden border border-border bg-muted">
                {image ? (
                  <Image
                    src={image}
                    alt={combo.name}
                    fill
                    sizes="(max-width: 1024px) 100vw, 45vw"
                    priority
                    className="object-contain p-8"
                  />
                ) : null}

                <span className="absolute left-0 top-4 bg-foreground px-3 py-1.5 font-label text-[10px] uppercase tracking-[0.18em] text-background">
                  {combo.badgeText || t(comboTypeKey(combo.comboType))}
                </span>
              </div>

              {images.length > 1 ? (
                <ul className="mt-4 flex flex-wrap gap-3">
                  {images.map((thumbnail, index) => (
                    <li key={`${thumbnail}-${index}`}>
                      <button
                        type="button"
                        onClick={() => setActiveImage(index)}
                        aria-label={t('combos.detail.viewImage', { index: index + 1 })}
                        aria-current={index === activeImage}
                        className={cn(
                          'relative h-20 w-20 overflow-hidden border bg-muted transition-colors',
                          index === activeImage
                            ? 'border-foreground'
                            : 'border-border hover:border-foreground/40',
                        )}
                      >
                        {thumbnail ? (
                          <Image
                            src={thumbnail}
                            alt=""
                            fill
                            sizes="80px"
                            className="object-contain p-2"
                          />
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            {/* Detail */}
            <div>
              <p className="font-label text-[0.625rem] uppercase tracking-[0.22em] text-muted-foreground">
                {tPlural('combos.pieceCount', combo.componentCount)}
              </p>

              <h1 className="mt-3 font-navigation text-3xl font-semibold leading-[1.1] tracking-[-0.01em] text-foreground md:text-4xl">
                {combo.name}
              </h1>

              <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-2">
                <span className="font-price text-2xl text-foreground">
                  {formatPrice(combo.price)}
                </span>
                {savings ? (
                  <>
                    <span className="font-caption text-sm text-subtle-foreground line-through">
                      {formatPrice(combo.compareAtPrice)}
                    </span>
                    <span className="border border-foreground/20 px-2 py-0.5 font-label text-[10px] uppercase tracking-[0.14em] text-foreground">
                      {t('combos.saveAmountAndPercent', {
                        amount: formatPrice(combo.savings),
                        percent: combo.savingsPercent,
                      })}
                    </span>
                  </>
                ) : null}
              </div>

              {combo.description ? (
                <p className="mt-5 max-w-xl font-paragraph text-sm leading-relaxed text-muted-foreground">
                  {combo.description}
                </p>
              ) : null}

              {/* Composition */}
              <section className="mt-8">
                <h2 className="font-navigation text-base font-semibold text-foreground">
                  {t(comboItemsHeadingKey(combo.comboType))}
                </h2>

                <div className="mt-3 overflow-x-auto border border-border">
                  <table className="w-full border-collapse text-left">
                    <caption className="sr-only">
                      {t(comboItemsHeadingKey(combo.comboType))}
                    </caption>
                    <thead>
                      <tr className="border-b border-border bg-muted/60">
                        <th
                          scope="col"
                          className="w-12 px-3 py-2.5 font-label text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
                        >
                          {t('combos.table.index')}
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-2.5 font-label text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
                        >
                          {t('combos.table.product')}
                        </th>
                        <th
                          scope="col"
                          className="w-20 px-3 py-2.5 text-right font-label text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
                        >
                          {t('combos.table.qty')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {combo.components.map((component, index) => (
                        <tr
                          key={`${component.productId}-${component.variantId ?? ''}`}
                          className="border-b border-border last:border-b-0"
                        >
                          <td className="px-3 py-3 font-price text-xs text-subtle-foreground">
                            {index + 1}
                          </td>
                          <td className="px-3 py-3">
                            {component.slug ? (
                              <Link
                                href={`/products/${component.slug}`}
                                className="font-title text-sm text-foreground transition-colors hover:text-muted-foreground"
                              >
                                {component.name}
                              </Link>
                            ) : (
                              <span className="font-title text-sm text-foreground">
                                {component.name || t('combos.table.unavailable')}
                              </span>
                            )}
                            {component.variantLabel ? (
                              <span className="ml-2 font-caption text-xs text-muted-foreground">
                                {component.variantLabel}
                              </span>
                            ) : null}
                            {component.maxCombos < 1 ? (
                              <span className="ml-2 font-label text-[10px] uppercase tracking-[0.14em] text-destructive-600">
                                {t('combos.soldOut')}
                              </span>
                            ) : null}
                          </td>
                          <td className="px-3 py-3 text-right font-price text-sm text-foreground">
                            {component.qty}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Buy box */}
              <div className="mt-8 border border-border p-5">
                {combo.inStock ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <span className="font-label text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground">
                        {t('combos.quantity')}
                      </span>
                      <div className="inline-flex items-center border border-border">
                        <button
                          type="button"
                          onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                          disabled={quantity <= 1}
                          aria-label={t('combos.decreaseQuantity')}
                          className="flex h-10 w-10 items-center justify-center text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:text-subtle-foreground"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-10 px-2 text-center font-price text-sm text-foreground">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setQuantity((current) => Math.min(combo.maxUnits, current + 1))
                          }
                          disabled={atMax}
                          aria-label={t('combos.increaseQuantity')}
                          className="flex h-10 w-10 items-center justify-center text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:text-subtle-foreground"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {combo.maxUnits <= 5 ? (
                      <p className="mt-3 font-caption text-xs text-muted-foreground">
                        {tPlural('combos.unitsLeft', combo.maxUnits)}
                      </p>
                    ) : null}

                    <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-border pt-4">
                      <span className="font-label text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground">
                        {t('combos.total')}
                      </span>
                      <span className="font-price text-lg text-foreground">
                        {formatPrice(combo.price * quantity)}
                      </span>
                    </div>

                    <ComboAddToCartButton
                      combo={combo}
                      quantity={quantity}
                      className="mt-4"
                    />

                    {cartLine ? (
                      <p className="mt-3 text-center font-caption text-xs text-muted-foreground">
                        {tPlural('combos.inCart', cartLine.quantity)}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <>
                    <p className="font-label text-[0.6875rem] uppercase tracking-[0.16em] text-foreground">
                      {t('combos.soldOut')}
                    </p>
                    <p className="mt-2 font-paragraph text-sm text-muted-foreground">
                      {combo.unavailableComponents.length
                        ? t('combos.soldOutBecause', {
                            products: combo.unavailableComponents.join(', '),
                          })
                        : t('combos.soldOutBody')}
                    </p>
                    <Link
                      href={COMBO_LISTING_HREF}
                      className="mt-4 inline-flex h-11 items-center border border-border bg-card px-6 font-button text-[0.6875rem] uppercase tracking-[0.18em] text-foreground transition-colors duration-300 hover:border-foreground hover:bg-foreground hover:text-background"
                    >
                      {t('combos.detail.backToListing')}
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
