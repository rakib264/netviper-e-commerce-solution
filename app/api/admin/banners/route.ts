import { auth } from '@/lib/auth';
import { normalizeSlideBody } from '@/lib/hero-carousel/normalize';
import Banner from '@/lib/models/Banner';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (
      !session?.user?.role ||
      !['admin', 'manager', 'super_admin'].includes(session.user.role)
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const filter: Record<string, unknown> = {};

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { productName: { $regex: search, $options: 'i' } },
        { 'products.productName': { $regex: search, $options: 'i' } },
        { subtitle: { $regex: search, $options: 'i' } },
      ];
    }

    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;

    const total = await Banner.countDocuments(filter);
    const banners = await Banner.find(filter)
      .sort({ order: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      banners,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit) || 1,
        total,
        limit,
      },
    });
  } catch (error) {
    console.error('Error fetching banners:', error);
    return NextResponse.json({ error: 'Failed to fetch banners' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (
      !session?.user?.role ||
      !['admin', 'manager', 'super_admin'].includes(session.user.role)
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const data = normalizeSlideBody(body);

    if (!data.title) {
      return NextResponse.json({ error: 'Headline is required' }, { status: 400 });
    }
    if (!data.image && !data.backgroundVideo) {
      return NextResponse.json(
        { error: 'Background image or video is required' },
        { status: 400 }
      );
    }
    if (!data.image) {
      data.image = data.backgroundVideo;
    }

    if (!data.ctaButtons.length) {
      if (data.ctaButtonLabel && data.ctaButtonUrl) {
        data.ctaButtons = [{ label: data.ctaButtonLabel, url: data.ctaButtonUrl }];
      } else {
        data.ctaButtons = [{ label: 'Shop Now', url: '/products' }];
      }
    }

    const lastBanner = await Banner.findOne({}).sort({ order: -1 }).select('order').lean();
    const nextOrder =
      data.order !== undefined && !Number.isNaN(data.order)
        ? data.order
        : (lastBanner?.order ?? -1) + 1;

    const banner = await Banner.create({
      ...data,
      order: nextOrder,
    });

    return NextResponse.json(banner, { status: 201 });
  } catch (error) {
    console.error('Error creating banner:', error);
    return NextResponse.json({ error: 'Failed to create slide' }, { status: 500 });
  }
}
