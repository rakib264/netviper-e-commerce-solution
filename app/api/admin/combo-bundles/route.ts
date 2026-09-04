import { createAuditLog, getClientIP } from '@/lib/audit';
import { auth } from '@/lib/auth';
import { normalizeComboBundle } from '@/lib/combo-bundles/types';
import { resolveComboBundles } from '@/lib/combo-bundles/resolve';
import ComboBundle from '@/lib/models/ComboBundle';
import Product from '@/lib/models/Product';
import connectDB from '@/lib/mongodb';
import { revalidateDynamicSlots } from '@/lib/landing/homepage-sections-server';
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ROLES = ['admin', 'manager'];

async function requireStaff() {
  const session = await auth();
  if (!session?.user?.role || !ALLOWED_ROLES.includes(session.user.role)) {
    return null;
  }
  return session;
}

/**
 * Every referenced product must exist. Checked here rather than in the shared
 * validator, which is deliberately DB-free so the admin form can reuse it.
 */
async function missingProductIds(productIds: string[]): Promise<string[]> {
  const unique = Array.from(new Set(productIds));
  if (unique.length === 0) return [];
  const found = await Product.find({ _id: { $in: unique } })
    .select('_id')
    .lean<Array<{ _id: unknown }>>();
  const foundIds = new Set(found.map((product) => String(product._id)));
  return unique.filter((id) => !foundIds.has(id));
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireStaff();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status') || 'all';
    const comboType = searchParams.get('comboType') || 'all';

    const filter: Record<string, unknown> = {};
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;
    if (comboType === 'combo' || comboType === 'bundle') filter.comboType = comboType;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
      ];
    }

    const docs = await ComboBundle.find(filter)
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    // Resolved, not raw: the list shows the live savings and stock ceiling,
    // both of which follow the components rather than the combo document.
    const comboBundles = await resolveComboBundles(docs as Record<string, any>[]);

    return NextResponse.json({ comboBundles, total: comboBundles.length });
  } catch (error) {
    console.error('combo-bundles GET admin', error);
    return NextResponse.json({ error: 'Failed to load combos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireStaff();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { value, errors } = normalizeComboBundle(await request.json());
    if (errors.length > 0) {
      return NextResponse.json({ error: 'Invalid offer', details: errors }, { status: 400 });
    }

    const missing = await missingProductIds(
      value.components.map((component) => component.productId),
    );
    if (missing.length > 0) {
      return NextResponse.json(
        { error: 'Invalid offer', details: [`Unknown products: ${missing.join(', ')}`] },
        { status: 400 },
      );
    }

    if (await ComboBundle.exists({ slug: value.slug })) {
      return NextResponse.json(
        { error: `A combo with the slug "${value.slug}" already exists` },
        { status: 409 },
      );
    }

    const last = await ComboBundle.findOne()
      .sort({ sortOrder: -1 })
      .select('sortOrder')
      .lean<{ sortOrder?: number } | null>();

    const created = await ComboBundle.create({
      name: value.name,
      slug: value.slug,
      description: value.description,
      images: value.images,
      components: value.components.map((component) => ({
        product: component.productId,
        variantId: component.variantId || '',
        qty: component.qty,
        sortOrder: component.sortOrder,
      })),
      price: value.price,
      compareAtPrice: value.compareAtPrice,
      badgeText: value.badgeText,
      isActive: value.isActive,
      isFeatured: value.isFeatured,
      sortOrder: (last?.sortOrder ?? -1) + 1,
      startsAt: value.startsAt,
      endsAt: value.endsAt,
    });

    // The homepage slot list is keyed on what exists, so a new offer shows up
    // in Home Sections without waiting for the next uncached read.
    await revalidateDynamicSlots();

    await createAuditLog({
      userId: session.user.id as string,
      action: 'create',
      resource: 'combo-bundle',
      resourceId: String(created._id),
      metadata: {
        name: value.name,
        comboType: created.comboType,
        components: value.components.length,
        price: value.price,
      },
      ipAddress: getClientIP(request),
    });

    const [comboBundle] = await resolveComboBundles([created.toObject()]);
    return NextResponse.json({ comboBundle }, { status: 201 });
  } catch (error) {
    console.error('combo-bundles POST', error);
    return NextResponse.json({ error: 'Failed to create combo' }, { status: 500 });
  }
}
