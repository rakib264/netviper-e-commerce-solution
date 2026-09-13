'use client';

import CourierTestOrderDialog from '@/components/admin/courier/CourierTestOrderDialog';
import { useTranslation } from '@/components/providers/LocalizationProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { usePathaoLocations } from '@/hooks/use-pathao-locations';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Calculator,
  Check,
  Copy,
  Loader2,
  MapPin,
  PlugZap,
  RefreshCw,
  Save,
  ShieldCheck,
  Truck,
  Wallet,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * Merchant credentials for Pathao and Steadfast.
 *
 * Secrets never round-trip: the API answers with a masked hint and a
 * `has*` flag, and a blank secret field on save means "leave it alone". So an
 * empty input is not an erasure — clearing one is an explicit action.
 */

interface PathaoSettings {
  enabled: boolean;
  sandbox: boolean;
  baseUrl: string;
  resolvedBaseUrl: string;
  clientId: string;
  username: string;
  storeId: string;
  storeName: string;
  defaultDeliveryType: number;
  defaultItemType: number;
  webhookSecret: string;
  clientSecretHint: string;
  passwordHint: string;
  hasClientSecret: boolean;
  hasPassword: boolean;
  tokenExpiresAt: string | null;
}

interface SteadfastSettings {
  enabled: boolean;
  baseUrl: string;
  resolvedBaseUrl: string;
  webhookToken: string;
  apiKeyHint: string;
  secretKeyHint: string;
  hasApiKey: boolean;
  hasSecretKey: boolean;
}

interface IntegrationSettings {
  defaultProvider: 'pathao' | 'steadfast';
  autoDispatchOnConfirm: boolean;
  carrierCalculatedRates: boolean;
  pathao: PathaoSettings;
  steadfast: SteadfastSettings;
}

interface PathaoStore {
  store_id: number;
  store_name: string;
  store_address: string;
  is_active: 0 | 1;
}

interface PathaoQuote {
  price: number;
  discount: number;
  promo_discount: number;
  cod_enabled: 0 | 1;
  cod_percentage: number;
  additional_charge: number;
  final_price: number;
}

type TestState = { ok: boolean; message: string } | null;

/** Secrets the admin typed this session, kept apart from the saved settings. */
interface SecretDraft {
  pathaoClientSecret: string;
  pathaoPassword: string;
  steadfastApiKey: string;
  steadfastSecretKey: string;
}

const EMPTY_SECRETS: SecretDraft = {
  pathaoClientSecret: '',
  pathaoPassword: '',
  steadfastApiKey: '',
  steadfastSecretKey: '',
};

export default function CourierIntegrationsPanel() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [settings, setSettings] = useState<IntegrationSettings | null>(null);
  const [secrets, setSecrets] = useState<SecretDraft>(EMPTY_SECRETS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<'pathao' | 'steadfast' | null>(null);
  const [testResult, setTestResult] = useState<Record<string, TestState>>({});
  const [stores, setStores] = useState<PathaoStore[] | null>(null);
  const [loadingStores, setLoadingStores] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/courier/integrations', {
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('load failed');
      const data = await response.json();
      setSettings(data.settings);
      setSecrets(EMPTY_SECRETS);
    } catch {
      toast({ title: t('admin.courier.integrations.loadError'), variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    load();
  }, [load]);

  // A connection test runs against what is *stored*, so a freshly typed secret
  // has to be saved first — this flags that rather than letting the test fail
  // for a reason the admin cannot see.
  const hasUnsavedSecrets = Object.values(secrets).some(Boolean);

  /** Webhook URLs are absolute, and only the browser knows the public origin. */
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const webhookUrls = useMemo(
    () => ({
      pathao: `${origin}/api/webhooks/courier/pathao`,
      steadfast: `${origin}/api/webhooks/courier/steadfast`,
    }),
    [origin],
  );

  const patch = <K extends keyof IntegrationSettings>(
    key: K,
    value: IntegrationSettings[K],
  ) => setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));

  const patchPathao = (patchValue: Partial<PathaoSettings>) =>
    setSettings((prev) =>
      prev ? { ...prev, pathao: { ...prev.pathao, ...patchValue } } : prev,
    );

  const patchSteadfast = (patchValue: Partial<SteadfastSettings>) =>
    setSettings((prev) =>
      prev ? { ...prev, steadfast: { ...prev.steadfast, ...patchValue } } : prev,
    );

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/courier/integrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultProvider: settings.defaultProvider,
          autoDispatchOnConfirm: settings.autoDispatchOnConfirm,
          carrierCalculatedRates: settings.carrierCalculatedRates,
          pathao: {
            enabled: settings.pathao.enabled,
            sandbox: settings.pathao.sandbox,
            baseUrl: settings.pathao.baseUrl,
            clientId: settings.pathao.clientId,
            username: settings.pathao.username,
            storeId: settings.pathao.storeId,
            storeName: settings.pathao.storeName,
            defaultDeliveryType: settings.pathao.defaultDeliveryType,
            defaultItemType: settings.pathao.defaultItemType,
            webhookSecret: settings.pathao.webhookSecret,
            clientSecret: secrets.pathaoClientSecret,
            password: secrets.pathaoPassword,
          },
          steadfast: {
            enabled: settings.steadfast.enabled,
            baseUrl: settings.steadfast.baseUrl,
            webhookToken: settings.steadfast.webhookToken,
            apiKey: secrets.steadfastApiKey,
            secretKey: secrets.steadfastSecretKey,
          },
        }),
      });
      if (!response.ok) throw new Error('save failed');
      const data = await response.json();
      setSettings(data.settings);
      setSecrets(EMPTY_SECRETS);
      toast({ title: t('admin.courier.integrations.saved'), variant: 'success' });
    } catch {
      toast({ title: t('admin.courier.integrations.saveError'), variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async (provider: 'pathao' | 'steadfast') => {
    setTesting(provider);
    setTestResult((prev) => ({ ...prev, [provider]: null }));
    try {
      const response = await fetch('/api/admin/courier/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      const data = await response.json();
      setTestResult((prev) => ({
        ...prev,
        [provider]: { ok: Boolean(data.ok), message: String(data.message ?? '') },
      }));
    } catch {
      setTestResult((prev) => ({
        ...prev,
        [provider]: { ok: false, message: t('admin.courier.integrations.testError') },
      }));
    } finally {
      setTesting(null);
    }
  };

  const loadStores = async () => {
    setLoadingStores(true);
    try {
      const response = await fetch('/api/admin/courier/pathao/stores', {
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'failed');
      setStores(data.stores ?? []);
    } catch (error) {
      toast({
        title: t('admin.courier.integrations.pathao.storesError'),
        description: error instanceof Error ? error.message : undefined,
        variant: 'error',
      });
    } finally {
      setLoadingStores(false);
    }
  };

  const loadBalance = async () => {
    setLoadingBalance(true);
    try {
      const response = await fetch('/api/admin/courier/steadfast/balance', {
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'failed');
      setBalance(Number(data.balance));
    } catch (error) {
      toast({
        title: t('admin.courier.integrations.steadfast.balanceError'),
        description: error instanceof Error ? error.message : undefined,
        variant: 'error',
      });
    } finally {
      setLoadingBalance(false);
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

  if (loading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((index) => (
          <div key={index} className="h-48 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  if (!settings) {
    return (
      <p className="typography-caption text-muted-foreground">
        {t('admin.courier.integrations.loadError')}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Truck className="h-4 w-4" />
            {t('admin.courier.integrations.routing.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{t('admin.courier.integrations.routing.defaultProvider')}</Label>
            <Select
              value={settings.defaultProvider}
              onValueChange={(value) =>
                patch('defaultProvider', value as IntegrationSettings['defaultProvider'])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="steadfast">Steadfast</SelectItem>
                <SelectItem value="pathao">Pathao</SelectItem>
              </SelectContent>
            </Select>
            <p className="typography-micro text-muted-foreground">
              {t('admin.courier.integrations.routing.defaultProviderHelp')}
            </p>
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
            <div className="space-y-1">
              <Label htmlFor="auto-dispatch">
                {t('admin.courier.integrations.routing.autoDispatch')}
              </Label>
              <p className="typography-micro text-muted-foreground">
                {t('admin.courier.integrations.routing.autoDispatchHelp')}
              </p>
            </div>
            <Switch
              id="auto-dispatch"
              checked={settings.autoDispatchOnConfirm}
              onCheckedChange={(checked) => patch('autoDispatchOnConfirm', checked)}
            />
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
            <div className="space-y-1">
              <Label htmlFor="carrier-rates">
                {t('admin.courier.integrations.routing.carrierRates')}
              </Label>
              <p className="typography-micro text-muted-foreground">
                {t('admin.courier.integrations.routing.carrierRatesHelp')}
              </p>
            </div>
            <Switch
              id="carrier-rates"
              checked={settings.carrierCalculatedRates}
              onCheckedChange={(checked) => patch('carrierCalculatedRates', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Pathao ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <PlugZap className="h-4 w-4" />
            Pathao
            <Badge variant={settings.pathao.enabled ? 'default' : 'outline'}>
              {settings.pathao.enabled
                ? t('admin.courier.integrations.enabled')
                : t('admin.courier.integrations.disabled')}
            </Badge>
            {settings.pathao.sandbox ? (
              <Badge variant="outline">{t('admin.courier.integrations.sandbox')}</Badge>
            ) : null}
          </CardTitle>
          <Switch
            checked={settings.pathao.enabled}
            onCheckedChange={(checked) => patchPathao({ enabled: checked })}
            aria-label={t('admin.courier.integrations.pathao.toggle')}
          />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label={t('admin.courier.integrations.pathao.clientId')}
              value={settings.pathao.clientId}
              onChange={(value) => patchPathao({ clientId: value })}
            />
            <SecretField
              label={t('admin.courier.integrations.pathao.clientSecret')}
              hint={settings.pathao.clientSecretHint}
              hasValue={settings.pathao.hasClientSecret}
              value={secrets.pathaoClientSecret}
              onChange={(value) =>
                setSecrets((prev) => ({ ...prev, pathaoClientSecret: value }))
              }
              savedLabel={t('admin.courier.integrations.secretSaved')}
              placeholder={t('admin.courier.integrations.secretPlaceholder')}
            />
            <Field
              label={t('admin.courier.integrations.pathao.username')}
              value={settings.pathao.username}
              onChange={(value) => patchPathao({ username: value })}
            />
            <SecretField
              label={t('admin.courier.integrations.pathao.password')}
              hint={settings.pathao.passwordHint}
              hasValue={settings.pathao.hasPassword}
              value={secrets.pathaoPassword}
              onChange={(value) => setSecrets((prev) => ({ ...prev, pathaoPassword: value }))}
              savedLabel={t('admin.courier.integrations.secretSaved')}
              placeholder={t('admin.courier.integrations.secretPlaceholder')}
            />
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
            <div className="space-y-1">
              <Label htmlFor="pathao-sandbox">
                {t('admin.courier.integrations.pathao.sandboxLabel')}
              </Label>
              <p className="typography-micro text-muted-foreground">
                {t('admin.courier.integrations.pathao.sandboxHelp', {
                  url: settings.pathao.resolvedBaseUrl,
                })}
              </p>
            </div>
            <Switch
              id="pathao-sandbox"
              checked={settings.pathao.sandbox}
              onCheckedChange={(checked) => patchPathao({ sandbox: checked })}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('admin.courier.integrations.pathao.deliveryType')}</Label>
              <Select
                value={String(settings.pathao.defaultDeliveryType)}
                onValueChange={(value) =>
                  patchPathao({ defaultDeliveryType: Number(value) })
                }
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
              <Label>{t('admin.courier.integrations.pathao.itemType')}</Label>
              <Select
                value={String(settings.pathao.defaultItemType)}
                onValueChange={(value) => patchPathao({ defaultItemType: Number(value) })}
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

          {/* The store is the pickup point every consignment is created against. */}
          <div className="space-y-3 rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>{t('admin.courier.integrations.pathao.store')}</Label>
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
                {settings.pathao.storeId
                  ? t('admin.courier.integrations.pathao.currentStore', {
                      store: settings.pathao.storeName || settings.pathao.storeId,
                    })
                  : t('admin.courier.integrations.pathao.noStoreSelected')}
              </p>
            ) : stores.length === 0 ? (
              <p className="typography-micro text-muted-foreground">
                {t('admin.courier.integrations.pathao.noStores')}
              </p>
            ) : (
              <Select
                value={settings.pathao.storeId}
                onValueChange={(value) => {
                  const store = stores.find((item) => String(item.store_id) === value);
                  patchPathao({ storeId: value, storeName: store?.store_name ?? '' });
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
                      {store.is_active ? '' : ` — ${t('admin.courier.integrations.inactive')}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <WebhookRow
            label={t('admin.courier.integrations.pathao.webhookUrl')}
            help={t('admin.courier.integrations.pathao.webhookHelp')}
            url={webhookUrls.pathao}
            copied={copied === 'pathao-url'}
            onCopy={() => copy('pathao-url', webhookUrls.pathao)}
            copyLabel={t('admin.courier.integrations.copy')}
          />

          <div className="space-y-2">
            <Label>{t('admin.courier.integrations.pathao.webhookSecret')}</Label>
            <Input
              value={settings.pathao.webhookSecret}
              onChange={(event) => patchPathao({ webhookSecret: event.target.value })}
              placeholder={t('admin.courier.integrations.pathao.webhookSecretPlaceholder')}
            />
            <p className="typography-micro text-muted-foreground">
              {t('admin.courier.integrations.pathao.webhookSecretHelp')}
            </p>
          </div>

          <TestRow
            testing={testing === 'pathao'}
            result={testResult.pathao ?? null}
            onTest={() => testConnection('pathao')}
            label={t('admin.courier.integrations.testConnection')}
            unsavedHint={hasUnsavedSecrets ? t('admin.courier.integrations.unsavedHint') : null}
            extra={
              <CourierTestOrderDialog
                provider="pathao"
                unsavedHint={
                  hasUnsavedSecrets ? t('admin.courier.integrations.unsavedHint') : null
                }
              />
            }
          />

          <PathaoCoverageCheck />
        </CardContent>
      </Card>

      {/* ── Steadfast ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <PlugZap className="h-4 w-4" />
            Steadfast
            <Badge variant={settings.steadfast.enabled ? 'default' : 'outline'}>
              {settings.steadfast.enabled
                ? t('admin.courier.integrations.enabled')
                : t('admin.courier.integrations.disabled')}
            </Badge>
          </CardTitle>
          <Switch
            checked={settings.steadfast.enabled}
            onCheckedChange={(checked) => patchSteadfast({ enabled: checked })}
            aria-label={t('admin.courier.integrations.steadfast.toggle')}
          />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <SecretField
              label={t('admin.courier.integrations.steadfast.apiKey')}
              hint={settings.steadfast.apiKeyHint}
              hasValue={settings.steadfast.hasApiKey}
              value={secrets.steadfastApiKey}
              onChange={(value) =>
                setSecrets((prev) => ({ ...prev, steadfastApiKey: value }))
              }
              savedLabel={t('admin.courier.integrations.secretSaved')}
              placeholder={t('admin.courier.integrations.secretPlaceholder')}
            />
            <SecretField
              label={t('admin.courier.integrations.steadfast.secretKey')}
              hint={settings.steadfast.secretKeyHint}
              hasValue={settings.steadfast.hasSecretKey}
              value={secrets.steadfastSecretKey}
              onChange={(value) =>
                setSecrets((prev) => ({ ...prev, steadfastSecretKey: value }))
              }
              savedLabel={t('admin.courier.integrations.secretSaved')}
              placeholder={t('admin.courier.integrations.secretPlaceholder')}
            />
            <Field
              label={t('admin.courier.integrations.steadfast.baseUrl')}
              value={settings.steadfast.baseUrl}
              onChange={(value) => patchSteadfast({ baseUrl: value })}
            />
            <div className="space-y-2">
              <Label>{t('admin.courier.integrations.steadfast.balance')}</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={loadBalance}
                  disabled={loadingBalance}
                >
                  {loadingBalance ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Wallet className="mr-2 h-3.5 w-3.5" />
                  )}
                  {t('admin.courier.integrations.steadfast.checkBalance')}
                </Button>
                {balance !== null ? (
                  <span className="typography-caption tabular-nums">{balance}</span>
                ) : null}
              </div>
            </div>
          </div>

          <WebhookRow
            label={t('admin.courier.integrations.steadfast.webhookUrl')}
            help={t('admin.courier.integrations.steadfast.webhookHelp')}
            url={webhookUrls.steadfast}
            copied={copied === 'steadfast-url'}
            onCopy={() => copy('steadfast-url', webhookUrls.steadfast)}
            copyLabel={t('admin.courier.integrations.copy')}
          />

          <div className="space-y-2">
            <Label>{t('admin.courier.integrations.steadfast.webhookToken')}</Label>
            <Input
              value={settings.steadfast.webhookToken}
              onChange={(event) => patchSteadfast({ webhookToken: event.target.value })}
              placeholder={t('admin.courier.integrations.steadfast.webhookTokenPlaceholder')}
            />
            <p className="typography-micro text-muted-foreground">
              {t('admin.courier.integrations.steadfast.webhookTokenHelp')}
            </p>
          </div>

          <TestRow
            testing={testing === 'steadfast'}
            result={testResult.steadfast ?? null}
            onTest={() => testConnection('steadfast')}
            label={t('admin.courier.integrations.testConnection')}
            unsavedHint={hasUnsavedSecrets ? t('admin.courier.integrations.unsavedHint') : null}
            extra={
              <CourierTestOrderDialog
                provider="steadfast"
                unsavedHint={
                  hasUnsavedSecrets ? t('admin.courier.integrations.unsavedHint') : null
                }
              />
            }
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {t('admin.courier.integrations.save')}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function SecretField({
  label,
  hint,
  hasValue,
  value,
  onChange,
  savedLabel,
  placeholder,
}: {
  label: string;
  hint: string;
  hasValue: boolean;
  value: string;
  onChange: (value: string) => void;
  savedLabel: string;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type="password"
        autoComplete="new-password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={hasValue ? hint : placeholder}
      />
      {hasValue ? (
        <p className="flex items-center gap-1 typography-micro text-muted-foreground">
          <ShieldCheck className="h-3 w-3" />
          {savedLabel}
        </p>
      ) : null}
    </div>
  );
}

function WebhookRow({
  label,
  help,
  url,
  copied,
  onCopy,
  copyLabel,
}: {
  label: string;
  help: string;
  url: string;
  copied: boolean;
  onCopy: () => void;
  copyLabel: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input readOnly value={url} className="font-mono text-xs" />
        <Button type="button" variant="outline" size="sm" onClick={onCopy}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          <span className="sr-only">{copyLabel}</span>
        </Button>
      </div>
      <p className="typography-micro text-muted-foreground">{help}</p>
    </div>
  );
}

function TestRow({
  testing,
  result,
  onTest,
  label,
  unsavedHint,
  extra,
}: {
  testing: boolean;
  result: TestState;
  onTest: () => void;
  label: string;
  unsavedHint: string | null;
  /** Further provider actions sharing this row — the test-order dialog. */
  extra?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={onTest} disabled={testing}>
          {testing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <PlugZap className="mr-2 h-4 w-4" />
          )}
          {label}
        </Button>
        {extra}
        {result ? (
          <span
            className={cn(
              'typography-micro',
              result.ok ? 'text-primary' : 'text-destructive',
            )}
          >
            {result.message}
          </span>
        ) : null}
      </div>
      {unsavedHint ? (
        <p className="typography-micro text-warning-700">{unsavedHint}</p>
      ) : null}
    </div>
  );
}

/**
 * Resolves a destination through Pathao's city → zone → area cascade and asks
 * for the real price. It exercises the whole chain — token, store, routing,
 * pricing — so a misconfiguration surfaces here rather than on a live order.
 */
function PathaoCoverageCheck() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const locations = usePathaoLocations({
    onError: (message) =>
      toast({
        title: t('admin.courier.integrations.coverage.loadError'),
        description: message,
        variant: 'error',
      }),
  });

  const { cities, zones, areas, cityId, zoneId, areaId, selectedArea } = locations;
  const [weight, setWeight] = useState('1');
  const [quote, setQuote] = useState<PathaoQuote | null>(null);
  const [quoting, setQuoting] = useState(false);

  // A quote belongs to the destination it was asked for, so moving anywhere in
  // the cascade discards it rather than leaving a stale price on screen.
  const chooseCity = (value: string) => {
    setQuote(null);
    return locations.selectCity(value);
  };

  const chooseZone = (value: string) => {
    setQuote(null);
    return locations.selectZone(value);
  };

  const check = async () => {
    setQuoting(true);
    setQuote(null);
    try {
      const response = await fetch('/api/admin/courier/pathao/price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientCity: Number(cityId),
          recipientZone: Number(zoneId),
          itemWeight: Number(weight) || 0.5,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setQuote(data.quote);
    } catch (error) {
      toast({
        title: t('admin.courier.integrations.coverage.quoteError'),
        description: error instanceof Error ? error.message : undefined,
        variant: 'error',
      });
    } finally {
      setQuoting(false);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Label>{t('admin.courier.integrations.coverage.title')}</Label>
          <p className="typography-micro text-muted-foreground">
            {t('admin.courier.integrations.coverage.subtitle')}
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

      {cities === null ? null : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>{t('admin.courier.integrations.coverage.city')}</Label>
              <Select value={cityId} onValueChange={chooseCity}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={t('admin.courier.integrations.coverage.selectCity')}
                  />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
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
                value={zoneId}
                onValueChange={chooseZone}
                disabled={!zones.length || locations.loading === 'zones'}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t('admin.courier.integrations.coverage.selectZone')}
                  />
                </SelectTrigger>
                <SelectContent>
                  {zones.map((zone) => (
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
                value={areaId}
                onValueChange={locations.selectArea}
                disabled={!areas.length || locations.loading === 'areas'}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t('admin.courier.integrations.coverage.selectArea')}
                  />
                </SelectTrigger>
                <SelectContent>
                  {areas.map((area) => (
                    <SelectItem key={area.area_id} value={String(area.area_id)}>
                      {area.area_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedArea ? (
            <p
              className={cn(
                'typography-micro',
                selectedArea.home_delivery_available ? 'text-primary' : 'text-warning-700',
              )}
            >
              {selectedArea.home_delivery_available
                ? t('admin.courier.integrations.coverage.homeDelivery')
                : t('admin.courier.integrations.coverage.noHomeDelivery')}
            </p>
          ) : null}

          <div className="flex flex-wrap items-end gap-3">
            <div className="w-32 space-y-2">
              <Label>{t('admin.courier.integrations.coverage.weight')}</Label>
              <Input
                type="number"
                min="0.5"
                max="10"
                step="0.5"
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={check}
              disabled={!cityId || !zoneId || quoting}
            >
              {quoting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Calculator className="mr-2 h-4 w-4" />
              )}
              {t('admin.courier.integrations.coverage.check')}
            </Button>
          </div>

          {quote ? (
            <dl className="grid gap-3 rounded-lg bg-muted/40 p-3 sm:grid-cols-4">
              <QuoteCell
                label={t('admin.courier.integrations.coverage.price')}
                value={quote.price}
              />
              <QuoteCell
                label={t('admin.courier.integrations.coverage.discount')}
                value={quote.discount}
              />
              <QuoteCell
                label={t('admin.courier.integrations.coverage.finalPrice')}
                value={quote.final_price}
                emphasis
              />
              <QuoteCell
                label={t('admin.courier.integrations.coverage.codPercentage')}
                value={quote.cod_percentage}
              />
            </dl>
          ) : null}
        </>
      )}
    </div>
  );
}

function QuoteCell({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: number;
  emphasis?: boolean;
}) {
  return (
    <div>
      <dt className="typography-micro text-muted-foreground">{label}</dt>
      <dd className={cn('tabular-nums', emphasis ? 'font-semibold' : 'typography-caption')}>
        {value}
      </dd>
    </div>
  );
}
