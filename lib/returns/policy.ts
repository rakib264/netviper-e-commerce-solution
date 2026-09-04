/**
 * Return policy: what may be returned, and how a request may move.
 *
 * Shared by the customer-facing eligibility check, the admin decision endpoint
 * and the UI, so all three agree on one set of rules rather than each
 * re-deriving them.
 */

/* ── Non-returnable reasons ─────────────────────────────────────────────── */

export const NON_RETURNABLE_REASONS = [
  'one_time_use',
  'hygiene',
  'final_sale',
  'perishable',
  'personalised',
  'custom',
] as const;

export type NonReturnableReason = (typeof NON_RETURNABLE_REASONS)[number];

/** Locale key for the customer-facing explanation of a blocked product. */
export function nonReturnableReasonKey(reason?: string | null): string {
  const known = (NON_RETURNABLE_REASONS as readonly string[]).includes(
    String(reason),
  )
    ? (reason as NonReturnableReason)
    : 'custom';
  return `returns.rules.nonReturnable.${known}`;
}

/* ── Return window ──────────────────────────────────────────────────────── */

/**
 * Days a customer has to open a request, counted from delivery (or from the
 * order date when the order was never marked delivered).
 *
 * A product may narrow or widen this with `returnWindowDays`; this is the
 * fallback and the value the UI quotes when a product sets nothing.
 */
export const DEFAULT_RETURN_WINDOW_DAYS = 14;

export function resolveReturnWindowDays(productWindow?: number | null): number {
  return typeof productWindow === 'number' && productWindow > 0
    ? productWindow
    : DEFAULT_RETURN_WINDOW_DAYS;
}

/* ── Statuses ───────────────────────────────────────────────────────────── */

/**
 * The lifecycle, in the order a request normally travels it.
 *
 * `info_requested` is new: the previous set had no way to say "we need more
 * from the customer", so agents used `pending` for both "not looked at" and
 * "waiting on them", and the customer's tracker could not tell them apart.
 */
export const RETURN_STATUSES = [
  'pending',
  'info_requested',
  'approved',
  'rejected',
  'processing',
  'shipped',
  'delivered',
  'completed',
  'cancelled',
] as const;

export type ReturnStatus = (typeof RETURN_STATUSES)[number];

/** Statuses no transition may leave. */
export const TERMINAL_RETURN_STATUSES: readonly ReturnStatus[] = [
  'rejected',
  'completed',
  'cancelled',
];

/**
 * Legal transitions.
 *
 * Declared rather than implied, because every endpoint previously accepted any
 * status for any request: a completed return could be moved back to `pending`,
 * and a rejected one could be silently approved, each writing a history entry
 * that made the sequence unreadable.
 */
export const RETURN_STATUS_TRANSITIONS: Record<
  ReturnStatus,
  readonly ReturnStatus[]
> = {
  pending: ['info_requested', 'approved', 'rejected', 'cancelled'],
  info_requested: ['pending', 'approved', 'rejected', 'cancelled'],
  approved: ['processing', 'rejected', 'cancelled'],
  processing: ['shipped', 'completed', 'cancelled'],
  shipped: ['delivered', 'completed', 'cancelled'],
  delivered: ['completed'],
  // Terminal.
  rejected: [],
  completed: [],
  cancelled: [],
};

export function isReturnStatus(value: unknown): value is ReturnStatus {
  return (
    typeof value === 'string' &&
    (RETURN_STATUSES as readonly string[]).includes(value)
  );
}

export function isTerminalReturnStatus(status: ReturnStatus): boolean {
  return TERMINAL_RETURN_STATUSES.includes(status);
}

export function canTransition(from: ReturnStatus, to: ReturnStatus): boolean {
  if (from === to) return false;
  return RETURN_STATUS_TRANSITIONS[from].includes(to);
}

export function allowedTransitionsFrom(
  status: ReturnStatus,
): readonly ReturnStatus[] {
  return RETURN_STATUS_TRANSITIONS[status] ?? [];
}

/**
 * Fields a transition cannot proceed without.
 *
 * A rejection with no reason gives the customer nothing to act on, and a
 * completed refund with no method or amount leaves finance unable to reconcile
 * it. Enforced server-side, and read by the admin form to mark the same fields
 * required.
 */
export const TRANSITION_REQUIRED_FIELDS: Partial<
  Record<ReturnStatus, readonly string[]>
> = {
  rejected: ['message'],
  info_requested: ['message'],
  completed: ['refundAmount', 'refundMethod'],
};

export function missingTransitionFields(
  to: ReturnStatus,
  payload: Record<string, unknown>,
): string[] {
  const required = TRANSITION_REQUIRED_FIELDS[to] || [];
  return required.filter((field) => {
    const value = payload[field];
    if (typeof value === 'string') return value.trim().length === 0;
    if (typeof value === 'number') return !Number.isFinite(value);
    return value === undefined || value === null;
  });
}

/* ── Eligibility ────────────────────────────────────────────────────────── */

/**
 * Why a line cannot be returned. `null` means it can.
 *
 * Each code maps to one locale key, so the customer is told which rule stopped
 * them rather than being handed a generic failure.
 */
export const INELIGIBILITY_CODES = [
  'not_in_order',
  'non_returnable',
  'window_expired',
  'quantity_exceeded',
  'order_not_delivered',
] as const;

export type IneligibilityCode = (typeof INELIGIBILITY_CODES)[number];

export function ineligibilityKey(code: IneligibilityCode): string {
  return `returns.rules.ineligible.${code}`;
}
