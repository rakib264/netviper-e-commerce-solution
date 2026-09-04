'use client';

import { REWARD_TYPE_META } from '@/components/admin/deals/constants';
import type { DealFormValues } from '@/components/admin/deals/types';
import { useCurrency } from '@/components/providers/LocalizationProvider';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { recalculateCart } from '@/lib/deals/engine';
import type { CartLine, DealDefinition, GiftCandidate } from '@/lib/deals/types';
import { cn } from '@/lib/utils';
import { Gift, ShoppingBag } from 'lucide-react';
import { useMemo, useState } from 'react';

/**
 * A real cart rendered against the deal being edited.
 *
 * It calls the same `recalculateCart` the storefront does rather than mocking
 * the output, so what an admin sees while writing copy is what a customer gets
 * — including the gift line and the discount.
 */
export default function CartPreviewPanel({ values }: { values: DealFormValues }) {
  const { formatPrice } = useCurrency();
  const isSubtotalTrigger = values.triggerType === 'subtotal_min';
  const target = Math.max(1, Number(values.triggerValue) || 1);

  // Start the scrubber just short of the threshold: the locked message is the
  // one that does the selling, so it is the one worth seeing first.
  const [fraction, setFraction] = useState(0.84);

  const preview = useMemo(() => {
    const current = isSubtotalTrigger
      ? Math.round(target * fraction)
      : Math.max(0, Math.round(target * fraction));

    const line: CartLine = {
      id: '000000000000000000000000',
      name: 'Preview item',
      price: isSubtotalTrigger ? current : 100,
      quantity: isSubtotalTrigger ? 1 : current,
    };

    const deal: DealDefinition = {
      id: 'preview',
      name: values.name || 'Untitled deal',
      isActive: true,
      priority: values.priority,
      isExclusive: values.isExclusive,
      // The preview always sits inside the window; the schedule step is where
      // dates are judged.
      startsAt: new Date(Date.now() - 1000),
      endsAt: new Date(Date.now() + 86_400_000),
      audience: 'all',
      triggerType: values.triggerType,
      triggerValue: target,
      rewardType: values.rewardType,
      settleOn: values.rewardType === 'FIXED_DISCOUNT' || values.rewardType === 'FREE_GIFT'
        ? 'cart'
        : 'delivered',
      rewardConfig: values.rewardConfig as DealDefinition['rewardConfig'],
      usedCount: 0,
      storefrontCopy: values.storefrontCopy,
    };

    const giftCatalog: Record<string, GiftCandidate> =
      values.rewardType === 'FREE_GIFT' && values.rewardConfig.productId
        ? {
            preview: {
              productId: values.rewardConfig.productId,
              variantId: values.rewardConfig.variantId ?? null,
              name: values.rewardConfig.label || 'Gift product',
              price: values.rewardConfig.price ?? 0,
              image: values.rewardConfig.image,
              inStock: true,
              giftable: true,
            },
          }
        : {};

    return recalculateCart({
      lines: current > 0 ? [line] : [],
      deals: [deal],
      now: new Date(),
      giftCatalog,
      formatMoney: (value) => formatPrice(value),
    });
  }, [values, target, fraction, isSubtotalTrigger, formatPrice]);

  const progress = preview.dealProgress[0];
  const giftLine = preview.lines.find((line) => line.isGift);
  const meta = REWARD_TYPE_META[values.rewardType];

  return (
    <div className="space-y-4 border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ShoppingBag className="h-4 w-4" />
          Cart preview
        </h4>
        <span className="text-xs text-muted-foreground">{meta.label}</span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{isSubtotalTrigger ? 'Preview subtotal' : 'Preview item count'}</span>
          <span className="font-medium text-foreground">
            {isSubtotalTrigger
              ? formatPrice(preview.subtotal)
              : `${progress?.current ?? 0} items`}
          </span>
        </div>
        <Slider
          value={[Math.round(fraction * 100)]}
          onValueChange={([next]) => setFraction(next / 100)}
          min={0}
          max={140}
          step={1}
          aria-label="Preview cart size"
        />
      </div>

      {!progress ? (
        <p className="border border-dashed border-border bg-muted/30 px-3 py-6 text-center text-xs text-muted-foreground">
          Finish the reward step to see this deal in a cart.
        </p>
      ) : (
        <div
          className={cn(
            'space-y-3 border p-3 transition-colors',
            progress.unlocked ? 'border-success-200 bg-success-50/50' : 'border-border bg-muted/30'
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-foreground">{progress.message}</p>
            <span
              className={cn(
                'shrink-0 border px-2 py-0.5 text-xs font-medium',
                progress.unlocked
                  ? 'border-success-200 bg-success-50 text-success-700'
                  : 'border-border bg-card text-muted-foreground'
              )}
            >
              {progress.reward_preview.label}
            </span>
          </div>

          <Progress value={progress.percent} className="h-1.5" />

          <p className="text-xs text-muted-foreground">
            {progress.percent}% there
            {!progress.unlocked && (
              <>
                {' · '}
                {isSubtotalTrigger
                  ? `${formatPrice(progress.remaining)} to go`
                  : `${progress.remaining} more item${progress.remaining === 1 ? '' : 's'}`}
              </>
            )}
          </p>
        </div>
      )}

      {giftLine && (
        <div className="flex items-center gap-3 border border-border bg-card p-3">
          {giftLine.image ? (
            <img src={giftLine.image} alt="" className="h-10 w-10 object-cover" />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center bg-accent">
              <Gift className="h-4 w-4 text-muted-foreground" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{giftLine.name}</p>
            <p className="text-xs text-muted-foreground">Gift · quantity locked at {giftLine.quantity}</p>
          </div>
          <span className="text-sm font-semibold text-success-700">Free</span>
        </div>
      )}

      {preview.dealDiscount > 0 && (
        <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
          <span className="text-muted-foreground">Deal discount</span>
          <span className="font-semibold text-success-700">-{formatPrice(preview.dealDiscount)}</span>
        </div>
      )}
    </div>
  );
}
