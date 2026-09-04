'use client';

import { useEffect, type RefObject } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Makes an overlay behave like a modal for the keyboard.
 *
 * While `active`, Tab cycles inside `container`, Esc calls `onEscape`, the page
 * behind cannot scroll, and focus returns to whatever the customer was on when
 * the overlay closes. Written here rather than pulled in, because the cart is
 * animated by framer-motion off Redux state and a dialog primitive would want
 * to own both.
 *
 * `initialFocus` decides where focus lands on open. `container` puts it on the
 * overlay itself, which is what an overlay whose first control is incidental
 * wants: the dialog's own label is announced, and no control is left looking
 * pressed. It requires `container` to carry `tabIndex={-1}`.
 */
export function useFocusTrap(
  container: RefObject<HTMLElement | null>,
  active: boolean,
  onEscape: () => void,
  initialFocus: 'first' | 'container' = 'first'
) {
  useEffect(() => {
    if (!active) return;
    const node = container.current;
    if (!node) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const focusable = () =>
      Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.offsetParent !== null || element === document.activeElement
      );

    // Move focus in without stealing it from an element the overlay itself
    // just rendered focused.
    if (!node.contains(document.activeElement)) {
      (initialFocus === 'container' ? node : (focusable()[0] ?? node)).focus?.();
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onEscape();
        return;
      }
      if (event.key !== 'Tab') return;

      const elements = focusable();
      if (elements.length === 0) {
        event.preventDefault();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      const current = document.activeElement as HTMLElement | null;

      // From the container itself, forward is the first control and backward is
      // the last. Left to the browser, Shift+Tab here would step out of the
      // overlay entirely.
      if (current === node) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }

      if (event.shiftKey && (current === first || !node.contains(current))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (current === last || !node.contains(current))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [active, container, initialFocus, onEscape]);
}
