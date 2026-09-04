import { auth } from '@/lib/auth';
import AuditLog from '@/lib/models/AuditLog';
import Order from '@/lib/models/Order';
import User from '@/lib/models/User';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

// GET - View customer details
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager', 'staff'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const { id } = await context.params;
    
    // Get customer details
    const customer = await User.findById(id).select('-password').lean();
    
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Get customer orders for statistics
    const orders = await Order.find({ customer: id });
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);
    const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

    const customerWithStats = {
      ...customer,
      totalOrders,
      totalSpent,
      averageOrderValue,
      recentOrders: orders.slice(-5).reverse(), // Last 5 orders
      orderStatusBreakdown: {
        pending: orders.filter(o => o.orderStatus === 'pending').length,
        confirmed: orders.filter(o => o.orderStatus === 'confirmed').length,
        processing: orders.filter(o => o.orderStatus === 'processing').length,
        shipped: orders.filter(o => o.orderStatus === 'shipped').length,
        delivered: orders.filter(o => o.orderStatus === 'delivered').length,
        cancelled: orders.filter(o => o.orderStatus === 'cancelled').length
      }
    };

    return NextResponse.json(customerWithStats);
  } catch (error) {
    console.error('Get customer error:', error);
    return NextResponse.json({ error: 'Failed to fetch customer' }, { status: 500 });
  }
}

// PUT - Edit customer details
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
    
    // Remove sensitive fields that shouldn't be updated
    delete updateData._id;
    delete updateData.password;
    delete updateData.role;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const oldCustomer = await User.findById(id);
    
    if (!oldCustomer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const updatedCustomer = await User.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select('-password');

    // Log audit trail
    const changes = [];
    for (const [key, value] of Object.entries(updateData)) {
      if (oldCustomer[key] !== value) {
        changes.push({
          field: key,
          oldValue: oldCustomer[key],
          newValue: value
        });
      }
    }

    if (changes.length > 0) {
      await AuditLog.create({
        user: session.user.id,
        action: 'UPDATE',
        resource: 'User',
        resourceId: id,
        changes,
        metadata: { 
          customerEmail: updatedCustomer.email,
          customerName: `${updatedCustomer.firstName} ${updatedCustomer.lastName}`
        }
      });
    }

    return NextResponse.json(updatedCustomer);
  } catch (error) {
    console.error('Update customer error:', error);
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
  }
}

// DELETE - Delete customer
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
    
    const customer = await User.findById(id);
    
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Check if customer has orders - for safety
    const orderCount = await Order.countDocuments({ customer: id });
    
    if (orderCount > 0) {
      // Instead of hard delete, we might want to soft delete or deactivate
      await User.findByIdAndUpdate(id, { 
        isActive: false, 
        deletedAt: new Date(),
        email: `deleted_${Date.now()}_${customer.email}` // Prevent email conflicts
      });
    } else {
      // Hard delete if no orders
      await User.findByIdAndDelete(id);
    }

    // Log audit
    await AuditLog.create({
      user: session.user.id,
      action: 'DELETE',
      resource: 'User',
      resourceId: id,
      metadata: { 
        customerEmail: customer.email,
        customerName: `${customer.firstName} ${customer.lastName}`,
        hadOrders: orderCount > 0,
        deletionType: orderCount > 0 ? 'soft' : 'hard'
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: orderCount > 0 
        ? 'Customer deactivated (had existing orders)' 
        : 'Customer deleted successfully' 
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 });
  }
}
