import { requireReturnsAdmin } from '@/lib/returns/admin-guard';
import {
  buildOrderReturnContext,
  validateRequestedLines,
  type RequestedLine,
} from '@/lib/returns/eligibility';
import { ineligibilityKey } from '@/lib/returns/policy';
import { createReturnRequest } from '@/lib/returns/service';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Open a return an admin has decided to accept despite the policy.
 *
 * The exceptional path, and deliberately a separate endpoint rather than a flag
 * on the customer one: waiving a rule is an administrative act that needs a
 * role, a stated reason and an audit entry, and none of that belongs on a route
 * the public can reach.
 *
 * It relaxes only *judgement* rules — a product marked non-returnable, an
 * expired window, an order not yet delivered. It cannot invent a line that is
 * not on the order or exceed the quantity purchased; those are facts, not
 * policy, and `validateRequestedLines` still refuses them.
 *
 * The waived codes and the admin's reason are written to the request and to the
 * audit log, so an exception is always attributable afterwards.
 */
export async function POST(request: NextRequest) {
  const guard = await requireReturnsAdmin(request);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  try {
    const body = await request.json().catch(() => ({}));

    const orderNumber = String(body.orderNumber || body.orderId || '').trim();
    const overrideReason = String(body.overrideReason || '').trim();

    if (!orderNumber) {
      return NextResponse.json({ error: 'Order number is required' }, { status: 400 });
    }
    // An override with no stated reason is indistinguishable from a mistake.
    if (overrideReason.length < 10) {
      return NextResponse.json(
        { error: 'An override needs a reason of at least 10 characters' },
        { status: 400 },
      );
    }

    const rawLines: unknown[] = Array.isArray(body.products) ? body.products : [];
    if (rawLines.length === 0) {
      return NextResponse.json({ error: 'Select at least one item' }, { status: 400 });
    }

    // Looked up without an owner constraint: an admin acts on any order, and the
    // role check above is what authorises that.
    const context = await buildOrderReturnContext({
      orderNumber,
      email: String(body.email || '').trim() || null,
      customerId: null,
    });

    if (!context) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const lines: RequestedLine[] = rawLines.map((raw) => {
      const line = (raw || {}) as Record<string, unknown>;
      return {
        productId: line.productId ? String(line.productId) : null,
        productName: String(line.productName || '').trim(),
        variant: line.variant ? String(line.variant).trim() : undefined,
        quantity: Math.max(1, Math.floor(Number(line.quantity) || 0)),
        reason: String(line.reason || body.reason || '').trim(),
        details: line.details ? String(line.details).trim() : undefined,
      };
    });

    // What the policy *would* have refused — recorded as the waived set.
    const waived = validateRequestedLines(context, lines).map((failure) => failure.code);

    // Re-checked with the override applied: anything still failing is structural.
    const blocking = validateRequestedLines(context, lines, { allowOverride: true });
    if (blocking.length > 0) {
      return NextResponse.json(
        {
          error: 'Some items cannot be returned even with an override',
          ineligible: blocking.map((failure) => ({
            productName: failure.productName,
            code: failure.code,
            messageKey: ineligibilityKey(failure.code),
          })),
        },
        { status: 422 },
      );
    }

    const result = await createReturnRequest({
      context,
      lines,
      type: body.type === 'exchange' ? 'exchange' : 'return',
      reason: String(body.reason || overrideReason).trim(),
      details: body.details ? String(body.details) : undefined,
      customerName: String(body.customerName || context.email || 'Customer').trim(),
      email: String(body.email || context.email || '').trim(),
      phone: body.phone ? String(body.phone) : undefined,
      actor: guard.actor,
      override: {
        reason: overrideReason,
        waivedCodes: Array.from(new Set(waived)),
      },
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(
      { success: true, ...result.data, waivedCodes: Array.from(new Set(waived)) },
      { status: 201 },
    );
  } catch (error) {
    console.error('Return override error:', error);
    return NextResponse.json(
      { error: 'Failed to create return request' },
      { status: 500 },
    );
  }
}
