'use client';

import StarRating from '@/components/products/StarRating';
import {
  isMongoId,
  type HeroSlideProduct,
} from '@/lib/hero-carousel/types';
import { addToCart } from '@/lib/store/slices/cartSlice';
import { cn, formatEuroCurrency } from '@/lib/utils';
import { showErrorToast } from '@/lib/utils/toast-notifications';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useTranslation } from '@/components/providers/LocalizationProvider';

interface ProductCardProps {
  product: HeroSlideProduct;
  variant?: 'desktop' | 'mobile';
  className?: string;
}

export default function ProductCard({
  product,
  className,
}: ProductCardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useDispatch();
  const [adding, setAdding] = useState(false);

  const image = product.productImage || '';
  const name = product.productName || 'Featured product';
  const rating = typeof product.rating === 'number' ? product.rating : 5;
  const price = typeof product.price === 'number' ? product.price : 0;
  const compare =
    typeof product.comparePrice === 'number' && product.comparePrice > price
      ? product.comparePrice
      : 0;
  const href = product.productSlug
    ? `/products/${product.productSlug}`
    : '/products';
  const canAdd = isMongoId(product.productId);

  const handleView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(href);
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canAdd || !product.productId) {
      showErrorToast({
        title: t('home.heroCarousel.productCard.cannotAddToCart'),
        description: t('home.heroCarousel.productCard.selectACatalogProductSoThis'),
      });
      return;
    }
    setAdding(true);
    try {
      dispatch(
        addToCart({
          id: product.productId,
          name,
          price: price || 0,
          image: image || '/placeholder-product.jpg',
          quantity: 1,
          maxQuantity: 999,
        })
      );
    } catch {
      showErrorToast({
        title: t('home.heroCarousel.productCard.couldNotAdd'),
        description: t('home.heroCarousel.productCard.pleaseTryAgain'),
      });
    } finally {
      setAdding(false);
    }
  };

  return (
    <div
      className={cn(
        'flex w-full overflow-hidden bg-card shadow-[0_10px_32px_rgba(0,0,0,0.28)]',
        className
      )}
    >
      <div className="relative h-[88px] w-[80px] shrink-0 bg-accent sm:h-[110px] sm:w-[100px] lg:h-[120px] lg:w-[110px]">
        {image ? (
          <Image
            src={image}
            alt={name}
            fill
            className="object-cover"
            sizes="110px"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-1 text-center text-[8px] font-label uppercase tracking-wide text-subtle-foreground">
            {t('home.heroCarousel.productCard.noImage')}
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-1.5 px-2.5 py-2 sm:gap-2 sm:px-3.5 sm:py-2.5">
        <div className="min-w-0">
          <p className="truncate font-navigation text-[12px] font-semibold leading-snug tracking-tight text-foreground sm:text-[13px]">
            {name}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {price > 0 ? (
              <span className="font-price text-[12px] font-semibold tabular-nums text-foreground sm:text-[13px]">
                {formatEuroCurrency(price)}
              </span>
            ) : null}
            {compare > 0 ? (
              <span className="font-caption text-[10px] tabular-nums text-subtle-foreground line-through sm:text-[11px]">
                {formatEuroCurrency(compare)}
              </span>
            ) : null}
            <StarRating value={rating} size={9} precise className="sm:hidden" />
            <StarRating
              value={rating}
              size={10}
              precise
              className="hidden sm:inline-flex"
            />
          </div>
        </div>

        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={handleView}
            className="min-w-0 flex-1 border border-foreground/25 bg-transparent px-2 py-1.5 font-button text-[9px] font-semibold uppercase tracking-[0.14em] text-foreground transition-colors active:bg-primary active:text-primary-foreground sm:tracking-[0.16em]"
          >
            {t('home.heroCarousel.productCard.view')}
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!canAdd || adding}
            className="flex min-w-0 flex-1 items-center justify-center gap-1 bg-primary px-2 py-1.5 font-button text-[9px] font-semibold uppercase tracking-[0.14em] text-white transition-opacity active:opacity-80 disabled:cursor-not-allowed disabled:opacity-35 sm:tracking-[0.16em]"
          >
            {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            {t('home.heroCarousel.productCard.add')}
          </button>
        </div>
      </div>
    </div>
  );
}
