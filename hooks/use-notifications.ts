'use client';

import { playNotificationSound } from '@/lib/notifications/sound';
import type { NotificationDTO } from '@/lib/notifications/serialize';
import { useCallback, useEffect, useRef, useState } from 'react';

interface NotificationsState {
  notifications: NotificationDTO[];
  unreadCount: number;
  loading: boolean;
  error: boolean;
}

const INITIAL_STATE: NotificationsState = {
  notifications: [],
  unreadCount: 0,
  loading: true,
  error: false,
};

export interface UseNotificationsOptions {
  /** Skip fetching entirely — used while the session is still resolving. */
  enabled?: boolean;
  /** How many rows the bell shows. */
  limit?: number;
  /**
   * Chime when a previously unseen unread notification appears. Off for a
   * second mount of the hook on the same page, so one page cannot double-beep.
   */
  sound?: boolean;
}

/**
 * Background refresh interval.
 *
 * 60s, and only while the tab is visible — a hidden tab polling for a badge
 * nobody is looking at is pure cost, and push already covers the case where a
 * notification has to reach someone who is away. Combined with the
 * visibility-regain refresh below, an idle open tab costs one request a minute
 * and a backgrounded one costs nothing.
 */
const REFRESH_INTERVAL_MS = 60_000;

/**
 * The notification inbox for the signed-in user.
 *
 * Fetched once on mount and then only in response to something happening: no
 * polling interval. A bell that polls every thirty seconds is a request per
 * visitor per thirty seconds for a badge that is usually zero, and push already
 * covers the case where a notification needs to reach someone who is not
 * looking. Refetching is explicit — `refresh()` — and the OneSignal foreground
 * hook is the natural place to call it from later.
 *
 * Both mutations are optimistic and self-correcting: the badge moves
 * immediately, and the server's own `unreadCount` overwrites the guess when the
 * response lands. A failed request rolls the optimistic change back, so the
 * badge can never drift permanently out of step with the database.
 */
export function useNotifications({
  enabled = true,
  limit = 12,
  sound = false,
}: UseNotificationsOptions = {}) {
  const [state, setState] = useState<NotificationsState>(INITIAL_STATE);
  const mounted = useRef(true);
  /**
   * Ids already shown to this visitor.
   *
   * Tracked as a set rather than by comparing unread *counts*: reading one
   * notification while another arrives nets zero change in the count, and that
   * new one still deserves a chime. The first successful load only seeds the
   * set — arriving at a page with a full inbox is not an event.
   */
  const seenIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const response = await fetch(`/api/notifications?limit=${limit}`, { signal });
        if (!response.ok) throw new Error('request failed');
        const payload = await response.json();
        if (!mounted.current) return;

        const notifications: NotificationDTO[] = payload.notifications || [];

        const previouslySeen = seenIds.current;
        const isFirstLoad = previouslySeen === null;
        const hasNewUnread = notifications.some(
          (item) => !item.read && !previouslySeen?.has(item._id),
        );
        seenIds.current = new Set(notifications.map((item) => item._id));

        setState({
          notifications,
          unreadCount: payload.unreadCount || 0,
          loading: false,
          error: false,
        });

        // Not on the first load, and not for a tab nobody is looking at — the
        // push notification is what reaches someone who is away.
        if (
          sound &&
          !isFirstLoad &&
          hasNewUnread &&
          typeof document !== 'undefined' &&
          document.visibilityState === 'visible'
        ) {
          playNotificationSound();
        }
      } catch (error) {
        if ((error as Error)?.name === 'AbortError' || !mounted.current) return;
        setState((previous) => ({ ...previous, loading: false, error: true }));
      }
    },
    [limit, sound],
  );

  useEffect(() => {
    if (!enabled) {
      setState((previous) => ({ ...previous, loading: false }));
      return;
    }

    const controller = new AbortController();
    load(controller.signal);

    /*
     * Refresh triggers, cheapest first.
     *
     * The bell used to fetch once on mount and never again, so a notification
     * arriving while the visitor sat on the page was invisible until they
     * navigated — no badge, and nothing for the chime to fire on.
     */
    let timer: number | undefined;

    const startPolling = () => {
      if (timer !== undefined) return;
      timer = window.setInterval(() => load(), REFRESH_INTERVAL_MS);
    };

    const stopPolling = () => {
      if (timer === undefined) return;
      window.clearInterval(timer);
      timer = undefined;
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Coming back to the tab is the moment the badge most needs to be
        // right, so refresh immediately rather than waiting for the interval.
        load();
        startPolling();
      } else {
        stopPolling();
      }
    };

    if (document.visibilityState === 'visible') startPolling();
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onVisibilityChange);

    return () => {
      controller.abort();
      stopPolling();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onVisibilityChange);
    };
  }, [enabled, load]);

  const markRead = useCallback(async (id: string) => {
    let rolledBack = false;

    setState((previous) => {
      const target = previous.notifications.find((item) => item._id === id);
      // Already read: nothing to do, and nothing to roll back.
      if (!target || target.read) {
        rolledBack = true;
        return previous;
      }
      return {
        ...previous,
        notifications: previous.notifications.map((item) =>
          item._id === id ? { ...item, read: true } : item,
        ),
        unreadCount: Math.max(0, previous.unreadCount - 1),
      };
    });

    if (rolledBack) return;

    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
      });
      if (!response.ok) throw new Error('request failed');
      const payload = await response.json();
      if (!mounted.current) return;
      // Authoritative count, in case another tab or device also read something.
      setState((previous) => ({
        ...previous,
        unreadCount: payload.unreadCount ?? previous.unreadCount,
      }));
    } catch {
      if (!mounted.current) return;
      setState((previous) => ({
        ...previous,
        notifications: previous.notifications.map((item) =>
          item._id === id ? { ...item, read: false } : item,
        ),
        unreadCount: previous.unreadCount + 1,
      }));
    }
  }, []);

  const markAllRead = useCallback(async () => {
    let snapshot: NotificationsState | null = null;

    setState((previous) => {
      if (previous.unreadCount === 0) return previous;
      snapshot = previous;
      return {
        ...previous,
        notifications: previous.notifications.map((item) => ({ ...item, read: true })),
        unreadCount: 0,
      };
    });

    if (!snapshot) return;

    try {
      const response = await fetch('/api/notifications/read-all', { method: 'POST' });
      if (!response.ok) throw new Error('request failed');
    } catch {
      if (!mounted.current || !snapshot) return;
      setState(snapshot);
    }
  }, []);

  return {
    ...state,
    refresh: () => load(),
    markRead,
    markAllRead,
  };
}

export default useNotifications;
