import { auth } from '@/lib/auth';
import AuditLog from '@/lib/models/AuditLog';
import Courier from '@/lib/models/Courier';
import CourierSettings from '@/lib/models/CourierSettings';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager', 'staff'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    if (search) {
      query.$or = [
        { courierId: { $regex: search, $options: 'i' } },
        { 'receiver.name': { $regex: search, $options: 'i' } },
        { 'receiver.phone': { $regex: search, $options: 'i' } },
        { trackingNumber: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      query.status = status;
    }

    // Build sort
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const couriers = await Courier.find(query)
      .populate('order', 'orderNumber total')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Courier.countDocuments(query);

    return NextResponse.json({
      couriers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Courier API error:', error);
    return NextResponse.json({ error: 'Failed to fetch couriers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager', 'staff'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const data = await request.json();
    
    // Get courier settings for delivery charges and default sender info
    let courierSettings = await CourierSettings.findOne();
    if (!courierSettings) {
      // Create default settings if none exist
      courierSettings = await CourierSettings.create({
        senderInfo: {
          name: process.env.NEXT_PUBLIC_SITE_NAME || 'Muscari Mart',
          phone: process.env.NEXT_PUBLIC_SITE_PHONE || '+8801234567890',
          address: process.env.NEXT_PUBLIC_SITE_ADDRESS || '123 Technology Street',
          division: 'Dhaka',
          district: 'Dhaka',
        },
        deliveryCharges: {
          regularWithinDhaka: 60,
          regularOutsideDhaka: 120,
          expressWithinDhaka: 100,
          expressOutsideDhaka: 150,
          sameDayWithinDhaka: 150,
          fragileHandlingCharge: 20,
        },
        codChargeRate: 1,
        weightBasedCharging: true,
        freeDeliveryThreshold: 1000,
        defaultCourierPartners: ['steadfast'],
      });
    }
    
    // Generate courier ID if not provided
    if (!data.courierId) {
      data.courierId = `CR${Date.now().toString().slice(-8)}`;
    }

    // Use sender info from settings if not provided
    if (!data.sender || !data.sender.name) {
      data.sender = {
        name: data.sender?.name || courierSettings.senderInfo.name,
        phone: data.sender?.phone || courierSettings.senderInfo.phone,
        address: data.sender?.address || courierSettings.senderInfo.address,
        division: data.sender?.division || courierSettings.senderInfo.division,
        district: data.sender?.district || courierSettings.senderInfo.district,
      };
    }

    // Calculate delivery charge based on parcel type and location
    let deliveryCharge = 60; // Default fallback
    const parcelType = data.parcel?.type || 'regular';
    const isWithinDhaka = data.receiver?.city?.toLowerCase().includes('dhaka') || 
                         data.receiver?.district?.toLowerCase().includes('dhaka');

    if (parcelType === 'regular') {
      deliveryCharge = isWithinDhaka ? 
        courierSettings.deliveryCharges.regularWithinDhaka : 
        courierSettings.deliveryCharges.regularOutsideDhaka;
    } else if (parcelType === 'express') {
      deliveryCharge = isWithinDhaka ? 
        courierSettings.deliveryCharges.expressWithinDhaka : 
        courierSettings.deliveryCharges.expressOutsideDhaka;
    } else if (parcelType === 'same_day') {
      deliveryCharge = courierSettings.deliveryCharges.sameDayWithinDhaka;
    }

    // Add fragile handling charge if applicable
    if (data.isFragile || data.parcel?.type === 'fragile') {
      deliveryCharge += courierSettings.deliveryCharges.fragileHandlingCharge;
    }

    // Calculate COD charge
    let codCharge = 0;
    if (data.isCOD && data.codAmount > 0) {
      codCharge = Math.max(10, (data.codAmount * courierSettings.codChargeRate) / 100);
    }

    // Set charges
    data.charges = {
      deliveryCharge: data.deliveryCharge || deliveryCharge,
      codCharge: data.codCharge || codCharge,
      totalCharge: (data.deliveryCharge || deliveryCharge) + (data.codCharge || codCharge)
    };

    // Set default courier partner if not provided
    if (!data.courierPartner && courierSettings.defaultCourierPartners.length > 0) {
      data.courierPartner = courierSettings.defaultCourierPartners[0];
    }

    const courier = await Courier.create(data);

    // Log audit
    await AuditLog.create({
      user: session.user.id,
      action: 'CREATE',
      resource: 'Courier',
      resourceId: courier._id.toString(),
      metadata: { 
        courierId: courier.courierId,
        orderId: data.orderId
      }
    });
    
    return NextResponse.json(courier, { status: 201 });
  } catch (error) {
    console.error('Create courier error:', error);
    return NextResponse.json({ error: 'Failed to create courier' }, { status: 500 });
  }
}