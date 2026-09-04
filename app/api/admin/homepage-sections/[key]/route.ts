import { auth } from '@/lib/auth';
import { createAuditLog, getClientIP } from '@/lib/audit';
import {
  HOMEPAGE_SECTION_META_BY_KEY,
  isHomepageSectionKey,
  normalizeHomepageSectionUpdate,
  mergeHomepageSections,
  type HomepageSectionConfig,
} from '@/lib/landing/homepage-sections';
import {
  HOMEPAGE_SECTIONS_CACHE_TAG,
  ensureHomepageSectionsSeeded,
} from '@/lib/landing/homepage-sections-server';
import HomepageSection from '@/lib/models/HomepageSection';
import connectDB from '@/lib/mongodb';
import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { CACHE_TAGS } from '@/lib/cache/tags';
import { revalidateStorefront } from '@/lib/cache/revalidate';

const ALLOWED_ROLES = ['admin', 'manager'];

/** Update a single slot: heading copy, visibility, or its `settings` object. */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ key: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.role || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { key } = await context.params;
    if (!isHomepageSectionKey(key)) {
      return NextResponse.json(
        { error: `Unknown homepage section "${key}"` },
        { status: 404 },
      );
    }

    const body = await request.json().catch(() => null);
    const { update, errors } = normalizeHomepageSectionUpdate(key, body);

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Invalid section configuration', details: errors },
        { status: 400 },
      );
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: 'No supported fields were provided' },
        { status: 400 },
      );
    }

    await connectDB();
    await ensureHomepageSectionsSeeded();

    const previous = await HomepageSection.findOne({ key }).lean<
      Partial<HomepageSectionConfig>
    >();

    const section = await HomepageSection.findOneAndUpdate(
      { key },
      { $set: update },
      { new: true, upsert: true, runValidators: true },
    ).lean<Partial<HomepageSectionConfig>>();

    // Storefront reads go through a tagged cache; drop it so the change is live.
    revalidateTag(HOMEPAGE_SECTIONS_CACHE_TAG);
    // The slot config decides which readers the aggregate homepage payload
    // calls and with what limits, so it is an input to that cache entry too.
    revalidateStorefront(CACHE_TAGS.homepage);
    revalidatePath('/');

    const changes = Object.entries(update).map(([field, newValue]) => ({
      field,
      oldValue: (previous as Record<string, unknown> | null)?.[field] ?? null,
      newValue,
    }));

    await createAuditLog({
      userId: session.user.id as string,
      action: 'update',
      resource: 'homepage-section',
      resourceId: key,
      changes,
      metadata: { label: HOMEPAGE_SECTION_META_BY_KEY[key]?.label },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      message: 'Section updated',
      section: mergeHomepageSections([section]).find((item) => item.key === key),
    });
  } catch (error: any) {
    console.error('Update homepage section error:', error);

    if (error?.name === 'ValidationError') {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: Object.values(error.errors || {}).map((err: any) => err.message),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to update homepage section' },
      { status: 500 },
    );
  }
}
