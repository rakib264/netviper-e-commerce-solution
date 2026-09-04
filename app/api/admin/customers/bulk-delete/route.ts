import { auth } from '@/lib/auth';
import AuditLog from '@/lib/models/AuditLog';
import Order from '@/lib/models/Order';
import User from '@/lib/models/User';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const { customerIds } = await request.json();
    
    if (!Array.isArray(customerIds) || customerIds.length === 0) {
      return NextResponse.json({ error: 'Invalid customer IDs provided' }, { status: 400 });
    }

    const results = {
      deleted: 0,
      deactivated: 0,
      errors: [] as Array<{ id: string; error: string }>,
      details: [] as Array<{ id: string; name?: string; action: string; reason?: string }>
    };

    for (const customerId of customerIds) {
      try {
        const customer = await User.findById(customerId);
        
        if (!customer) {
          results.errors.push({ id: customerId, error: 'Customer not found' });
          continue;
        }

        // Check if customer has orders
        const orderCount = await Order.countDocuments({ customer: customerId });
        
        if (orderCount > 0) {
          // Soft delete (deactivate)
          await User.findByIdAndUpdate(customerId, { 
            isActive: false, 
            deletedAt: new Date(),
            email: `deleted_${Date.now()}_${customer.email}`
          });
          results.deactivated++;
          results.details.push({
            id: customerId,
            name: `${customer.firstName} ${customer.lastName}`,
            action: 'deactivated',
            reason: 'Had existing orders'
          });
        } else {
          // Hard delete
          await User.findByIdAndDelete(customerId);
          results.deleted++;
          results.details.push({
            id: customerId,
            name: `${customer.firstName} ${customer.lastName}`,
            action: 'deleted',
            reason: 'No existing orders'
          });
        }

        // Log audit
        await AuditLog.create({
          user: session.user.id,
          action: 'DELETE',
          resource: 'User',
          resourceId: customerId,
          metadata: { 
            customerEmail: customer.email,
            customerName: `${customer.firstName} ${customer.lastName}`,
            hadOrders: orderCount > 0,
            deletionType: orderCount > 0 ? 'soft' : 'hard',
            bulkOperation: true
          }
        });

      } catch (error) {
        console.error(`Error deleting customer ${customerId}:`, error);
        results.errors.push({ 
          id: customerId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Bulk delete completed. ${results.deleted} deleted, ${results.deactivated} deactivated.`,
      results
    });

  } catch (error) {
    console.error('Bulk delete customers error:', error);
    return NextResponse.json({ error: 'Failed to delete customers' }, { status: 500 });
  }
}
