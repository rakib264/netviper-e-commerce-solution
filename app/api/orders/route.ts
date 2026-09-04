import { auth } from '@/lib/auth';
import { resolveComboLine } from '@/lib/combo-bundles/resolve';
import { persistOrderDeals, recalculateCartForRequest } from '@/lib/deals/service';
import Coupon from '@/lib/models/Coupon';
import Order from '@/lib/models/Order';
import PaymentSettings from '@/lib/models/PaymentSettings';
import Product from '@/lib/models/Product';
import connectDB from '@/lib/mongodb';
import {
  notifyAdminLowStock,
  notifyAdminNewOrder,
  notifyCustomerOrderPlaced,
} from '@/lib/notifications/events';
import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Add debugging for production
    console.log('Orders API POST request received:', {
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries()),
      timestamp: new Date().toISOString()
    });

    await connectDB();
    
    const data = await request.json();
    const session = await auth();
    
    // Generate order number
    const orderNumber = `ORD-${Date.now().toString().slice(-8)}`;
    
    // Get payment settings
    const paymentSettings = await PaymentSettings.findOne();
    
    // Validate items and calculate totals. Any line the client marked as a
    // gift is dropped here — gift lines are the deals engine's to create, and
    // accepting one from the browser would be a free-product hole.
    const submittedItems = (data.items || []).filter((item: any) => !item.isGift);

    // Combo/bundle lines are priced and stocked differently from products, so
    // they are split out and validated against the offer rather than against a
    // product document.
    const comboItems = submittedItems.filter(
      (item: any) => item.itemType === 'combo_bundle'
    );
    const customerItems = submittedItems.filter(
      (item: any) => item.itemType !== 'combo_bundle'
    );

    let calculatedSubtotal = 0;
    const validatedItems = [];
    /** Component draw-down, accumulated across every combo line. */
    const componentStockDraw = new Map<string, number>();

    for (const item of customerItems) {
      // console.log('Processing item:', { productId: item.product, type: typeof item.product });
      
      // Validate product ID format
      if (!mongoose.Types.ObjectId.isValid(item.product)) {
        console.error('Invalid product ID:', item.product);
        return NextResponse.json({ 
          error: `Invalid product ID format: ${item.product}` 
        }, { status: 400 });
      }
      
      const product = await Product.findById(item.product);
      if (!product) {
        console.error('Product not found:', item.product);
        return NextResponse.json({ 
          error: `Product not found with ID: ${item.product}` 
        }, { status: 400 });
      }
      
      if (product.trackQuantity && product.quantity < item.quantity) {
        return NextResponse.json({ 
          error: `Insufficient stock for ${product.name}. Available: ${product.quantity}` 
        }, { status: 400 });
      }
      
      validatedItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        variant: item.variant,
        image: item.image || product.thumbnailImage
      });
      
      calculatedSubtotal += product.price * item.quantity;
    }
    
    /*
     * Combo/bundle lines.
     *
     * One order line per offer, at the price the server computes — the client's
     * copy of the price, the name and the composition are all ignored. Stock is
     * taken from the components, so an offer whose components cannot cover
     * `qty × componentQty` is refused here rather than oversold.
     */
    for (const item of comboItems) {
      const comboBundleId = String(item.comboBundleId || item.product || '');
      const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));

      if (!mongoose.Types.ObjectId.isValid(comboBundleId)) {
        return NextResponse.json(
          { error: `Invalid combo id: ${comboBundleId}` },
          { status: 400 }
        );
      }

      const resolution = await resolveComboLine(comboBundleId, quantity);
      const combo = resolution.combo;

      if (!combo || resolution.reason === 'not_found') {
        return NextResponse.json(
          { error: 'This combo is no longer available', code: 'combo_not_found' },
          { status: 400 }
        );
      }

      if (!resolution.ok) {
        const message =
          resolution.reason === 'insufficient_stock'
            ? `Insufficient stock for ${combo.name}. Available: ${resolution.sellableQty}`
            : `${combo.name} is no longer available`;
        return NextResponse.json(
          { error: message, code: resolution.reason },
          { status: 400 }
        );
      }

      validatedItems.push({
        name: combo.name,
        // The fixed price, recomputed from the offer — never the posted one.
        price: combo.price,
        quantity,
        image: combo.images[0],
        itemType: 'combo_bundle' as const,
        comboBundle: new mongoose.Types.ObjectId(combo._id),
        comboType: combo.comboType,
        components: combo.components.map((component) => ({
          product: new mongoose.Types.ObjectId(component.productId),
          variantId: component.variantId,
          name: component.variantLabel
            ? `${component.name} (${component.variantLabel})`
            : component.name,
          qty: component.qty,
          unitPrice: component.unitPrice,
        })),
      });

      calculatedSubtotal += combo.price * quantity;

      for (const component of combo.components) {
        const key = component.productId;
        componentStockDraw.set(
          key,
          (componentStockDraw.get(key) || 0) + component.qty * quantity
        );
      }
    }

    // Re-run the deals engine server-side. The cart already did this, but the
    // browser's answer is advisory only: gift lines, the discount and the
    // pending reward grants are all taken from this pass.
    const { result: dealResult, deals: runningDeals } = await recalculateCartForRequest({
      // Product lines only. A combo's fixed price is its discount, so combo
      // value deliberately does not stack toward threshold rewards — and the
      // engine reads products, which a combo id is not.
      lines: customerItems.map((item: any) => ({
        id: item.product,
        variant: item.variant,
        quantity: item.quantity,
      })),
      customerId: session?.user?.id,
    });

    for (const giftLine of dealResult.lines.filter((line) => line.isGift)) {
      validatedItems.push({
        product: new mongoose.Types.ObjectId(giftLine.id),
        name: giftLine.name,
        price: 0,
        quantity: giftLine.quantity,
        variant: giftLine.variant,
        image: giftLine.image,
        isGift: true,
        sourceDeal: giftLine.sourceDealId
          ? new mongoose.Types.ObjectId(giftLine.sourceDealId)
          : undefined,
      });
    }

    const dealDiscount = dealResult.dealDiscount;

    // Calculate tax (0%)
    const calculatedTax = Math.round(calculatedSubtotal * 0.00);

    // If client passed couponCode and discount, re-validate discount server-side for integrity
    let validatedDiscount = 0;
    let appliedCouponCode: string | undefined = undefined;
    if (data.couponCode) {
      const coupon = await Coupon.findOne({ 
        code: data.couponCode.toUpperCase(),
        isActive: true,
        startDate: { $lte: new Date() },
        expiryDate: { $gte: new Date() }
      });
      if (coupon) {
        // Check usage and min spend
        if ((!coupon.usageLimit || coupon.currentUsage < coupon.usageLimit) && (!coupon.minSpend || calculatedSubtotal >= coupon.minSpend)) {
          if (coupon.type === 'percentage') {
            validatedDiscount = Math.round((calculatedSubtotal * coupon.value) / 100);
            if (coupon.maxDiscount && validatedDiscount > coupon.maxDiscount) {
              validatedDiscount = coupon.maxDiscount;
            }
          } else {
            validatedDiscount = coupon.value;
          }
          appliedCouponCode = coupon.code;
          // Optionally increment usage later after successful payment; for COD we'll increment now
          coupon.currentUsage = (coupon.currentUsage || 0) + 1;
          await coupon.save();
        }
      }
    }
    
    // Create order data - make customer optional for guest users
    const orderData: any = {
      orderNumber,
      items: validatedItems,
      subtotal: calculatedSubtotal,
      tax: calculatedTax,
      taxRate: 0,
      shippingCost: data.shippingCost || 60,
      discountAmount: validatedDiscount,
      couponCode: appliedCouponCode,
      dealDiscount,
      total: Math.max(
        0,
        calculatedSubtotal + (data.shippingCost || 60) + calculatedTax - validatedDiscount - dealDiscount
      ),
      paymentMethod: data.paymentMethod || 'cod',
      paymentStatus: 'pending',
      orderStatus: 'pending',
      shippingAddress: data.shippingAddress,
      billingAddress: data.billingAddress,
      deliveryType: data.deliveryType || 'regular',
      notes: data.notes,
      paymentDetails: {
        transactionId: null,
        gatewayData: null,
        validationId: null,
        cardType: null,
        paidAmount: null,
        paidAt: null,
        failureReason: null,
        ipnReceived: false
      }
    };

    // Only add customer field if user is logged in
    if (session?.user?.id) {
      orderData.customer = session.user.id;
    }
    
    const order = await Order.create(orderData);

    // Freeze the deals that fired onto the order. Delivered-settled rewards
    // are recorded here as unsettled and granted when payment lands.
    try {
      await persistOrderDeals(order._id.toString(), session?.user?.id, dealResult, runningDeals);
    } catch (dealError) {
      console.error('Failed to record applied deals for order:', order.orderNumber, dealError);
    }

    const lowStockAlertedProductIds = new Set<string>();
    
    // Update product quantities
    for (const item of validatedItems) {
      // A combo line has no stock of its own; its components are drawn down
      // below, once, with every line's demand already summed.
      if (!item.product) continue;
      const product = await Product.findById(item.product);
      if (product && product.trackQuantity) {
        const previousQuantity = Number(product.quantity) || 0;
        const lowStockThreshold = Number(product.lowStockThreshold) || 0;
        product.quantity -= item.quantity;
        product.totalSales += item.quantity;
        await product.save();

        const crossedLowStockThreshold =
          lowStockThreshold > 0 &&
          previousQuantity > lowStockThreshold &&
          product.quantity <= lowStockThreshold;
        // Running out is worth an alert whether or not a threshold was ever
        // configured — a product with `lowStockThreshold: 0` used to sell out
        // silently. `notifyAdminLowStock` routes a zero stock level to the
        // `admin_out_of_stock` event, which has its own cooldown scope and so
        // cannot be suppressed by an earlier low-stock alert.
        const ranOutOfStock = previousQuantity > 0 && product.quantity <= 0;

        if (
          (crossedLowStockThreshold || ranOutOfStock) &&
          !lowStockAlertedProductIds.has(product._id.toString())
        ) {
          lowStockAlertedProductIds.add(product._id.toString());
          try {
            await notifyAdminLowStock({
              productId: product._id.toString(),
              productName: product.name,
              currentStock: product.quantity,
              threshold: lowStockThreshold,
            });
          } catch (notificationError) {
            console.error('Failed to enqueue low-stock notification:', notificationError);
          }
        }
      }
    }

    // Combo components. Summed across lines first, so the same product used by
    // two different combos in one order is decremented once by the total.
    for (const [productId, units] of componentStockDraw) {
      try {
        const product = await Product.findById(productId);
        if (!product) continue;
        if (product.trackQuantity) {
          const previousQuantity = Number(product.quantity) || 0;
          const lowStockThreshold = Number(product.lowStockThreshold) || 0;
          product.quantity = Math.max(0, product.quantity - units);
          product.totalSales = (product.totalSales || 0) + units;
          await product.save();

          const crossedLowStockThreshold =
            lowStockThreshold > 0 &&
            previousQuantity > lowStockThreshold &&
            product.quantity <= lowStockThreshold;
          const ranOutOfStock = previousQuantity > 0 && product.quantity <= 0;

          if (
            (crossedLowStockThreshold || ranOutOfStock) &&
            !lowStockAlertedProductIds.has(product._id.toString())
          ) {
            lowStockAlertedProductIds.add(product._id.toString());
            try {
              await notifyAdminLowStock({
                productId: product._id.toString(),
                productName: product.name,
                currentStock: product.quantity,
                threshold: lowStockThreshold,
              });
            } catch (notificationError) {
              console.error(
                'Failed to enqueue combo low-stock notification:',
                notificationError,
              );
            }
          }
        } else {
          product.totalSales = (product.totalSales || 0) + units;
          await product.save();
        }
      } catch (stockError) {
        console.error('Failed to draw down combo component stock', productId, stockError);
      }
    }
    
    // Populate order for response
    const populatedOrder = await Order.findById(order._id)
      .populate('customer', 'firstName lastName email phone')
      .populate('items.product', 'name thumbnailImage');
    
    // Get customer email from session or shipping address
    const customerEmail = session?.user?.email || data.shippingAddress?.email;

    // Queue invoice generation job asynchronously (don't block order creation)
    try {
      console.log('Queueing invoice generation job for order:', order.orderNumber);
      
      // Import queue service dynamically to avoid initialization issues
      const { default: queueService, JobType } = await import('@/lib/queue');
      
      // Queue invoice generation job (PDF → Bunny CDN upload → DB update → emails)
      const invoiceJobId = await queueService.enqueue({
        type: JobType.GENERATE_INVOICE,
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        customerEmail: customerEmail,
        customerId: session?.user?.id,
        orderData: populatedOrder.toObject()
      } as any);

      console.log('✅ Invoice generation job queued:', invoiceJobId);
      console.log('📨 Invoice generation will be processed asynchronously for order:', order.orderNumber);
      
      // Process the job immediately to ensure invoice and emails are generated
      try {
        console.log('🔄 Processing invoice generation job immediately...');
        const result = await queueService.processJobs(1);
        console.log('📧 Invoice generation processing result:', result);
        
        if (result.processed > 0) {
          console.log('✅ Invoice generated and emails sent successfully');
        } else if (result.failed > 0) {
          console.log('❌ Invoice generation failed');
        }
      } catch (processError) {
        console.error('❌ Error processing invoice generation job immediately:', processError);
        // Don't fail the order creation, just log the error
      }
    } catch (error) {
      console.error('💥 Failed to queue invoice generation job for order:', order.orderNumber, error);
      console.error('💥 Invoice and emails will not be generated automatically');
      // Don't fail the order creation if job queueing fails
    }

    try {
      const notificationJobs = [];

      if (session?.user?.id) {
        notificationJobs.push(
          notifyCustomerOrderPlaced({
            userId: session.user.id,
            orderId: order._id.toString(),
            orderNumber: order.orderNumber,
          }),
        );
      }

      notificationJobs.push(
        notifyAdminNewOrder({
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          total: order.total,
        }),
      );

      await Promise.all(notificationJobs);
    } catch (notificationError) {
      console.error('Failed to enqueue order notifications:', notificationError);
    }
    
    const response = NextResponse.json({ 
      message: 'Order placed successfully',
      order: populatedOrder 
    }, { status: 201 });
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
  } catch (error) {
    console.error('Create order error:', error);
    const response = NextResponse.json({ error: 'Failed to place order' }, { status: 500 });
    
    // Add CORS headers to error response
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const orders = await Order.find({ customer: session.user.id })
      .populate('items.product', 'name thumbnailImage')
      .sort({ createdAt: -1 });
    
    const response = NextResponse.json({ orders });
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
  } catch (error) {
    console.error('Get orders error:', error);
    const response = NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    
    // Add CORS headers to error response
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// Handle unsupported methods
export async function PUT(request: NextRequest) {
  return NextResponse.json({ error: 'Method not allowed. Use POST to create orders.' }, { status: 405 });
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json({ error: 'Method not allowed. Use POST to create orders.' }, { status: 405 });
}

export async function PATCH(request: NextRequest) {
  return NextResponse.json({ error: 'Method not allowed. Use POST to create orders.' }, { status: 405 });
}