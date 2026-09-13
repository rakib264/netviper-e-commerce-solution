'use client';

import { useTranslation } from '@/components/providers/LocalizationProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MapPin, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * Pickup address and the merchant's own delivery rates.
 *
 * These used to live in Settings → Courier, one tab away from the credentials
 * of the carriers they describe, and the rate table there carried five fields
 * nothing in the order path ever read (`express*`, `sameDay*`,
 * `fragileHandlingCharge`, `weightBasedCharging`) because checkout only ever
 * emits a regular delivery. Only what is actually used is editable here.
 *
 * The two rates are the floor under every quote: `quoteShipping` reaches for a
 * live carrier price only when the merchant turned that on and the carrier can
 * answer, and falls back to these in every other case — carrier down, address
 * outside coverage, Steadfast (which has no price API at all).
 */

interface OperationsSettings {
  senderInfo: {
    name: string;
    phone: string;
    address: string;
    division: string;
    district: string;
  };
  deliveryCharges: {
    regularWithinDhaka: number;
    regularOutsideDhaka: number;
  };
  codChargeRate: number;
  freeDeliveryThreshold: number;
}

const EMPTY: OperationsSettings = {
  senderInfo: { name: '', phone: '', address: '', division: '', district: '' },
  deliveryCharges: { regularWithinDhaka: 60, regularOutsideDhaka: 120 },
  codChargeRate: 1,
  freeDeliveryThreshold: 0,
};

export default function CourierOperationsSettings() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [values, setValues] = useState<OperationsSettings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch('/api/admin/settings/courier', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (!active) return;
        setValues({
          senderInfo: { ...EMPTY.senderInfo, ...(data.senderInfo ?? {}) },
          deliveryCharges: {
            regularWithinDhaka:
              data.deliveryCharges?.regularWithinDhaka ?? EMPTY.deliveryCharges.regularWithinDhaka,
            regularOutsideDhaka:
              data.deliveryCharges?.regularOutsideDhaka ??
              EMPTY.deliveryCharges.regularOutsideDhaka,
          },
          codChargeRate: data.codChargeRate ?? EMPTY.codChargeRate,
          freeDeliveryThreshold: data.freeDeliveryThreshold ?? EMPTY.freeDeliveryThreshold,
        });
      } catch {
        if (active) toast({ title: t('admin.courier.operations.loadError'), variant: 'error' });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [t, toast]);

  const save = async () => {
    setSaving(true);
    try {
      // The route replaces the document it is given, and the fields this form
      // does not show still have meaning for manually created records — so the
      // existing document is read back and merged rather than overwritten.
      const current = await fetch('/api/admin/settings/courier', { cache: 'no-store' }).then(
        (response) => response.json(),
      );

      const response = await fetch('/api/admin/settings/courier', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...current,
          senderInfo: values.senderInfo,
          deliveryCharges: {
            ...(current.deliveryCharges ?? {}),
            regularWithinDhaka: Number(values.deliveryCharges.regularWithinDhaka) || 0,
            regularOutsideDhaka: Number(values.deliveryCharges.regularOutsideDhaka) || 0,
          },
          codChargeRate: Number(values.codChargeRate) || 0,
          freeDeliveryThreshold: Number(values.freeDeliveryThreshold) || 0,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast({ title: t('admin.courier.operations.saved'), variant: 'success' });
    } catch (error) {
      toast({
        title: t('admin.courier.operations.saveError'),
        description: error instanceof Error ? error.message : undefined,
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const setSender = (key: keyof OperationsSettings['senderInfo'], value: string) =>
    setValues((current) => ({ ...current, senderInfo: { ...current.senderInfo, [key]: value } }));

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {t('admin.courier.operations.pickupTitle')}
          </CardTitle>
          <CardDescription>{t('admin.courier.operations.pickupSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="sender-name">{t('admin.courier.operations.senderName')}</Label>
            <Input
              id="sender-name"
              value={values.senderInfo.name}
              onChange={(event) => setSender('name', event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="sender-phone">{t('admin.courier.operations.senderPhone')}</Label>
            <Input
              id="sender-phone"
              value={values.senderInfo.phone}
              onChange={(event) => setSender('phone', event.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="sender-address">{t('admin.courier.operations.senderAddress')}</Label>
            <Input
              id="sender-address"
              value={values.senderInfo.address}
              onChange={(event) => setSender('address', event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="sender-division">{t('admin.courier.operations.senderDivision')}</Label>
            <Input
              id="sender-division"
              value={values.senderInfo.division}
              onChange={(event) => setSender('division', event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="sender-district">{t('admin.courier.operations.senderDistrict')}</Label>
            <Input
              id="sender-district"
              value={values.senderInfo.district}
              onChange={(event) => setSender('district', event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            {t('admin.courier.operations.ratesTitle')}
          </CardTitle>
          <CardDescription>{t('admin.courier.operations.ratesSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="rate-inside">{t('admin.courier.operations.insideDhaka')}</Label>
            <Input
              id="rate-inside"
              type="number"
              min={0}
              value={values.deliveryCharges.regularWithinDhaka}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  deliveryCharges: {
                    ...current.deliveryCharges,
                    regularWithinDhaka: Number(event.target.value),
                  },
                }))
              }
            />
          </div>
          <div>
            <Label htmlFor="rate-outside">{t('admin.courier.operations.outsideDhaka')}</Label>
            <Input
              id="rate-outside"
              type="number"
              min={0}
              value={values.deliveryCharges.regularOutsideDhaka}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  deliveryCharges: {
                    ...current.deliveryCharges,
                    regularOutsideDhaka: Number(event.target.value),
                  },
                }))
              }
            />
          </div>
          <div>
            <Label htmlFor="free-threshold">{t('admin.courier.operations.freeThreshold')}</Label>
            <Input
              id="free-threshold"
              type="number"
              min={0}
              value={values.freeDeliveryThreshold}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  freeDeliveryThreshold: Number(event.target.value),
                }))
              }
            />
            <p className="mt-1 typography-micro text-muted-foreground">
              {t('admin.courier.operations.freeThresholdHint')}
            </p>
          </div>
          <div>
            <Label htmlFor="cod-rate">{t('admin.courier.operations.codRate')}</Label>
            <Input
              id="cod-rate"
              type="number"
              min={0}
              step="0.1"
              value={values.codChargeRate}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  codChargeRate: Number(event.target.value),
                }))
              }
            />
            <p className="mt-1 typography-micro text-muted-foreground">
              {t('admin.courier.operations.codRateHint')}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
          {t('admin.courier.operations.save')}
        </Button>
      </div>
    </div>
  );
}
