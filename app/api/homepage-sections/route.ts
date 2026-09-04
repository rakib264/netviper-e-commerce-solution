import { getCachedHomepageSections } from '@/lib/landing/homepage-sections-server';
import { mergeHomepageSections } from '@/lib/landing/homepage-sections';
import { NextResponse } from 'next/server';

/**
 * Public slot configuration. `HomeClient` receives this server-side as a prop;
 * this route is the client-side fallback (and is handy for debugging).
 */
export async function GET() {
  try {
    const sections = await getCachedHomepageSections();
    return NextResponse.json({ success: true, sections });
  } catch (error) {
    console.error('Public homepage sections error:', error);
    return NextResponse.json({ success: false, sections: mergeHomepageSections(null) });
  }
}
