import { auth } from '@/lib/auth';
import { recalculateCartForRequest } from '@/lib/deals/service';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Recalculates the cart against the live deals engine.
 *
 * The storefront calls this on every cart mutation — add, quantity change,
 * remove, coupon apply. It takes ids and quantities only: prices, gift lines
 * and discounts all come back from the server, because a client-sent total is
 * never trusted.
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json().catch(() => ({}));
    const session = await auth();

    const { result } = await recalculateCartForRequest({
      lines: body?.items || [],
      customerId: session?.user?.id,
    });

    return NextResponse.json({
      lines: result.lines,
      subtotal: result.subtotal,
      cart_total: result.cartTotal,
      deal_discount: result.dealDiscount,
      deal_progress: result.dealProgress,
      applied_deals: result.appliedDeals.map((applied) => ({
        deal_id: applied.dealId,
        name: applied.name,
        reward_type: applied.rewardType,
        discount_amount: applied.discountAmount,
      })),
    });
  } catch (error) {
    console.error('Cart deals recalculation error:', error);
    return NextResponse.json({ error: 'Failed to recalculate cart deals' }, { status: 500 });
  }
}
