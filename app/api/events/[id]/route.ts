import Event from '@/lib/models/Event';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    const event = await Event.findOne({
      _id: id,
      isActive: true
    })
      .populate('products', 'name thumbnailImage price comparePrice slug averageRating totalReviews isActive category quantity variants images isNewArrival isFeatured isLimitedEdition')
      .lean();

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Filter to only include active products
    const eventData = event as any;
    const activeProducts = (eventData.products || []).filter((product: any) => product.isActive);

    // Compute status
    const now = new Date();
    let status = 'inactive';
    if (eventData.isActive) {
      if (now < new Date(eventData.startDate)) {
        status = 'upcoming';
      } else if (now > new Date(eventData.endDate)) {
        status = 'expired';
      } else {
        status = 'active';
      }
    }

    const eventWithStatus = {
      ...eventData,
      products: activeProducts,
      productsCount: activeProducts.length,
      status
    };

    return NextResponse.json(eventWithStatus);
  } catch (error) {
    console.error('Get public event error:', error);
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
  }
}
