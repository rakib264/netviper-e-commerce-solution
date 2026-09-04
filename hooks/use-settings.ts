'use client';

import { useEffect, useRef, useState } from 'react';
import type { CurrencyCode } from '@/lib/currency/config';
import type { Locale } from '@/lib/i18n/config';
import type { TypographySettings } from '@/lib/theme/typography';

interface GeneralSettings {
  siteName: string;
  siteDescription: string;
  contactEmail: string;
  contactPhone: string;
  contactPerson: string;
  address: string;
  logo1: string;
  logo2: string;
  favicon: string;
  primaryColor: string;
  secondaryColor: string;
  location: {
    address: string;
    latitude: number;
    longitude: number;
    formattedAddress?: string;
  };
  socialLinks?: {
    facebook?: string;
    youtube?: string;
    instagram?: string;
    tiktok?: string;
  };
  currency: CurrencyCode;
  timezone: string;
  language: Locale;
  typography?: TypographySettings;
  typographyCssVariables?: Record<string, string>;
  typographyStylesheetHref?: string | null;
  themeVersion?: number;
}

interface CourierSettingsPublic {
  insideDhaka: number;
  outsideDhaka: number;
}

/**
 * One in-flight request per endpoint, and one cached answer per page view.
 *
 * `useSettings` is mounted four times on the homepage alone — the header, the
 * footer, the newsletter band and the favicon provider — and each mount used to
 * issue its own `no-store` request for the same document. On top of that,
 * `no-store` forbade the browser from reusing a response it had received
 * milliseconds earlier.
 *
 * The cache is module scope, so it lives for the page view and is dropped on
 * navigation to a fresh document — the same lifetime the settings themselves
 * are stable for. `refreshSettingsCache` exists for the admin, which changes
 * these values and needs the next read to see the change.
 */
type SettingsEndpoint = '/api/settings/general' | '/api/settings/courier';

const settingsCache = new Map<SettingsEndpoint, unknown>();
const settingsInFlight = new Map<SettingsEndpoint, Promise<unknown>>();

async function loadSettings<T>(endpoint: SettingsEndpoint): Promise<T> {
  const cached = settingsCache.get(endpoint);
  if (cached !== undefined) return cached as T;

  const pending = settingsInFlight.get(endpoint);
  if (pending) return pending as Promise<T>;

  const request = fetch(endpoint)
    .then(async (response) => {
      if (!response.ok) throw new Error(`Settings request failed: ${response.status}`);
      const data = await response.json();
      settingsCache.set(endpoint, data);
      return data;
    })
    .finally(() => {
      settingsInFlight.delete(endpoint);
    });

  settingsInFlight.set(endpoint, request);
  return request as Promise<T>;
}

/** Drop the client-side settings cache, so the next mount refetches. */
export function refreshSettingsCache(): void {
  settingsCache.clear();
  settingsInFlight.clear();
}

// The admin settings screen already announces a save with this event, which the
// theme provider listens for. The settings cache listens to the same one, so an
// admin saving the site name sees it without a reload.
if (typeof window !== 'undefined') {
  window.addEventListener('theme-settings-updated', refreshSettingsCache);
}

// Backward-compatible general settings hook
// Priority: Backend Database → Environment Variables → Empty
export function useSettings() {
  const [settings, setSettings] = useState<GeneralSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // API already handles: Database → Env Vars → Empty
        const data = await loadSettings<GeneralSettings>('/api/settings/general');
        if (isMounted.current) setSettings(data);
      } catch (err) {
        // On error, set empty settings
        setSettings(null);
        setError('Error fetching settings');
        console.error('Error fetching settings:', err);
      } finally {
        if (isMounted.current) setLoading(false);
      }
    };

    fetchSettings();
    return () => { isMounted.current = false; };
  }, []);

  return { settings, loading, error };
}

// Dedicated courier settings hook
// Priority: Backend Database → Environment Variables → Empty
export function useCourierSettings() {
  const [settings, setSettings] = useState<CourierSettingsPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await loadSettings<CourierSettingsPublic>('/api/settings/courier');
        if (isMounted.current) setSettings(data);
      } catch (err) {
        // On error, use default values
        setSettings({
          insideDhaka: 0,
          outsideDhaka: 0
        });
        setError('Error fetching courier settings');
        console.error('Error fetching courier settings:', err);
      } finally {
        if (isMounted.current) setLoading(false);
      }
    };

    fetchSettings();
    return () => { isMounted.current = false; };
  }, []);

  return { settings, loading, error };
}
