import type { PunchCardBoxEntry } from '@/lib/deals/types';

/**
 * Pure reward arithmetic — the ledger and punch-card rules with no database
 * anywhere near them.
 *
 * `lib/deals/settlement.ts` is the thin DB shell around these; keeping the
 * decisions here is what lets double-webhook idempotency and refund reversal
 * be tested off literals.
 */

export const LEDGER_STATUSES = ['pending', 'available', 'redeemed', 'expired'] as const;
export type LedgerStatus = (typeof LEDGER_STATUSES)[number];

export const LEDGER_ENTRY_TYPES = ['grant', 'redemption', 'reversal', 'expiry'] as const;
export type LedgerEntryType = (typeof LEDGER_ENTRY_TYPES)[number];

export interface LedgerRow {
  /** Signed: grants are positive, redemptions and reversals negative. */
  points: number;
  status: LedgerStatus;
  entryType?: LedgerEntryType;
}

export interface PointsBalances {
  /** Spendable now. */
  available: number;
  /** Earned but waiting on delivery. */
  pending: number;
  /** Everything ever earned that made it out of pending. */
  lifetime: number;
}

/**
 * The balance rule, stated once:
 *
 *   pending   = sum of every row still waiting on delivery
 *   available = sum of every row that is not pending
 *
 * Negative rows only ever carry a settled status (`redeemed`, `expired`, or
 * the status their grant had when it was reversed), so a single signed sum is
 * the whole answer — no per-status special-casing.
 */
export function computeBalances(rows: LedgerRow[]): PointsBalances {
  let available = 0;
  let pending = 0;
  let lifetime = 0;

  for (const row of rows) {
    const points = Number(row.points) || 0;
    if (row.status === 'pending') {
      pending += points;
    } else {
      available += points;
      if (points > 0) lifetime += points;
    }
  }

  return { available, pending, lifetime };
}

export interface ClaimCheck {
  allowed: boolean;
  /** How many more points are needed. 0 once the threshold is met. */
  shortfall: number;
}

/** Gate behind the wallet's claim CTA. */
export function canClaimPoints(available: number, minClaimThreshold: number): ClaimCheck {
  const threshold = Math.max(0, Number(minClaimThreshold) || 0);
  const balance = Number(available) || 0;
  if (balance <= 0) return { allowed: false, shortfall: Math.max(threshold, 1) };
  if (balance >= threshold) return { allowed: true, shortfall: 0 };
  return { allowed: false, shortfall: threshold - balance };
}

/** The compensating row for a grant that is being undone. Never a delete. */
export function reverseRow(row: LedgerRow): LedgerRow {
  return {
    points: -(Number(row.points) || 0),
    // Mirroring the grant's status is what makes the pair cancel: a reversed
    // pending grant nets to zero in pending, a reversed available one in
    // available.
    status: row.status,
    entryType: 'reversal',
  };
}

/* ── Punch cards ─────────────────────────────────────────────────────── */

export interface PunchCardState {
  punches: number;
  target: number;
  completedCount: number;
}

export interface PunchOutcome {
  next: PunchCardState;
  /** True when this punch filled the card and a box should be created. */
  boxAwarded: boolean;
}

/** Adds one stamp, rolling the card over when it fills. */
export function applyPunch(card: PunchCardState, repeatable: boolean): PunchOutcome {
  const target = Math.max(1, card.target);

  // A finished, non-repeating card stops accruing rather than silently
  // banking stamps a customer can never spend.
  if (!repeatable && card.completedCount > 0) {
    return { next: { ...card, target }, boxAwarded: false };
  }

  const punches = card.punches + 1;
  if (punches < target) {
    return { next: { ...card, target, punches }, boxAwarded: false };
  }

  return {
    next: {
      target,
      punches: repeatable ? punches - target : target,
      completedCount: card.completedCount + 1,
    },
    boxAwarded: true,
  };
}

/** Undoes one stamp, un-completing the card if that punch was the one that filled it. */
export function revokePunch(card: PunchCardState): PunchOutcome {
  const target = Math.max(1, card.target);

  if (card.punches > 0) {
    return { next: { ...card, target, punches: card.punches - 1 }, boxAwarded: false };
  }

  // The stamp being undone was the one that completed the card, so the
  // completion goes with it and the card returns to one short of full.
  if (card.completedCount > 0) {
    return {
      next: { target, punches: target - 1, completedCount: card.completedCount - 1 },
      boxAwarded: false,
    };
  }

  return { next: { ...card, target }, boxAwarded: false };
}

/* ── Mystery box draw ────────────────────────────────────────────────── */

/**
 * Draw percentages for a weighted pool, index-aligned with the input.
 * `null` for an entry whose weight is zero in an otherwise-zero pool, so the
 * editor can render an em dash rather than `NaN%`.
 */
export function drawOdds(pool: Array<{ weight: number }>): Array<number | null> {
  const total = pool.reduce((sum, entry) => sum + Math.max(0, Number(entry.weight) || 0), 0);
  if (total <= 0) return pool.map(() => null);
  return pool.map((entry) => (Math.max(0, Number(entry.weight) || 0) / total) * 100);
}

/**
 * Picks an entry from the weighted pool. `roll` is a value in [0, 1) supplied
 * by the caller, so the draw is deterministic in a test and random in
 * production.
 */
export function drawFromPool(
  pool: PunchCardBoxEntry[],
  roll: number
): PunchCardBoxEntry | null {
  const eligible = pool.filter((entry) => Math.max(0, Number(entry.weight) || 0) > 0);
  if (eligible.length === 0) return null;

  const total = eligible.reduce((sum, entry) => sum + Number(entry.weight), 0);
  const clamped = Math.min(Math.max(roll, 0), 0.999999999);
  let cursor = clamped * total;

  for (const entry of eligible) {
    cursor -= Number(entry.weight);
    if (cursor < 0) return entry;
  }
  return eligible[eligible.length - 1];
}

/** Days-from-now as an absolute expiry, for a points grant. */
export function expiryFrom(now: Date, expiresAfterDays: number): Date {
  const days = Math.max(1, Number(expiresAfterDays) || 365);
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}
