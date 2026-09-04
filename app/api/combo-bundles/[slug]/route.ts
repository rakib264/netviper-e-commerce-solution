import { findComboBundleBySlug } from '@/lib/combo-bundles/resolve';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const comboBundle = await findComboBundleBySlug(slug);

    if (!comboBundle || !comboBundle.isActive || !comboBundle.isScheduleLive) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(
      { comboBundle },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      },
    );
  } catch (error) {
    console.error('combo-bundle public GET', error);
    return NextResponse.json({ error: 'Failed to load combo' }, { status: 500 });
  }
}
