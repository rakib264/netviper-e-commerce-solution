'use client';

import DealCard from '@/components/deals/DealCard';
import DealsRail from '@/components/deals/DealsRail';
import { useTranslation } from '@/components/providers/LocalizationProvider';
import type { RootState } from '@/lib/store/store';
import { useSelector } from 'react-redux';

/**
 * The cart's Deals rail: one card per running deal, always present.
 *
 * Every card is derived from the server's `deal_progress` and nothing else, so
 * a deal is locked or unlocked purely as a function of the cart total. Raising
 * a quantity past a threshold renders the unlocked card; lowering it renders
 * the locked one again. There is no transition to announce, nothing to dismiss
 * and no flag left behind — which is why this replaced the unlock toast.
 *
 * It scrolls horizontally rather than stacking: four stacked cards took the
 * whole drawer and pushed the cart itself out of view. One card at a time with
 * the next one peeking keeps the items the subject of the screen.
 *
 * Where the reward itself materialises depends on its type: a fixed discount
 * becomes a row in the order summary, a free gift becomes a real cart line,
 * and points and stamps live here because they never touch the money.
 */
export default function CartDealsPanel({ className }: { className?: string }) {
  const { t } = useTranslation();
  const dealProgress = useSelector((state: RootState) => state.cart.dealProgress);

  if (dealProgress.length === 0) return null;

  const unlockedCount = dealProgress.filter((progress) => progress.unlocked).length;

  return (
    <DealsRail
      className={className}
      ariaLabel={t('cart.deals.sectionLabel')}
      label={
        <h3 className="text-xs font-title font-semibold uppercase tracking-wider text-muted-foreground">
          {t('cart.deals.sectionTitle')}
        </h3>
      }
      meta={
        unlockedCount > 0 ? (
          <span className="font-caption text-[11px] font-medium text-muted-foreground">
            {t('cart.deals.unlockedCount', {
              count: unlockedCount,
              total: dealProgress.length,
            })}
          </span>
        ) : null
      }
      slides={dealProgress.map((progress) => ({
        key: progress.deal_id,
        content: <DealCard progress={progress} />,
      }))}
    />
  );
}
