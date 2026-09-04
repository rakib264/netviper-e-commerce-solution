import { auth } from '@/lib/auth';
import AuditLog from '@/lib/models/AuditLog';
import User from '@/lib/models/User';
import connectDB from '@/lib/mongodb';
 
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const { isActive } = await request.json();
    const { id } = await context.params;
    const oldUser = await User.findById(id);
    
    if (!oldUser) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    ).select('-password');

    // Log audit
    await AuditLog.create({
      user: session.user.id,
      action: 'UPDATE',
      resource: 'User',
      resourceId: id,
      changes: [
        {
          field: 'isActive',
          oldValue: oldUser.isActive,
          newValue: isActive
        }
      ],
      metadata: { 
        customerEmail: updatedUser.email,
        customerName: `${updatedUser.firstName} ${updatedUser.lastName}`
      }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Update customer status error:', error);
    return NextResponse.json({ error: 'Failed to update customer status' }, { status: 500 });
  }
}