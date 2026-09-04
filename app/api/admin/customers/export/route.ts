import { auth } from '@/lib/auth';
import AuditLog from '@/lib/models/AuditLog';
import Order from '@/lib/models/Order';
import User from '@/lib/models/User';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager', 'staff'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const { customerIds, format = 'csv', includeOrders = false } = await request.json();
    
    let customers;
    
    if (customerIds && Array.isArray(customerIds) && customerIds.length > 0) {
      // Export selected customers
      customers = await User.find({ _id: { $in: customerIds } })
        .select('-password')
        .lean();
    } else {
      // Export all customers with applied filters from query params
      const { searchParams } = new URL(request.url);
      const search = searchParams.get('search') || '';
      const active = searchParams.get('active');
      const sortBy = searchParams.get('sortBy') || 'createdAt';
      const sortOrder = searchParams.get('sortOrder') || 'desc';

      const query: any = { role: 'customer' };

      if (search) {
        query.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ];
      }

      if (active !== null && active !== undefined && active !== '' && active !== 'all') {
        query.isActive = active === 'true';
      }

      const sort: any = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      customers = await User.find(query)
        .select('-password')
        .sort(sort)
        .lean();
    }

    // Add order statistics if requested
    if (includeOrders) {
      const customersWithStats = await Promise.all(
        customers.map(async (customer) => {
          const orders = await Order.find({ customer: customer._id });
          const totalOrders = orders.length;
          const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);
          const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
          const lastOrderDate = orders.length > 0 
            ? new Date(Math.max(...orders.map(order => new Date(order.createdAt).getTime())))
            : null;

          return {
            ...customer,
            totalOrders,
            totalSpent,
            averageOrderValue,
            lastOrderDate
          };
        })
      );
      customers = customersWithStats;
    }

    // Generate export data based on format
    let exportData;
    let contentType;
    let filename;

    if (format === 'json') {
      exportData = JSON.stringify(customers, null, 2);
      contentType = 'application/json';
      filename = `customers_export_${new Date().toISOString().split('T')[0]}.json`;
    } else {
      // CSV format (default)
      const headers = [
        'ID',
        'First Name',
        'Last Name',
        'Email',
        'Phone',
        'Status',
        'Street',
        'City',
        'District',
        'Division',
        'Joined Date',
        'Last Login'
      ];

      if (includeOrders) {
        headers.push('Total Orders', 'Total Spent', 'Average Order Value', 'Last Order Date');
      }

      const csvRows = [headers.join(',')];

      customers.forEach(customer => {
        try {
          const row = [
            customer._id || '',
            `"${(customer.firstName || '').replace(/"/g, '""')}"`,
            `"${(customer.lastName || '').replace(/"/g, '""')}"`,
            `"${(customer.email || '').replace(/"/g, '""')}"`,
            `"${(customer.phone || '').replace(/"/g, '""')}"`,
            customer.isActive ? 'Active' : 'Inactive',
            `"${(customer.address?.street || '').replace(/"/g, '""')}"`,
            `"${(customer.address?.city || '').replace(/"/g, '""')}"`,
            `"${(customer.address?.district || '').replace(/"/g, '""')}"`,
            `"${(customer.address?.division || '').replace(/"/g, '""')}"`,
            customer.createdAt ? new Date(customer.createdAt).toISOString().split('T')[0] : '',
            customer.lastLogin ? new Date(customer.lastLogin).toISOString().split('T')[0] : ''
          ];

          if (includeOrders) {
            row.push(
              (customer.totalOrders || 0).toString(),
              (customer.totalSpent || 0).toString(),
              (customer.averageOrderValue || 0).toFixed(2),
              customer.lastOrderDate ? new Date(customer.lastOrderDate).toISOString().split('T')[0] : ''
            );
          }

          csvRows.push(row.join(','));
        } catch (error) {
          console.error('Error processing customer for export:', customer._id, error);
          // Skip this customer if there's an error
        }
      });

      exportData = csvRows.join('\n');
      contentType = 'text/csv';
      filename = `customers_export_${new Date().toISOString().split('T')[0]}.csv`;
    }

    // Log audit
    if (session.user?.id) {
      try {
        await AuditLog.create({
          user: session.user.id,
          action: 'EXPORT',
          resource: 'User',
          resourceId: 'bulk_export',
          metadata: { 
            exportType: 'customers',
            format,
            includeOrders,
            customerCount: customers.length,
            isSelectedExport: customerIds && customerIds.length > 0
          }
        });
      } catch (auditError) {
        console.error('Failed to create audit log:', auditError);
        // Continue with export even if audit fails
      }
    }

    return new NextResponse(exportData, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Export customers error:', error);
    
    // Provide more detailed error information
    let errorMessage = 'Failed to export customers';
    if (error instanceof Error) {
      errorMessage = `Export failed: ${error.message}`;
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      details: error instanceof Error ? error.stack : 'Unknown error'
    }, { status: 500 });
  }
}
