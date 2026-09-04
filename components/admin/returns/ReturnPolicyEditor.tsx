'use client';

import { useTranslation } from '@/components/providers/LocalizationProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { SUPPORTED_LOCALES } from '@/lib/i18n/config';
import {
  DEFAULT_RETURN_POLICY,
  type PolicyLocale,
  type ReturnPolicyContent,
} from '@/lib/returns/policy-content';
import { useEffect, useState } from 'react';

/**
 * Edit the customer-facing returns policy.
 *
 * Deliberately plain: a few numbers, a switch, and an ordered list of
 * heading/body pairs with one field per language. The policy is content the
 * brand owns, so it is edited here rather than living in the locale files, but
 * it still has to exist in all three languages — hence a tab per locale rather
 * than a single text box.
 */
export function ReturnPolicyEditor() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [policy, setPolicy] = useState<ReturnPolicyContent | null>(null);
  const [activeLocale, setActiveLocale] = useState<PolicyLocale>('en');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/admin/settings/returns', { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((payload) => setPolicy(payload.policy))
      .catch((error) => {
        if ((error as Error)?.name !== 'AbortError') setPolicy(DEFAULT_RETURN_POLICY);
      });

    return () => controller.abort();
  }, []);

  const save = async (next: ReturnPolicyContent) => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/settings/returns', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      if (!response.ok) throw new Error('save failed');
      const payload = await response.json();
      setPolicy(payload.policy);
      toast({ title: t('admin.returns.policyEditor.saved'), variant: 'success' });
    } catch {
      toast({ title: t('admin.returns.policyEditor.saveError'), variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (!policy) {
    return <div className="h-64 animate-pulse rounded-lg bg-muted" aria-busy />;
  }

  const patch = (changes: Partial<ReturnPolicyContent>) =>
    setPolicy({ ...policy, ...changes });

  const patchSection = (
    index: number,
    field: 'title' | 'body',
    value: string,
  ) => {
    const sections = policy.sections.map((section, i) =>
      i === index
        ? { ...section, [field]: { ...section[field], [activeLocale]: value } }
        : section,
    );
    patch({ sections });
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= policy.sections.length) return;
    const sections = [...policy.sections];
    [sections[index], sections[target]] = [sections[target], sections[index]];
    patch({ sections: sections.map((section, i) => ({ ...section, order: i })) });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="typography-card-title text-hierarchy-title">
          {t('admin.returns.policyEditor.title')}
        </h2>
        <p className="mt-1 typography-micro text-muted-foreground">
          {t('admin.returns.policyEditor.description')}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="policy-return-window">
            {t('admin.returns.policyEditor.returnWindow')}
          </Label>
          <Input
            id="policy-return-window"
            type="number"
            min={1}
            max={365}
            value={policy.returnWindowDays}
            onChange={(event) =>
              patch({ returnWindowDays: Number(event.target.value) || 1 })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="policy-exchange-window">
            {t('admin.returns.policyEditor.exchangeWindow')}
          </Label>
          <Input
            id="policy-exchange-window"
            type="number"
            min={1}
            max={365}
            value={policy.exchangeWindowDays}
            onChange={(event) =>
              patch({ exchangeWindowDays: Number(event.target.value) || 1 })
            }
          />
        </div>

        <label className="flex items-end gap-3 pb-2 text-sm">
          <Switch
            checked={policy.freeReturnShipping}
            onCheckedChange={(checked) => patch({ freeReturnShipping: checked })}
          />
          {t('admin.returns.policyEditor.freeShipping')}
        </label>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="typography-label text-hierarchy-label">
            {t('admin.returns.policyEditor.sections')}
          </p>
          {/* One tab per language: the same section, different text. */}
          <div className="flex gap-1 rounded-md border border-border p-1">
            {SUPPORTED_LOCALES.map((locale) => (
              <button
                key={locale}
                type="button"
                onClick={() => setActiveLocale(locale as PolicyLocale)}
                className={
                  locale === activeLocale
                    ? 'rounded px-3 py-1 text-xs font-semibold uppercase bg-muted text-foreground'
                    : 'rounded px-3 py-1 text-xs uppercase text-muted-foreground hover:text-foreground'
                }
              >
                {locale}
              </button>
            ))}
          </div>
        </div>

        {policy.sections.map((section, index) => (
          <div
            key={section.key}
            className="space-y-3 rounded-lg border border-border p-4"
          >
            <div className="space-y-2">
              <Label htmlFor={`policy-title-${index}`}>
                {t('admin.returns.policyEditor.sectionTitle')}
              </Label>
              <Input
                id={`policy-title-${index}`}
                value={section.title[activeLocale] || ''}
                onChange={(event) => patchSection(index, 'title', event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`policy-body-${index}`}>
                {t('admin.returns.policyEditor.sectionBody')}
              </Label>
              <Textarea
                id={`policy-body-${index}`}
                rows={3}
                value={section.body[activeLocale] || ''}
                onChange={(event) => patchSection(index, 'body', event.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => move(index, -1)}
                disabled={index === 0}
              >
                {t('admin.returns.policyEditor.moveUp')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => move(index, 1)}
                disabled={index === policy.sections.length - 1}
              >
                {t('admin.returns.policyEditor.moveDown')}
              </Button>
              <Button
                type="button"
                variant="ghost-secondary"
                size="sm"
                onClick={() =>
                  patch({
                    sections: policy.sections.filter((_, i) => i !== index),
                  })
                }
              >
                {t('admin.returns.policyEditor.removeSection')}
              </Button>
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            patch({
              sections: [
                ...policy.sections,
                {
                  key: `section-${Date.now().toString(36)}`,
                  title: { en: '', bn: '', de: '' },
                  body: { en: '', bn: '', de: '' },
                  order: policy.sections.length,
                },
              ],
            })
          }
        >
          {t('admin.returns.policyEditor.addSection')}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <Button onClick={() => save(policy)} disabled={saving}>
          {saving
            ? t('admin.returns.policyEditor.saving')
            : t('admin.returns.policyEditor.save')}
        </Button>
        <Button
          variant="outline"
          onClick={() => setPolicy(DEFAULT_RETURN_POLICY)}
          disabled={saving}
        >
          {t('admin.returns.policyEditor.restoreDefaults')}
        </Button>
      </div>
    </div>
  );
}

export default ReturnPolicyEditor;
