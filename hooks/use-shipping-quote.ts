'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * The delivery price for the cart at the address being typed.
 *
 * Checkout used to compute this itself, from two numbers on the public settings
 * endpoint and a `district.includes('dhaka')` test. That put the rate table in
 * the browser, which meant the rule could only ever be as rich as something the
 * client could be trusted with — and the number it produced was posted back and
 * believed. The server owns the rule now; this hook only asks.
 *
 * Debounced, because the address is quoted while it is still being typed, and
 * `keepPrevious` holds the last good answer during a refetch so the total does
 * not flicker to zero between keystrokes.
 */

export type ShippingQuoteSource = 'free-threshold' | 'carrier' | 'flat';

export interface ShippingQuoteState {
  amount: number;
  source: ShippingQuoteSource | null;
  /** True until the address is complete enough to price. */
  pending: boolean;
  loading: boolean;
}

export interface ShippingQuoteRequest {
  district: string;
  city: string;
  division: string;
  street: string;
  lines: Array<{ productId: string; quantity: number }>;
  subtotal: number;
}

const DEBOUNCE_MS = 400;

export function useShippingQuote(request: ShippingQuoteRequest): ShippingQuoteState {
  const [amount, setAmount] = useState(0);
  const [source, setSource] = useState<ShippingQuoteSource | null>(null);
  const [loading, setLoading] = useState(false);

  // Serialised so the effect re-runs on a real change rather than on every
  // render — `lines` is a fresh array object each time the cart re-renders.
  const key = JSON.stringify(request);
  const latest = useRef(0);

  const ready = Boolean(request.district?.trim()) && request.lines.length > 0;

  useEffect(() => {
    if (!ready) {
      setAmount(0);
      setSource(null);
      return;
    }

    const requestId = ++latest.current;
    const controller = new AbortController();
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const response = await fetch('/api/shipping/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            address: {
              district: request.district,
              city: request.city,
              division: request.division,
              street: request.street,
            },
            lines: request.lines,
            subtotal: request.subtotal,
          }),
        });
        if (!response.ok) throw new Error('quote failed');
        const data = await response.json();

        // A slower earlier request must not overwrite a newer answer.
        if (requestId !== latest.current) return;
        setAmount(Number(data.amount) || 0);
        setSource(data.source ?? null);
      } catch (error) {
        if ((error as Error)?.name === 'AbortError') return;
        // The order route re-quotes server-side regardless, so a failed
        // preview must not block checkout — it just shows nothing yet.
        if (requestId === latest.current) setSource(null);
      } finally {
        if (requestId === latest.current) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);

  return { amount, source, pending: !ready, loading };
}
