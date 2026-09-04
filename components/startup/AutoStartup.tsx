'use client';

import { useEffect } from 'react';

/**
 * Development-only queue health probe.
 *
 * `/api/startup` reads the Upstash queue stats and this component discarded the
 * answer — nothing on the storefront reacts to it. On every page view, for every
 * visitor, that was a Redis round trip (~360ms in a local measurement) competing
 * with the requests the page actually needs, and one more serverless invocation
 * per visit in production.
 *
 * Kept for local development, where seeing the queue wake up is useful.
 */
export default function AutoStartup() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;

    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch('/api/startup', { signal: controller.signal }).catch((error) => {
        if ((error as Error)?.name !== 'AbortError') {
          console.error('Startup initialization error:', error);
        }
      });
    }, 1000);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  return null;
}
