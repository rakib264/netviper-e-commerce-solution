import { auth } from '@/lib/auth';
import { autoDispatchOrderCourier } from '@/lib/courier/dispatch';
import { syncOrderRewards } from '@/lib/deals/settlement';
import AuditLog from '@/lib/models/AuditLog';
import Courier from '@/lib/models/Courier';
import CourierSettings from '@/lib/models/CourierSettings';
import Order from '@/lib/models/Order';
import connectDB from '@/lib/mongodb';
import { notifyCustomerOrderStatusChanged } from '@/lib/notifications/events';
 
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager', 'staff'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const { status, notes } = await request.json();
    const { id } = await context.params;
    const oldOrder = await Order.findById(id);
    
    if (!oldOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { 
        orderStatus: status,
        ...(notes && { notes }),
        ...(status === 'delivered' && { deliveredAt: new Date() })
      },
      { new: true }
    ).populate('customer').populate('items.product');


    // Settle, release or reverse the delivered-settled rewards this status
    // change implies. Idempotent, so a repeated update grants nothing twice.
    if (updatedOrder) {
      await syncOrderRewards({
        _id: updatedOrder._id,
        customer: updatedOrder.customer?._id ?? updatedOrder.customer,
        orderStatus: updatedOrder.orderStatus,
        paymentStatus: updatedOrder.paymentStatus,
      });

      try {
        await notifyCustomerOrderStatusChanged({
          userId: updatedOrder.customer?._id
            ? String(updatedOrder.customer._id)
            : updatedOrder.customer
              ? String(updatedOrder.customer)
              : null,
          orderId: updatedOrder._id.toString(),
          orderNumber: updatedOrder.orderNumber,
          status: updatedOrder.orderStatus,
          previousStatus: oldOrder.orderStatus,
        });
      } catch (notificationError) {
        console.error('Failed to enqueue customer order status notification:', notificationError);
      }
    }

    // Auto-generate courier record when order status changes to 'confirmed'
    if (status === 'confirmed' && oldOrder.orderStatus !== 'confirmed') {
      try {
        // Check if courier already exists for this order
        const existingCourier = await Courier.findOne({ order: id });
        
        if (!existingCourier) {
          // Get courier settings
          let courierSettings = await CourierSettings.findOne();
          
          if (!courierSettings) {
            // Create default settings if none exist
            courierSettings = await CourierSettings.create({
              senderInfo: {
                name: process.env.NEXT_PUBLIC_SITE_NAME || 'Muscari Mart',
                phone: process.env.NEXT_PUBLIC_CONTACT_PHONE || '+8801234567890',
                address: process.env.NEXT_PUBLIC_CONTACT_ADDRESS || '123 Technology Street',
                division: 'Dhaka',
                district: 'Dhaka',
              },
              deliveryCharges: {
                regularWithinDhaka: 60,
                regularOutsideDhaka: 100,
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

          // Generate courier ID
          const courierId = `CR${Date.now().toString().slice(-8)}`;

          if (!updatedOrder) {
            throw new Error('Updated order not found');
          }

          // Calculate parcel details from order items (weight may be freeform string)
          const { parseMeasurementNumber } = await import('@/lib/products/measurements');
          const toKg = (raw: unknown) => {
            const n = parseMeasurementNumber(raw as any);
            if (!n) return 0.5;
            const s = String(raw ?? '').toLowerCase();
            if (s.includes('lb') || s.includes('oz') || s.includes('pound')) {
              return n * (s.includes('oz') ? 0.0283495 : 0.453592);
            }
            return n;
          };
          const totalWeight = updatedOrder.items?.reduce((sum: number, item: any) => {
            return sum + toKg(item.product?.weight) * item.quantity;
          }, 0) || 0.5;

          const parcelDescription = updatedOrder.items?.map((item: any) => 
            `${item.name} (Qty: ${item.quantity})`
          ).join(', ') || 'Order items';
          // Determine if delivery is within Dhaka
          const isWithinDhaka = updatedOrder.shippingAddress?.city?.toLowerCase().includes('dhaka') || 
                               updatedOrder.shippingAddress?.district?.toLowerCase().includes('dhaka') ||
                               updatedOrder.shippingAddress?.division?.toLowerCase().includes('dhaka');

          // Determine delivery type based on order delivery type
          let deliveryType = 'regular';
          if (updatedOrder.deliveryType === 'express') {
            deliveryType = 'express';
          } else if (updatedOrder.deliveryType === 'same-day') {
            deliveryType = 'express'; // Map same-day to express for courier
          }

          // Calculate delivery charge
          let deliveryCharge = 60; // Default fallback
          if (deliveryType === 'regular') {
            deliveryCharge = isWithinDhaka ? 
              courierSettings.deliveryCharges.regularWithinDhaka : 
              courierSettings.deliveryCharges.regularOutsideDhaka;
          } else if (deliveryType === 'express') {
            deliveryCharge = isWithinDhaka ? 
              courierSettings.deliveryCharges.expressWithinDhaka : 
              courierSettings.deliveryCharges.expressOutsideDhaka;
          }

          // Calculate COD charge
          let codCharge = 0;
          const isCOD = updatedOrder.paymentMethod === 'cod';
          if (isCOD) {
            codCharge = Math.max(10, (updatedOrder.total * courierSettings.codChargeRate) / 100);
          }

          // Create courier record
          const courierData = {
            courierId,
            order: updatedOrder._id,
            sender: {
              name: courierSettings.senderInfo.name,
              phone: courierSettings.senderInfo.phone,
              address: courierSettings.senderInfo.address,
              division: courierSettings.senderInfo.division,
              district: courierSettings.senderInfo.district,
            },
            receiver: {
              name: updatedOrder.shippingAddress?.name || `${updatedOrder.customer?.firstName || ''} ${updatedOrder.customer?.lastName || ''}`.trim() || 'Customer',
              phone: updatedOrder.shippingAddress?.phone || updatedOrder.customer?.phone || '',
              address: updatedOrder.shippingAddress?.street || '',
              city: updatedOrder.shippingAddress?.city || '',
              district: updatedOrder.shippingAddress?.district || '',
              division: updatedOrder.shippingAddress?.division || '',
            },
            parcel: {
              type: deliveryType as 'regular' | 'express' | 'fragile',
              quantity: updatedOrder.items?.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0) || 1,
              weight: Math.max(totalWeight, 0.5), // Minimum 0.5kg
              value: updatedOrder.total || 0,
              description: parcelDescription,
            },
            isCOD,
            codAmount: isCOD ? updatedOrder.total : 0,
            isFragile: false, // Can be determined from product attributes if available
            charges: {
              deliveryCharge,
              codCharge,
              totalCharge: deliveryCharge + codCharge,
            },
            status: 'pending',
            statusHistory: [{
              status: 'pending',
              timestamp: new Date(),
              updatedBy: session.user.id,
              notes: 'Auto-generated courier record'
            }],
            courierPartner: courierSettings.defaultCourierPartners[0] || 'steadfast',
            notes: `Auto-generated from order ${updatedOrder.orderNumber}`,
          };

          // Validate required fields before creation
          const requiredFields = {
            'courier.order': courierData.order,
            'courier.sender.name': courierData.sender.name,
            'courier.sender.phone': courierData.sender.phone,
            'courier.receiver.name': courierData.receiver.name,
            'courier.receiver.phone': courierData.receiver.phone,
            'courier.parcel.description': courierData.parcel.description,
            'courier.charges.totalCharge': courierData.charges.totalCharge,
          };

          for (const [field, value] of Object.entries(requiredFields)) {
            if (!value) {
              console.error(`Missing required field: ${field}`);
              throw new Error(`Missing required field: ${field}`);
            }
          }

          const createdCourier = await Courier.create(courierData);

          // Log courier creation
          await AuditLog.create({
            user: session.user.id,
            action: 'CREATE',
            resource: 'Courier',
            resourceId: courierId,
            metadata: { 
              orderId: updatedOrder._id.toString(),
              orderNumber: updatedOrder.orderNumber,
              autoGenerated: true,
            }
          });
        }
      } catch (courierError) {
        console.error('Error auto-generating courier:', courierError);
        console.error('Courier error stack:', courierError instanceof Error ? courierError.stack : 'Unknown error');
        // Don't fail the order status update if courier creation fails
      }

      // Push the consignment to Pathao/Steadfast if the admin opted into
      // automatic dispatch. Never throws, and is a no-op when the courier was
      // already dispatched, so a repeated confirmation cannot double-book.
      await autoDispatchOrderCourier(id);
    }

    // Log audit
    await AuditLog.create({
      user: session.user.id,
      action: 'UPDATE',
      resource: 'Order',
      resourceId: id,
      changes: [
        {
          field: 'orderStatus',
          oldValue: oldOrder.orderStatus,
          newValue: status
        }
      ],
      metadata: { 
        orderNumber: updatedOrder.orderNumber,
        notes: notes || ''
      }
    });

    return NextResponse.json({
      ...updatedOrder,
      courierAutoGenerated: status === 'confirmed' && oldOrder.orderStatus !== 'confirmed'
    });
  } catch (error) {
    console.error('Update order status error:', error);
    return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 });
  }
}