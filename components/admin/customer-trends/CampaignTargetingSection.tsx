'use client';

import { EmptyState } from '@/components/admin/customer-trends/shared';
import { useCurrency, useTranslation } from '@/components/providers/LocalizationProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { ClusterPlaybook, DistrictTargeting, PeriodDays } from '@/lib/analytics/targeting';
import { buildTargetingCsv, downloadCsv } from '@/lib/analytics/targeting-export';
import { Copy, Download } from 'lucide-react';
import React, { useCallback } from 'react';

interface CampaignTargetingSectionProps {
  districts: DistrictTargeting[];
  playbooks: ClusterPlaybook[];
  periodDays: PeriodDays;
}

export default function CampaignTargetingSection({
  districts,
  playbooks,
  periodDays,
}: CampaignTargetingSectionProps) {
  const { t, tPlural } = useTranslation();
  const { formatPrice, currency } = useCurrency();
  const { toast } = useToast();

  const funded = playbooks.filter((playbook) => playbook.districts.length > 0);

  const copyDistricts = useCallback(
    async (playbook: ClusterPlaybook) => {
      try {
        await navigator.clipboard.writeText(playbook.districts.join(', '));
        toast({
          title: t('admin.customerTrends.playbook.copied'),
          description: playbook.districts.join(', '),
        });
      } catch {
        // Clipboard access is denied outside a secure context; say so rather
        // than failing silently, so the marketer can select the list by hand.
        toast({
          variant: 'error',
          title: t('admin.customerTrends.playbook.copyFailed'),
        });
      }
    },
    [t, toast],
  );

  const exportCsv = useCallback(() => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(
      `geo-retargeting-${periodDays}d-${stamp}.csv`,
      buildTargetingCsv(districts, playbooks, currency),
    );
  }, [currency, districts, periodDays, playbooks]);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>{t('admin.customerTrends.playbook.title')}</CardTitle>
          <CardDescription>
            {t('admin.customerTrends.playbook.description')}
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={exportCsv}
          disabled={districts.length === 0}
        >
          <Download className="mr-2 h-4 w-4" aria-hidden="true" />
          {t('admin.customerTrends.playbook.exportCsv')}
        </Button>
      </CardHeader>
      <CardContent>
        {funded.length === 0 ? (
          <EmptyState message={t('admin.customerTrends.playbook.empty')} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {funded.map((playbook) => (
              <div
                key={playbook.cluster}
                className="flex flex-col rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {t(`admin.customerTrends.cluster.${playbook.cluster}`)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t(`admin.customerTrends.cluster.${playbook.cluster}Hint`)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold tabular-nums text-foreground">
                      {t('admin.customerTrends.percent', { value: playbook.budgetShare })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('admin.customerTrends.playbook.budgetShare')}
                    </p>
                  </div>
                </div>

                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-muted-foreground">
                      {t('admin.customerTrends.playbook.objective')}
                    </dt>
                    <dd>
                      <Badge variant="subtle">
                        {t(`admin.customerTrends.objective.${playbook.objective}`)}
                      </Badge>
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-muted-foreground">
                      {t('admin.customerTrends.kpi.orders')}
                    </dt>
                    <dd className="tabular-nums">{playbook.orders}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-muted-foreground">
                      {t('admin.customerTrends.kpi.revenue')}
                    </dt>
                    <dd className="tabular-nums">{formatPrice(playbook.revenue)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-muted-foreground">
                      {t('admin.customerTrends.playbook.audienceSize')}
                    </dt>
                    <dd className="tabular-nums">{playbook.uniqueCustomers}</dd>
                  </div>
                </dl>

                <div className="mt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t('admin.customerTrends.playbook.angle')}
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    {playbook.messagingCategories.length > 0
                      ? playbook.messagingCategories.join(' · ')
                      : playbook.messagingProducts.length > 0
                        ? playbook.messagingProducts.join(' · ')
                        : t('admin.customerTrends.playbook.noAngle')}
                  </p>
                </div>

                <div className="mt-4 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {tPlural(
                      'admin.customerTrends.playbook.districtCount',
                      playbook.districts.length,
                    )}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground">
                    {playbook.districts.join(', ')}
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full"
                  onClick={() => copyDistricts(playbook)}
                >
                  <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t('admin.customerTrends.playbook.copyDistricts')}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
