import { auth } from '@/lib/auth';
import Message from '@/lib/models/Message';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
    const provider = searchParams.get('provider') || '';
    const status = searchParams.get('status') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    if (search) {
      query.$or = [
        { content: { $regex: search, $options: 'i' } },
        { 'sender.firstName': { $regex: search, $options: 'i' } },
        { 'sender.lastName': { $regex: search, $options: 'i' } },
        { provider: { $regex: search, $options: 'i' } }
      ];
    }

    if (type) {
      query.type = type;
    }

    if (provider) {
      query.provider = provider;
    }

    if (status) {
      switch (status) {
        case 'sent':
          query.sentCount = { $gt: 0 };
          break;
        case 'delivered':
          query.deliveredCount = { $gt: 0 };
          break;
        case 'failed':
          query.failedCount = { $gt: 0 };
          break;
        case 'pending':
          query.sentCount = 0;
          break;
      }
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.createdAt.$lte = new Date(dateTo + 'T23:59:59.999Z');
      }
    }

    // Build sort
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const messages = await Message.find(query)
      .populate('sender', 'firstName lastName')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Message.countDocuments(query);

    return NextResponse.json({
      messages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Messages API error:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids');
    const single = searchParams.get('id');

    if (!ids && !single) {
      return NextResponse.json({ error: 'Message ID(s) required' }, { status: 400 });
    }

    if (single) {
      // Delete single message
      const message = await Message.findById(single);
      if (!message) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 });
      }

      await Message.findByIdAndDelete(single);
      return NextResponse.json({ message: 'Message deleted successfully' });
    }

    if (ids) {
      // Bulk delete messages
      const messageIds = ids.split(',').filter(id => id.trim());
      if (messageIds.length === 0) {
        return NextResponse.json({ error: 'No valid message IDs provided' }, { status: 400 });
      }

      const result = await Message.deleteMany({ _id: { $in: messageIds } });
      
      return NextResponse.json({ 
        message: `${result.deletedCount} message(s) deleted successfully`,
        deletedCount: result.deletedCount
      });
    }

  } catch (error) {
    console.error('Delete messages API error:', error);
    return NextResponse.json({ error: 'Failed to delete message(s)' }, { status: 500 });
  }
}