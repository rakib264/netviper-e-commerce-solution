import { auth } from '@/lib/auth';
import { PRIVATE_CACHE_HEADER } from '@/lib/cache/http';
import { buildOrderReturnContext } from '@/lib/returns/eligibility';
import { NextRequest, NextResponse } from 'next/server';

/**
 * What can be returned from one order.
 *
 * The first step of the return form: the customer gives an order number (plus
 * the email it was placed under, if they are not signed in) and gets back the
 * order's real line items, each already judged against the policy. The form then
 * lets them pick from those lines instead of typing a product name into a free
 * text box that nothing could validate.
 *
 * A signed-in customer is scoped to their own orders by the query itself. A
 * guest must supply the matching email. Either way a miss returns the same 404,
 * so the endpoint cannot be used to test whether an order number exists.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const body = await request.json().catch(() => ({}));

    const orderNumber = typeof body.orderNumber === 'string' ? body.orderNumber : '';
    const email = typeof body.email === 'string' ? body.email : '';

    if (!orderNumber.trim()) {
      return NextResponse.json({ error: 'Order number is required' }, { status: 400 });
    }
    if (!session?.user?.id && !email.trim()) {
      return NextResponse.json(
        { error: 'Email is required to look up an order as a guest' },
        { status: 400 },
      );
    }

    const context = await buildOrderReturnContext({
      orderNumber,
      customerId: session?.user?.id || null,
      email: session?.user?.id ? null : email,
    });

    if (!context) {
      // Deliberately indistinguishable from "not yours".
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        order: {
          orderNumber: context.orderNumber,
          orderStatus: context.orderStatus,
          deliveredAt: context.deliveredAt,
          hasReturnableLines: context.hasReturnableLines,
          lines: context.lines,
        },
      },
      { headers: { 'Cache-Control': PRIVATE_CACHE_HEADER } },
    );
  } catch (error) {
    console.error('Return lookup error:', error);
    return NextResponse.json({ error: 'Failed to look up order' }, { status: 500 });
  }
}

/** Unused, but explicit: the lookup takes an email and must not land in a URL. */
export async function GET() {
  return NextResponse.json(
    { error: 'Use POST — a lookup carries an email address' },
    { status: 405 },
  );
}
