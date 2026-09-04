import { PUBLIC_CONTENT_CACHE_HEADER } from '@/lib/cache/http';
import { getCachedPublicGeneralSettings } from '@/lib/theme/general-settings-server';
import { NextResponse } from 'next/server';

/**
 * Public general settings — site identity, palette, typography, locale.
 *
 * Reads through the same helper the root layout uses, and is cacheable: the
 * previous `no-store` meant the four components that mount `useSettings` each
 * paid a full database round trip on every page view, for a document that only
 * changes when an admin saves the settings screen. That save revalidates the
 * `public-general-settings` tag, so the cache can be held without going stale.
 */
export async function GET() {
  try {
    const publicSettings = await getCachedPublicGeneralSettings();

    return NextResponse.json(publicSettings, {
      headers: { 'Cache-Control': PUBLIC_CONTENT_CACHE_HEADER },
    });
  } catch (error) {
    console.error('Public general settings error:', error);
    return NextResponse.json({ error: 'Failed to fetch general settings' }, { status: 500 });
  }
}
