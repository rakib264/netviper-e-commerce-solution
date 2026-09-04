'use client';

import { useEffect, useState } from 'react';

/**
 * A homepage section's data: whatever the server already resolved, or a client
 * fetch when it resolved nothing.
 *
 * Every band on the homepage used to own this logic and get it slightly
 * differently: `useState([])` plus `loading: true` plus an effect that fetched
 * with `cache: 'no-store'`. That is what made the page a wall of skeletons — the
 * markup could not contain content until the bundle had hydrated and a request
 * had come back.
 *
 * Now the server resolves each section up front and passes it in. `serverData`
 * present means the component starts loaded: `loading` is `false` on the very
 * first render, so the skeleton is never mounted at all and the section is in
 * the server HTML. `serverData` of `null` means the component was rendered
 * outside the homepage's server path, and the fetch is the fallback.
 *
 * The distinction between `null` and `[]` is load-bearing: `[]` is a resolved
 * empty result and must render the section's empty state, not a skeleton.
 */
export function useSectionData<T>(
  serverData: T | null | undefined,
  fetcher: (signal: AbortSignal) => Promise<T>,
  /** Values that change what the fetcher asks for. */
  deps: readonly unknown[] = [],
): { data: T | null; loading: boolean } {
  const hasServerData = serverData !== null && serverData !== undefined;
  const [data, setData] = useState<T | null>(hasServerData ? serverData : null);
  const [loading, setLoading] = useState(!hasServerData);

  useEffect(() => {
    if (hasServerData) {
      setData(serverData);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    fetcher(controller.signal)
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch((error) => {
        if (cancelled || (error as Error)?.name === 'AbortError') return;
        setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
    // `fetcher` is re-created every render by design; `deps` names what actually
    // changes the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasServerData, serverData, ...deps]);

  return { data, loading };
}

export default useSectionData;
