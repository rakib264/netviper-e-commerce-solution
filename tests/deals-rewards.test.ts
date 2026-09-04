import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyPunch,
  canClaimPoints,
  computeBalances,
  drawFromPool,
  drawOdds,
  expiryFrom,
  reverseRow,
  revokePunch,
  type LedgerRow,
  type PunchCardState,
} from '../lib/deals/rewards.ts';

/* ── Balances ────────────────────────────────────────────────────────── */

test('pending points are counted apart from spendable ones', () => {
  const rows: LedgerRow[] = [
    { points: 150, status: 'pending', entryType: 'grant' },
    { points: 200, status: 'available', entryType: 'grant' },
    { points: -50, status: 'redeemed', entryType: 'redemption' },
  ];

  assert.deepEqual(computeBalances(rows), { available: 150, pending: 150, lifetime: 200 });
});

test('an expired grant leaves lifetime intact but removes the balance', () => {
  const rows: LedgerRow[] = [
    { points: 300, status: 'available', entryType: 'grant' },
    { points: -300, status: 'expired', entryType: 'expiry' },
  ];

  const balances = computeBalances(rows);
  assert.equal(balances.available, 0);
  assert.equal(balances.lifetime, 300);
});

/* ── Claim threshold ─────────────────────────────────────────────────── */

test('a claim below the threshold is refused and reports the shortfall', () => {
  assert.deepEqual(canClaimPoints(380, 500), { allowed: false, shortfall: 120 });
  assert.deepEqual(canClaimPoints(500, 500), { allowed: true, shortfall: 0 });
  assert.deepEqual(canClaimPoints(640, 500), { allowed: true, shortfall: 0 });
  // An empty wallet never claims, even where no threshold is configured.
  assert.equal(canClaimPoints(0, 0).allowed, false);
  assert.equal(canClaimPoints(10, 0).allowed, true);
});

/* ── Refund reversal ─────────────────────────────────────────────────── */

test('reversing a released grant nets the balance to zero without a delete', () => {
  const grant: LedgerRow = { points: 150, status: 'available', entryType: 'grant' };
  const ledger: LedgerRow[] = [grant, reverseRow(grant)];

  assert.equal(ledger.length, 2, 'the grant row survives the reversal');
  assert.equal(ledger[1].points, -150);
  assert.equal(ledger[1].entryType, 'reversal');
  assert.deepEqual(computeBalances(ledger), { available: 0, pending: 0, lifetime: 150 });
});

test('reversing a still-pending grant nets inside pending, not available', () => {
  const grant: LedgerRow = { points: 150, status: 'pending', entryType: 'grant' };
  const ledger: LedgerRow[] = [grant, reverseRow(grant)];

  assert.deepEqual(computeBalances(ledger), { available: 0, pending: 0, lifetime: 0 });
});

test('a reversal does not claw back points the customer already spent', () => {
  const grant: LedgerRow = { points: 150, status: 'available', entryType: 'grant' };
  const ledger: LedgerRow[] = [
    grant,
    { points: -150, status: 'redeemed', entryType: 'redemption' },
    reverseRow(grant),
  ];

  // The wallet goes negative, which is the honest record: the merchant gave
  // away goods for points an order later un-earned.
  assert.equal(computeBalances(ledger).available, -150);
});

/* ── Punch cards ─────────────────────────────────────────────────────── */

function card(overrides: Partial<PunchCardState> = {}): PunchCardState {
  return { punches: 0, target: 10, completedCount: 0, ...overrides };
}

test('a punch short of the target awards nothing', () => {
  const outcome = applyPunch(card({ punches: 3 }), true);
  assert.equal(outcome.next.punches, 4);
  assert.equal(outcome.boxAwarded, false);
});

test('the punch that fills a repeatable card awards a box and resets it', () => {
  const outcome = applyPunch(card({ punches: 9 }), true);
  assert.equal(outcome.boxAwarded, true);
  assert.equal(outcome.next.punches, 0);
  assert.equal(outcome.next.completedCount, 1);
});

test('a non-repeating card stops accruing once it is complete', () => {
  const completed = applyPunch(card({ punches: 9 }), false);
  assert.equal(completed.boxAwarded, true);
  assert.equal(completed.next.completedCount, 1);
  assert.equal(completed.next.punches, 10);

  const afterwards = applyPunch(completed.next, false);
  assert.equal(afterwards.boxAwarded, false);
  assert.equal(afterwards.next.punches, 10, 'no stamp is banked past a finished card');
});

test('revoking a punch walks the card back, un-completing it if needed', () => {
  assert.equal(revokePunch(card({ punches: 4 })).next.punches, 3);

  // The refunded order was the one that filled the card.
  const rolledBack = revokePunch(card({ punches: 0, completedCount: 1 }));
  assert.equal(rolledBack.next.completedCount, 0);
  assert.equal(rolledBack.next.punches, 9);

  // An empty card cannot go negative.
  assert.deepEqual(revokePunch(card()).next, card());
});

/* ── Mystery box draw ────────────────────────────────────────────────── */

test('draw odds are the weights as percentages', () => {
  assert.deepEqual(drawOdds([{ weight: 3 }, { weight: 1 }]), [75, 25]);
  assert.deepEqual(drawOdds([{ weight: 0 }, { weight: 0 }]), [null, null]);
});

test('the weighted draw honours the pool and never returns a zero-weight entry', () => {
  const pool = [
    { productId: 'common', weight: 9 },
    { productId: 'rare', weight: 1 },
    { productId: 'never', weight: 0 },
  ];

  assert.equal(drawFromPool(pool, 0)?.productId, 'common');
  assert.equal(drawFromPool(pool, 0.5)?.productId, 'common');
  assert.equal(drawFromPool(pool, 0.95)?.productId, 'rare');
  // A roll at the very top of the range must still land inside the pool.
  assert.equal(drawFromPool(pool, 1)?.productId, 'rare');
  assert.equal(drawFromPool([], 0.5), null);
  assert.equal(drawFromPool([{ productId: 'x', weight: 0 }], 0.5), null);
});

/* ── Idempotency ─────────────────────────────────────────────────────── */

/**
 * Models what `lib/deals/settlement.ts` does at the database: a row is claimed
 * with a conditional update on its own timestamp, and only a successful claim
 * runs the grant. A retried webhook therefore finds nothing to claim.
 */
function makeSettler() {
  const rows = [{ id: 'row-1', points: 150, settledAt: null as Date | null }];
  const ledger: LedgerRow[] = [];

  return {
    ledger,
    settle(now: Date) {
      for (const row of rows) {
        if (row.settledAt !== null) continue;
        row.settledAt = now;
        ledger.push({ points: row.points, status: 'pending', entryType: 'grant' });
      }
    },
    release() {
      for (const entry of ledger) {
        if (entry.status === 'pending') entry.status = 'available';
      }
    },
  };
}

test('a webhook delivered twice grants the reward once', () => {
  const settler = makeSettler();

  settler.settle(new Date('2026-09-15T10:00:00Z'));
  settler.settle(new Date('2026-09-15T10:00:03Z'));

  assert.equal(settler.ledger.length, 1);
  assert.deepEqual(computeBalances(settler.ledger), { available: 0, pending: 150, lifetime: 0 });
});

test('delivery releases the pending grant exactly once', () => {
  const settler = makeSettler();
  settler.settle(new Date('2026-09-15T10:00:00Z'));

  settler.release();
  settler.release();

  assert.equal(settler.ledger.length, 1);
  assert.deepEqual(computeBalances(settler.ledger), { available: 150, pending: 0, lifetime: 150 });
});

/* ── Expiry ──────────────────────────────────────────────────────────── */

test('expiry is counted forward from the grant', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  assert.equal(expiryFrom(now, 365).toISOString(), '2027-01-01T00:00:00.000Z');
  // A nonsense value falls back to a year rather than expiring immediately.
  assert.equal(expiryFrom(now, 0).toISOString(), '2027-01-01T00:00:00.000Z');
});
