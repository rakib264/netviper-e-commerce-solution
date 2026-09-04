import { auth } from '@/lib/auth';
import AuditLog from '@/lib/models/AuditLog';
import Event from '@/lib/models/Event';
import Product from '@/lib/models/Product';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager', 'staff'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const status = searchParams.get('status') || '';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { subtitle: { $regex: search, $options: 'i' } },
        { discountText: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by status - we'll handle this after fetching events
    // since status is computed based on isActive flag and dates

    // Date range filtering (on startDate)
    if (dateFrom || dateTo) {
      query.startDate = {} as any;
      if (dateFrom) {
        const [fy, fm, fd] = dateFrom.split('-').map((v) => parseInt(v, 10));
        const from = new Date(fy, (fm || 1) - 1, fd || 1, 0, 0, 0, 0);
        (query.startDate as any).$gte = from;
      }
      if (dateTo) {
        const [ty, tm, td] = dateTo.split('-').map((v) => parseInt(v, 10));
        const to = new Date(ty, (tm || 1) - 1, td || 1, 23, 59, 59, 999);
        (query.startDate as any).$lte = to;
      }
    }

    // Build sort
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const events = await Event.find(query)
      .populate('products', 'name thumbnailImage price comparePrice slug quantity')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Event.countDocuments(query);

    // Add computed status to each event
    const now = new Date();
    let eventsWithStatus = events.map((event: any) => ({
      ...event,
      status: !event.isActive ? 'inactive' :
               now < event.startDate ? 'upcoming' :
               now > event.endDate ? 'expired' : 'active',
      productsCount: event.products.length
    }));

    // Filter by status after computing status
    if (status) {
      eventsWithStatus = eventsWithStatus.filter((event: any) => event.status === status);
    }

    // For status filtering, we need to recalculate pagination since we filtered after the query
    let filteredTotal = total;
    if (status) {
      // We need to count all events that match the status filter
      const allEvents = await Event.find(query).lean();
      const allEventsWithStatus = allEvents.map((event: any) => ({
        ...event,
        status: !event.isActive ? 'inactive' :
                 now < event.startDate ? 'upcoming' :
                 now > event.endDate ? 'expired' : 'active'
      }));
      filteredTotal = allEventsWithStatus.filter((event: any) => event.status === status).length;
    }

    return NextResponse.json({
      events: eventsWithStatus,
      pagination: {
        page,
        limit,
        total: filteredTotal,
        pages: Math.ceil(filteredTotal / limit)
      }
    });
  } catch (error) {
    console.error('Events API error:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const data = await request.json();

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
      const validProductIds = data.products.filter((id: string) =>
        mongoose.Types.ObjectId.isValid(id)
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

    if (errors.length > 0) {
      return NextResponse.json({
        error: 'Validation failed',
        details: errors
      }, { status: 400 });
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

    // Prepare data for creation
    const eventData: any = {
      title: data.title.trim(),
      subtitle: data.subtitle?.trim(),
      bannerImage: data.bannerImage,
      discountText: data.discountText.trim(),
      layoutType: data.layoutType || 'horizontal',
      showInLanding: data.showInLanding || false,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      products: data.products || [],
      isActive: data.isActive !== undefined ? data.isActive : true
    };

    // Add CTA if provided
    if (data.cta && data.cta.label && data.cta.url) {
      eventData.cta = {
        label: data.cta.label.trim(),
        url: data.cta.url.trim(),
        openInNewTab: data.cta.openInNewTab || false
      };
    }

    const event = await Event.create(eventData);

    // Log audit
    await AuditLog.create({
      user: session.user.id,
      action: 'CREATE',
      resource: 'Event',
      resourceId: event._id.toString(),
      metadata: {
        eventTitle: event.title,
        productsCount: event.products.length,
        startDate: event.startDate,
        endDate: event.endDate
      }
    });

    // Populate products for response
    await event.populate('products', 'name thumbnailImage price comparePrice slug');

    return NextResponse.json({
      message: 'Event created successfully',
      event
    }, { status: 201 });

  } catch (error: any) {
    console.error('Create event error:', error);

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json({
        error: 'Validation failed',
        details: validationErrors
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Failed to create event',
      details: error.message
    }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { ids, isActive } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No event ids provided' }, { status: 400 });
    }
    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'isActive must be a boolean' }, { status: 400 });
    }

    const result = await Event.updateMany(
      { _id: { $in: ids } },
      { $set: { isActive } }
    );

    // Audit logs per event
    const logs = ids.map((id: string) => ({
      user: session.user.id,
      action: 'UPDATE',
      resource: 'Event',
      resourceId: id,
      changes: [
        {
          field: 'isActive',
          oldValue: undefined,
          newValue: isActive,
        },
      ],
      metadata: { bulk: true },
    }));

    try {
      await AuditLog.insertMany(logs);
    } catch (_) {
      // best-effort; ignore audit failures
    }

    return NextResponse.json({ updated: result.modifiedCount || 0 });
  } catch (error) {
    console.error('Bulk update events error:', error);
    return NextResponse.json({ error: 'Failed to update events' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { ids } = await request.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No event ids provided' }, { status: 400 });
    }

    const results: Array<{ id: string; status: 'deleted' | 'skipped'; reason?: string }> = [];

    for (const id of ids) {
      try {
        const event = await Event.findById(id);
        if (!event) {
          results.push({ id, status: 'skipped', reason: 'Event not found' });
          continue;
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
            productsCount: event.products.length,
            bulk: true
          }
        });

        results.push({ id, status: 'deleted' });
      } catch (_err) {
        results.push({ id, status: 'skipped', reason: 'Unexpected error' });
      }
    }

    const deleted = results.filter(r => r.status === 'deleted').length;
    const skipped = results.length - deleted;

    return NextResponse.json({ deleted, skipped, results });
  } catch (error) {
    console.error('Bulk delete events error:', error);
    return NextResponse.json({ error: 'Failed to bulk delete events' }, { status: 500 });
  }
}
