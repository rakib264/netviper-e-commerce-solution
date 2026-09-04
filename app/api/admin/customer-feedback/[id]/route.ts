import { createAuditLog, getClientIP } from '@/lib/audit';
import { auth } from '@/lib/auth';
import CustomerFeedback from '@/lib/models/CustomerFeedback';
import User from '@/lib/models/User';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

// GET - Fetch single customer feedback
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Check if user is admin or manager
    if (!['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const feedback = await CustomerFeedback.findById(id);

    if (!feedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    return NextResponse.json({ feedback });
  } catch (error: any) {
    console.error('Error fetching customer feedback:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer feedback' },
      { status: 500 }
    );
  }
}

// PUT - Update customer feedback
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Check if user is admin or manager
    if (!['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = await User.findOne({ email: session.user.email });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { id } = await params;
    const body = await request.json();

    const {
      platform,
      platformName,
      customer,
      message,
      rating,
      productImage,
      isActive,
    } = body;

    // Validation
    if (rating && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (platform) updateData.platform = platform;
    if (platformName) updateData.platformName = platformName;
    if (customer) {
      updateData.customer = {
        name: customer.name,
        avatar: customer.avatar,
        location: customer.location,
        verified: customer.verified || false,
      };
    }
    if (message) updateData.message = message;
    if (rating) updateData.rating = rating;
    if (productImage !== undefined) updateData.productImage = productImage;
    if (isActive !== undefined) updateData.isActive = isActive;

    const feedback = await CustomerFeedback.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!feedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    // Log audit
    await createAuditLog({
      userId: user._id.toString(),
      action: 'UPDATE',
      resource: 'customer_feedback',
      resourceId: feedback._id.toString(),
      metadata: {
        customerName: feedback.customer.name,
        platform: feedback.platform,
        updatedFields: Object.keys(updateData),
      },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({
      message: 'Customer feedback updated successfully',
      feedback,
    });
  } catch (error: any) {
    console.error('Error updating customer feedback:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { 
        error: 'Failed to update customer feedback',
        details: error.message,
        mongoError: error.name 
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete customer feedback
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Check if user is admin or manager
    if (!['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = await User.findOne({ email: session.user.email });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { id } = await params;
    const feedback = await CustomerFeedback.findByIdAndDelete(id);

    if (!feedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    // Log audit
    await createAuditLog({
      userId: user._id.toString(),
      action: 'DELETE',
      resource: 'customer_feedback',
      resourceId: id,
      metadata: {
        customerName: feedback.customer.name,
        platform: feedback.platform,
      },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({
      message: 'Customer feedback deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting customer feedback:', error);
    console.error('Error details:', error.message);
    return NextResponse.json(
      { 
        error: 'Failed to delete customer feedback',
        details: error.message 
      },
      { status: 500 }
    );
  }
}



