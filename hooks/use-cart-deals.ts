'use client';

import {
  applyDealResult,
  dealsSyncFailed,
  dealsSyncStarted,
} from '@/lib/store/slices/cartSlice';
import type { RootState } from '@/lib/store/store';
import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';

/**
 * Keeps the cart's deal state in step with the server.
 *
 * The browser's copy of a deal is a rendering detail — the discount and the
 * gift lines are recomputed server-side on every cart mutation, and again at
 * order creation. Mount this once, app-wide.
 *
 * Nothing here notifies: unlocking and re-locking a deal are states of the
 * cart, rendered by the Deals section from `dealProgress`, not events. A toast
 * would outlive the state that caused it.
 */
export function useCartDealsSync() {
  const dispatch = useDispatch();
  const items = useSelector((state: RootState) => state.cart.items);
  const inFlight = useRef<AbortController | null>(null);

  // Only the customer's own lines matter as input — gift lines are output, and
  // including them would make every sync trigger another sync.
  const signature = items
    .filter((item) => !item.isGift)
    .map((item) => `${item.id}:${item.variant ?? ''}:${item.quantity}`)
    .join('|');

  useEffect(() => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;

    const payload = items
      .filter((item) => !item.isGift)
      .map((item) => ({ id: item.id, variant: item.variant, quantity: item.quantity }));

    dispatch(dealsSyncStarted());

    fetch('/api/cart/deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: payload }),
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('sync failed'))))
      .then((data) => {
        dispatch(
          applyDealResult({
            lines: data.lines || [],
            dealDiscount: data.deal_discount || 0,
            dealProgress: data.deal_progress || [],
          })
        );
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return;
        // A failed sync leaves the cart priced without deals rather than
        // guessing at a discount the server has not confirmed, and rolls back
        // any optimistic quantity change that was riding on it.
        dispatch(dealsSyncFailed());
      });

    return () => controller.abort();
    // `items` is read inside but `signature` is what decides a resync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, dispatch]);
}
