import { createAuditLog, getClientIP } from '@/lib/audit';
import { auth } from '@/lib/auth';
import User from '@/lib/models/User';
import connectDB from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/admin-manager - Get all admin/manager users with filters, search, pagination
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const skip = (page - 1) * limit;

    // Build filter object for admin/manager users only (exclude soft-deleted)
    const filter: any = { 
      role: { $in: ['admin', 'manager'] },
      deletedAt: { $exists: false } // Exclude soft-deleted records
    };

    // Search across multiple fields
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Role filter
    if (role && role !== 'all') {
      filter.role = role;
    }

    // Status filter
    if (status && status !== 'all') {
      filter.isActive = status === 'active';
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get total count
    const total = await User.countDocuments(filter);

    // Get users with pagination
    const users = await User.find(filter)
      .select('-password')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Transform data to match frontend interface
    const admins = users.map((user: any) => ({
      id: user._id.toString(),
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      role: user.role,
      status: user.isActive ? 'active' : 'inactive',
      lastLogin: user.lastLogin?.toISOString() || user.createdAt.toISOString(),
      createdAt: user.createdAt.toISOString(),
      avatar: undefined // You can add avatar field to User model if needed
    }));

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      admins,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Admin manager GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch admin users' }, { status: 500 });
  }
}

// POST /api/admin/admin-manager - Create new admin/manager
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { firstName, lastName, email, role, password, isActive = true } = await request.json();

    // Validate required fields
    if (!firstName || !lastName || !email || !role || !password) {
      return NextResponse.json({ 
        error: 'Missing required fields: firstName, lastName, email, role, password' 
      }, { status: 400 });
    }

    // Validate role
    if (!['admin', 'manager'].includes(role)) {
      return NextResponse.json({ 
        error: 'Invalid role. Must be admin or manager' 
      }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ 
        error: 'User with this email already exists' 
      }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new admin/manager user
    const newUser = new User({
      firstName,
      lastName,
      email,
      role,
      password: hashedPassword,
      isActive,
      emailVerified: true, // Admin/manager accounts are auto-verified
      authProvider: 'credentials',
      profileImage: '', // Initialize as empty string
    });

    await newUser.save();

    // Log audit trail
    await createAuditLog({
      userId: session.user.id,
      action: 'CREATE',
      resource: 'AdminUser',
      resourceId: newUser._id.toString(),
      changes: [
        {
          field: 'role',
          oldValue: null,
          newValue: role
        },
        {
          field: 'email',
          oldValue: null,
          newValue: email
        },
        {
          field: 'isActive',
          oldValue: null,
          newValue: isActive
        }
      ],
      metadata: { 
        adminEmail: email,
        adminName: `${firstName} ${lastName}`,
        createdBy: session.user.email
      },
              ipAddress: getClientIP(request)
    });

    // Return user without password
    const userResponse = {
      id: (newUser._id as any).toString(),
      name: `${newUser.firstName} ${newUser.lastName}`,
      email: newUser.email,
      role: newUser.role,
      status: newUser.isActive ? 'active' : 'inactive',
      lastLogin: newUser.lastLogin?.toISOString() || newUser.createdAt.toISOString(),
      createdAt: newUser.createdAt.toISOString(),
      avatar: undefined
    };

    return NextResponse.json(userResponse, { status: 201 });
  } catch (error) {
    console.error('Admin manager POST error:', error);
    return NextResponse.json({ error: 'Failed to create admin user' }, { status: 500 });
  }
}
