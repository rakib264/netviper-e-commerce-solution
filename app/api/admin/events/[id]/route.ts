import { auth } from '@/lib/auth';
import AuditLog from '@/lib/models/AuditLog';
import Event from '@/lib/models/Event';
import Product from '@/lib/models/Product';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager', 'staff'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    const event = await Event.findById(id)
      .populate('products', 'name thumbnailImage price comparePrice slug sku isActive quantity')
      .lean();

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Add computed status
    const now = new Date();
    const eventData = event as any;
    const eventWithStatus = {
      ...eventData,
      status: !eventData.isActive ? 'inactive' :
               now < new Date(eventData.startDate) ? 'upcoming' :
               now > new Date(eventData.endDate) ? 'expired' : 'active',
      productsCount: eventData.products.length
    };

    return NextResponse.json(eventWithStatus);
  } catch (error) {
    console.error('Get event error:', error);
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const data = await request.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    const existingEvent = await Event.findById(id);
    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Validation
    const errors: string[] = [];

    // Required fields validation
    if (!data.title || data.title.trim().length === 0) {
      errors.push('Event title is required');
    }

    if (!data.discountText || data.discountText.trim().length === 0) {
      errors.push('Discount text is required');
    }

    if (!data.startDate) {
      errors.push('Start date is required');
    }

    if (!data.endDate) {
      errors.push('End date is required');
    }

    // Date validation
    if (data.startDate && data.endDate) {
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        errors.push('Invalid date format');
      } else if (startDate >= endDate) {
        errors.push('End date must be after start date');
      }
    }

    // Validate products exist
    if (data.products && Array.isArray(data.products) && data.products.length > 0) {
      const validProductIds = data.products.filter((productId: string) =>
        mongoose.Types.ObjectId.isValid(productId)
      );

      if (validProductIds.length !== data.products.length) {
        errors.push('Some product IDs are invalid');
      } else {
        const existingProducts = await Product.find({
          _id: { $in: validProductIds },
          isActive: true
        });

        if (existingProducts.length !== validProductIds.length) {
          errors.push('Some selected products do not exist or are inactive');
        }
      }
    }

    // Validate CTA if provided
    if (data.cta) {
      if (!data.cta.label || data.cta.label.trim().length === 0) {
        errors.push('CTA label is required when CTA is enabled');
      }
      if (!data.cta.url || data.cta.url.trim().length === 0) {
        errors.push('CTA URL is required when CTA is enabled');
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({
        error: 'Validation failed',
        details: errors
      }, { status: 400 });
    }

    // Track changes for audit log
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];

    if (data.title !== existingEvent.title) {
      changes.push({ field: 'title', oldValue: existingEvent.title, newValue: data.title });
    }
    if (data.subtitle !== existingEvent.subtitle) {
      changes.push({ field: 'subtitle', oldValue: existingEvent.subtitle, newValue: data.subtitle });
    }
    if (data.discountText !== existingEvent.discountText) {
      changes.push({ field: 'discountText', oldValue: existingEvent.discountText, newValue: data.discountText });
    }
    if (data.bannerImage !== existingEvent.bannerImage) {
      changes.push({ field: 'bannerImage', oldValue: existingEvent.bannerImage, newValue: data.bannerImage });
    }
    if (new Date(data.startDate).getTime() !== existingEvent.startDate.getTime()) {
      changes.push({ field: 'startDate', oldValue: existingEvent.startDate, newValue: new Date(data.startDate) });
    }
    if (new Date(data.endDate).getTime() !== existingEvent.endDate.getTime()) {
      changes.push({ field: 'endDate', oldValue: existingEvent.endDate, newValue: new Date(data.endDate) });
    }
    if (data.isActive !== existingEvent.isActive) {
      changes.push({ field: 'isActive', oldValue: existingEvent.isActive, newValue: data.isActive });
    }

    // Check if products changed
    const oldProductIds = existingEvent.products.map((p: any) => p.toString()).sort();
    const newProductIds = (data.products || []).map((p: string) => p.toString()).sort();
    if (JSON.stringify(oldProductIds) !== JSON.stringify(newProductIds)) {
      changes.push({
        field: 'products',
        oldValue: `${oldProductIds.length} products`,
        newValue: `${newProductIds.length} products`
      });
    }

    // Prepare update data
    const updateData: any = {
      title: data.title.trim(),
      subtitle: data.subtitle?.trim(),
      bannerImage: data.bannerImage,
      discountText: data.discountText.trim(),
      layoutType: data.layoutType || existingEvent.layoutType || 'horizontal',
      showInLanding: data.showInLanding !== undefined ? data.showInLanding : existingEvent.showInLanding || false,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      products: data.products || [],
      isActive: data.isActive !== undefined ? data.isActive : existingEvent.isActive
    };

    // Handle CTA update
    if (data.cta && data.cta.label && data.cta.url) {
      updateData.cta = {
        label: data.cta.label.trim(),
        url: data.cta.url.trim(),
        openInNewTab: data.cta.openInNewTab || false
      };
    } else if (data.cta === null) {
      // Explicitly remove CTA if null is passed
      updateData.cta = undefined;
    }

    // Update the event
    const updatedEvent = await Event.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('products', 'name thumbnailImage price comparePrice slug sku isActive quantity');

    // Add computed status
    const now = new Date();
    const eventWithStatus = {
      ...updatedEvent?.toObject(),
      status: !updatedEvent?.isActive ? 'inactive' :
               now < updatedEvent?.startDate ? 'upcoming' :
               now > updatedEvent?.endDate ? 'expired' : 'active',
      productsCount: updatedEvent?.products.length
    };

    // Log audit if there were changes
    if (changes.length > 0) {
      await AuditLog.create({
        user: session.user.id,
        action: 'UPDATE',
        resource: 'Event',
        resourceId: id,
        changes,
        metadata: {
          eventTitle: updatedEvent?.title,
          productsCount: updatedEvent?.products.length
        }
      });
    }

    return NextResponse.json({
      message: 'Event updated successfully',
      event: eventWithStatus
    });

  } catch (error: any) {
    console.error('Update event error:', error);

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json({
        error: 'Validation failed',
        details: validationErrors
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Failed to update event',
      details: error.message
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !['admin'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    const event = await Event.findById(id);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    await Event.findByIdAndDelete(id);

    // Log audit
    await AuditLog.create({
      user: session.user.id,
      action: 'DELETE',
      resource: 'Event',
      resourceId: id,
      metadata: {
        eventTitle: event.title,
        productsCount: event.products.length
      }
    });

    return NextResponse.json({
      message: 'Event deleted successfully'
    });

  } catch (error) {
    console.error('Delete event error:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
