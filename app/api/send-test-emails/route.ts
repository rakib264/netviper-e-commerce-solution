import resendService from "@/lib/resend";
import { NextRequest, NextResponse } from "next/server";

/**
 * Direct Email Test Endpoint
 *
 * Bypasses the queue to test email sending directly
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      orderNumber = "TEST-123",
      customerEmail = "redwan.rakib267@gmail.com",
    } = body;

    console.log("🧪 Sending test emails directly...");

    // Test 1: Admin notification
    console.log("📧 Sending admin notification...");
    await resendService.sendAdminNotification(
      process.env.ADMIN_EMAIL || "mmuddin134@gmail.com",
      `Test Order Notification - #${orderNumber}`,
      {
        title: "🛒 Test Order Received",
        content: `
          <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; border-left: 4px solid #8b5cf6;">
            <h4>Test Order Details:</h4>
            <p><strong>Order Number:</strong> ${orderNumber}</p>
            <p><strong>Customer:</strong> ${customerEmail}</p>
            <p><strong>Total Amount:</strong> ৳1,000</p>
            <p><strong>Order Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          <p>This is a test email to verify admin notifications work.</p>
        `,
      },
    );
    console.log("✅ Admin notification sent");

    // Test 2: Customer order confirmation
    console.log("📧 Sending customer order confirmation...");
    await resendService.sendOrderConfirmation(customerEmail, {
      customerName: "Test Customer",
      orderNumber: orderNumber,
      orderDate: new Date().toLocaleDateString(),
      items: [
        {
          name: "Test Product",
          quantity: 1,
          price: 1000,
          total: 1000,
        },
      ],
      subtotal: 1000,
      shippingCost: 0,
      total: 1000,
      paymentMethod: "Cash on Delivery",
      deliveryType: "Home Delivery",
      shippingAddress: {
        name: "Test Customer",
        phone: "+8801234567890",
        address: "Test Address, Dhaka 1000",
      },
    });
    console.log("✅ Customer order confirmation sent");

    return NextResponse.json({
      success: true,
      message: "Test emails sent successfully",
      emails: [
        { type: "admin_notification", to: process.env.ADMIN_EMAIL },
        { type: "order_confirmation", to: customerEmail },
      ],
    });
  } catch (error) {
    console.error("❌ Test email failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
