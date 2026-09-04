import { auth } from '@/lib/auth';
import Message from '@/lib/models/Message';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await context.params;

    const message = await Message.findById(id)
      .populate('sender', 'firstName lastName email')
      .lean();

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Message details API error:', error);
    return NextResponse.json({ error: 'Failed to fetch message details' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await context.params;

    const message = await Message.findById(id);
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    await Message.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message API error:', error);
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}
