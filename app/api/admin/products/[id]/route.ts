import { auth } from '@/lib/auth';
import AuditLog from '@/lib/models/AuditLog';
import Product from '@/lib/models/Product';
import connectDB from '@/lib/mongodb';
import { notifyAdminLowStock } from '@/lib/notifications/events';
import { validateProductPayload } from '@/lib/products/validate-payload';
import { legacyToMedia, mediaToLegacy } from '@/lib/products/types';
import { NextRequest, NextResponse } from 'next/server';

function normalizeIncomingProduct(data: any) {
  const mode = data.variantMode === 'multi' ? 'multi' : 'single';

  let media = Array.isArray(data.media) ? data.media : [];
  if (!media.length) {
    media = legacyToMedia(data.images || [], data.videoLinks || []);
  }
  const legacy = mediaToLegacy(media);

  const variants = Array.isArray(data.variants)
    ? data.variants.map((v: any) => {
        let vMedia = Array.isArray(v.media) ? v.media : [];
        if (!vMedia.length && v.image) {
          vMedia = legacyToMedia([v.image], []);
        }
        return {
          ...v,
          id: v.id || `var_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          attributeName: v.attributeName || v.name || 'Color',
          attributeValue: v.attributeValue || v.value || '',
          name: v.attributeName || v.name || 'Color',
          value: v.attributeValue || v.value || '',
          thumbnailImage: v.thumbnailImage || v.image || '',
          image: v.thumbnailImage || v.image || '',
          media: vMedia,
          barcodeType: v.barcodeType || 'Custom',
          trackQuantity: v.trackQuantity !== false,
        };
      })
    : [];

  return {
    ...data,
    variantMode: mode,
    media,
    images: legacy.images,
    videoLinks: legacy.videoLinks,
    variants: mode === 'multi' ? variants : [],
    productSize: [],
    shippingCost: undefined,
  };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager', 'staff'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const { id } = await context.params;
    const product = await Product.findById(id).populate('category', 'name slug');
    
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const raw = await request.json();
    const data = normalizeIncomingProduct(raw);
    const { id } = await context.params;
    const oldProduct = await Product.findById(id);
    
    if (!oldProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const errors = validateProductPayload(data);

    const skusToCheck: string[] =
      data.variantMode === 'multi'
        ? (data.variants || []).map((v: any) => v.sku).filter(Boolean)
        : [data.sku].filter(Boolean);

    for (const sku of skusToCheck) {
      const exists = await Product.findOne({
        _id: { $ne: id },
        $or: [{ sku }, { 'variants.sku': sku }],
      }).select('_id');
      if (exists) {
        errors.push(`SKU already exists: ${sku}`);
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 },
      );
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      {
        $set: {
          ...data,
          shippingCost: undefined,
        },
        $unset: { shippingCost: 1 },
      },
      { new: true, runValidators: true }
    ).populate('category', 'name slug');

    const changes = [];
    for (const key in data) {
      if (JSON.stringify((oldProduct as any)[key]) !== JSON.stringify(data[key])) {
        changes.push({
          field: key,
          oldValue: (oldProduct as any)[key],
          newValue: data[key]
        });
      }
    }

    await AuditLog.create({
      user: session.user.id,
      action: 'UPDATE',
      resource: 'Product',
      resourceId: id,
      changes,
      metadata: { productName: updatedProduct?.name, sku: updatedProduct?.sku }
    });

    if (updatedProduct) {
      const oldQuantity = Number(oldProduct.quantity) || 0;
      const newQuantity = Number(updatedProduct.quantity) || 0;
      const threshold = Number(updatedProduct.lowStockThreshold) || 0;
      const crossedLowStockThreshold =
        threshold > 0 &&
        newQuantity < oldQuantity &&
        oldQuantity > threshold &&
        newQuantity <= threshold;
      // An admin editing stock down to zero is an out-of-stock event even with
      // no threshold configured; see the same pairing in `/api/orders`.
      const ranOutOfStock = oldQuantity > 0 && newQuantity <= 0;

      if (crossedLowStockThreshold || ranOutOfStock) {
        try {
          await notifyAdminLowStock({
            productId: updatedProduct._id.toString(),
            productName: updatedProduct.name,
            currentStock: newQuantity,
            threshold,
          });
        } catch (notificationError) {
          console.error('Failed to enqueue product low-stock notification:', notificationError);
        }
      }
    }

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error('Update product error:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !['admin'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const { id } = await context.params;
    const product = await Product.findById(id);
    
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    await Product.findByIdAndDelete(id);

    await AuditLog.create({
      user: session.user.id,
      action: 'DELETE',
      resource: 'Product',
      resourceId: id,
      metadata: { productName: product.name, sku: product.sku }
    });

    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
