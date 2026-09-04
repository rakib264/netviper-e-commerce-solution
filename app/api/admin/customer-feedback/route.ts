import { createAuditLog, getClientIP } from '@/lib/audit';
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import CustomerFeedback from '@/lib/models/CustomerFeedback';
import User from '@/lib/models/User';

// GET - Fetch all customer feedback (with pagination and filters)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Check if user is admin or manager
    if (!['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = await User.findOne({ email: session.user.email });

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const platform = searchParams.get('platform');
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search');

    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};
    if (platform) query.platform = platform;
    if (isActive !== null && isActive !== undefined && isActive !== '') {
      query.isActive = isActive === 'true';
    }
    if (search) {
      query.$or = [
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'customer.location': { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
      ];
    }

    const [feedbacks, total] = await Promise.all([
      CustomerFeedback.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CustomerFeedback.countDocuments(query),
    ]);

    return NextResponse.json({
      feedbacks,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching customer feedback:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer feedback' },
      { status: 500 }
    );
  }
}

// POST - Create new customer feedback
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Check if user is admin or manager
    if (!['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = await User.findOne({ email: session.user.email });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();

    const {
      platform,
      platformName,
      customer,
      message,
      rating,
      productImage,
      isActive,
    } = body;

    // Validation
    if (!platform || !platformName || !customer || !message || !rating) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!customer.name || !customer.avatar || !customer.location) {
      return NextResponse.json(
        { error: 'Missing required customer fields' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    const feedback = await CustomerFeedback.create({
      platform,
      platformName,
      customer: {
        name: customer.name,
        avatar: customer.avatar,
        location: customer.location,
        verified: customer.verified || false,
      },
      message,
      rating,
      productImage: productImage || '',
      isActive: isActive !== undefined ? isActive : true,
    });

    // Log audit
    await createAuditLog({
      userId: user._id.toString(),
      action: 'CREATE',
      resource: 'customer_feedback',
      resourceId: feedback._id.toString(),
      metadata: {
        customerName: customer.name,
        platform,
        rating,
      },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({
      message: 'Customer feedback created successfully',
      feedback,
    });
  } catch (error: any) {
    console.error('Error creating customer feedback:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { 
        error: 'Failed to create customer feedback',
        details: error.message,
        mongoError: error.name 
      },
      { status: 500 }
    );
  }
}

