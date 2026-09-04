import { auth } from "@/lib/auth";
import GeneralSettings from "@/lib/models/GeneralSettings";
import Order from "@/lib/models/Order";
import connectDB from "@/lib/mongodb";
import { resolveTypography } from "@/lib/theme/typography";
import { NextRequest, NextResponse } from "next/server";
import { getServerCurrencyFormatter } from '@/lib/currency/server';


export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (
      !session ||
      !["admin", "manager", "staff"].includes(session.user?.role)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { id } = await context.params;
    const order = await Order.findById(id)
      .populate("customer", "firstName lastName email phone")
      .populate("items.product", "name thumbnailImage");

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Get company settings for invoice
    let settings = await GeneralSettings.findOne();
    if (!settings) {
      settings = await GeneralSettings.create({});
    }

    // Generate HTML content for PDF
    // The invoice quotes the store's configured currency; it used to hardcode
    // a taka sign in six places.
    const money = await getServerCurrencyFormatter();
    const htmlContent = generateInvoiceHTML(order, settings, money);

    // For now, return HTML content
    // In production, you would use a PDF generation library like puppeteer
    return new NextResponse(htmlContent, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `attachment; filename="invoice-${order.orderNumber}.html"`,
      },
    });
  } catch (error) {
    console.error("Download PDF error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 },
    );
  }
}

function generateInvoiceHTML(
  order: any,
  settings: any,
  money: (value: number) => string,
): string {
  const customerName = order.customer
    ? `${order.customer.firstName} ${order.customer.lastName}`
    : order.shippingAddress?.name || "Guest User";

  const customerEmail =
    order.customer?.email || order.shippingAddress?.email || "";
  const customerPhone =
    order.customer?.phone || order.shippingAddress?.phone || "";

  // Fonts come from the same settings doc as the company details, so the
  // invoice matches whatever typography is selected in /admin/settings.
  const pdfFontStacks = {
    bodyFontStack: resolveTypography(settings?.typography ?? null).cssVariables[
      "--font-paragraph"
    ],
  };

  // Extract company information from settings
  const companyName = settings?.siteName || "Muscari Mart";
  const companyAddress = settings?.address || "Dhaka, Bangladesh";
  const companyEmail = settings?.contactEmail || "mmuddin134@gmail.com";
  const companyPhone = settings?.contactPhone || "+8801339561702";
  const companyLogo = settings?.logo1 || "";

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Invoice - ${order.orderNumber}</title>
        <style>
            body { font-family: ${pdfFontStacks.bodyFontStack}; margin: 40px; color: #333; }
            .header {
                text-align: center;
                margin-bottom: 40px;
                padding: 20px;
                background: linear-gradient(135deg, #3949AB, #8b5cf6);
                color: white;
                border-radius: 8px;
            }
            .logo {
                max-height: 60px;
                max-width: 200px;
                margin-bottom: 10px;
            }
            .company-info {
                font-size: 14px;
                margin-top: 10px;
            }
            .invoice-details {
                margin-bottom: 30px;
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
            }
            .customer-details {
                margin-bottom: 30px;
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
            }
            .items-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 30px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .items-table th, .items-table td {
                border: 1px solid #ddd;
                padding: 12px;
                text-align: left;
            }
            .items-table th {
                background: linear-gradient(135deg, #3949AB, #8b5cf6);
                color: white;
                font-weight: bold;
            }
            .items-table tr:nth-child(even) {
                background-color: #f9f9f9;
            }
            .totals {
                text-align: right;
                margin-bottom: 30px;
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
            }
            .total-row {
                background: linear-gradient(135deg, #3949AB, #8b5cf6);
                color: white;
                padding: 10px;
                border-radius: 4px;
                margin-top: 10px;
            }
            .footer {
                text-align: center;
                margin-top: 40px;
                color: #666;
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
            }
        </style>
    </head>
    <body>
        <div class="header">
            ${companyLogo ? `<img src="${companyLogo}" alt="${companyName}" class="logo" />` : ""}
            <h1>INVOICE</h1>
            <div class="company-info">
                <p>${companyAddress}</p>
                <p>Email: ${companyEmail} | Phone: ${companyPhone}</p>
            </div>
        </div>

        <div class="invoice-details">
            <h3>Invoice Details</h3>
            <p><strong>Invoice Number:</strong> ${order.orderNumber}</p>
            <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
            <p><strong>Status:</strong> ${order.orderStatus}</p>
        </div>

        <div class="customer-details">
            <h3>Customer Details</h3>
            <p><strong>Name:</strong> ${customerName}</p>
            <p><strong>Email:</strong> ${customerEmail}</p>
            <p><strong>Phone:</strong> ${customerPhone}</p>
            <p><strong>Shipping Address:</strong></p>
            <p>${order.shippingAddress.street}<br>
               ${order.shippingAddress.city}, ${order.shippingAddress.district}<br>
               ${order.shippingAddress.division}</p>
        </div>

        <table class="items-table">
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${order.items
                  .map(
                    (item: any) => `
                    <tr>
                        <td>${item.name}</td>
                        <td>${item.quantity}</td>
                        <td>${money(item.price)}</td>
                        <td>${money(item.price * item.quantity)}</td>
                    </tr>
                `,
                  )
                  .join("")}
            </tbody>
        </table>

        <div class="totals">
            <p><strong>Subtotal:</strong> ${money(order.subtotal)}</p>
            ${order.discountAmount > 0 ? `<p><strong>Discount:</strong> -${money(order.discountAmount)}</p>` : ""}
            <p><strong>Shipping:</strong> ${money(order.shippingCost)}</p>
            <div class="total-row">
                <h3><strong>Total: ${money(order.total)}</strong></h3>
            </div>
        </div>

        <div class="footer">
            <p>Thank you for choosing ${companyName}!</p>
            <p>For any queries, please contact us at ${companyEmail}</p>
        </div>
    </body>
    </html>
  `;
}
