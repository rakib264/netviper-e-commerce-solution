import { auth } from '@/lib/auth';
import { createAuditLog, getClientIP } from '@/lib/audit';
import { isHomepageSectionKey } from '@/lib/landing/homepage-sections';
import {
  HOMEPAGE_SECTIONS_CACHE_TAG,
  ensureHomepageSectionsSeeded,
  getFreshHomepageSections,
  syncDynamicSectionSlots,
} from '@/lib/landing/homepage-sections-server';
import HomepageSection from '@/lib/models/HomepageSection';
import connectDB from '@/lib/mongodb';
import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { CACHE_TAGS } from '@/lib/cache/tags';
import { revalidateStorefront } from '@/lib/cache/revalidate';

const ALLOWED_ROLES = ['admin', 'manager'];

/** Persist a new render order. Body: `{ keys: HomepageSectionKey[] }`. */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.role || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const keys: unknown = body?.keys;

    if (!Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json(
        { error: 'An ordered array of section keys is required' },
        { status: 400 },
      );
    }

    const invalid = keys.filter((key) => !isHomepageSectionKey(key));
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `Unknown section keys: ${invalid.join(', ')}` },
        { status: 400 },
      );
    }

    if (new Set(keys).size !== keys.length) {
      return NextResponse.json(
        { error: 'Duplicate section keys in the requested order' },
        { status: 400 },
      );
    }

    await connectDB();
    await ensureHomepageSectionsSeeded();
    await syncDynamicSectionSlots();

    // Keys omitted from the request keep their relative position after the
    // supplied ones, so a partial payload can never orphan a section. The
    // fill-in comes from the stored documents rather than the static registry,
    // because showcase slots are created at runtime and are not in it.
    const stored = await HomepageSection.find()
      .select('key')
      .sort({ sortOrder: 1 })
      .lean<Array<{ key: string }>>();

    const requested = new Set(keys as string[]);
    const ordered = [
      ...(keys as string[]),
      ...stored.map((doc) => doc.key).filter((key) => !requested.has(key)),
    ];

    await HomepageSection.bulkWrite(
      ordered.map((key, index) => ({
        updateOne: {
          filter: { key },
          update: { $set: { sortOrder: index + 1 } },
          // No upsert: a showcase slot only exists while its section does, and
          // an upsert here would resurrect one that sync just retired.
          upsert: false,
        },
      })),
      { ordered: false },
    );

    revalidateTag(HOMEPAGE_SECTIONS_CACHE_TAG);
    // The slot config decides which readers the aggregate homepage payload
    // calls and with what limits, so it is an input to that cache entry too.
    revalidateStorefront(CACHE_TAGS.homepage);
    revalidatePath('/');

    await createAuditLog({
      userId: session.user.id as string,
      action: 'reorder',
      resource: 'homepage-section',
      metadata: { order: ordered },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      message: 'Section order updated',
      sections: await getFreshHomepageSections(),
    });
  } catch (error) {
    console.error('Reorder homepage sections error:', error);
    return NextResponse.json(
      { error: 'Failed to reorder homepage sections' },
      { status: 500 },
    );
  }
}
