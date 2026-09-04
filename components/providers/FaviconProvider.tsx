'use client';

import { useSettings } from '@/hooks/use-settings';
import { useEffect } from 'react';

export function FaviconProvider() {
  const { settings } = useSettings();

  useEffect(() => {
    if (settings?.favicon && typeof window !== 'undefined') {
      // Update favicon
      let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      
      link.href = settings.favicon;
      
      // Also update apple-touch-icon if exists
      const appleTouchIcon = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
      if (appleTouchIcon) {
        appleTouchIcon.href = settings.favicon;
      }
      
      // Update title if needed
      if (settings.siteName) {
        document.title = settings.siteName;
      }
    }
  }, [settings]);

  return null; // This component doesn't render anything
}
