'use client';

import { applyComboVerdicts } from '@/lib/store/slices/cartSlice';
import type { RootState } from '@/lib/store/store';
import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';

/**
 * Keeps combo/bundle cart lines honest against the server.
 *
 * A combo line is a snapshot taken when the customer clicked add: a name, an
 * image and a price. Any of it can go stale in the cart — the offer switched
 * off, its schedule closed, a component sold out or was repriced — and the
 * customer would otherwise reach checkout holding a line the server will
 * refuse. This revalidates on mount and after every combo mutation and takes
 * the server's answer as the truth, the same discipline `useCartDealsSync`
 * applies to gift lines.
 *
 * Mounted once, app-wide, beside the deals sync.
 */
export function useComboCartSync() {
  const dispatch = useDispatch();
  const items = useSelector((state: RootState) => state.cart.items);
  const inFlight = useRef<AbortController | null>(null);

  const comboLines = items.filter((item) => item.itemType === 'combo_bundle');
  // Re-run only when a combo line's identity or quantity changes: a product
  // line moving must not trigger a combo revalidation, and vice versa.
  const signature = comboLines
    .map((item) => `${item.comboBundleId || item.id}:${item.quantity}`)
    .join('|');

  useEffect(() => {
    inFlight.current?.abort();
    if (!signature) return;

    const controller = new AbortController();
    inFlight.current = controller;

    const payload = signature.split('|').map((entry) => {
      const [comboBundleId, quantity] = entry.split(':');
      return { comboBundleId, quantity: Number(quantity) || 1 };
    });

    fetch('/api/combo-bundles/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines: payload }),
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('sync failed'))))
      .then((data) => {
        dispatch(applyComboVerdicts(data.lines || []));
      })
      .catch((error) => {
        // A failed check leaves the cart as it is. Order creation revalidates
        // every combo line again server-side, so a stale line cannot be
        // bought — it is only shown for a moment longer than it should be.
        if (error?.name !== 'AbortError') {
          console.warn('Combo cart validation failed', error);
        }
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, dispatch]);
}

export default useComboCartSync;
