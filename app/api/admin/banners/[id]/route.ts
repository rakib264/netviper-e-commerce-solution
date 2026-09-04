import { auth } from '@/lib/auth';
import { normalizeSlideBody } from '@/lib/hero-carousel/normalize';
import Banner from '@/lib/models/Banner';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (
      !session?.user?.role ||
      !['admin', 'manager', 'super_admin'].includes(session.user.role)
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid slide ID' }, { status: 400 });
    }

    const banner = await Banner.findById(id);
    if (!banner) {
      return NextResponse.json({ error: 'Slide not found' }, { status: 404 });
    }

    return NextResponse.json(banner);
  } catch (error) {
    console.error('Error fetching banner:', error);
    return NextResponse.json({ error: 'Failed to fetch slide' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (
      !session?.user?.role ||
      !['admin', 'manager', 'super_admin'].includes(session.user.role)
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid slide ID' }, { status: 400 });
    }

    const body = await request.json();

    if (body.patch === 'status' || (Object.keys(body).length === 1 && 'isActive' in body)) {
      const banner = await Banner.findByIdAndUpdate(
        id,
        { isActive: Boolean(body.isActive) },
        { new: true }
      );
      if (!banner) {
        return NextResponse.json({ error: 'Slide not found' }, { status: 404 });
      }
      return NextResponse.json(banner);
    }

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
      data.ctaButtons = [{ label: 'Shop Now', url: '/products' }];
    }

    const updateData: Record<string, unknown> = { ...data };
    if (data.order === undefined || Number.isNaN(data.order)) {
      delete updateData.order;
    }

    const banner = await Banner.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!banner) {
      return NextResponse.json({ error: 'Slide not found' }, { status: 404 });
    }

    return NextResponse.json(banner);
  } catch (error) {
    console.error('Error updating banner:', error);
    return NextResponse.json({ error: 'Failed to update slide' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (
      !session?.user?.role ||
      !['admin', 'manager', 'super_admin'].includes(session.user.role)
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid slide ID' }, { status: 400 });
    }

    const banner = await Banner.findByIdAndDelete(id);
    if (!banner) {
      return NextResponse.json({ error: 'Slide not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Slide deleted successfully' });
  } catch (error) {
    console.error('Error deleting banner:', error);
    return NextResponse.json({ error: 'Failed to delete slide' }, { status: 500 });
  }
}
