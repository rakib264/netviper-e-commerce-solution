import { auth } from '@/lib/auth';
import { testBunnyConnection, isBunnyConfigured, getBunnyCdnHostname } from '@/lib/bunny';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const session = await auth();
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await testBunnyConnection();
    return NextResponse.json({
      success: result.ok,
      error: result.ok ? undefined : result.message,
      message: result.message,
      storageZone: result.storageZone,
      cdnUrl: result.cdnUrl,
      cdnHostname: getBunnyCdnHostname(),
      configured: isBunnyConfigured(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Bunny test failed',
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager'].includes(session.user?.role || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      configured: isBunnyConfigured(),
      storageZone: process.env.BUNNY_STORAGE_ZONE_NAME || null,
      storageHostname: process.env.BUNNY_STORAGE_HOSTNAME || 'storage.bunnycdn.com',
      cdnUrl: process.env.NEXT_PUBLIC_BUNNY_CDN_URL || null,
      cdnHostname: getBunnyCdnHostname(),
      accessKeySet: Boolean(process.env.BUNNY_STORAGE_ACCESS_KEY),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 },
    );
  }
}
