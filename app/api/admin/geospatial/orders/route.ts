import Order from '@/lib/models/Order';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

// Helper function to get approximate coordinates for Bangladesh divisions
function getDivisionCoordinates(division?: string): { lat: number; lng: number } {
  const divisionCoords: { [key: string]: { lat: number; lng: number } } = {
    'Dhaka': { lat: 23.8103, lng: 90.4125 },
    'Dhaka Division': { lat: 23.8103, lng: 90.4125 },
    'Chittagong': { lat: 22.3569, lng: 91.7832 },
    'Chittagong Division': { lat: 22.3569, lng: 91.7832 },
    'Rajshahi': { lat: 24.3745, lng: 88.6042 },
    'Rajshahi Division': { lat: 24.3745, lng: 88.6042 },
    'Khulna': { lat: 22.8456, lng: 89.5403 },
    'Khulna Division': { lat: 22.8456, lng: 89.5403 },
    'Barisal': { lat: 22.7010, lng: 90.3535 },
    'Barisal Division': { lat: 22.7010, lng: 90.3535 },
    'Sylhet': { lat: 24.8949, lng: 91.8687 },
    'Sylhet Division': { lat: 24.8949, lng: 91.8687 },
    'Rangpur': { lat: 25.7439, lng: 89.2752 },
    'Rangpur Division': { lat: 25.7439, lng: 89.2752 },
    'Mymensingh': { lat: 24.7471, lng: 90.4203 },
    'Mymensingh Division': { lat: 24.7471, lng: 90.4203 }
  };
  
  return divisionCoords[division || ''] || { lat: 23.8103, lng: 90.4125 }; // Default to Dhaka
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const division = searchParams.get('division');
    const district = searchParams.get('district');
    const postalCode = searchParams.get('postalCode');
    const customerSegment = searchParams.get('customerSegment');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const includeCounts = searchParams.get('includeCounts') === 'true';
    const includeHeatmap = searchParams.get('includeHeatmap') === 'true';

    // First, let's check if we have any orders at all
    const totalOrdersCount = await Order.countDocuments();

    // Build query filter - make coordinates optional for now
    const query: any = {};
    
    // If we have orders with coordinates, filter by them
    const ordersWithCoords = await Order.countDocuments({
      'shippingAddress.coordinates.lat': { $exists: true, $ne: null },
      'shippingAddress.coordinates.lng': { $exists: true, $ne: null }
    });
        
    if (ordersWithCoords > 0) {
      query['shippingAddress.coordinates.lat'] = { $exists: true, $ne: null };
      query['shippingAddress.coordinates.lng'] = { $exists: true, $ne: null };
    }

    // Location filters - check both coordinates and regular fields
    if (division) {
      query.$or = [
        { 'shippingAddress.coordinates.divisionName': division },
        { 'shippingAddress.division': division }
      ];
    }
    if (district) {
      const districtFilter = {
        $or: [
          { 'shippingAddress.coordinates.district': district },
          { 'shippingAddress.district': district }
        ]
      };
      query.$and = query.$and || [];
      query.$and.push(districtFilter);
    }
    if (postalCode) {
      const postalFilter = {
        $or: [
          { 'shippingAddress.coordinates.postalCode': postalCode },
          { 'shippingAddress.postalCode': postalCode }
        ]
      };
      query.$and = query.$and || [];
      query.$and.push(postalFilter);
    }

    // Date filters
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    // Customer segment filtering
    let customerFilter: any = {};
    if (customerSegment) {
      // Get customer analytics first
      const customerAnalytics = await Order.aggregate([
        { $match: { customer: { $exists: true } } },
        {
          $group: {
            _id: '$customer',
            orderCount: { $sum: 1 },
            totalSpent: { $sum: '$total' },
            firstOrder: { $min: '$createdAt' },
            lastOrder: { $max: '$createdAt' }
          }
        }
      ]);

      const customerSegments = customerAnalytics.reduce((acc: any, customer: any) => {
        const isFrequent = customer.orderCount >= 5;
        const isNew = new Date(customer.firstOrder) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
        const isHighValue = customer.totalSpent >= 10000; // 10k BDT threshold

        if (customerSegment === 'frequent' && isFrequent) acc.push(customer._id);
        else if (customerSegment === 'new' && isNew) acc.push(customer._id);
        else if (customerSegment === 'high-value' && isHighValue) acc.push(customer._id);
        else if (customerSegment === 'low-value' && !isHighValue) acc.push(customer._id);

        return acc;
      }, []);

      if (customerSegments.length > 0) {
        query.customer = { $in: customerSegments };
      }
    }

    // Get orders with geospatial data
    const orders = await Order.find(query)
      .populate('customer', 'name email phone')
      .select('orderNumber total paymentStatus orderStatus shippingAddress customer createdAt items')
      .lean();

    // Transform data for map visualization
    const mapData = orders.map((order: any) => {
      // Handle coordinates - either from coordinates object or generate default Bangladesh coordinates
      let lat = 23.8103; // Default Dhaka coordinates
      let lng = 90.4125;
      let coordinates = [lng, lat];
      
      if (order.shippingAddress?.coordinates?.lat && order.shippingAddress?.coordinates?.lng) {
        lat = order.shippingAddress.coordinates.lat;
        lng = order.shippingAddress.coordinates.lng;
        coordinates = [lng, lat];
      } else {
        // Generate approximate coordinates based on division
        const divisionCoords = getDivisionCoordinates(
          order.shippingAddress?.division || order.shippingAddress?.coordinates?.divisionName
        );
        lat = divisionCoords.lat;
        lng = divisionCoords.lng;
        coordinates = [lng, lat];
      }
      
      return {
        id: order._id,
        orderNumber: order.orderNumber,
        coordinates,
        lat,
        lng,
        total: order.total,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        division: order.shippingAddress?.coordinates?.divisionName || order.shippingAddress?.division || 'Unknown',
        district: order.shippingAddress?.coordinates?.district || order.shippingAddress?.district || 'Unknown',
        thana: order.shippingAddress?.coordinates?.thanaOrUpazilaName,
        placeName: order.shippingAddress?.coordinates?.placeName,
        postalCode: order.shippingAddress?.coordinates?.postalCode || order.shippingAddress?.postalCode,
        customerName: order.customer?.name || 'Guest',
        customerEmail: order.customer?.email,
        itemCount: order.items?.length || 0,
        createdAt: order.createdAt
      };
    });

    const response: any = { orders: mapData };

    // Include aggregate counts if requested
    if (includeCounts) {
      try {
        const [divisionCounts, districtCounts, statusCounts] = await Promise.all([
          // Division-wise counts - check both coordinate and direct division fields
          Order.aggregate([
            { $match: query },
            {
              $group: {
                _id: {
                  $ifNull: [
                    '$shippingAddress.coordinates.divisionName',
                    '$shippingAddress.division'
                  ]
                },
                count: { $sum: 1 },
                totalRevenue: { $sum: '$total' },
                avgOrderValue: { $avg: '$total' }
              }
            },
            { $sort: { count: -1 } }
          ]),

          // District-wise counts
          Order.aggregate([
            { $match: query },
            {
              $group: {
                _id: {
                  $ifNull: [
                    '$shippingAddress.coordinates.district',
                    '$shippingAddress.district'
                  ]
                },
                division: { 
                  $first: {
                    $ifNull: [
                      '$shippingAddress.coordinates.divisionName',
                      '$shippingAddress.division'
                    ]
                  }
                },
                count: { $sum: 1 },
                totalRevenue: { $sum: '$total' },
                avgOrderValue: { $avg: '$total' }
              }
            },
            { $sort: { count: -1 } }
          ]),

          // Status-wise counts
          Order.aggregate([
            { $match: query },
            {
              $group: {
                _id: '$orderStatus',
                count: { $sum: 1 },
                totalRevenue: { $sum: '$total' }
              }
            }
          ])
        ]);

        response.analytics = {
          divisions: divisionCounts,
          districts: districtCounts,
          statuses: statusCounts,
          totalOrders: mapData.length,
          totalRevenue: mapData.reduce((sum: number, order: any) => sum + order.total, 0)
        };
      } catch (analyticsError) {
        console.error('Analytics aggregation error:', analyticsError);
        response.analytics = {
          divisions: [],
          districts: [],
          statuses: [],
          totalOrders: mapData.length,
          totalRevenue: mapData.reduce((sum: number, order: any) => sum + order.total, 0)
        };
      }
    }

    // Include heatmap data if requested
    if (includeHeatmap) {
      const heatmapData = mapData.map((order: any) => ({
        coordinates: order.coordinates,
        weight: order.total / 1000 // Normalize weight
      }));

      response.heatmap = heatmapData;
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Geospatial orders API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch geospatial order data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { bounds, filters = {} } = body;

    // Bounding box query for map viewport
    if (bounds) {
      const { north, south, east, west } = bounds;
      
      const query = {
        'shippingAddress.coordinates.lat': { $gte: south, $lte: north },
        'shippingAddress.coordinates.lng': { $gte: west, $lte: east },
        ...filters
      };

      const orders = await Order.find(query)
        .select('orderNumber total shippingAddress.coordinates paymentStatus orderStatus createdAt')
        .lean();

      const clusteredData = orders.map((order: any) => ({
        id: order._id,
        coordinates: [
          order.shippingAddress.coordinates.lng,
          order.shippingAddress.coordinates.lat
        ],
        total: order.total,
        status: order.orderStatus
      }));

      return NextResponse.json({ orders: clusteredData });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  } catch (error) {
    console.error('Geospatial orders POST API error:', error);
    return NextResponse.json(
      { error: 'Failed to process geospatial query' },
      { status: 500 }
    );
  }
}
