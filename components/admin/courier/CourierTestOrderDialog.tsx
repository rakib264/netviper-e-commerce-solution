'use client';

import { useTranslation } from '@/components/providers/LocalizationProvider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { usePathaoLocations } from '@/hooks/use-pathao-locations';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Check, Copy, FlaskConical, Loader2, MapPin, RefreshCw } from 'lucide-react';
import { useCallback, useState } from 'react';

/**
 * Creates one throwaway consignment at Pathao or Steadfast from the
 * integrations screen.
 *
 * The form is split by what the provider actually transmits: the shared block
 * holds the fields both APIs carry, and the provider block holds the rest —
 * showing a Steadfast admin a weight input it would silently drop is worse
 * than not showing it at all.
 *
 * The consignment is real. The credentials it uses are the *stored* ones, so a
 * secret typed but not yet saved is flagged rather than silently ignored.
 */

type ProviderId = 'pathao' | 'steadfast';

interface TestOrderForm {
  merchantOrderId: string;
  recipientName: string;
  recipientPhone: string;
  recipientSecondaryPhone: string;
  recipientAddress: string;
  itemQuantity: string;
  itemWeight: string;
  itemDescription: string;
  specialInstruction: string;
  amountToCollect: string;
  pathaoStoreId: string;
  pathaoStoreName: string;
  pathaoDeliveryType: string;
  pathaoItemType: string;
}

interface TestOrderResult {
  consignmentId: string;
  trackingCode: string | null;
  providerStatus: string | null;
  deliveryFee: number | null;
  merchantOrderId: string;
}

interface PathaoStore {
  store_id: number;
  store_name: string;
  is_active: 0 | 1;
}

const PROVIDER_LABEL: Record<ProviderId, string> = {
  pathao: 'Pathao',
  steadfast: 'Steadfast',
};

export default function CourierTestOrderDialog({
  provider,
  unsavedHint,
}: {
  provider: ProviderId;
  /** Shown when secrets are typed but unsaved — the call uses stored ones. */
  unsavedHint: string | null;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<TestOrderForm | null>(null);
  const [result, setResult] = useState<TestOrderResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stores, setStores] = useState<PathaoStore[] | null>(null);
  const [loadingStores, setLoadingStores] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const locations = usePathaoLocations({
    onError: (message) =>
      toast({
        title: t('admin.courier.integrations.coverage.loadError'),
        description: message,
        variant: 'error',
      }),
  });

  const patch = (value: Partial<TestOrderForm>) =>
    setForm((prev) => (prev ? { ...prev, ...value } : prev));

  /** Prefill is re-read on every opening, so each test gets a fresh reference. */
  const loadPrefill = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch(
        `/api/admin/courier/test-order?provider=${provider}`,
        { cache: 'no-store' },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      const prefill = data.prefill;
      setForm({
        merchantOrderId: prefill.merchantOrderId ?? '',
        recipientName: prefill.recipientName ?? '',
        recipientPhone: prefill.recipientPhone ?? '',
        recipientSecondaryPhone: prefill.recipientSecondaryPhone ?? '',
        recipientAddress: prefill.recipientAddress ?? '',
        itemQuantity: String(prefill.itemQuantity ?? 1),
        itemWeight: String(prefill.itemWeight ?? 0.5),
        itemDescription: prefill.itemDescription ?? '',
        specialInstruction: prefill.specialInstruction ?? '',
        amountToCollect: String(prefill.amountToCollect ?? 0),
        pathaoStoreId: prefill.pathaoStoreId ?? '',
        pathaoStoreName: prefill.pathaoStoreName ?? '',
        pathaoDeliveryType: String(prefill.pathaoDeliveryType ?? 48),
        pathaoItemType: String(prefill.pathaoItemType ?? 2),
      });
      if (!data.configured) {
        setError(t('admin.courier.integrations.testOrder.notConfigured'));
      }
    } catch (loadError) {
      setForm(null);
      setError(
        loadError instanceof Error
          ? loadError.message
          : t('admin.courier.integrations.testOrder.loadError'),
      );
    } finally {
      setLoading(false);
    }
  }, [provider, t]);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setStores(null);
      locations.reset();
      loadPrefill();
    }
  };

  const loadStores = async () => {
    setLoadingStores(true);
    try {
      const response = await fetch('/api/admin/courier/pathao/stores', {
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setStores(data.stores ?? []);
    } catch (storeError) {
      toast({
        title: t('admin.courier.integrations.pathao.storesError'),
        description: storeError instanceof Error ? storeError.message : undefined,
        variant: 'error',
      });
    } finally {
      setLoadingStores(false);
    }
  };

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied((current) => (current === key ? null : current)), 1500);
    } catch {
      toast({ title: t('admin.courier.integrations.copyError'), variant: 'error' });
    }
  };

  /** Mirrors the server-side check so an obvious gap costs no API call. */
  const clientValidation = (values: TestOrderForm): string | null => {
    if (!values.merchantOrderId.trim()) {
      return t('admin.courier.integrations.testOrder.validation.reference');
    }
    if (!values.recipientName.trim()) {
      return t('admin.courier.integrations.testOrder.validation.name');
    }
    if (!values.recipientPhone.trim()) {
      return t('admin.courier.integrations.testOrder.validation.phone');
    }
    if (values.recipientAddress.trim().length < 10) {
      return t('admin.courier.integrations.testOrder.validation.address');
    }
    return null;
  };

  const submit = async () => {
    if (!form) return;
    const invalid = clientValidation(form);
    if (invalid) {
      setError(invalid);
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/courier/test-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          merchantOrderId: form.merchantOrderId,
          recipientName: form.recipientName,
          recipientPhone: form.recipientPhone,
          recipientAddress: form.recipientAddress,
          itemDescription: form.itemDescription,
          specialInstruction: form.specialInstruction,
          amountToCollect: form.amountToCollect,
          ...(provider === 'pathao'
            ? {
                recipientSecondaryPhone: form.recipientSecondaryPhone,
                itemQuantity: form.itemQuantity,
                itemWeight: form.itemWeight,
                pathaoStoreId: form.pathaoStoreId,
                pathaoDeliveryType: form.pathaoDeliveryType,
                pathaoItemType: form.pathaoItemType,
                pathaoCityId: locations.cityId,
                pathaoZoneId: locations.zoneId,
                pathaoAreaId: locations.areaId,
              }
            : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setResult({
        consignmentId: String(data.consignmentId),
        trackingCode: data.trackingCode ?? null,
        providerStatus: data.providerStatus ?? null,
        deliveryFee: data.deliveryFee ?? null,
        merchantOrderId: String(data.merchantOrderId),
      });
      toast({
        title: t('admin.courier.integrations.testOrder.created'),
        variant: 'success',
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t('admin.courier.integrations.testOrder.createError'),
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <FlaskConical className="mr-2 h-4 w-4" />
          {t('admin.courier.integrations.testOrder.button')}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t('admin.courier.integrations.testOrder.title', {
              provider: PROVIDER_LABEL[provider],
            })}
          </DialogTitle>
          <DialogDescription>
            {t('admin.courier.integrations.testOrder.description')}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 py-4">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="h-10 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : !form ? (
          <p className="typography-caption text-destructive">
            {error ?? t('admin.courier.integrations.testOrder.loadError')}
          </p>
        ) : result ? (
          <ResultPanel
            result={result}
            copied={copied}
            onCopy={copy}
            copyLabel={t('admin.courier.integrations.copy')}
          />
        ) : (
          <div className="space-y-6">
            {unsavedHint ? (
              <p className="typography-micro text-warning-700">{unsavedHint}</p>
            ) : null}

            <Section title={t('admin.courier.integrations.testOrder.sectionShared')}>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  label={t('admin.courier.integrations.testOrder.reference')}
                  help={t('admin.courier.integrations.testOrder.referenceHelp')}
                  value={form.merchantOrderId}
                  onChange={(value) => patch({ merchantOrderId: value })}
                />
                <FormField
                  label={t('admin.courier.integrations.testOrder.codAmount')}
                  help={t('admin.courier.integrations.testOrder.codAmountHelp')}
                  type="number"
                  min="0"
                  value={form.amountToCollect}
                  onChange={(value) => patch({ amountToCollect: value })}
                />
                <FormField
                  label={t('admin.courier.integrations.testOrder.recipientName')}
                  value={form.recipientName}
                  onChange={(value) => patch({ recipientName: value })}
                />
                <FormField
                  label={t('admin.courier.integrations.testOrder.recipientPhone')}
                  help={t('admin.courier.integrations.testOrder.recipientPhoneHelp')}
                  value={form.recipientPhone}
                  onChange={(value) => patch({ recipientPhone: value })}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('admin.courier.integrations.testOrder.recipientAddress')}</Label>
                <Textarea
                  rows={2}
                  value={form.recipientAddress}
                  onChange={(event) => patch({ recipientAddress: event.target.value })}
                />
                <p className="typography-micro text-muted-foreground">
                  {t('admin.courier.integrations.testOrder.recipientAddressHelp')}
                </p>
              </div>

              <FormField
                label={t('admin.courier.integrations.testOrder.itemDescription')}
                value={form.itemDescription}
                onChange={(value) => patch({ itemDescription: value })}
              />

              <div className="space-y-2">
                <Label>{t('admin.courier.integrations.testOrder.instruction')}</Label>
                <Textarea
                  rows={2}
                  value={form.specialInstruction}
                  onChange={(event) => patch({ specialInstruction: event.target.value })}
                />
              </div>
            </Section>

            {provider === 'pathao' ? (
              <Section title={t('admin.courier.integrations.testOrder.sectionPathao')}>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    label={t('admin.courier.integrations.testOrder.secondaryPhone')}
                    value={form.recipientSecondaryPhone}
                    onChange={(value) => patch({ recipientSecondaryPhone: value })}
                  />
                  <FormField
                    label={t('admin.courier.integrations.testOrder.quantity')}
                    type="number"
                    min="1"
                    step="1"
                    value={form.itemQuantity}
                    onChange={(value) => patch({ itemQuantity: value })}
                  />
                  <FormField
                    label={t('admin.courier.integrations.testOrder.weight')}
                    help={t('admin.courier.integrations.testOrder.weightHelp')}
                    type="number"
                    min="0.5"
                    max="10"
                    step="0.5"
                    value={form.itemWeight}
                    onChange={(value) => patch({ itemWeight: value })}
                  />
                  <div className="space-y-2">
                    <Label>{t('admin.courier.integrations.testOrder.deliveryType')}</Label>
                    <Select
                      value={form.pathaoDeliveryType}
                      onValueChange={(value) => patch({ pathaoDeliveryType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="48">
                          {t('admin.courier.integrations.pathao.deliveryNormal')}
                        </SelectItem>
                        <SelectItem value="12">
                          {t('admin.courier.integrations.pathao.deliveryOnDemand')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('admin.courier.integrations.testOrder.itemType')}</Label>
                    <Select
                      value={form.pathaoItemType}
                      onValueChange={(value) => patch({ pathaoItemType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">
                          {t('admin.courier.integrations.pathao.itemParcel')}
                        </SelectItem>
                        <SelectItem value="1">
                          {t('admin.courier.integrations.pathao.itemDocument')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* The pickup store the consignment is created against. */}
                <div className="space-y-3 rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label>{t('admin.courier.integrations.testOrder.store')}</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={loadStores}
                      disabled={loadingStores}
                    >
                      {loadingStores ? (
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-3.5 w-3.5" />
                      )}
                      {t('admin.courier.integrations.pathao.loadStores')}
                    </Button>
                  </div>

                  {stores === null ? (
                    <p className="typography-micro text-muted-foreground">
                      {form.pathaoStoreId
                        ? t('admin.courier.integrations.pathao.currentStore', {
                            store: form.pathaoStoreName || form.pathaoStoreId,
                          })
                        : t('admin.courier.integrations.pathao.noStoreSelected')}
                    </p>
                  ) : stores.length === 0 ? (
                    <p className="typography-micro text-muted-foreground">
                      {t('admin.courier.integrations.pathao.noStores')}
                    </p>
                  ) : (
                    <Select
                      value={form.pathaoStoreId}
                      onValueChange={(value) => {
                        const store = stores.find(
                          (item) => String(item.store_id) === value,
                        );
                        patch({
                          pathaoStoreId: value,
                          pathaoStoreName: store?.store_name ?? '',
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t('admin.courier.integrations.pathao.selectStore')}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {stores.map((store) => (
                          <SelectItem key={store.store_id} value={String(store.store_id)}>
                            {store.store_name}
                            {store.is_active
                              ? ''
                              : ` — ${t('admin.courier.integrations.inactive')}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <p className="typography-micro text-muted-foreground">
                    {t('admin.courier.integrations.testOrder.storeHelp')}
                  </p>
                </div>

                {/* Optional: unset routing lets Pathao resolve it from the address. */}
                <div className="space-y-3 rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <Label>{t('admin.courier.integrations.testOrder.routing')}</Label>
                      <p className="typography-micro text-muted-foreground">
                        {t('admin.courier.integrations.testOrder.routingHelp')}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={locations.loadCities}
                      disabled={locations.loading === 'cities'}
                    >
                      {locations.loading === 'cities' ? (
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <MapPin className="mr-2 h-3.5 w-3.5" />
                      )}
                      {t('admin.courier.integrations.coverage.loadCities')}
                    </Button>
                  </div>

                  {locations.cities === null ? null : (
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label>{t('admin.courier.integrations.coverage.city')}</Label>
                        <Select
                          value={locations.cityId}
                          onValueChange={locations.selectCity}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t(
                                'admin.courier.integrations.coverage.selectCity',
                              )}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {locations.cities.map((city) => (
                              <SelectItem key={city.id} value={String(city.id)}>
                                {city.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{t('admin.courier.integrations.coverage.zone')}</Label>
                        <Select
                          value={locations.zoneId}
                          onValueChange={locations.selectZone}
                          disabled={!locations.zones.length || locations.loading === 'zones'}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t(
                                'admin.courier.integrations.coverage.selectZone',
                              )}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {locations.zones.map((zone) => (
                              <SelectItem key={zone.id} value={String(zone.id)}>
                                {zone.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{t('admin.courier.integrations.coverage.area')}</Label>
                        <Select
                          value={locations.areaId}
                          onValueChange={locations.selectArea}
                          disabled={!locations.areas.length || locations.loading === 'areas'}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t(
                                'admin.courier.integrations.coverage.selectArea',
                              )}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {locations.areas.map((area) => (
                              <SelectItem key={area.area_id} value={String(area.area_id)}>
                                {area.area_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {locations.selectedArea ? (
                    <p
                      className={cn(
                        'typography-micro',
                        locations.selectedArea.home_delivery_available
                          ? 'text-primary'
                          : 'text-warning-700',
                      )}
                    >
                      {locations.selectedArea.home_delivery_available
                        ? t('admin.courier.integrations.coverage.homeDelivery')
                        : t('admin.courier.integrations.coverage.noHomeDelivery')}
                    </p>
                  ) : null}
                </div>
              </Section>
            ) : (
              <Section title={t('admin.courier.integrations.testOrder.sectionSteadfast')}>
                <p className="typography-micro text-muted-foreground">
                  {t('admin.courier.integrations.testOrder.steadfastNote')}
                </p>
              </Section>
            )}

            {error ? (
              <p className="typography-caption text-destructive">{error}</p>
            ) : null}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            {result
              ? t('admin.courier.integrations.testOrder.close')
              : t('admin.courier.integrations.testOrder.cancel')}
          </Button>
          {result ? null : (
            <Button type="button" onClick={submit} disabled={creating || !form}>
              {creating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FlaskConical className="mr-2 h-4 w-4" />
              )}
              {t('admin.courier.integrations.testOrder.submit')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="typography-caption font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

function FormField({
  label,
  help,
  value,
  onChange,
  type,
  min,
  max,
  step,
}: {
  label: string;
  help?: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  min?: string;
  max?: string;
  step?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type={type}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {help ? <p className="typography-micro text-muted-foreground">{help}</p> : null}
    </div>
  );
}

/**
 * What the provider returned. The ids are the only handle the admin has on a
 * live consignment, so each one is copyable and the cancellation reminder sits
 * right beside them.
 */
function ResultPanel({
  result,
  copied,
  onCopy,
  copyLabel,
}: {
  result: TestOrderResult;
  copied: string | null;
  onCopy: (key: string, value: string) => void;
  copyLabel: string;
}) {
  const { t } = useTranslation();

  const rows: Array<{ key: string; label: string; value: string; copyable?: boolean }> = [
    {
      key: 'consignmentId',
      label: t('admin.courier.integrations.testOrder.result.consignmentId'),
      value: result.consignmentId,
      copyable: true,
    },
    {
      key: 'merchantOrderId',
      label: t('admin.courier.integrations.testOrder.result.reference'),
      value: result.merchantOrderId,
      copyable: true,
    },
    {
      key: 'trackingCode',
      label: t('admin.courier.integrations.testOrder.result.trackingCode'),
      value: result.trackingCode ?? '—',
      copyable: Boolean(result.trackingCode),
    },
    {
      key: 'providerStatus',
      label: t('admin.courier.integrations.testOrder.result.providerStatus'),
      value: result.providerStatus ?? '—',
    },
    {
      key: 'deliveryFee',
      label: t('admin.courier.integrations.testOrder.result.deliveryFee'),
      value: result.deliveryFee === null ? '—' : String(result.deliveryFee),
    },
  ];

  return (
    <div className="space-y-4">
      <p className="typography-caption font-semibold text-primary">
        {t('admin.courier.integrations.testOrder.result.title')}
      </p>
      <dl className="divide-y divide-border rounded-lg border border-border">
        {rows.map((row) => (
          <div
            key={row.key}
            className="flex items-center justify-between gap-3 px-4 py-3"
          >
            <dt className="typography-micro text-muted-foreground">{row.label}</dt>
            <dd className="flex items-center gap-2">
              <span className="font-mono text-xs tabular-nums">{row.value}</span>
              {row.copyable ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onCopy(row.key, row.value)}
                >
                  {copied === row.key ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span className="sr-only">{copyLabel}</span>
                </Button>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>
      <p className="typography-micro text-warning-700">
        {t('admin.courier.integrations.testOrder.result.hint')}
      </p>
    </div>
  );
}
