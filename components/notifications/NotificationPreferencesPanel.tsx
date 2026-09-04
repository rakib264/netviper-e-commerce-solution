'use client';

import { useTranslation } from '@/components/providers/LocalizationProvider';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import type { INotificationPreferences } from '@/lib/models/User';
import { cn } from '@/lib/utils';
import { useCallback, useEffect, useState } from 'react';

type PreferenceToggle =
  | { group: 'push'; field: 'enabled' | 'orderUpdates' | 'marketing' }
  | { group: 'inApp'; field: 'enabled' };

// An intersection rather than an `extends`: `PreferenceToggle` is a union that
// pairs each group with only the fields that group actually has, which is what
// stops a row from asking for `inApp.marketing`.
type ToggleRow = PreferenceToggle & {
  labelKey: string;
  helpKey: string;
  /** Rendered disabled while its parent channel is switched off. */
  dependsOnPushEnabled?: boolean;
};

/**
 * Only the channels the policy engine actually enforces today.
 *
 * `email` and `sms` exist on the model, deliberately unexposed: the email
 * pipeline still has its own opt-in handling, and offering a switch that does
 * not yet govern anything would be a lie in the UI.
 */
const ROWS: ToggleRow[] = [
  {
    group: 'push',
    field: 'enabled',
    labelKey: 'notifications.preferences.pushEnabled',
    helpKey: 'notifications.preferences.pushEnabledHelp',
  },
  {
    group: 'push',
    field: 'orderUpdates',
    labelKey: 'notifications.preferences.pushOrderUpdates',
    helpKey: 'notifications.preferences.pushOrderUpdatesHelp',
    dependsOnPushEnabled: true,
  },
  {
    group: 'push',
    field: 'marketing',
    labelKey: 'notifications.preferences.pushMarketing',
    helpKey: 'notifications.preferences.pushMarketingHelp',
    dependsOnPushEnabled: true,
  },
  {
    group: 'inApp',
    field: 'enabled',
    labelKey: 'notifications.preferences.inAppEnabled',
    helpKey: 'notifications.preferences.inAppEnabledHelp',
  },
];

/**
 * The customer's notification switches.
 *
 * Each toggle saves on change — no separate save button, because a single
 * boolean has nothing to review before committing. The optimistic flip is
 * reverted if the request fails, so the switch never shows a state the server
 * did not accept.
 */
export function NotificationPreferencesPanel() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<INotificationPreferences | null>(
    null,
  );
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/profile/notification-preferences', { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((payload) => setPreferences(payload.preferences))
      .catch((error) => {
        if ((error as Error)?.name !== 'AbortError') setPreferences(null);
      });

    return () => controller.abort();
  }, []);

  const update = useCallback(
    async (toggle: PreferenceToggle, value: boolean) => {
      if (!preferences) return;

      const key = `${toggle.group}.${toggle.field}`;
      const previous = preferences;
      const next = {
        ...preferences,
        [toggle.group]: { ...preferences[toggle.group], [toggle.field]: value },
      } as INotificationPreferences;

      setPreferences(next);
      setSaving(key);

      try {
        const response = await fetch('/api/profile/notification-preferences', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            [toggle.group]: { [toggle.field]: value },
          }),
        });
        if (!response.ok) throw new Error('request failed');
        const payload = await response.json();
        setPreferences(payload.preferences);
        toast({
          title: t('notifications.preferences.saved'),
          variant: 'success',
        });
      } catch {
        setPreferences(previous);
        toast({
          title: t('notifications.preferences.saveError'),
          variant: 'error',
        });
      } finally {
        setSaving(null);
      }
    },
    [preferences, t, toast],
  );

  if (!preferences) {
    return (
      <div className="space-y-3" aria-busy>
        {ROWS.map((row) => (
          <div
            key={`${row.group}.${row.field}`}
            className="h-14 animate-pulse rounded-xl bg-muted"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {ROWS.map((row) => {
        const key = `${row.group}.${row.field}`;
        const checked = Boolean(
          (preferences[row.group] as Record<string, boolean>)[row.field],
        );
        const disabled =
          saving === key ||
          (row.dependsOnPushEnabled && !preferences.push.enabled);

        return (
          <div
            key={key}
            className={cn(
              'flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0',
              disabled && row.dependsOnPushEnabled && 'opacity-55',
            )}
          >
            <div className="min-w-0">
              <p className="typography-label text-hierarchy-label">
                {t(row.labelKey)}
              </p>
              <p className="mt-0.5 typography-micro text-muted-foreground">
                {t(row.helpKey)}
              </p>
            </div>
            <Switch
              checked={checked}
              disabled={disabled}
              onCheckedChange={(value) => update(row, value)}
              aria-label={t(row.labelKey)}
            />
          </div>
        );
      })}
    </div>
  );
}

export default NotificationPreferencesPanel;
