import { createAuditLog, getClientIP } from '@/lib/audit';
import { auth } from '@/lib/auth';
import { resolveComboBundles } from '@/lib/combo-bundles/resolve';
import { normalizeComboBundle } from '@/lib/combo-bundles/types';
import ComboBundle from '@/lib/models/ComboBundle';
import Product from '@/lib/models/Product';
import connectDB from '@/lib/mongodb';
import { revalidateDynamicSlots } from '@/lib/landing/homepage-sections-server';
import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ROLES = ['admin', 'manager'];

async function requireStaff() {
  const session = await auth();
  if (!session?.user?.role || !ALLOWED_ROLES.includes(session.user.role)) {
    return null;
  }
  return session;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireStaff();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    await connectDB();
    const doc = await ComboBundle.findById(id).lean();
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const [comboBundle] = await resolveComboBundles([doc as Record<string, any>]);
    return NextResponse.json({ comboBundle });
  } catch (error) {
    console.error('combo-bundles GET id', error);
    return NextResponse.json({ error: 'Failed to load combo' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireStaff();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    await connectDB();
    const existing = await ComboBundle.findById(id);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await request.json();

    // A body carrying nothing but `isActive` is the list's toggle, and must not
    // have to resend a whole valid offer to switch one off.
    const keys = Object.keys(body || {});
    if (keys.length === 1 && keys[0] === 'isActive') {
      existing.isActive = Boolean(body.isActive);
      await existing.save();
      await revalidateDynamicSlots();

      await createAuditLog({
        userId: session.user.id as string,
        action: 'update',
        resource: 'combo-bundle',
        resourceId: id,
        changes: [
          { field: 'isActive', oldValue: !existing.isActive, newValue: existing.isActive },
        ],
        ipAddress: getClientIP(request),
      });

      const [comboBundle] = await resolveComboBundles([existing.toObject()]);
      return NextResponse.json({ comboBundle });
    }

    const { value, errors } = normalizeComboBundle(body);
    if (errors.length > 0) {
      return NextResponse.json({ error: 'Invalid offer', details: errors }, { status: 400 });
    }

    const componentIds = Array.from(
      new Set(value.components.map((component) => component.productId)),
    );
    const found = await Product.find({ _id: { $in: componentIds } })
      .select('_id')
      .lean<Array<{ _id: unknown }>>();
    const foundIds = new Set(found.map((product) => String(product._id)));
    const missing = componentIds.filter((productId) => !foundIds.has(productId));
    if (missing.length > 0) {
      return NextResponse.json(
        { error: 'Invalid offer', details: [`Unknown products: ${missing.join(', ')}`] },
        { status: 400 },
      );
    }

    const slugTaken = await ComboBundle.exists({
      slug: value.slug,
      _id: { $ne: id },
    });
    if (slugTaken) {
      return NextResponse.json(
        { error: `A combo with the slug "${value.slug}" already exists` },
        { status: 409 },
      );
    }

    const before = {
      name: existing.name,
      price: existing.price,
      components: existing.components.length,
      isActive: existing.isActive,
    };

    existing.name = value.name;
    existing.slug = value.slug;
    existing.description = value.description;
    existing.images = value.images;
    existing.components = value.components.map((component) => ({
      product: new mongoose.Types.ObjectId(component.productId),
      variantId: component.variantId || '',
      qty: component.qty,
      sortOrder: component.sortOrder,
    })) as typeof existing.components;
    existing.price = value.price;
    existing.compareAtPrice = value.compareAtPrice;
    existing.badgeText = value.badgeText;
    existing.isActive = value.isActive;
    existing.isFeatured = value.isFeatured;
    existing.startsAt = value.startsAt ? new Date(value.startsAt) : null;
    existing.endsAt = value.endsAt ? new Date(value.endsAt) : null;
    // `sortOrder` belongs to the reorder endpoint, so an edit never jumps the
    // offer to a different place in the list.

    await existing.save();
    await revalidateDynamicSlots();

    await createAuditLog({
      userId: session.user.id as string,
      action: 'update',
      resource: 'combo-bundle',
      resourceId: id,
      changes: [
        { field: 'name', oldValue: before.name, newValue: existing.name },
        { field: 'price', oldValue: before.price, newValue: existing.price },
        {
          field: 'components',
          oldValue: before.components,
          newValue: existing.components.length,
        },
        { field: 'isActive', oldValue: before.isActive, newValue: existing.isActive },
      ],
      ipAddress: getClientIP(request),
    });

    const [comboBundle] = await resolveComboBundles([existing.toObject()]);
    return NextResponse.json({ comboBundle });
  } catch (error) {
    console.error('combo-bundles PATCH', error);
    return NextResponse.json({ error: 'Failed to update combo' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireStaff();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    await connectDB();
    const deleted = await ComboBundle.findByIdAndDelete(id).lean<{
      name?: string;
    } | null>();
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await revalidateDynamicSlots();

    await createAuditLog({
      userId: session.user.id as string,
      action: 'delete',
      resource: 'combo-bundle',
      resourceId: id,
      metadata: { name: deleted.name },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('combo-bundles DELETE', error);
    return NextResponse.json({ error: 'Failed to delete combo' }, { status: 500 });
  }
}
