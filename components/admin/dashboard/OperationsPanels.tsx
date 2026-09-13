'use client';

import MetricTile, { usePercentFormatter } from '@/components/admin/dashboard/MetricTile';
import PanelCard from '@/components/admin/dashboard/PanelCard';
import { useCurrency, useTranslation } from '@/components/providers/LocalizationProvider';
import { Progress } from '@/components/ui/progress';
import type { DashboardOperations } from '@/lib/analytics/dashboard';
import { DAYS_OF_COVER_AT_RISK } from '@/lib/analytics/dashboard';
import React from 'react';

/** Hours rendered as whole days once a delivery takes longer than one. */
function useDurationFormatter() {
  const { t } = useTranslation();
  return React.useCallback(
    (hours: number | null) => {
      if (hours === null) return null;
      if (hours < 48) return t('admin.dashboard.fulfillment.hours', { value: hours });
      return t('admin.dashboard.fulfillment.days', { value: (hours / 24).toFixed(1) });
    },
    [t],
  );
}

/* ── Revenue quality ─────────────────────────────────────────────────── */

function RevenueQualityCard({ data }: { data: DashboardOperations['revenueQuality'] }) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const pct = usePercentFormatter();

  return (
    <PanelCard
      title={t('admin.dashboard.revenueQuality.title')}
      description={t('admin.dashboard.revenueQuality.description')}
      isEmpty={data.totalOrders === 0}
    >
      <div className="grid grid-cols-2 gap-4">
        <MetricTile
          label={t('admin.dashboard.revenueQuality.gmv')}
          value={formatPrice(data.grossMerchandiseValue)}
        />
        <MetricTile
          label={t('admin.dashboard.revenueQuality.netPaid')}
          value={formatPrice(data.netPaidRevenue)}
          tone="positive"
        />
        <MetricTile
          label={t('admin.dashboard.revenueQuality.discountRate')}
          value={pct(data.discountRatePct)}
          hint={formatPrice(data.discountTotal)}
          tone={data.discountRatePct !== null && data.discountRatePct > 25 ? 'warning' : 'default'}
        />
        <MetricTile
          label={t('admin.dashboard.revenueQuality.paidRatio')}
          value={pct(data.paidOrderRatioPct)}
          hint={t('admin.dashboard.revenueQuality.ofOrders', { count: data.totalOrders })}
        />
      </div>
      <div className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">
            {t('admin.dashboard.revenueQuality.aov')}
          </span>
          <span className="tabular-nums">{formatPrice(data.averageOrderValue)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">
            {t('admin.dashboard.revenueQuality.shipping')}
          </span>
          <span className="tabular-nums">{formatPrice(data.shippingRevenue)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">
            {t('admin.dashboard.revenueQuality.couponOrders')}
          </span>
          <span className="tabular-nums">{data.couponOrders}</span>
        </div>
      </div>
    </PanelCard>
  );
}

/* ── Payment health ──────────────────────────────────────────────────── */

function PaymentHealthCard({ data }: { data: DashboardOperations['paymentHealth'] }) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const pct = usePercentFormatter();
  const settled = data.paid + data.failed;

  return (
    <PanelCard
      title={t('admin.dashboard.payment.title')}
      description={t('admin.dashboard.payment.description')}
      isEmpty={data.paid + data.pending + data.failed + data.refunded === 0}
    >
      <div className="grid grid-cols-2 gap-4">
        <MetricTile
          label={t('admin.dashboard.payment.successRate')}
          value={pct(data.successRatePct)}
          hint={t('admin.dashboard.payment.settledBasis', { count: settled })}
          tone={
            data.successRatePct !== null && data.successRatePct < 90 ? 'critical' : 'positive'
          }
        />
        <MetricTile
          label={t('admin.dashboard.payment.refundRate')}
          value={pct(data.refundRatePct)}
          hint={t('admin.dashboard.payment.refunded', { count: data.refunded })}
          tone={data.refundRatePct !== null && data.refundRatePct > 5 ? 'warning' : 'default'}
        />
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">{t('admin.dashboard.payment.paid')}</dt>
          <dd className="tabular-nums text-success">{data.paid}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">
            {t('admin.dashboard.payment.pending')}
          </dt>
          <dd className="tabular-nums">{data.pending}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">
            {t('admin.dashboard.payment.failed')}
          </dt>
          <dd className="tabular-nums text-destructive">{data.failed}</dd>
        </div>
      </dl>

      {data.methods.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('admin.dashboard.payment.methods')}
          </p>
          <ul className="space-y-1.5 text-sm">
            {data.methods.map((method) => (
              <li key={method.method} className="flex items-center justify-between gap-3">
                <span className="truncate font-medium uppercase">{method.method}</span>
                <span className="flex shrink-0 items-center gap-3 tabular-nums text-muted-foreground">
                  <span>{formatPrice(method.revenue)}</span>
                  <span className="w-12 text-right">
                    {pct(method.successRatePct, 0) ?? t('admin.dashboard.notAvailable')}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </PanelCard>
  );
}

/* ── Fulfillment SLA ─────────────────────────────────────────────────── */

function FulfillmentSlaCard({ data }: { data: DashboardOperations['fulfillment'] }) {
  const { t } = useTranslation();
  const pct = usePercentFormatter();
  const duration = useDurationFormatter();

  return (
    <PanelCard
      title={t('admin.dashboard.fulfillment.title')}
      description={t('admin.dashboard.fulfillment.description')}
      isEmpty={data.deliveredOrders === 0 && data.openOrders === 0}
    >
      <div className="grid grid-cols-2 gap-4">
        <MetricTile
          label={t('admin.dashboard.fulfillment.median')}
          value={duration(data.medianHoursToDeliver)}
          hint={t('admin.dashboard.fulfillment.deliveredBasis', {
            count: data.deliveredOrders,
          })}
        />
        <MetricTile
          label={t('admin.dashboard.fulfillment.p90')}
          value={duration(data.p90HoursToDeliver)}
        />
        <MetricTile
          label={t('admin.dashboard.fulfillment.onTime')}
          value={pct(data.onTimeRatePct)}
          hint={
            data.onTimeMeasured === 0
              ? t('admin.dashboard.fulfillment.noExpectedDates')
              : t('admin.dashboard.fulfillment.onTimeBasis', { count: data.onTimeMeasured })
          }
          tone={data.onTimeRatePct !== null && data.onTimeRatePct < 85 ? 'warning' : 'positive'}
        />
        <MetricTile
          label={t('admin.dashboard.fulfillment.ageing')}
          value={data.ageingOrders}
          hint={t('admin.dashboard.fulfillment.openBasis', { count: data.openOrders })}
          tone={data.ageingOrders > 0 ? 'critical' : 'default'}
        />
      </div>
    </PanelCard>
  );
}

/* ── Returns and cancellations ───────────────────────────────────────── */

function ReturnsQualityCard({ data }: { data: DashboardOperations['returns'] }) {
  const { t } = useTranslation();
  const pct = usePercentFormatter();

  return (
    <PanelCard
      title={t('admin.dashboard.returns.title')}
      description={t('admin.dashboard.returns.description')}
      isEmpty={data.totalOrders === 0}
    >
      <div className="grid grid-cols-2 gap-4">
        <MetricTile
          label={t('admin.dashboard.returns.cancelRate')}
          value={pct(data.cancelRatePct)}
          hint={t('admin.dashboard.returns.cancelledBasis', { count: data.cancelledOrders })}
          tone={data.cancelRatePct !== null && data.cancelRatePct > 10 ? 'warning' : 'default'}
        />
        <MetricTile
          label={t('admin.dashboard.returns.returnRate')}
          value={pct(data.returnRatePct)}
          hint={t('admin.dashboard.returns.requestsBasis', { count: data.returnRequests })}
          tone={data.returnRatePct !== null && data.returnRatePct > 10 ? 'warning' : 'default'}
        />
      </div>

      <div className="mt-4 border-t border-border pt-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t('admin.dashboard.returns.topReasons')}
        </p>
        {data.topReasons.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('admin.dashboard.returns.noReasons')}
          </p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {data.topReasons.map((reason) => (
              <li key={reason.reason} className="flex items-center justify-between gap-3">
                <span className="truncate">{reason.reason}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {reason.count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PanelCard>
  );
}

/* ── Inventory risk ──────────────────────────────────────────────────── */

function InventoryRiskCard({ data }: { data: DashboardOperations['inventory'] }) {
  const { t } = useTranslation();

  return (
    <PanelCard
      title={t('admin.dashboard.inventory.title')}
      description={t('admin.dashboard.inventory.description')}
      isEmpty={data.trackedProducts === 0}
    >
      <div className="grid grid-cols-3 gap-4">
        <MetricTile
          label={t('admin.dashboard.inventory.outOfStock')}
          value={data.outOfStock}
          tone={data.outOfStock > 0 ? 'critical' : 'default'}
        />
        <MetricTile
          label={t('admin.dashboard.inventory.lowStock')}
          value={data.lowStock}
          tone={data.lowStock > 0 ? 'warning' : 'default'}
        />
        <MetricTile
          label={t('admin.dashboard.inventory.tracked')}
          value={data.trackedProducts}
        />
      </div>

      <div className="mt-4 border-t border-border pt-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t('admin.dashboard.inventory.atRisk')}
        </p>
        {data.atRisk.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('admin.dashboard.inventory.noRisk')}
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {data.atRisk.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3">
                <span className="min-w-0 flex-1 truncate">{item.name}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {t('admin.dashboard.inventory.stockUnits', { count: item.quantity })}
                </span>
                <span
                  className={
                    item.daysOfCover !== null && item.daysOfCover < DAYS_OF_COVER_AT_RISK
                      ? 'w-24 shrink-0 text-right tabular-nums text-destructive'
                      : 'w-24 shrink-0 text-right tabular-nums text-muted-foreground'
                  }
                >
                  {item.daysOfCover === null
                    ? t('admin.dashboard.inventory.noVelocity')
                    : t('admin.dashboard.inventory.daysOfCover', { value: item.daysOfCover })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {data.byCategory.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('admin.dashboard.inventory.byCategory')}
          </p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {data.byCategory.map((row) => (
              <li key={row.category}>
                <span className="text-foreground">{row.category}</span>{' '}
                <span className="tabular-nums">{row.atRisk}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </PanelCard>
  );
}

/* ── Retention ───────────────────────────────────────────────────────── */

function RetentionSnapshotCard({ data }: { data: DashboardOperations['retention'] }) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const pct = usePercentFormatter();

  const newShare =
    data.windowCustomers > 0 ? (data.newCustomers / data.windowCustomers) * 100 : 0;

  return (
    <PanelCard
      title={t('admin.dashboard.retention.title')}
      description={t('admin.dashboard.retention.description')}
      isEmpty={data.windowCustomers === 0}
    >
      <div className="grid grid-cols-2 gap-4">
        <MetricTile
          label={t('admin.dashboard.retention.repeatRate')}
          value={pct(data.repeatCustomerRatePct)}
          hint={t('admin.dashboard.retention.customersBasis', {
            count: data.windowCustomers,
          })}
        />
        <MetricTile
          label={t('admin.dashboard.retention.returningRevenueShare')}
          value={pct(data.returningRevenueSharePct)}
          hint={formatPrice(data.returningRevenue)}
          tone="positive"
        />
      </div>

      <div className="mt-4 border-t border-border pt-3">
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {t('admin.dashboard.retention.newCustomers')}
          </span>
          <span className="tabular-nums">{data.newCustomers}</span>
        </div>
        <Progress value={newShare} className="h-2" />
        <div className="mt-1.5 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {t('admin.dashboard.retention.returningCustomers')}
          </span>
          <span className="tabular-nums">{data.returningCustomers}</span>
        </div>
      </div>
    </PanelCard>
  );
}

/* ── Grid ────────────────────────────────────────────────────────────── */

/**
 * The operations band. Kept as one export so the dashboard page composes a
 * section rather than seven imports and a bespoke grid.
 */
export default function OperationsPanels({ data }: { data: DashboardOperations }) {
  const { t } = useTranslation();

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          {t('admin.dashboard.operations.title')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('admin.dashboard.operations.description')}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <RevenueQualityCard data={data.revenueQuality} />
        <PaymentHealthCard data={data.paymentHealth} />
        <FulfillmentSlaCard data={data.fulfillment} />
        <ReturnsQualityCard data={data.returns} />
        <InventoryRiskCard data={data.inventory} />
        <RetentionSnapshotCard data={data.retention} />
      </div>
    </section>
  );
}
