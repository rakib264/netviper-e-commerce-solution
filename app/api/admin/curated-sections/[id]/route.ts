import { auth } from '@/lib/auth';
import { createAuditLog, getClientIP } from '@/lib/audit';
import {
  normalizeCuratedSection,
  toCuratedSection,
  type CuratedSection as CuratedSectionDTO,
} from '@/lib/curated-sections/types';
import { revalidateDynamicSlots } from '@/lib/landing/homepage-sections-server';
import CuratedSection from '@/lib/models/CuratedSection';
import connectDB from '@/lib/mongodb';
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

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireStaff();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    await connectDB();
    // The stored document supplies anything the body omits, so a partial
    // update (the live toggle, say) cannot blank a section's copy or products.
    const existing = await CuratedSection.findById(id).lean<CuratedSectionDTO | null>();
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { value, errors } = normalizeCuratedSection(
      await request.json(),
      toCuratedSection(existing as Record<string, any>),
    );
    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Invalid section', details: errors },
        { status: 400 },
      );
    }

    const clash = await CuratedSection.exists({
      key: value.key,
      _id: { $ne: id },
    });
    if (clash) {
      return NextResponse.json(
        { error: `A section with the key "${value.key}" already exists` },
        { status: 409 },
      );
    }

    const section = await CuratedSection.findByIdAndUpdate(
      id,
      { $set: value },
      { new: true, runValidators: true },
    ).lean();

    if (!section) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await revalidateDynamicSlots();

    await createAuditLog({
      userId: session.user.id as string,
      action: 'update',
      resource: 'curated-section',
      resourceId: id,
      metadata: { key: value.key, label: value.label },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({ section: toCuratedSection(section as any) });
  } catch (error) {
    console.error('curated-sections PUT', error);
    return NextResponse.json({ error: 'Failed to update section' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireStaff();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    await connectDB();
    const deleted = await CuratedSection.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Retires the homepage slot along with the section.
    await revalidateDynamicSlots();

    await createAuditLog({
      userId: session.user.id as string,
      action: 'delete',
      resource: 'curated-section',
      resourceId: id,
      metadata: { key: deleted.key },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('curated-sections DELETE', error);
    return NextResponse.json({ error: 'Failed to delete section' }, { status: 500 });
  }
}
