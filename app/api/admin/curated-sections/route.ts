import { normalizeCuratedSection, toCuratedSection } from '@/lib/curated-sections/types';
import { auth } from '@/lib/auth';
import { createAuditLog, getClientIP } from '@/lib/audit';
import { revalidateDynamicSlots } from '@/lib/landing/homepage-sections-server';
import CuratedSection from '@/lib/models/CuratedSection';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ROLES = ['admin', 'manager'];

async function requireStaff() {
  const session = await auth();
  if (!session?.user?.role || !ALLOWED_ROLES.includes(session.user.role)) {
    return null;
  }
  return session;
}

export async function GET() {
  try {
    const session = await requireStaff();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const sections = await CuratedSection.find()
      .sort({ order: 1, createdAt: 1 })
      .lean();

    return NextResponse.json({ sections: sections.map(toCuratedSection) });
  } catch (error) {
    console.error('curated-sections GET admin', error);
    return NextResponse.json({ error: 'Failed to load sections' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireStaff();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { value, errors } = normalizeCuratedSection(await request.json());
    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Invalid section', details: errors },
        { status: 400 },
      );
    }

    if (await CuratedSection.exists({ key: value.key })) {
      return NextResponse.json(
        { error: `A section with the key "${value.key}" already exists` },
        { status: 409 },
      );
    }

    const last = await CuratedSection.findOne()
      .sort({ order: -1 })
      .select('order')
      .lean<{ order?: number } | null>();
    value.order = (last?.order ?? -1) + 1;

    const created = await CuratedSection.create(value);
    await revalidateDynamicSlots();

    await createAuditLog({
      userId: session.user.id as string,
      action: 'create',
      resource: 'curated-section',
      resourceId: String(created._id),
      metadata: { key: value.key, label: value.label },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({ section: toCuratedSection(created.toObject()) }, {
      status: 201,
    });
  } catch (error) {
    console.error('curated-sections POST', error);
    return NextResponse.json({ error: 'Failed to create section' }, { status: 500 });
  }
}
