import { auth } from '@/lib/auth';
import { resolveCuratedProducts } from '@/lib/curated-sections/resolve';
import { normalizeCuratedSection, toCuratedSection } from '@/lib/curated-sections/types';
import CuratedSection from '@/lib/models/CuratedSection';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ROLES = ['admin', 'manager'];

/**
 * Resolve a section's products *with* their origin, for the admin editor.
 *
 * Accepts a draft body so the preview reflects unsaved changes — switching a
 * section from `auto` to `hybrid` should show the effect before it is saved.
 * `id` may be `new`, which previews a section that does not exist yet.
 *
 * This is the only route that returns `origin`, and it is behind the admin
 * role check. The public route strips it.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.role || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    await connectDB();

    const stored =
      id && mongoose.Types.ObjectId.isValid(id)
        ? await CuratedSection.findById(id).lean()
        : null;

    const { value, errors } = normalizeCuratedSection(
      await request.json().catch(() => ({})),
      stored ? toCuratedSection(stored as Record<string, any>) : null,
    );

    // A draft is allowed to be incomplete — the preview is a working surface,
    // not a save. Only the fields the resolver needs have to make sense.
    const products = await resolveCuratedProducts(value);

    return NextResponse.json({ products, warnings: errors });
  } catch (error) {
    console.error('curated-sections preview', error);
    return NextResponse.json({ error: 'Failed to preview' }, { status: 500 });
  }
}
