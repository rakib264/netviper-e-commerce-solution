import { auth } from '@/lib/auth';
import {
  getFreshHomepageSections,
  ensureHomepageSectionsSeeded,
  syncDynamicSectionSlots,
} from '@/lib/landing/homepage-sections-server';
import {
  HOMEPAGE_SECTION_META,
  curatedSlotMeta,
  showcaseSlotMeta,
} from '@/lib/landing/homepage-sections';
import { NextResponse } from 'next/server';

const ALLOWED_ROLES = ['admin', 'manager'];

/** All slots, including disabled ones, plus the registry metadata the UI renders from. */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.role || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureHomepageSectionsSeeded();
    // Dynamic slots are created at runtime, so their registry entries are
    // built from the source records and shipped alongside the static ones.
    const { showcases, curated } = await syncDynamicSectionSlots();
    const sections = await getFreshHomepageSections();

    return NextResponse.json({
      success: true,
      sections,
      meta: [
        ...HOMEPAGE_SECTION_META,
        ...showcases.map(showcaseSlotMeta),
        ...curated.map(curatedSlotMeta),
      ],
    });
  } catch (error) {
    console.error('List homepage sections error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch homepage sections' },
      { status: 500 },
    );
  }
}
