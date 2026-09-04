import { auth } from '@/lib/auth';
import AuditLog from '@/lib/models/AuditLog';
import User from '@/lib/models/User';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const { customerIds, isActive } = await request.json();
    
    if (!Array.isArray(customerIds) || customerIds.length === 0) {
      return NextResponse.json({ error: 'Invalid customer IDs provided' }, { status: 400 });
    }

    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'isActive must be a boolean' }, { status: 400 });
    }

    const results = {
      updated: 0,
      errors: [] as Array<{ id: string; error: string }>,
      details: [] as Array<{ id: string; name?: string; action: string; reason?: string }>
    };

    for (const customerId of customerIds) {
      try {
        const oldCustomer = await User.findById(customerId);
        
        if (!oldCustomer) {
          results.errors.push({ id: customerId, error: 'Customer not found' });
          continue;
        }

        // Skip if already in the desired state
        if (oldCustomer.isActive === isActive) {
          results.details.push({
            id: customerId,
            name: `${oldCustomer.firstName} ${oldCustomer.lastName}`,
            action: 'skipped',
            reason: `Already ${isActive ? 'active' : 'inactive'}`
          });
          continue;
        }

        await User.findByIdAndUpdate(customerId, { isActive });
        results.updated++;
        results.details.push({
          id: customerId,
          name: `${oldCustomer.firstName} ${oldCustomer.lastName}`,
          action: isActive ? 'activated' : 'deactivated',
          reason: 'Status updated successfully'
        });

        // Log audit
        await AuditLog.create({
          user: session.user.id,
          action: 'UPDATE',
          resource: 'User',
          resourceId: customerId,
          changes: [
            {
              field: 'isActive',
              oldValue: oldCustomer.isActive,
              newValue: isActive
            }
          ],
          metadata: { 
            customerEmail: oldCustomer.email,
            customerName: `${oldCustomer.firstName} ${oldCustomer.lastName}`,
            bulkOperation: true
          }
        });

      } catch (error) {
        console.error(`Error updating customer ${customerId}:`, error);
        results.errors.push({ 
          id: customerId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Bulk status update completed. ${results.updated} customers updated.`,
      results
    });

  } catch (error) {
    console.error('Bulk status update error:', error);
    return NextResponse.json({ error: 'Failed to update customer statuses' }, { status: 500 });
  }
}
