'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseAdminResourceOptions<T> {
  /**
   * The request URL, rebuilt by the caller whenever a filter changes. It is a
   * plain string on purpose: a primitive dependency cannot churn its identity
   * between renders the way an options object or a callback would.
   */
  url: string;
  /** Pull the payload out of the response envelope. Held in a ref, so an inline lambda is fine. */
  select: (payload: any) => T;
  initialData: T;
  /** Skip fetching entirely — e.g. a tab that has not been opened yet. */
  enabled?: boolean;
  /** Wait this long before firing, for search-as-you-type. */
  debounceMs?: number;
  /** Called with a human-readable message when a request fails. Held in a ref. */
  onError?: (message: string) => void;
}

interface AdminResource<T> {
  data: T;
  /** Local writes, for optimistic updates. */
  setData: React.Dispatch<React.SetStateAction<T>>;
  /** True only until the first response settles — this is what gates a skeleton. */
  loading: boolean;
  /** True for every later request, so content can stay on screen while it updates. */
  refreshing: boolean;
  /** Stable identity. Safe in an effect dependency list or a child's props. */
  refresh: () => Promise<void>;
}

/**
 * Fetch a list for one admin screen, once per meaningful change.
 *
 * Every guard here exists because of a way this went wrong:
 *
 * - `select` / `onError` live in refs. `useToastWithTypes()` returns fresh
 *   closures on every render, so depending on one directly makes the fetch
 *   callback — and any effect that lists it — re-run forever.
 * - The in-flight request is aborted whenever a newer one starts, and a response
 *   whose id is no longer the newest is dropped. Typing in a search box cannot
 *   land an old result on top of a new one.
 * - `loading` latches false after the first settle. Refetching a filter or
 *   reloading after a save reports `refreshing` instead, so the list stays put
 *   rather than collapsing into a skeleton and flickering back.
 */
export function useAdminResource<T>({
  url,
  select,
  initialData,
  enabled = true,
  debounceMs = 0,
  onError,
}: UseAdminResourceOptions<T>): AdminResource<T> {
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);

  const selectRef = useRef(select);
  selectRef.current = select;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const urlRef = useRef(url);
  urlRef.current = url;

  const hasLoadedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const refresh = useCallback(async () => {
    // Only the newest request matters; drop whatever is still in flight.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = ++requestIdRef.current;

    if (hasLoadedRef.current) setRefreshing(true);

    try {
      const response = await fetch(urlRef.current, {
        cache: 'no-store',
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || `Request failed (${response.status})`);
      }
      if (requestId !== requestIdRef.current || !mountedRef.current) return;
      setData(selectRef.current(payload));
      hasLoadedRef.current = true;
    } catch (thrown: any) {
      if (thrown?.name === 'AbortError') return;
      if (requestId !== requestIdRef.current || !mountedRef.current) return;
      hasLoadedRef.current = true;
      onErrorRef.current?.(thrown?.message || 'Request failed');
    } finally {
      // A superseded request must not clear the flags the newer one just set.
      if (requestId === requestIdRef.current && mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (!debounceMs) {
      refresh();
      return;
    }
    const timer = setTimeout(refresh, debounceMs);
    return () => clearTimeout(timer);
    // `url` is a string and `refresh` is stable, so this runs on real changes only.
  }, [url, enabled, debounceMs, refresh]);

  return { data, setData, loading, refreshing, refresh };
}

export default useAdminResource;
