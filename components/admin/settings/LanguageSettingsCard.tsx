'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  LOCALE_LIST,
  normalizeAllowedLocales,
  normalizeLocale,
  type Locale,
} from '@/lib/i18n/config';
import { translate } from '@/lib/i18n/dictionary';
import { cn } from '@/lib/utils';
import { Check, Info, Languages } from 'lucide-react';
import { useMemo } from 'react';

interface LanguageSettingsCardProps {
  /** Site default language. */
  value: string;
  onChange: (locale: Locale) => void;
  /** Languages offered in the storefront switcher. */
  allowed: string[];
  onAllowedChange: (allowed: Locale[]) => void;
}

/** A handful of high-traffic strings, enough to judge a translation at a glance. */
const PREVIEW_KEYS: Array<{ key: string; context: string }> = [
  { key: 'nav.signIn', context: 'Header' },
  { key: 'nav.wishlist', context: 'Header' },
  { key: 'product.addToCart', context: 'Product card' },
  { key: 'cart.checkout', context: 'Cart drawer' },
  { key: 'footer.newsletterSignUp', context: 'Footer' },
];

export function LanguageSettingsCard({
  value,
  onChange,
  allowed,
  onAllowedChange,
}: LanguageSettingsCardProps) {
  const selected = normalizeLocale(value);
  const allowedLocales = useMemo(
    () => normalizeAllowedLocales(allowed, selected),
    [allowed, selected],
  );

  const preview = useMemo(
    () =>
      PREVIEW_KEYS.map((entry) => ({
        ...entry,
        translated: translate(selected, entry.key),
        english: translate('en', entry.key),
      })),
    [selected],
  );

  const toggleAllowed = (locale: Locale, next: boolean) => {
    // The default can never be switched off — normalizeAllowedLocales would add
    // it straight back, so the checkbox is disabled rather than silently ignored.
    if (locale === selected) return;

    const nextAllowed = next
      ? [...allowedLocales, locale]
      : allowedLocales.filter((code) => code !== locale);

    onAllowedChange(normalizeAllowedLocales(nextAllowed, selected));
  };

  const selectDefault = (locale: Locale) => {
    onChange(locale);
    // Promoting a language to default implies offering it.
    onAllowedChange(normalizeAllowedLocales(allowedLocales, locale));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Languages size={20} />
          <span>Language</span>
        </CardTitle>
        <p className="font-paragraph text-sm text-muted-foreground">
          Choose which languages visitors can switch between, and which one they
          see by default. Any key a translation is missing falls back to English,
          so a partial translation never leaves a blank on the page.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Label>Allowed languages</Label>
            <span className="font-caption text-xs text-subtle-foreground">
              Shown in the storefront language switcher
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {LOCALE_LIST.map((locale) => {
              const isAllowed = allowedLocales.includes(locale.code);
              const isDefault = locale.code === selected;
              return (
                <label
                  key={locale.code}
                  htmlFor={`allowed-${locale.code}`}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all',
                    isAllowed
                      ? 'border-ring ring-2 ring-ring/30'
                      : 'border-border hover:border-ring/60',
                    isDefault && 'cursor-default',
                  )}
                >
                  <Checkbox
                    id={`allowed-${locale.code}`}
                    checked={isAllowed}
                    disabled={isDefault}
                    onCheckedChange={(next) =>
                      toggleAllowed(locale.code, next === true)
                    }
                    className="mt-0.5"
                  />
                  <span className="min-w-0">
                    <span className="block font-title text-sm font-medium text-foreground">
                      {locale.label}
                    </span>
                    <span className="mt-0.5 block truncate font-paragraph text-sm text-muted-foreground">
                      {locale.nativeLabel}
                    </span>
                    <span className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="font-label text-[11px] uppercase tracking-wide text-subtle-foreground">
                        {locale.code} · {locale.intlLocale}
                      </span>
                      {isDefault ? (
                        <Badge variant="outline" className="font-label text-[10px]">
                          Default
                        </Badge>
                      ) : null}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <Label>Default language</Label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {LOCALE_LIST.map((locale) => {
              const active = locale.code === selected;
              return (
                <button
                  key={locale.code}
                  type="button"
                  onClick={() => selectDefault(locale.code)}
                  aria-pressed={active}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-lg border p-3 text-left transition-all',
                    active
                      ? 'border-ring ring-2 ring-ring/30'
                      : 'border-border hover:border-ring/60',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block font-title text-sm font-medium text-foreground">
                      {locale.label}
                    </span>
                    <span className="mt-0.5 block truncate font-caption text-xs text-subtle-foreground">
                      {locale.nativeLabel}
                    </span>
                  </span>
                  {active ? (
                    <Check size={16} className="shrink-0 text-foreground" />
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="flex gap-3 rounded-lg border border-border p-3">
            <Info size={15} className="mt-0.5 shrink-0 text-muted-foreground" />
            <p className="font-paragraph text-sm text-muted-foreground">
              Visitors who have not picked a language see the default. A visitor&apos;s
              own choice is remembered in their browser, and falls back to the
              default if you later stop offering that language.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label>Preview</Label>
            <Badge variant="outline" className="font-label text-[11px]">
              locales/{selected}.json
            </Badge>
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            {preview.map((entry, index) => {
              const untranslated = selected !== 'en' && entry.translated === entry.english;
              return (
                <div
                  key={entry.key}
                  className={cn(
                    'flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3',
                    index > 0 && 'border-t border-border',
                  )}
                >
                  <span className="font-caption text-xs text-subtle-foreground">
                    {entry.context} · {entry.key}
                  </span>
                  <div className="flex items-center gap-2 font-paragraph text-sm text-foreground">
                    {entry.translated}
                    {untranslated ? (
                      <Badge variant="outline" className="font-label text-[10px]">
                        English fallback
                      </Badge>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="font-caption text-xs text-subtle-foreground">
            Add or edit copy in <code>locales/&lt;code&gt;.json</code>. Keys are shared
            across every language, so a new key added to English becomes available
            everywhere immediately.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
