'use client';

import { useCurrency } from '@/components/providers/LocalizationProvider';
import { cn } from '@/lib/utils';

interface PriceProps {
  price: number;
  comparePrice?: number;
  className?: string;
  saleClassName?: string;
  regularClassName?: string;
}

export function ShowcasePrice({
  price,
  comparePrice,
  className,
  saleClassName = 'text-destructive',
  regularClassName = 'text-foreground',
}: PriceProps) {
  const { formatPrice } = useCurrency();
  const onSale =
    typeof comparePrice === 'number' && comparePrice > price && price > 0;

  return (
    <div className={cn('flex flex-wrap items-baseline gap-2', className)}>
      {onSale ? (
        <>
          <span className={cn('font-price tabular-nums', saleClassName)}>
            {formatPrice(price)}
          </span>
          <span
            className={cn(
              'font-caption text-subtle-foreground line-through tabular-nums',
              regularClassName === 'text-foreground' ? '' : regularClassName
            )}
          >
            {formatPrice(comparePrice)}
          </span>
        </>
      ) : (
        <span className={cn('font-price tabular-nums', regularClassName)}>
          {formatPrice(price)}
        </span>
      )}
    </div>
  );
}
