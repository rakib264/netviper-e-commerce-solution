import { auth } from '@/lib/auth';
import User from '@/lib/models/User';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

/** The distinct segment tags in use, for the audience step's group picker. */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const groups = await User.distinct('customerGroups', { customerGroups: { $ne: [] } });

    return NextResponse.json({ groups: (groups as string[]).filter(Boolean).sort() });
  } catch (error) {
    console.error('Customer groups error:', error);
    return NextResponse.json({ error: 'Failed to fetch customer groups' }, { status: 500 });
  }
}
