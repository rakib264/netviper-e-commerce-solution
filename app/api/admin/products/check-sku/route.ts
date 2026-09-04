import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Product from '@/lib/models/Product';
import { isValidSkuFormat } from '@/lib/products/sku';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager', 'staff'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sku = (searchParams.get('sku') || '').trim();
    const excludeId = searchParams.get('excludeId') || '';
    const excludeVariantId = searchParams.get('excludeVariantId') || '';

    if (!sku) {
      return NextResponse.json({ available: false, error: 'SKU is required' }, { status: 400 });
    }

    if (!isValidSkuFormat(sku)) {
      return NextResponse.json({
        available: false,
        error: 'Invalid SKU format (2–64 chars, alphanumeric with - _ .)',
      });
    }

    await connectDB();

    const productQuery: Record<string, unknown> = { sku };
    if (excludeId) {
      productQuery._id = { $ne: excludeId };
    }

    const productHit = await Product.findOne(productQuery).select('_id sku').lean();
    if (productHit) {
      return NextResponse.json({ available: false, error: 'SKU already in use' });
    }

    // Check variant-level SKUs
    const variantHit = await Product.findOne({
      'variants.sku': sku,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    })
      .select('_id variants')
      .lean();

    if (variantHit) {
      const collision = (variantHit as any).variants?.find(
        (v: any) =>
          v.sku === sku && (!excludeVariantId || v.id !== excludeVariantId),
      );
      // Also check within same product when excludeId is set
      if (!excludeId && collision) {
        return NextResponse.json({ available: false, error: 'SKU already used by a variant' });
      }
    }

    // Same-product variant collision when editing
    if (excludeId) {
      const self = await Product.findById(excludeId).select('variants sku').lean();
      if (self) {
        const selfData = self as any;
        if (selfData.sku === sku) {
          // ok if this is the product-level sku itself — already handled by excludeId on product query
        }
        const otherVariant = (selfData.variants || []).find(
          (v: any) => v.sku === sku && v.id !== excludeVariantId,
        );
        if (otherVariant) {
          return NextResponse.json({
            available: false,
            error: 'SKU already used by another variant on this product',
          });
        }
      }
    }

    return NextResponse.json({ available: true });
  } catch (error) {
    console.error('SKU check error:', error);
    return NextResponse.json({ error: 'Failed to validate SKU' }, { status: 500 });
  }
}
