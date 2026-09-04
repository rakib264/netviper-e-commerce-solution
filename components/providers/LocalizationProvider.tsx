'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  formatCurrency,
  setActiveCurrency,
  type FormatCurrencyOptions,
} from '@/lib/currency/format';
import {
  DEFAULT_CURRENCY,
  getCurrencyMeta,
  normalizeCurrency,
  type CurrencyCode,
  type CurrencyMeta,
} from '@/lib/currency/config';
import {
  DEFAULT_ALLOWED_LOCALES,
  DEFAULT_LOCALE,
  getLocaleMeta,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_COOKIE_NAME,
  LOCALE_REGISTRY,
  LOCALE_STORAGE_KEY,
  normalizeAllowedLocales,
  normalizeLocale,
  resolveActiveLocale,
  type Locale,
  type LocaleMeta,
} from '@/lib/i18n/config';
import {
  translate,
  translatePlural,
  type TranslationKey,
  type TranslationValues,
} from '@/lib/i18n/dictionary';
import { setActiveLocale } from '@/lib/i18n/runtime';

/**
 * The translator, as a standalone type. Validation schemas and other non-React
 * helpers take this as a parameter so their copy can be translated without them
 * having to be React components.
 */
export type Translate = (
  key: TranslationKey | (string & {}),
  values?: TranslationValues,
) => string;

/** Shared with ThemeProvider — one save bumps both theme and localization. */
const THEME_VERSION_STORAGE_KEY = 'theme-settings-version';
const SETTINGS_UPDATED_EVENT = 'theme-settings-updated';

interface LocalizationContextValue {
  /** The language actually being rendered. */
  locale: Locale;
  localeMeta: LocaleMeta;
  /** Site default, from admin settings. */
  defaultLocale: Locale;
  /** Languages the visitor may switch to, in registry order. */
  allowedLocales: Locale[];
  allowedLocaleMeta: LocaleMeta[];
  /** Switch language for this visitor and remember the choice. */
  setLocale: (locale: Locale) => void;
  currency: CurrencyCode;
  currencyMeta: CurrencyMeta;
  currencySymbol: string;
  t: (key: TranslationKey | (string & {}), values?: TranslationValues) => string;
  tPlural: (
    key: TranslationKey | (string & {}),
    count: number,
    values?: TranslationValues,
  ) => string;
  formatPrice: (value: number, options?: FormatCurrencyOptions) => string;
  refresh: () => Promise<void>;
}

const LocalizationContext = createContext<LocalizationContextValue | undefined>(
  undefined,
);

interface LocalizationProviderProps {
  children: React.ReactNode;
  /**
   * Server-resolved values, so the first paint is already in the right language.
   * `initialLocale` has the visitor's cookie already applied by the layout — the
   * client must not re-derive it during render, or SSR and hydration disagree.
   */
  initialLocale?: string | null;
  initialDefaultLocale?: string | null;
  initialAllowedLocales?: string[] | null;
  initialCurrency?: string | null;
}

/** Mirrors the cookie the server read, so a later reload resolves identically. */
function persistLocaleChoice(locale: Locale) {
  if (typeof document === 'undefined') return;

  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie =
    `${LOCALE_COOKIE_NAME}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}` +
    `; SameSite=Lax${secure}`;

  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Private mode or blocked storage — the cookie alone is enough.
  }
}

export function LocalizationProvider({
  children,
  initialLocale,
  initialDefaultLocale,
  initialAllowedLocales,
  initialCurrency,
}: LocalizationProviderProps) {
  const [defaultLocale, setDefaultLocale] = useState<Locale>(() =>
    normalizeLocale(initialDefaultLocale ?? initialLocale, DEFAULT_LOCALE),
  );
  const [allowedLocales, setAllowedLocales] = useState<Locale[]>(() =>
    normalizeAllowedLocales(
      initialAllowedLocales ?? DEFAULT_ALLOWED_LOCALES,
      normalizeLocale(initialDefaultLocale ?? initialLocale, DEFAULT_LOCALE),
    ),
  );
  const [locale, setLocaleState] = useState<Locale>(() =>
    normalizeLocale(initialLocale, DEFAULT_LOCALE),
  );
  const [currency, setCurrency] = useState<CurrencyCode>(() =>
    normalizeCurrency(initialCurrency, DEFAULT_CURRENCY),
  );

  // Written during render, not in an effect: non-hook helpers such as
  // `formatBDTCurrency()` and `t()` read the module singletons synchronously
  // while children render, so an effect would leave the first paint (and the
  // SSR output it must match) on the fallback locale and currency.
  setActiveLocale(locale);
  setActiveCurrency(currency);

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/settings/general', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });
      if (!response.ok || !isMounted.current) return;

      const settings = await response.json();
      if (!isMounted.current) return;

      const nextDefault = normalizeLocale(settings?.language, DEFAULT_LOCALE);
      const nextAllowed = normalizeAllowedLocales(
        settings?.allowedLanguages,
        nextDefault,
      );

      setDefaultLocale(nextDefault);
      setAllowedLocales(nextAllowed);
      // An admin narrowing the allow-list must be able to pull a visitor off a
      // language that is no longer offered, so the visitor's choice is re-resolved
      // rather than simply kept.
      setLocaleState((current) =>
        resolveActiveLocale({
          requested: current,
          defaultLocale: nextDefault,
          allowedLocales: nextAllowed,
        }),
      );
      setCurrency(normalizeCurrency(settings?.currency, DEFAULT_CURRENCY));
    } catch (error) {
      console.error('Error refreshing localization settings:', error);
    }
  }, []);

  // Same signals ThemeProvider listens to: an in-tab custom event after an admin
  // save, and the storage key for every other open tab.
  useEffect(() => {
    const onSettingsUpdate = () => {
      void refresh();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_VERSION_STORAGE_KEY) return;
      void refresh();
    };

    window.addEventListener(SETTINGS_UPDATED_EVENT, onSettingsUpdate);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(SETTINGS_UPDATED_EVENT, onSettingsUpdate);
      window.removeEventListener('storage', onStorage);
    };
  }, [refresh]);

  const setLocale = useCallback(
    (next: Locale) => {
      const resolved = resolveActiveLocale({
        requested: next,
        defaultLocale,
        allowedLocales,
      });
      persistLocaleChoice(resolved);
      setLocaleState(resolved);
    },
    [allowedLocales, defaultLocale],
  );

  // Recovery only: if the cookie was dropped (cleared site data, a cookie banner)
  // but the mirror survived, restore the choice and rewrite the cookie. Runs in an
  // effect rather than during render because it must not affect the SSR match.
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    } catch {
      return;
    }
    if (!stored) return;

    const hasCookie = document.cookie
      .split('; ')
      .some((entry) => entry.startsWith(`${LOCALE_COOKIE_NAME}=`));
    if (hasCookie) return;

    const resolved = resolveActiveLocale({
      requested: stored,
      defaultLocale,
      allowedLocales,
    });
    persistLocaleChoice(resolved);
    setLocaleState(resolved);
  }, [allowedLocales, defaultLocale]);

  // Keep the document in sync so screen readers, hyphenation and `:lang()` rules
  // follow the configured language.
  useEffect(() => {
    const meta = getLocaleMeta(locale);
    document.documentElement.lang = meta.intlLocale;
    document.documentElement.dir = meta.dir;
  }, [locale]);

  const value = useMemo<LocalizationContextValue>(() => {
    const currencyMeta = getCurrencyMeta(currency);
    return {
      locale,
      localeMeta: getLocaleMeta(locale),
      defaultLocale,
      allowedLocales,
      allowedLocaleMeta: allowedLocales.map((code) => LOCALE_REGISTRY[code]),
      setLocale,
      currency,
      currencyMeta,
      currencySymbol: currencyMeta.symbol,
      t: (key, values) => translate(locale, key, values),
      tPlural: (key, count, values) => translatePlural(locale, key, count, values),
      formatPrice: (amount, options) =>
        formatCurrency(amount, { currency, ...options }),
      refresh,
    };
  }, [allowedLocales, currency, defaultLocale, locale, refresh, setLocale]);

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
}

/**
 * Localization for components. Falls back to the module defaults rather than
 * throwing, so a component can be rendered in isolation (tests, Storybook-style
 * previews) without a provider above it.
 */
export function useLocalization(): LocalizationContextValue {
  const context = useContext(LocalizationContext);
  if (context) return context;

  const currencyMeta = getCurrencyMeta(DEFAULT_CURRENCY);
  return {
    locale: DEFAULT_LOCALE,
    localeMeta: getLocaleMeta(DEFAULT_LOCALE),
    defaultLocale: DEFAULT_LOCALE,
    allowedLocales: [...DEFAULT_ALLOWED_LOCALES],
    allowedLocaleMeta: DEFAULT_ALLOWED_LOCALES.map((code) => LOCALE_REGISTRY[code]),
    setLocale: () => {},
    currency: DEFAULT_CURRENCY,
    currencyMeta,
    currencySymbol: currencyMeta.symbol,
    t: (key, values) => translate(DEFAULT_LOCALE, key, values),
    tPlural: (key, count, values) =>
      translatePlural(DEFAULT_LOCALE, key, count, values),
    formatPrice: (amount, options) => formatCurrency(amount, options),
    refresh: async () => {},
  };
}

/** `const { t } = useTranslation();` */
export function useTranslation() {
  const { t, tPlural, locale, localeMeta } = useLocalization();
  return { t, tPlural, locale, localeMeta };
}

/** Everything the storefront language switcher needs. */
export function useLocaleSwitcher() {
  const { locale, localeMeta, allowedLocales, allowedLocaleMeta, setLocale } =
    useLocalization();
  return { locale, localeMeta, allowedLocales, allowedLocaleMeta, setLocale };
}

/** `const { formatPrice, currencySymbol } = useCurrency();` */
export function useCurrency() {
  const { currency, currencyMeta, currencySymbol, formatPrice } = useLocalization();
  return { currency, currencyMeta, currencySymbol, formatPrice };
}
