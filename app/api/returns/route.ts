import { auth } from '@/lib/auth';
import { getClientIP } from '@/lib/audit';
import { PRIVATE_CACHE_HEADER } from '@/lib/cache/http';
import { ReturnRequest } from '@/lib/models/ReturnRequest';
import connectDB from '@/lib/mongodb';
import {
  buildOrderReturnContext,
  validateRequestedLines,
  type RequestedLine,
} from '@/lib/returns/eligibility';
import { ineligibilityKey, nonReturnableReasonKey } from '@/lib/returns/policy';
import {
  createReturnRequest,
  serializeReturnRequestForCustomer,
} from '@/lib/returns/service';
import { NextRequest, NextResponse } from 'next/server';

/**
 * The customer-facing returns endpoint: read your own requests, open a new one.
 *
 * Two things were wrong with what this replaced.
 *
 * **It exposed other people's data.** `GET ?userId=<id>` returned every request
 * belonging to that id, and `?requestId=` / `?orderId=` returned a full
 * document — email, phone, refund amount, internal `adminNotes` — with no
 * authentication at all. Both now resolve against the session, or, for a guest
 * tracking a request, against the email the request was filed under.
 *
 * **It let anyone rewrite any return.** A `PUT` handler here accepted a
 * `requestId` and a `status` with no session check whatsoever, so any caller
 * could approve their own refund. It is gone; admin decisions live behind
 * `PATCH /api/admin/returns/[id]`, which checks a role and records an actor.
 */

const MAX_LINES = 20;

/* ── Read ───────────────────────────────────────────────────────────────── */

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');
    const email = searchParams.get('email');

    await connectDB();

    // Guest tracking: the request id alone is not a credential, so the email it
    // was filed under is required alongside it.
    if (requestId) {
      const scope: Record<string, unknown> = { requestId };
      if (session?.user?.id) {
        scope.$or = [
          { userId: session.user.id },
          ...(session.user.email ? [{ email: session.user.email.toLowerCase() }] : []),
        ];
      } else if (email) {
        scope.email = email.trim().toLowerCase();
      } else {
        return NextResponse.json(
          { error: 'Sign in, or supply the email this request was filed under' },
          { status: 401 },
        );
      }

      const found = await ReturnRequest.findOne(scope).lean();
      if (!found) {
        return NextResponse.json({ error: 'Return request not found' }, { status: 404 });
      }

      return NextResponse.json(
        { returnRequest: serializeReturnRequestForCustomer(found) },
        { headers: { 'Cache-Control': PRIVATE_CACHE_HEADER } },
      );
    }

    // The list is always the caller's own. There is no `userId` parameter any
    // more — that was the whole vulnerability.
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requests = await ReturnRequest.find({
      $or: [
        { userId: session.user.id },
        ...(session.user.email ? [{ email: session.user.email.toLowerCase() }] : []),
      ],
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json(
      { returnRequests: requests.map(serializeReturnRequestForCustomer) },
      { headers: { 'Cache-Control': PRIVATE_CACHE_HEADER } },
    );
  } catch (error) {
    console.error('Error fetching return requests:', error);
    return NextResponse.json({ error: 'Failed to load return requests' }, { status: 500 });
  }
}

/* ── Create ─────────────────────────────────────────────────────────────── */

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const orderNumber = String(body.orderId || body.orderNumber || '').trim();
    const email = String(body.email || '').trim();
    const customerName = String(body.customerName || '').trim();
    const type = body.type === 'exchange' ? 'exchange' : 'return';
    const reason = String(body.reason || '').trim();

    const missing = [
      !orderNumber && 'orderId',
      !customerName && 'customerName',
      !email && 'email',
      !reason && 'reason',
    ].filter(Boolean);
    if (missing.length > 0) {
      return NextResponse.json(
        { error: 'Missing required fields', fields: missing },
        { status: 400 },
      );
    }

    const rawLines: unknown[] = Array.isArray(body.products) ? body.products : [];
    if (rawLines.length === 0) {
      return NextResponse.json(
        { error: 'Select at least one item to return' },
        { status: 400 },
      );
    }
    if (rawLines.length > MAX_LINES) {
      return NextResponse.json(
        { error: `A request may cover at most ${MAX_LINES} items` },
        { status: 400 },
      );
    }

    const lines: RequestedLine[] = rawLines.map((raw) => {
      const line = (raw || {}) as Record<string, unknown>;
      return {
        productId: line.productId ? String(line.productId) : null,
        productName: String(line.productName || '').trim(),
        variant: line.variant ? String(line.variant).trim() : undefined,
        quantity: Math.max(1, Math.floor(Number(line.quantity) || 0)),
        reason: String(line.reason || reason).trim(),
        details: line.details ? String(line.details).trim() : undefined,
      };
    });

    if (lines.some((line) => !line.productName || !line.reason)) {
      return NextResponse.json(
        { error: 'Every item needs a product and a reason' },
        { status: 400 },
      );
    }

    /*
     * Ownership, against the real relationship.
     *
     * The previous check was `Order.findOne({ _id: orderId, userId })` — but an
     * order has no `userId`, it has `customer`. That predicate matched nothing,
     * so a signed-in customer's return submission always failed with "Order not
     * found" while a guest's went through unvalidated.
     */
    const context = await buildOrderReturnContext({
      orderNumber,
      customerId: session?.user?.id || null,
      email: session?.user?.id ? null : email,
    });

    if (!context) {
      return NextResponse.json(
        { error: 'We could not find that order under this email' },
        { status: 404 },
      );
    }

    const failures = validateRequestedLines(context, lines);
    if (failures.length > 0) {
      // Structured so the form can name the offending item and explain the
      // rule, in the customer's own language.
      return NextResponse.json(
        {
          error: 'Some items are not eligible for return',
          ineligible: failures.map((failure) => ({
            productName: failure.productName,
            code: failure.code,
            messageKey: ineligibilityKey(failure.code),
            reasonKey:
              failure.code === 'non_returnable'
                ? nonReturnableReasonKey(failure.nonReturnableReason)
                : null,
          })),
        },
        { status: 422 },
      );
    }

    const result = await createReturnRequest({
      context,
      lines,
      type,
      reason,
      details: body.details ? String(body.details) : undefined,
      customerName,
      email,
      phone: body.phone ? String(body.phone) : undefined,
      attachments: Array.isArray(body.attachments)
        ? body.attachments.map(String).slice(0, 10)
        : [],
      actor: {
        userId: session?.user?.id || null,
        role: 'customer',
        ipAddress: getClientIP(request),
      },
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, ...result.data }, { status: 201 });
  } catch (error) {
    console.error('Error creating return request:', error);
    return NextResponse.json(
      { error: 'Failed to submit return request' },
      { status: 500 },
    );
  }
}
