import { PRIVATE_CACHE_HEADER } from '@/lib/cache/http';
import { quoteShipping } from '@/lib/courier/rates';
import { NextRequest, NextResponse } from 'next/server';

/**
 * The delivery price for one cart at one address.
 *
 * Public, because guest checkout has to be able to see a price before it has an
 * account. It carries no customer data back — only a number, the zone it was
 * derived for and which source produced it — and it reads nothing the caller
 * did not already supply.
 *
 * `PRIVATE_CACHE_HEADER`: the answer varies by cart and address, so it must
 * never land in a shared cache. The expensive parts (Pathao's geography and its
 * price plan) are cached server-side instead, where the key is the routing
 * rather than the shopper.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const address = {
      district: typeof body?.address?.district === 'string' ? body.address.district : '',
      city: typeof body?.address?.city === 'string' ? body.address.city : '',
      division: typeof body?.address?.division === 'string' ? body.address.division : '',
      street: typeof body?.address?.street === 'string' ? body.address.street : '',
    };

    // Only ids and quantities are read. The weight and the price are resolved
    // from the catalogue, so a doctored cart cannot buy itself cheaper postage.
    const lines = Array.isArray(body?.lines)
      ? body.lines
          .map((line: any) => ({
            productId: String(line?.productId ?? ''),
            quantity: Math.max(1, Math.floor(Number(line?.quantity) || 1)),
          }))
          .filter((line: { productId: string }) => line.productId)
      : [];

    const subtotal = Math.max(0, Number(body?.subtotal) || 0);

    const quote = await quoteShipping({ address, lines, subtotal });

    return NextResponse.json(
      {
        amount: quote.amount,
        source: quote.source,
        zone: quote.zone,
        provider: quote.provider ?? null,
        weightKg: quote.weightKg,
      },
      { headers: { 'Cache-Control': PRIVATE_CACHE_HEADER } },
    );
  } catch (error) {
    console.error('Shipping quote error:', error);
    return NextResponse.json({ error: 'Failed to quote shipping' }, { status: 500 });
  }
}
