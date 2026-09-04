import { auth } from '@/lib/auth';
import User from '@/lib/models/User';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/admin/admin-manager/export - Export admin/manager data
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const { adminIds, format = 'csv' } = await request.json();
    
    let admins;
    
    if (adminIds && Array.isArray(adminIds) && adminIds.length > 0) {
      // Export selected admins
      admins = await User.find({ 
        _id: { $in: adminIds },
        role: { $in: ['admin', 'manager'] }
      })
        .select('-password')
        .lean();
    } else {
      // Export all admins with applied filters from query params
      const { searchParams } = new URL(request.url);
      const search = searchParams.get('search') || '';
      const role = searchParams.get('role') || '';
      const status = searchParams.get('status') || '';
      const sortBy = searchParams.get('sortBy') || 'createdAt';
      const sortOrder = searchParams.get('sortOrder') || 'desc';

      const filter: any = { role: { $in: ['admin', 'manager'] } };

      if (search) {
        filter.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ];
      }

      if (role && role !== 'all') {
        filter.role = role;
      }

      if (status && status !== 'all') {
        filter.isActive = status === 'active';
      }

      const sort: any = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      admins = await User.find(filter)
        .select('-password')
        .sort(sort)
        .lean();
    }

    if (format === 'csv') {
      // Generate CSV content
      const csvHeaders = [
        'Name',
        'Email',
        'Role',
        'Status',
        'Phone',
        'Last Login',
        'Created At',
        'Email Verified'
      ];

      const csvRows = admins.map(admin => [
        `"${admin.firstName} ${admin.lastName}"`,
        `"${admin.email}"`,
        `"${admin.role}"`,
        `"${admin.isActive ? 'Active' : 'Inactive'}"`,
        `"${admin.phone || ''}"`,
        `"${admin.lastLogin ? new Date(admin.lastLogin).toLocaleDateString() : 'Never'}"`,
        `"${new Date(admin.createdAt).toLocaleDateString()}"`,
        `"${admin.emailVerified ? 'Yes' : 'No'}"`
      ]);

      const csvContent = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n');

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="admin-manager-export-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    } else if (format === 'json') {
      // Return JSON format
      const jsonData = admins.map((admin: any) => ({
        id: admin._id.toString(),
        name: `${admin.firstName} ${admin.lastName}`,
        email: admin.email,
        role: admin.role,
        status: admin.isActive ? 'active' : 'inactive',
        phone: admin.phone || '',
        lastLogin: admin.lastLogin?.toISOString() || null,
        createdAt: admin.createdAt.toISOString(),
        emailVerified: admin.emailVerified
      }));

      return new NextResponse(JSON.stringify(jsonData, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="admin-manager-export-${new Date().toISOString().split('T')[0]}.json"`
        }
      });
    } else {
      return NextResponse.json({ 
        error: 'Invalid format. Supported formats: csv, json' 
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Export admin/manager error:', error);
    return NextResponse.json({ error: 'Failed to export admin/manager data' }, { status: 500 });
  }
}
