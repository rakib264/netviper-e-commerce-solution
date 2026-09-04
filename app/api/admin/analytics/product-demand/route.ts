import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const ordersCollection = mongoose.connection.db?.collection('orders');

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '30';
    const category = searchParams.get('category');

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(timeRange));

    // Build aggregation pipeline for product demand analysis
    const pipeline: any[] = [
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          orderStatus: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] }
        }
      },
      {
        $unwind: '$items'
      },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      {
        $unwind: '$productInfo'
      }
    ];

    // Add category filter if specified
    if (category) {
      pipeline.push({
        $match: {
          'productInfo.category': category
        }
      });
    }

    // Group by product and calculate analytics
    pipeline.push(
      {
        $group: {
          _id: '$productInfo._id',
          name: { $first: '$productInfo.name' },
          category: { $first: '$productInfo.category' },
          stockLevel: { $first: '$productInfo.stock' },
          price: { $first: '$productInfo.price' },
          totalOrders: { $sum: 1 },
          totalQuantity: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
          locations: {
            $push: {
              division: '$shippingAddress.division',
              orderCount: 1,
              revenue: { $multiply: ['$items.quantity', '$items.price'] }
            }
          },
          orderDates: { $push: '$createdAt' }
        }
      },
      {
        $addFields: {
          avgPrice: { 
            $cond: {
              if: { $gt: ['$totalQuantity', 0] },
              then: { $divide: ['$revenue', '$totalQuantity'] },
              else: 0
            }
          },
          // Calculate growth rate (simplified - comparing first half vs second half of period)
          growthRate: {
            $let: {
              vars: {
                midDate: {
                  $add: [startDate, { $divide: [{ $subtract: [endDate, startDate] }, 2] }]
                },
                firstHalfCount: {
                  $size: {
                    $filter: {
                      input: '$orderDates',
                      cond: { $lt: ['$$this', { $add: [startDate, { $divide: [{ $subtract: [endDate, startDate] }, 2] }] }] }
                    }
                  }
                },
                secondHalfCount: {
                  $size: {
                    $filter: {
                      input: '$orderDates',
                      cond: { $gte: ['$$this', { $add: [startDate, { $divide: [{ $subtract: [endDate, startDate] }, 2] }] }] }
                    }
                  }
                }
              },
              in: {
                $cond: {
                  if: { $and: [{ $gt: [{ $size: '$orderDates' }, 0] }, { $gt: ['$$firstHalfCount', 0] }] },
                  then: {
                    $divide: [
                      { $subtract: ['$$secondHalfCount', '$$firstHalfCount'] },
                      '$$firstHalfCount'
                    ]
                  },
                  else: 0
                }
              }
            }
          },
          // Calculate demand score based on orders, revenue, and growth
          demandScore: {
            $min: [
              100,
              {
                $add: [
                  { $multiply: ['$totalOrders', 0.4] },
                  { $multiply: [{ $divide: ['$revenue', 10000] }, 0.4] },
                  { $multiply: ['$growthRate', 20] }
                ]
              }
            ]
          },
          // Calculate recommended stock
          recommendedStock: {
            $max: [
              '$stockLevel',
              {
                $multiply: [
                  '$totalQuantity',
                  {
                    $add: [
                      1.5, // Base multiplier
                      { $multiply: ['$growthRate', 0.5] } // Growth factor
                    ]
                  }
                ]
              }
            ]
          }
        }
      },
      {
        $addFields: {
          // Determine urgency based on stock level vs demand
          urgency: {
            $switch: {
              branches: [
                {
                  case: { $lt: ['$stockLevel', { $multiply: ['$totalQuantity', 0.5] }] },
                  then: 'critical'
                },
                {
                  case: { $lt: ['$stockLevel', { $multiply: ['$totalQuantity', 1] }] },
                  then: 'high'
                },
                {
                  case: { $lt: ['$stockLevel', { $multiply: ['$totalQuantity', 1.5] }] },
                  then: 'medium'
                }
              ],
              default: 'low'
            }
          },
          // Process locations data
          locations: {
            $map: {
              input: {
                $reduce: {
                  input: '$locations',
                  initialValue: [],
                  in: {
                    $cond: {
                      if: {
                        $in: [
                          '$$this.division',
                          { $map: { input: '$$value', as: 'item', in: '$$item.division' } }
                        ]
                      },
                      then: {
                        $map: {
                          input: '$$value',
                          as: 'item',
                          in: {
                            $cond: {
                              if: { $eq: ['$$item.division', '$$this.division'] },
                              then: {
                                division: '$$item.division',
                                orderCount: { $add: ['$$item.orderCount', 1] },
                                revenue: { $add: ['$$item.revenue', '$$this.revenue'] }
                              },
                              else: '$$item'
                            }
                          }
                        }
                      },
                      else: {
                        $concatArrays: [
                          '$$value',
                          [
                            {
                              division: '$$this.division',
                              orderCount: 1,
                              revenue: '$$this.revenue'
                            }
                          ]
                        ]
                      }
                    }
                  }
                }
              },
              as: 'loc',
              in: '$$loc'
            }
          }
        }
      },
      {
        $sort: { demandScore: -1 }
      }
    );

    const products = await ordersCollection?.aggregate(pipeline).toArray();

    // Generate category analysis
    const categoryPipeline = [
      {
        $group: {
          _id: '$category',
          products: { $sum: 1 },
          totalRevenue: { $sum: '$revenue' },
          totalOrders: { $sum: '$totalOrders' },
          avgGrowthRate: { $avg: '$growthRate' },
          avgDemandScore: { $avg: '$demandScore' }
        }
      },
      {
        $project: {
          category: '$_id',
          products: 1,
          totalRevenue: 1,
          totalOrders: 1,
          avgGrowthRate: 1,
          avgDemandScore: 1,
          _id: 0
        }
      }
    ];

    const categoryAnalysis = await ordersCollection?.aggregate([
      ...pipeline.slice(0, -1), // Remove sort
      ...categoryPipeline
    ]).toArray();

    // Generate demand trends (daily aggregation)
    const trendsPipeline = [
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          orderStatus: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] }
        }
      },
      {
        $unwind: '$items'
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          totalOrders: { $sum: 1 },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      {
        $project: {
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: '$_id.day'
            }
          },
          totalOrders: 1,
          revenue: 1,
          _id: 0
        }
      },
      {
        $sort: { date: 1 }
      }
    ];

    const demandTrends = await ordersCollection?.aggregate(trendsPipeline).toArray();

    return NextResponse.json({
      products: products || [],
      categoryAnalysis: categoryAnalysis || [],
      demandTrends: (demandTrends || []).map((trend: any) => ({
        ...trend,
        date: trend.date.toISOString().split('T')[0]
      })),
      meta: {
        timeRange: parseInt(timeRange),
        category: category || 'all',
        totalProducts: (products || []).length,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Product demand analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product demand analytics' },
      { status: 500 }
    );
  }
}
