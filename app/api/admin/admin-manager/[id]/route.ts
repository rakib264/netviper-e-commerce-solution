import { createAuditLog, getClientIP } from '@/lib/audit';
import { auth } from '@/lib/auth';
import User from '@/lib/models/User';
import connectDB from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/admin-manager/[id] - Get specific admin/manager details
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
    const user = await User.findOne({ 
      _id: id, 
      role: { $in: ['admin', 'manager'] } 
    }).select('-password');
    
    if (!user) {
      return NextResponse.json({ error: 'Admin/Manager not found' }, { status: 404 });
    }

    const adminResponse = {
      id: (user._id as any).toString(),
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      role: user.role,
      status: user.isActive ? 'active' : 'inactive',
      lastLogin: user.lastLogin?.toISOString() || user.createdAt.toISOString(),
      createdAt: user.createdAt.toISOString(),
      avatar: undefined
    };

    return NextResponse.json(adminResponse);
  } catch (error) {
    console.error('Get admin/manager error:', error);
    return NextResponse.json({ error: 'Failed to fetch admin/manager' }, { status: 500 });
  }
}

// PUT /api/admin/admin-manager/[id] - Update admin/manager
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
    
    const { id } = await context.params;
    const updateData = await request.json();
    
    // Remove sensitive fields that shouldn't be updated directly
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.lastLogin;

    // Find the user
    const oldUser = await User.findOne({ 
      _id: id, 
      role: { $in: ['admin', 'manager'] } 
    });
    
    if (!oldUser) {
      return NextResponse.json({ error: 'Admin/Manager not found' }, { status: 404 });
    }

    // Prevent non-admin users from changing roles
    if (session.user.role !== 'admin' && updateData.role) {
      delete updateData.role;
    }

    // Handle password update
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 12);
    }

    // Handle name fields
    if (updateData.name) {
      const nameParts = updateData.name.split(' ');
      updateData.firstName = nameParts[0];
      updateData.lastName = nameParts.slice(1).join(' ') || '';
      delete updateData.name;
    }

    // Handle status field
    if (updateData.status) {
      updateData.isActive = updateData.status === 'active';
      delete updateData.status;
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select('-password');

    // Log audit trail
    const changes = [];
    for (const [key, value] of Object.entries(updateData)) {
      if (key === 'password') continue; // Don't log password changes
      
      const oldValue = oldUser[key];
      if (oldValue !== value) {
        changes.push({
          field: key,
          oldValue: oldValue,
          newValue: value
        });
      }
    }

    if (changes.length > 0) {
      await createAuditLog({
        userId: session.user.id,
        action: 'UPDATE',
        resource: 'AdminUser',
        resourceId: id,
        changes,
        metadata: { 
          adminEmail: updatedUser.email,
          adminName: `${updatedUser.firstName} ${updatedUser.lastName}`,
          updatedBy: session.user.email
        },
        ipAddress: getClientIP(request)
      });
    }

    const adminResponse = {
      id: (updatedUser._id as any).toString(),
      name: `${updatedUser.firstName} ${updatedUser.lastName}`,
      email: updatedUser.email,
      role: updatedUser.role,
      status: updatedUser.isActive ? 'active' : 'inactive',
      lastLogin: updatedUser.lastLogin?.toISOString() || updatedUser.createdAt.toISOString(),
      createdAt: updatedUser.createdAt.toISOString(),
      avatar: undefined
    };

    return NextResponse.json(adminResponse);
  } catch (error) {
    console.error('Update admin/manager error:', error);
    return NextResponse.json({ error: 'Failed to update admin/manager' }, { status: 500 });
  }
}

// DELETE /api/admin/admin-manager/[id] - Delete admin/manager
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const { id } = await context.params;
    
    // Prevent self-deletion
    if (session.user.id === id) {
      return NextResponse.json({ 
        error: 'You cannot delete your own account' 
      }, { status: 400 });
    }
    
    const user = await User.findOne({ 
      _id: id, 
      role: { $in: ['admin', 'manager'] } 
    });
    
    if (!user) {
      return NextResponse.json({ error: 'Admin/Manager not found' }, { status: 404 });
    }

    // Soft delete by deactivating the account
    await User.findByIdAndUpdate(id, { 
      isActive: false, 
      deletedAt: new Date(),
      email: `deleted_${Date.now()}_${user.email}` // Prevent email conflicts
    });

    // Log audit
    await createAuditLog({
      userId: session.user.id,
      action: 'DELETE',
      resource: 'AdminUser',
      resourceId: id,
      changes: [
        {
          field: 'isActive',
          oldValue: user.isActive,
          newValue: false
        }
      ],
      metadata: { 
        adminEmail: user.email,
        adminName: `${user.firstName} ${user.lastName}`,
        deletedBy: session.user.email,
        deletionType: 'soft'
      },
      ipAddress: getClientIP(request)
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Admin/Manager deactivated successfully' 
    });
  } catch (error) {
    console.error('Delete admin/manager error:', error);
    return NextResponse.json({ error: 'Failed to delete admin/manager' }, { status: 500 });
  }
}
