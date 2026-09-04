import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_RETURN_WINDOW_DAYS,
  NON_RETURNABLE_REASONS,
  RETURN_STATUSES,
  RETURN_STATUS_TRANSITIONS,
  TERMINAL_RETURN_STATUSES,
  allowedTransitionsFrom,
  canTransition,
  ineligibilityKey,
  isReturnStatus,
  isTerminalReturnStatus,
  missingTransitionFields,
  nonReturnableReasonKey,
  resolveReturnWindowDays,
  type ReturnStatus,
} from '../lib/returns/policy.ts';

test('every status declares a transition list', () => {
  for (const status of RETURN_STATUSES) {
    assert.ok(
      Array.isArray(RETURN_STATUS_TRANSITIONS[status]),
      `${status} has no transition list`,
    );
  }
});

test('every declared transition target is a real status', () => {
  for (const [from, targets] of Object.entries(RETURN_STATUS_TRANSITIONS)) {
    for (const to of targets) {
      assert.ok(isReturnStatus(to), `${from} → ${to} is not a known status`);
      assert.notEqual(from, to, `${from} lists itself as a transition`);
    }
  }
});

test('terminal statuses are dead ends', () => {
  for (const status of TERMINAL_RETURN_STATUSES) {
    assert.equal(
      allowedTransitionsFrom(status).length,
      0,
      `${status} should be terminal`,
    );
    assert.ok(isTerminalReturnStatus(status));
  }
});

test('a closed request cannot be reopened', () => {
  // The bug this guards: both admin endpoints previously accepted any status
  // for any request, so a completed refund could be moved back to pending.
  assert.equal(canTransition('completed', 'pending'), false);
  assert.equal(canTransition('rejected', 'approved'), false);
  assert.equal(canTransition('cancelled', 'processing'), false);
});

test('the happy path is walkable end to end', () => {
  const path: ReturnStatus[] = [
    'pending',
    'approved',
    'processing',
    'shipped',
    'delivered',
    'completed',
  ];
  for (let i = 0; i < path.length - 1; i += 1) {
    assert.ok(
      canTransition(path[i], path[i + 1]),
      `${path[i]} → ${path[i + 1]} should be allowed`,
    );
  }
});

test('a request can be sent back to the customer and returned to review', () => {
  assert.ok(canTransition('pending', 'info_requested'));
  assert.ok(canTransition('info_requested', 'pending'));
  assert.ok(canTransition('info_requested', 'approved'));
});

test('no transition is a self-transition', () => {
  for (const status of RETURN_STATUSES) {
    assert.equal(canTransition(status, status), false);
  }
});

test('a rejection requires a message', () => {
  assert.deepEqual(missingTransitionFields('rejected', {}), ['message']);
  assert.deepEqual(missingTransitionFields('rejected', { message: '   ' }), [
    'message',
  ]);
  assert.deepEqual(
    missingTransitionFields('rejected', { message: 'Item shows wear' }),
    [],
  );
});

test('completing a return requires refund details', () => {
  assert.deepEqual(missingTransitionFields('completed', {}).sort(), [
    'refundAmount',
    'refundMethod',
  ]);
  assert.deepEqual(
    missingTransitionFields('completed', {
      refundAmount: 40,
      refundMethod: 'store_credit',
    }),
    [],
  );
  // NaN is not an amount.
  assert.deepEqual(
    missingTransitionFields('completed', {
      refundAmount: Number('x'),
      refundMethod: 'store_credit',
    }),
    ['refundAmount'],
  );
});

test('approving needs no extra fields', () => {
  assert.deepEqual(missingTransitionFields('approved', {}), []);
});

test('the return window falls back to the site default', () => {
  assert.equal(resolveReturnWindowDays(undefined), DEFAULT_RETURN_WINDOW_DAYS);
  assert.equal(resolveReturnWindowDays(null), DEFAULT_RETURN_WINDOW_DAYS);
  assert.equal(resolveReturnWindowDays(0), DEFAULT_RETURN_WINDOW_DAYS);
  assert.equal(resolveReturnWindowDays(-5), DEFAULT_RETURN_WINDOW_DAYS);
  assert.equal(resolveReturnWindowDays(30), 30);
});

test('an unknown non-returnable reason still resolves to a key', () => {
  for (const reason of NON_RETURNABLE_REASONS) {
    assert.equal(
      nonReturnableReasonKey(reason),
      `returns.rules.nonReturnable.${reason}`,
    );
  }
  // Anything unrecognised must not produce a dangling key.
  assert.equal(
    nonReturnableReasonKey('something-else'),
    'returns.rules.nonReturnable.custom',
  );
  assert.equal(nonReturnableReasonKey(null), 'returns.rules.nonReturnable.custom');
});

test('ineligibility codes map into the returns.rules namespace', () => {
  assert.equal(
    ineligibilityKey('window_expired'),
    'returns.rules.ineligible.window_expired',
  );
});

test('unknown status strings are rejected', () => {
  assert.equal(isReturnStatus('resolved'), false);
  assert.equal(isReturnStatus(''), false);
  assert.equal(isReturnStatus(undefined), false);
  assert.equal(isReturnStatus('pending'), true);
});
