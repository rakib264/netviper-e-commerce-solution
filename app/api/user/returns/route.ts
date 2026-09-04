import { auth } from '@/lib/auth';
import Order from '@/lib/models/Order';
import { ReturnRequest } from '@/lib/models/ReturnRequest';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';

// GET - Fetch return requests for logged-in user
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    
    // Build query for user's requests only - try both string and ObjectId
    const query: any = { 
      $or: [
        { userId: session.user.id },
        { userId: new mongoose.Types.ObjectId(session.user.id) },
        { email: session.user.email }
      ]
    };
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { requestId: { $regex: search, $options: 'i' } },
        { orderId: { $regex: search, $options: 'i' } },
        { 'products.productName': { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (page - 1) * limit;
    
    const [returnRequests, total] = await Promise.all([
      ReturnRequest.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ReturnRequest.countDocuments(query)
    ]);
    
    return NextResponse.json({
      returnRequests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching user return requests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new return request for logged-in user
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();
    
    const body = await request.json();
    const {
      orderId,
      type,
      reason,
      details,
      products,
      attachments
    } = body;
    
    // Validate required fields
    if (!orderId || !type || !reason || !products || products.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Verify order belongs to user
    const order = await Order.findOne({ _id: orderId, userId: session.user.id });
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found or does not belong to user' },
        { status: 404 }
      );
    }
    
    // Generate unique request ID
    const requestId = `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    // Create return request
    const returnRequest = new ReturnRequest({
      requestId,
      orderId,
      userId: session.user.id,
      customerName: session.user.name || 'User',
      email: session.user.email || '',
      phone: '', // Can be added later
      type,
      reason,
      details: details || '',
      products,
      attachments: attachments || [],
      status: 'pending',
      statusHistory: [{
        status: 'pending',
        message: 'Return request submitted',
        timestamp: new Date()
      }]
    });
    
    await returnRequest.save();
    
    return NextResponse.json({
      success: true,
      requestId,
      message: 'Return request submitted successfully',
      returnRequest: {
        requestId,
        status: returnRequest.status,
        createdAt: returnRequest.createdAt
      }
    });
    
  } catch (error) {
    console.error('Error creating user return request:', error);
    return NextResponse.json(
      { error: 'Failed to submit return request' },
      { status: 500 }
    );
  }
}
