import { auth } from '@/lib/auth';
import AuditLog from '@/lib/models/AuditLog';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const action = searchParams.get('action') || '';
    const resource = searchParams.get('resource') || '';
    const user = searchParams.get('user') || '';
    const dateRange = searchParams.get('dateRange') || '7d';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    if (action && action !== 'all') {
      query.action = action;
    }

    if (resource && resource !== 'all') {
      query.resource = resource;
    }

    if (user) {
      query.$or = [
        { 'user.firstName': { $regex: user, $options: 'i' } },
        { 'user.lastName': { $regex: user, $options: 'i' } },
        { 'user.email': { $regex: user, $options: 'i' } }
      ];
    }

    // Date range filter
    if (dateRange) {
      const now = new Date();
      let startDate = new Date();
      
      switch (dateRange) {
        case '1d':
          startDate.setDate(now.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(now.getDate() - 90);
          break;
      }
      
      query.createdAt = { $gte: startDate };
    }

    // Build sort
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const logs = await AuditLog.find(query)
      .populate({
        path: 'user',
        select: 'firstName lastName email role',
        options: { strictPopulate: false }
      })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await AuditLog.countDocuments(query);

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Audit logs API error:', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const body = await request.json();
    
    const { logIds } = body;
    
    if (!Array.isArray(logIds) || logIds.length === 0) {
      return NextResponse.json({ error: 'Invalid log IDs' }, { status: 400 });
    }

    // Validate and convert ObjectIds
    const validObjectIds = logIds.filter(id => {
      const isValid = mongoose.Types.ObjectId.isValid(id);
      if (!isValid) {
        // console.log('Invalid ObjectId:', id);
      }
      return isValid;
    });
    
    // console.log('Valid ObjectIds:', validObjectIds);
    
    if (validObjectIds.length === 0) {
      return NextResponse.json({ error: 'No valid log IDs provided' }, { status: 400 });
    }

    // Get client IP address
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     '127.0.0.1';

    // Delete audit logs
    const result = await AuditLog.deleteMany({ _id: { $in: validObjectIds } });
    
    // Log the bulk delete action
    const auditLogData: any = {
      user: session.user.id,
      action: 'BULK_DELETE',
      resource: 'AuditLog',
      changes: [],
      metadata: { 
        deletedCount: result.deletedCount,
        deletedLogIds: validObjectIds,
        reason: 'Bulk deletion via admin panel'
      },
      ipAddress
    };

    // Only add resourceId if we have a meaningful value
    if (validObjectIds.length > 0) {
      auditLogData.resourceId = `bulk-delete-${Date.now()}`;
    }

    await AuditLog.create(auditLogData);

    return NextResponse.json({ 
      message: `${result.deletedCount} audit logs deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Bulk delete audit logs error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete audit logs',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}