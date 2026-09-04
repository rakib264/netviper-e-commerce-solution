'use client';

import ProductCardRegular, { type Product } from '@/components/ui/product-card-regular';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from '@/components/providers/LocalizationProvider';

interface ProductRailProps {
  title: string;
  eyebrow?: string;
  products: Product[];
  className?: string;
  id?: string;
}

/**
 * Horizontally scrollable product rail with edge arrows and no visible
 * scrollbar, used for "You May Also Like" and "Recently Viewed".
 */
export default function ProductRail({
  title,
  eyebrow,
  products,
  className = '',
  id,
}: ProductRailProps) {
  const { t } = useTranslation();
  const railRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const updateEdges = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setEdges({
      left: el.scrollLeft > 2,
      right: el.scrollLeft < maxScroll - 2,
    });
  }, []);

  useEffect(() => {
    updateEdges();
    const el = railRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateEdges);
    observer.observe(el);
    return () => observer.disconnect();
  }, [products, updateEdges]);

  const scrollByPage = (direction: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  if (!products.length) return null;

  return (
    <section id={id} className={`border-t border-border pt-12 ${className}`}>
      <div className="mb-8 text-center">
        {eyebrow ? <p className="luxury-eyebrow">{eyebrow}</p> : null}
        <h2 className="mt-2 font-heading text-2xl tracking-tight text-foreground md:text-3xl">
          {title}
        </h2>
      </div>

      <div className="relative">
        {edges.left ? (
          <button
            type="button"
            onClick={() => scrollByPage(-1)}
            aria-label={t('products.productRail.scrollLeft')}
            className="absolute -left-2 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center border border-border bg-card/95 text-foreground shadow-sm transition hover:bg-muted md:flex"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={1.25} />
          </button>
        ) : null}

        <div
          ref={railRef}
          onScroll={updateEdges}
          className="scrollbar-hide flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-2"
        >
          {products.map((product) => (
            <div
              key={product._id}
              className="w-[46%] min-w-[160px] shrink-0 snap-start sm:w-[30%] lg:w-[23%]"
            >
              <ProductCardRegular product={product} />
            </div>
          ))}
        </div>

        {edges.right ? (
          <button
            type="button"
            onClick={() => scrollByPage(1)}
            aria-label={t('products.productRail.scrollRight')}
            className="absolute -right-2 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center border border-border bg-card/95 text-foreground shadow-sm transition hover:bg-muted md:flex"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={1.25} />
          </button>
        ) : null}
      </div>
    </section>
  );
}
