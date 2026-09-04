import { createAuditLog, getClientIP } from '@/lib/audit';
import { auth } from '@/lib/auth';
import User from '@/lib/models/User';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/admin/admin-manager/bulk-actions - Handle bulk operations
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { action, adminIds } = await request.json();

    if (!action || !adminIds || !Array.isArray(adminIds) || adminIds.length === 0) {
      return NextResponse.json({ 
        error: 'Missing required fields: action and adminIds' 
      }, { status: 400 });
    }

    // Prevent self-modification in bulk actions
    const filteredAdminIds = adminIds.filter(id => id !== session.user.id);

    if (filteredAdminIds.length === 0) {
      return NextResponse.json({ 
        error: 'No valid admin IDs provided' 
      }, { status: 400 });
    }

    let result;
    let auditChanges = [];

    switch (action) {
      case 'activate':
        result = await User.updateMany(
          { 
            _id: { $in: filteredAdminIds },
            role: { $in: ['admin', 'manager'] }
          },
          { isActive: true, updatedAt: new Date() }
        );
        
        auditChanges = [{
          field: 'isActive',
          oldValue: false,
          newValue: true
        }];
        break;

      case 'deactivate':
        result = await User.updateMany(
          { 
            _id: { $in: filteredAdminIds },
            role: { $in: ['admin', 'manager'] }
          },
          { isActive: false, updatedAt: new Date() }
        );
        
        auditChanges = [{
          field: 'isActive',
          oldValue: true,
          newValue: false
        }];
        break;

      case 'delete':
        // Only admins can perform bulk delete
        if (session.user.role !== 'admin') {
          return NextResponse.json({ 
            error: 'Only admins can perform bulk delete operations' 
          }, { status: 403 });
        }

        // Soft delete by deactivating accounts
        result = await User.updateMany(
          { 
            _id: { $in: filteredAdminIds },
            role: { $in: ['admin', 'manager'] }
          },
          { 
            isActive: false, 
            deletedAt: new Date(),
            updatedAt: new Date()
          }
        );
        
        auditChanges = [{
          field: 'isActive',
          oldValue: true,
          newValue: false
        }];
        break;

      default:
        return NextResponse.json({ 
          error: 'Invalid action. Supported actions: activate, deactivate, delete' 
        }, { status: 400 });
    }

    // Log audit trail for bulk action
    await createAuditLog({
      userId: session.user.id,
      action: action.toUpperCase(),
      resource: 'AdminUser',
      resourceId: filteredAdminIds.join(','),
      changes: auditChanges,
      metadata: { 
        action,
        affectedCount: result.modifiedCount,
        adminIds: filteredAdminIds,
        performedBy: session.user.email
      },
              ipAddress: getClientIP(request)
    });

    return NextResponse.json({
      success: true,
      message: `Bulk ${action} completed successfully`,
      affectedCount: result.modifiedCount,
      totalRequested: adminIds.length,
      processed: filteredAdminIds.length
    });
  } catch (error) {
    console.error('Bulk actions error:', error);
    return NextResponse.json({ error: 'Failed to perform bulk action' }, { status: 500 });
  }
}
