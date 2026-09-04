import { auth } from '@/lib/auth';
import Order from '@/lib/models/Order';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager', 'staff'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const { orderIds } = await request.json();
    
    let orders;
    if (orderIds && Array.isArray(orderIds) && orderIds.length > 0) {
      // Export selected orders
      orders = await Order.find({ _id: { $in: orderIds } })
        .populate('customer', 'firstName lastName email phone')
        .populate('items.product', 'name')
        .sort({ createdAt: -1 });
    } else {
      // Export all orders if no specific IDs provided
      orders = await Order.find()
        .populate('customer', 'firstName lastName email phone')
        .populate('items.product', 'name')
        .sort({ createdAt: -1 });
    }

    // Generate CSV content
    const csvHeaders = [
      'Order Number',
      'Customer Name',
      'Customer Email',
      'Customer Phone',
      'Order Date',
      'Order Status',
      'Payment Method',
      'Payment Status',
      'Delivery Type',
      'Shipping Address',
      'Items',
      'Subtotal',
      'Tax',
      'Shipping Cost',
      'Discount',
      'Total',
      'Tracking Number',
      'Notes'
    ];

    const csvRows = orders.map(order => {
      const customerName = order.customer 
        ? `${order.customer.firstName} ${order.customer.lastName}`
        : order.shippingAddress?.name || 'Guest User';
      
      const customerEmail = order.customer?.email || order.shippingAddress?.email || '';
      const customerPhone = order.customer?.phone || order.shippingAddress?.phone || '';
      
      const shippingAddress = `${order.shippingAddress.street}, ${order.shippingAddress.city}, ${order.shippingAddress.district}, ${order.shippingAddress.division}`;
      
      const items = order.items.map((item: any) => `${item.name} (${item.quantity}x)`).join('; ');
      
      return [
        order.orderNumber,
        customerName,
        customerEmail,
        customerPhone,
        new Date(order.createdAt).toLocaleDateString(),
        order.orderStatus,
        order.paymentMethod,
        order.paymentStatus,
        order.deliveryType,
        shippingAddress,
        items,
        order.subtotal,
        order.tax,
        order.shippingCost,
        order.discountAmount,
        order.total,
        order.trackingNumber || '',
        order.notes || ''
      ];
    });

    // Create CSV content
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n');

    // Return CSV as response
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="orders-export-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    console.error('Export orders error:', error);
    return NextResponse.json({ error: 'Failed to export orders' }, { status: 500 });
  }
}
