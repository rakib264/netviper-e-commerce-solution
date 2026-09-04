import Order from '@/lib/models/Order';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const analysisType = searchParams.get('type'); // 'customer-segments', 'growth-prediction', 'density-analysis'
    const timeframe = searchParams.get('timeframe') || '12'; // months
    const division = searchParams.get('division');

    switch (analysisType) {
      case 'customer-segments':
        return await getCustomerSegmentAnalysis(division);
      
      case 'growth-prediction':
        return await getGrowthPredictionAnalysis(timeframe, division);
      
      case 'density-analysis':
        return await getDensityAnalysis(division);
      
      case 'choropleth-data':
        return await getChoroplethData();
      
      case 'time-series':
        return await getTimeSeriesData(timeframe, division);
      
      default:
        return NextResponse.json({ error: 'Invalid analysis type' }, { status: 400 });
    }

  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}

async function getCustomerSegmentAnalysis(division?: string | null) {
  const matchStage: any = {};
  
  if (division) {
    matchStage.$or = [
      { 'shippingAddress.coordinates.divisionName': division },
      { 'shippingAddress.division': division }
    ];
  }

  const customerAnalysis = await Order.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          customer: '$customer',
          division: '$shippingAddress.coordinates.divisionName',
          district: '$shippingAddress.coordinates.district'
        },
        orderCount: { $sum: 1 },
        totalSpent: { $sum: '$total' },
        firstOrder: { $min: '$createdAt' },
        lastOrder: { $max: '$createdAt' },
        avgOrderValue: { $avg: '$total' },
        coordinates: { $first: '$shippingAddress.coordinates' },
        address: { $first: '$shippingAddress' }
      }
    },
    {
      $addFields: {
        daysSinceFirstOrder: {
          $divide: [
            { $subtract: [new Date(), '$firstOrder'] },
            1000 * 60 * 60 * 24
          ]
        },
        daysSinceLastOrder: {
          $divide: [
            { $subtract: [new Date(), '$lastOrder'] },
            1000 * 60 * 60 * 24
          ]
        }
      }
    }
  ]);

  // Segment customers
  const segments = {
    'high-value-frequent': [] as any[],
    'high-value-occasional': [] as any[],
    'low-value-frequent': [] as any[],
    'low-value-occasional': [] as any[],
    'new-customers': [] as any[],
    'churned-customers': [] as any[]
  };

  customerAnalysis.forEach((customer: any) => {
    const isHighValue = customer.totalSpent >= 10000;
    const isFrequent = customer.orderCount >= 5;
    const isNew = customer.daysSinceFirstOrder <= 30;
    const isChurned = customer.daysSinceLastOrder > 90;

    let segment: keyof typeof segments;
    
    if (isNew) {
      segment = 'new-customers';
    } else if (isChurned) {
      segment = 'churned-customers';
    } else if (isHighValue && isFrequent) {
      segment = 'high-value-frequent';
    } else if (isHighValue && !isFrequent) {
      segment = 'high-value-occasional';
    } else if (!isHighValue && isFrequent) {
      segment = 'low-value-frequent';
    } else {
      segment = 'low-value-occasional';
    }

    segments[segment].push({
      ...customer,
              lat: customer.coordinates?.lat || customer.address?.coordinates?.lat,
        lng: customer.coordinates?.lng || customer.address?.coordinates?.lng,
      division: customer._id.division,
      district: customer._id.district
    });
  });

  return NextResponse.json({ segments });
}

async function getGrowthPredictionAnalysis(timeframe: string, division?: string | null) {
  const months = parseInt(timeframe);
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const matchStage: any = {
    createdAt: { $gte: startDate },
    'shippingAddress.coordinates': { $exists: true }
  };
  
  if (division) {
    matchStage['shippingAddress.coordinates.divisionName'] = division;
  }

  // Historical growth by month and region
  const historicalGrowth = await Order.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          division: '$shippingAddress.coordinates.divisionName',
          district: '$shippingAddress.coordinates.district'
        },
        orderCount: { $sum: 1 },
        revenue: { $sum: '$total' },
        coordinates: { $first: '$shippingAddress.coordinates' },
        address: { $first: '$shippingAddress' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  // Calculate growth rates and predictions
  const regionGrowth = new Map();
  
  historicalGrowth.forEach((record: any) => {
    const key = `${record._id.division}-${record._id.district}`;
    if (!regionGrowth.has(key)) {
      regionGrowth.set(key, {
        division: record._id.division,
        district: record._id.district,
        coordinates: record.coordinates,
        monthlyData: []
      });
    }
    
    regionGrowth.get(key).monthlyData.push({
      year: record._id.year,
      month: record._id.month,
      orderCount: record.orderCount,
      revenue: record.revenue
    });
  });

  // Simple growth prediction (linear regression on order count)
  const predictions: any[] = [];
  
  regionGrowth.forEach((region: any, key: string) => {
    if (region.monthlyData.length >= 3) {
      const data = region.monthlyData;
      const n = data.length;
      
      // Calculate linear regression for order count
      let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
      
      data.forEach((point: any, index: number) => {
        const x = index;
        const y = point.orderCount;
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumXX += x * x;
      });
      
      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;
      
      // Predict next 3 months
      const currentOrderCount = data[data.length - 1].orderCount;
      const predictedGrowth = slope * (n + 2) + intercept;
      const growthRate = (predictedGrowth - currentOrderCount) / currentOrderCount;
      
      predictions.push({
        division: region.division,
        district: region.district,
        lat: region.coordinates?.lat,
        lng: region.coordinates?.lng,
        currentMonthlyOrders: currentOrderCount,
        predictedMonthlyOrders: Math.max(0, Math.round(predictedGrowth)),
        growthRate: growthRate,
        trend: slope > 0.5 ? 'growing' : slope < -0.5 ? 'declining' : 'stable',
        confidence: Math.min(0.9, n / 12) // Higher confidence with more data points
      });
    }
  });

  return NextResponse.json({ predictions: predictions.sort((a, b) => b.growthRate - a.growthRate) });
}

async function getDensityAnalysis(division?: string | null) {
  const matchStage: any = {
    'shippingAddress.coordinates.lat': { $exists: true },
    'shippingAddress.coordinates.lng': { $exists: true }
  };
  
  if (division) {
    matchStage['shippingAddress.coordinates.divisionName'] = division;
  }

  const densityData = await Order.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          // Grid-based density (0.01 degree precision ~1km)
          latGrid: { $round: [{ $multiply: ['$shippingAddress.coordinates.lat', 100] }, 0] },
          lngGrid: { $round: [{ $multiply: ['$shippingAddress.coordinates.lng', 100] }, 0] },
          division: '$shippingAddress.coordinates.divisionName',
          district: '$shippingAddress.coordinates.district'
        },
        orderCount: { $sum: 1 },
        totalRevenue: { $sum: '$total' },
        avgLat: { $avg: '$shippingAddress.coordinates.lat' },
        avgLng: { $avg: '$shippingAddress.coordinates.lng' }
      }
    },
    {
      $project: {
        division: '$_id.division',
        district: '$_id.district',
        lat: '$avgLat',
        lng: '$avgLng',
        orderCount: 1,
        totalRevenue: 1,
        density: { $divide: ['$orderCount', 1] } // Orders per km²
      }
    },
    { $sort: { orderCount: -1 } }
  ]);

  return NextResponse.json({ densityGrid: densityData });
}

async function getChoroplethData() {
  // Administrative boundary data for choropleth visualization
  const [divisionData, districtData] = await Promise.all([
    Order.aggregate([
      {
        $match: {
          'shippingAddress.coordinates.divisionName': { $exists: true }
        }
      },
      {
        $group: {
          _id: '$shippingAddress.coordinates.divisionName',
          orderCount: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          avgOrderValue: { $avg: '$total' }
        }
      }
    ]),
    
    Order.aggregate([
      {
        $match: {
          'shippingAddress.coordinates.district': { $exists: true }
        }
      },
      {
        $group: {
          _id: {
            district: '$shippingAddress.coordinates.district',
            division: '$shippingAddress.coordinates.divisionName'
          },
          orderCount: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          avgOrderValue: { $avg: '$total' }
        }
      }
    ])
  ]);

  // Bangladesh administrative divisions (hardcoded for now - in production use GeoJSON)
  const bangladeshDivisions = {
    'Dhaka Division': { lat: 23.8103, lng: 90.4125 },
    'Chittagong Division': { lat: 22.3569, lng: 91.7832 },
    'Rajshahi Division': { lat: 24.3745, lng: 88.6042 },
    'Khulna Division': { lat: 22.8456, lng: 89.5403 },
    'Barisal Division': { lat: 22.7010, lng: 90.3535 },
    'Sylhet Division': { lat: 24.8949, lng: 91.8687 },
    'Rangpur Division': { lat: 25.7439, lng: 89.2752 },
    'Mymensingh Division': { lat: 24.7471, lng: 90.4203 }
  };

  const choroplethData = divisionData.map((division: any) => ({
    name: division._id,
    coordinates: bangladeshDivisions[division._id as keyof typeof bangladeshDivisions] || { lat: 0, lng: 0 },
    orderCount: division.orderCount,
    totalRevenue: division.totalRevenue,
    avgOrderValue: division.avgOrderValue
  }));

  return NextResponse.json({ 
    divisions: choroplethData,
    districts: districtData 
  });
}

async function getTimeSeriesData(timeframe: string, division?: string | null) {
  const months = parseInt(timeframe);
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const matchStage: any = {
    createdAt: { $gte: startDate },
    'shippingAddress.coordinates': { $exists: true }
  };
  
  if (division) {
    matchStage['shippingAddress.coordinates.divisionName'] = division;
  }

  const timeSeriesData = await Order.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
          division: '$shippingAddress.coordinates.divisionName'
        },
        orderCount: { $sum: 1 },
        revenue: { $sum: '$total' },
        coordinates: { $push: '$shippingAddress.coordinates' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
  ]);

  return NextResponse.json({ timeSeries: timeSeriesData });
}
