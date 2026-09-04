import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ProductShowcaseSection from '@/lib/models/ProductShowcaseSection';
import { revalidateDynamicSlots } from '@/lib/landing/homepage-sections-server';
import {
  normalizeShowcaseBody,
  serializeShowcaseSection,
} from '@/lib/product-showcase/normalize';
import { NextRequest, NextResponse } from 'next/server';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

async function requireStaff() {
  const session = await auth();
  if (
    !session?.user?.role ||
    !['admin', 'manager', 'super_admin'].includes(session.user.role)
  ) {
    return null;
  }
  return session;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireStaff();
    if (!session) return unauthorized();

    await connectDB();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status') || 'all';

    const filter: Record<string, unknown> = {};
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { subtitle: { $regex: search, $options: 'i' } },
        { 'tabs.title': { $regex: search, $options: 'i' } },
      ];
    }

    const docs = await ProductShowcaseSection.find(filter)
      .sort({ order: 1, createdAt: -1 })
      .lean();

    // Serialized rather than returned raw, so the edit form receives the
    // resolved template and both templates' fields already filled in.
    const sections = docs.map((doc) =>
      serializeShowcaseSection(doc as Record<string, unknown>)
    );

    return NextResponse.json({ sections });
  } catch (error) {
    console.error('product-showcase GET admin', error);
    return NextResponse.json({ error: 'Failed to load sections' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireStaff();
    if (!session) return unauthorized();

    await connectDB();
    const body = await request.json();
    const data = normalizeShowcaseBody(body);

    if (data.order === 0 || data.order == null) {
      const last = await ProductShowcaseSection.findOne()
        .sort({ order: -1 })
        .select('order')
        .lean();
      data.order = ((last as { order?: number } | null)?.order ?? -1) + 1;
    }

    const created = await ProductShowcaseSection.create(data);
    // Give the new section its homepage slot straight away, so it is
    // orderable in Home Sections without waiting for the next uncached read.
    await revalidateDynamicSlots();
    return NextResponse.json(
      {
        section: serializeShowcaseSection(
          created.toObject() as unknown as Record<string, unknown>
        ),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('product-showcase POST', error);
    return NextResponse.json({ error: 'Failed to create section' }, { status: 500 });
  }
}
