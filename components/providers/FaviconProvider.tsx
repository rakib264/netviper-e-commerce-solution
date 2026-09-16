'use client';

import { useSettings } from '@/hooks/use-settings';
import { useEffect } from 'react';

/**
 * Swap the favicon to the one configured in `/admin/settings`.
 *
 * Deliberately does *not* touch `document.title`. It used to overwrite the
 * title with `settings.siteName` on every settings load, which flattened every
 * page-specific title the moment the page hydrated: the server sent
 * "Buldak 2x Spicy | Ramen Bhai" and the browser replaced it with "Ramen Bhai"
 * a few hundred milliseconds later. Titles belong to `buildMetadata`, which
 * renders them on the server where a crawler can see them.
 */
export function FaviconProvider() {
  const { settings } = useSettings();

  useEffect(() => {
    if (!settings?.favicon || typeof window === 'undefined') return;

    let link = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = settings.favicon;

    const appleTouchIcon =
      document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']");
    if (appleTouchIcon) appleTouchIcon.href = settings.favicon;
  }, [settings]);

  return null;
}
