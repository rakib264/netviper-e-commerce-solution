import { Resend } from "resend";
import createLogger from "./logger";
import { getDefaultBodyFontStack, MONOSPACE_FONT_STACK } from "./theme/typography";  // fallbacks only
import { formatCurrency } from "./currency/format";
import { getServerCurrency } from "./currency/server";
import { getEmailSettings } from "./utils/email-settings";

// Configure Winston logger
const logger = createLogger("resend-service");

// Resend configuration
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@muscarimart.com";
const FROM_NAME = process.env.FROM_NAME || "Muscari Mart";
const EMAIL_BODY_FONT_STACK = getDefaultBodyFontStack();

interface EmailTemplateData {
  siteName: string;
  logo?: string;
  primaryColor: string;
  secondaryColor?: string;
  contactEmail: string;
  contactPhone: string;
  address?: string;
  [key: string]: any;
}

class ResendService {
  private resend: Resend;

  constructor() {
    this.resend = new Resend(RESEND_API_KEY);
  }

  /**
   * Generate email styles
   */
  private getEmailStyles(data: EmailTemplateData): string {
    return `
      <style>
        body {
          font-family: ${data.bodyFontStack || EMAIL_BODY_FONT_STACK};
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f8f9fa;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, ${data.primaryColor} 0%, ${data.secondaryColor || data.primaryColor} 100%);
          color: white;
          padding: 40px 30px;
          text-align: center;
        }
        .logo {
          max-width: 150px;
          height: auto;
          margin-bottom: 20px;
        }
        .content {
          padding: 40px 30px;
        }
        .footer {
          background: #f8f9fa;
          padding: 30px;
          text-align: center;
          color: #6c757d;
          font-size: 14px;
          border-top: 1px solid #e9ecef;
        }
        h1, h2, h3 {
          margin-top: 0;
        }
        .btn {
          display: inline-block;
          padding: 12px 30px;
          background: ${data.primaryColor};
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 20px 0;
        }
        .invoice-details {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .order-items {
          border: 1px solid #e9ecef;
          border-radius: 8px;
          overflow: hidden;
          margin: 20px 0;
        }
        .order-item {
          padding: 15px;
          border-bottom: 1px solid #e9ecef;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .order-item:last-child {
          border-bottom: none;
        }
        .total-row {
          background: #f8f9fa;
          font-weight: bold;
          font-size: 18px;
        }
      </style>
    `;
  }

  /**
   * Generate email header
   */
  private getEmailHeader(data: EmailTemplateData, title: string): string {
    const logoHtml = data.logo
      ? `<img src="${data.logo}" alt="${data.siteName}" class="logo" />`
      : "";

    return `
      <div class="header">
        ${logoHtml}
        <h1 style="margin: 0; font-size: 28px; font-weight: 700;">${title}</h1>
      </div>
    `;
  }

  /**
   * Generate email footer
   */
  private getEmailFooter(data: EmailTemplateData): string {
    return `
      <div class="footer">
        <p style="margin: 0 0 10px 0;">
          <strong>${data.siteName}</strong>
        </p>
        ${data.address ? `<p style="margin: 5px 0;">${data.address}</p>` : ""}
        <p style="margin: 5px 0;">
          Email: ${data.contactEmail} | Phone: ${data.contactPhone}
        </p>
        <p style="margin: 15px 0 5px 0; font-size: 12px; opacity: 0.8;">
          © ${new Date().getFullYear()} ${data.siteName}. All rights reserved.
        </p>
      </div>
    `;
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation(
    to: string,
    data: {
      customerName: string;
      orderNumber: string;
      orderDate: string;
      items?: Array<{
        name: string;
        quantity: number;
        price: number;
        total: number;
      }>;
      subtotal?: number;
      shippingCost?: number;
      total: number | string;
      paymentMethod: string;
      deliveryType: string;
      shippingAddress?: {
        name: string;
        phone: string;
        address: string;
      };
    },
  ): Promise<boolean> {
    try {
      const emailSettings = await getEmailSettings();
      // Line-item amounts are formatted in the store's configured currency;
      // this used to hardcode a taka sign.
      const emailCurrency = await getServerCurrency();

      const templateData: EmailTemplateData = {
        ...emailSettings,
        ...data,
      };

      const itemsHtml = data.items
        ? data.items
            .map(
              (item) => `
        <div class="order-item">
          <div>
            <strong>${item.name}</strong><br>
            <small>Qty: ${item.quantity}</small>
          </div>
          <div>${formatCurrency(item.price * item.quantity, { currency: emailCurrency })}</div>
        </div>
      `,
            )
            .join("")
        : "";

      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Confirmation - ${data.orderNumber}</title>
          ${this.getEmailStyles(templateData)}
        </head>
        <body>
          <div class="container">
            ${this.getEmailHeader(templateData, "Order Confirmation")}

            <div class="content">
              <h2 style="color: ${templateData.primaryColor};">Thank you for your order!</h2>
              <p>Hello ${data.customerName},</p>
              <p>We've received your order and it's being processed. Here are your order details:</p>

              <div class="invoice-details">
                <h3 style="margin-top: 0;">Order Details</h3>
                <p><strong>Order Number:</strong> ${data.orderNumber}</p>
                <p><strong>Order Date:</strong> ${data.orderDate}</p>
                <p><strong>Payment Method:</strong> ${data.paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment"}</p>
                <p><strong>Delivery Type:</strong> ${data.deliveryType.replace("-", " ")}</p>
                <p><strong>Total Amount:</strong> ${data.total}</p>
              </div>

              ${
                itemsHtml
                  ? `
                <h3>Order Items</h3>
                <div class="order-items">
                  ${itemsHtml}
                  <div class="order-item total-row">
                    <div>Total</div>
                    <div>${data.total}</div>
                  </div>
                </div>
              `
                  : ""
              }

              <p>If you have any questions, please don't hesitate to contact us.</p>
            </div>

            ${this.getEmailFooter(templateData)}
          </div>
        </body>
        </html>
      `;

      console.log("📧 Sending email via Resend:", {
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [to],
        subject: `Order Confirmation - ${data.orderNumber} - ${emailSettings.siteName}`,
      });

      const result = await this.resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [to],
        subject: `Order Confirmation - ${data.orderNumber} - ${emailSettings.siteName}`,
        html,
      });

      console.log("📧 Resend response:", {
        success: !!result.data?.id,
        emailId: result.data?.id,
        error: result.error,
      });

      logger.info(`Order confirmation email sent successfully`, {
        to,
        orderNumber: data.orderNumber,
        messageId: result.data?.id,
      });

      return true;
    } catch (error) {
      console.error("❌ Resend error:", error);
      logger.error(`Error sending order confirmation email to ${to}:`, error);
      return false;
    }
  }

  /**
   * Send invoice email with PDF attachment
   */
  async sendInvoiceEmail(
    to: string,
    data: {
      customerName: string;
      orderNumber: string;
      orderDate: string;
      total: string;
      paymentMethod: string;
      deliveryType: string;
    },
    attachment?: {
      filename: string;
      content: Buffer | string;
      contentType: string;
    },
  ): Promise<boolean> {
    try {
      const emailSettings = await getEmailSettings();

      const templateData: EmailTemplateData = {
        ...emailSettings,
        ...data,
      };

      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invoice - ${data.orderNumber}</title>
          ${this.getEmailStyles(templateData)}
        </head>
        <body>
          <div class="container">
            ${this.getEmailHeader(templateData, "Invoice")}

            <div class="content">
              <h2 style="color: ${templateData.primaryColor};">Your Invoice is Ready</h2>
              <p>Hello ${data.customerName},</p>
              <p>Please find attached the invoice for your recent order.</p>

              <div class="invoice-details">
                <h3 style="margin-top: 0;">Invoice Details</h3>
                <p><strong>Order Number:</strong> ${data.orderNumber}</p>
                <p><strong>Order Date:</strong> ${data.orderDate}</p>
                <p><strong>Payment Method:</strong> ${data.paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment"}</p>
                <p><strong>Delivery Type:</strong> ${data.deliveryType.replace("-", " ")}</p>
                <p><strong>Total Amount:</strong> ${data.total}</p>
              </div>

              <p>Thank you for your business! We appreciate your trust in us.</p>
              <p>If you have any questions about your invoice, please contact our customer support.</p>
            </div>

            ${this.getEmailFooter(templateData)}
          </div>
        </body>
        </html>
      `;

      const emailData: any = {
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [to],
        subject: `Invoice for Order ${data.orderNumber} - ${emailSettings.siteName}`,
        html,
      };

      if (attachment) {
        emailData.attachments = [
          {
            filename: attachment.filename,
            content: attachment.content,
          },
        ];
      }

      const result = await this.resend.emails.send(emailData);

      logger.info(`Invoice email sent successfully`, {
        to,
        orderNumber: data.orderNumber,
        messageId: result.data?.id,
      });

      return true;
    } catch (error) {
      logger.error(`Error sending invoice email to ${to}:`, error);
      return false;
    }
  }

  /**
   * Send OTP email
   */
  async sendOTPEmail(
    to: string,
    data: {
      userName: string;
      otp: string;
      type: "password_reset" | "email_verification";
    },
  ): Promise<boolean> {
    try {
      const emailSettings = await getEmailSettings();

      const templateData: EmailTemplateData = {
        ...emailSettings,
        ...data,
      };

      const isPasswordReset = data.type === "password_reset";
      const title = isPasswordReset
        ? "Password Reset Request"
        : "Email Verification";
      const message = isPasswordReset
        ? "We received a request to reset your password. Use the verification code below to proceed:"
        : "Please verify your email address using the code below:";

      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title}</title>
          ${this.getEmailStyles(templateData)}
          <style>
            .otp-box {
              background: #f8f9fa;
              padding: 30px;
              border-radius: 12px;
              margin: 30px 0;
              text-align: center;
              border: 2px dashed ${templateData.primaryColor};
            }
            .otp-code {
              font-size: 36px;
              font-weight: bold;
              color: ${templateData.primaryColor};
              letter-spacing: 8px;
              font-family: ${templateData.monoFontStack || MONOSPACE_FONT_STACK};
              margin: 20px 0;
              display: block;
            }
            .warning {
              background: #fff3cd;
              border: 1px solid #ffeaa7;
              color: #856404;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              border-left: 4px solid #ffc107;
            }
          </style>
        </head>
        <body>
          <div class="container">
            ${this.getEmailHeader(templateData, title)}

            <div class="content">
              <h2 style="color: ${templateData.primaryColor};">${title}</h2>
              <p>Hello ${data.userName},</p>
              <p>${message}</p>

              <div class="otp-box">
                <h3 style="margin-top: 0; color: ${templateData.primaryColor};">Verification Code</h3>
                <span class="otp-code">${data.otp}</span>
                <p style="margin-bottom: 0; color: #666; font-size: 14px;">This code expires in 10 minutes</p>
              </div>

              <div class="warning">
                <h4 style="margin-top: 0;">Security Notice:</h4>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>Never share this code with anyone</li>
                  <li>Our team will never ask for this code over phone or email</li>
                  <li>If you didn't request this, please ignore this email</li>
                </ul>
              </div>

              <p>If you have any questions, please contact our support team.</p>
            </div>

            ${this.getEmailFooter(templateData)}
          </div>
        </body>
        </html>
      `;

      const result = await this.resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [to],
        subject: `${title} - ${emailSettings.siteName}`,
        html,
      });

      logger.info(`OTP email sent successfully`, {
        to,
        type: data.type,
        messageId: result.data?.id,
      });

      return true;
    } catch (error) {
      logger.error(`Error sending OTP email to ${to}:`, error);
      return false;
    }
  }

  /**
   * Send admin notification email
   */
  async sendAdminNotification(
    to: string,
    subject: string,
    data: {
      title: string;
      content: string;
    },
  ): Promise<boolean> {
    try {
      const emailSettings = await getEmailSettings();

      const templateData: EmailTemplateData = {
        ...emailSettings,
        ...data,
      };

      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
          ${this.getEmailStyles(templateData)}
        </head>
        <body>
          <div class="container">
            ${this.getEmailHeader(templateData, "Admin Notification")}

            <div class="content">
              <h2 style="color: ${templateData.primaryColor};">${data.title}</h2>
              ${data.content}
              <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; color: #666; font-size: 14px;">
                This is an automated notification from your ${emailSettings.siteName} admin panel.
              </p>
            </div>

            ${this.getEmailFooter(templateData)}
          </div>
        </body>
        </html>
      `;

      const result = await this.resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [to],
        subject: `[${emailSettings.siteName}] ${subject}`,
        html,
      });

      logger.info(`Admin notification sent successfully`, {
        to,
        subject,
        messageId: result.data?.id,
      });

      return true;
    } catch (error) {
      logger.error(`Error sending admin notification to ${to}:`, error);
      return false;
    }
  }

  /**
   * Send contact form notification
   */
  async sendContactFormNotification(
    to: string,
    data: {
      name: string;
      email: string;
      subject: string;
      message: string;
    },
  ): Promise<boolean> {
    try {
      const emailSettings = await getEmailSettings();

      const templateData: EmailTemplateData = {
        ...emailSettings,
        ...data,
      };

      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Contact Form Submission</title>
          ${this.getEmailStyles(templateData)}
        </head>
        <body>
          <div class="container">
            ${this.getEmailHeader(templateData, "Contact Form Submission")}

            <div class="content">
              <h2 style="color: ${templateData.primaryColor};">New Contact Form Message</h2>
              <p>You have received a new message through your website contact form:</p>

              <div class="invoice-details">
                <h3 style="margin-top: 0;">Message Details</h3>
                <p><strong>Name:</strong> ${data.name}</p>
                <p><strong>Email:</strong> ${data.email}</p>
                <p><strong>Subject:</strong> ${data.subject}</p>
                <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
              </div>

              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${templateData.primaryColor};">
                <h4 style="margin-top: 0;">Message:</h4>
                <p style="white-space: pre-wrap; margin-bottom: 0;">${data.message}</p>
              </div>

              <p>Please respond to this inquiry at your earliest convenience.</p>
            </div>

            ${this.getEmailFooter(templateData)}
          </div>
        </body>
        </html>
      `;

      console.log("📧 Sending email via Resend:", {
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [to],
        subject: `[${emailSettings.siteName}] ${data.subject}`,
        replyTo: `${data.name} <${data.email}>`,
      });

      const result = await this.resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [to],
        subject: `[${emailSettings.siteName}] ${data.subject}`,
        html,
        replyTo: `${data.name} <${data.email}>`,
      });

      console.log("📧 Resend response:", {
        success: !!result.data?.id,
        emailId: result.data?.id,
        error: result.error,
      });

      logger.info(`Contact form notification sent successfully`, {
        to,
        senderEmail: data.email,
        messageId: result.data?.id,
      });

      return true;
    } catch (error) {
      console.error("❌ Resend error:", error);
      logger.error(`Error sending contact form notification to ${to}:`, error);
      return false;
    }
  }

  /**
   * Send return/exchange confirmation email
   */
  async sendReturnExchangeConfirmation(
    to: string,
    data: {
      customerName: string;
      requestId: string;
      orderId: string;
      type: "return" | "exchange";
      products: Array<{
        productName: string;
        quantity: number;
        variant?: string;
        reason: string;
      }>;
    },
  ): Promise<boolean> {
    try {
      const emailSettings = await getEmailSettings();

      const templateData: EmailTemplateData = {
        ...emailSettings,
        ...data,
      };

      const typeText = data.type === "return" ? "Return" : "Exchange";
      const productsHtml = data.products
        .map(
          (product) => `
        <div class="order-item">
          <div>
            <strong>${product.productName}</strong><br>
            ${product.variant ? `<small>Variant: ${product.variant}</small><br>` : ""}
            <small>Qty: ${product.quantity}</small><br>
            <small style="color: #666;">Reason: ${product.reason}</small>
          </div>
        </div>
      `,
        )
        .join("");

      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${typeText} Request Confirmation</title>
          ${this.getEmailStyles(templateData)}
        </head>
        <body>
          <div class="container">
            ${this.getEmailHeader(templateData, `${typeText} Request Confirmation`)}

            <div class="content">
              <h2 style="color: ${templateData.primaryColor};">${typeText} Request Received</h2>
              <p>Hello ${data.customerName},</p>
              <p>We've received your ${data.type} request and it's being processed. Here are the details:</p>

              <div class="invoice-details">
                <h3 style="margin-top: 0;">Request Details</h3>
                <p><strong>Request ID:</strong> ${data.requestId}</p>
                <p><strong>Original Order ID:</strong> ${data.orderId}</p>
                <p><strong>Request Type:</strong> ${typeText}</p>
                <p><strong>Request Date:</strong> ${new Date().toLocaleDateString()}</p>
              </div>

              <h3>Requested Items</h3>
              <div class="order-items">
                ${productsHtml}
              </div>

              <p>We'll review your request and get back to you within 2-3 business days.</p>
              <p>If you have any questions, please contact our customer support.</p>
            </div>

            ${this.getEmailFooter(templateData)}
          </div>
        </body>
        </html>
      `;

      const result = await this.resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [to],
        subject: `${typeText} Request Confirmation - ${data.requestId} - ${emailSettings.siteName}`,
        html,
      });

      logger.info(`${typeText} confirmation email sent successfully`, {
        to,
        requestId: data.requestId,
        messageId: result.data?.id,
      });

      return true;
    } catch (error) {
      logger.error(
        `Error sending ${data.type} confirmation email to ${to}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Send return/exchange status update email
   */
  async sendReturnExchangeStatusUpdate(
    to: string,
    data: {
      customerName: string;
      requestId: string;
      orderId: string;
      type: "return" | "exchange";
      status: "approved" | "rejected" | "resolved";
      adminNotes?: string;
      resolutionNotes?: string;
    },
  ): Promise<boolean> {
    try {
      const emailSettings = await getEmailSettings();

      const templateData: EmailTemplateData = {
        ...emailSettings,
        ...data,
      };

      const typeText = data.type === "return" ? "Return" : "Exchange";
      const statusText =
        data.status.charAt(0).toUpperCase() + data.status.slice(1);
      const statusColor =
        data.status === "approved"
          ? "#10b981"
          : data.status === "rejected"
            ? "#ef4444"
            : "#3b82f6";

      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${typeText} Request ${statusText}</title>
          ${this.getEmailStyles(templateData)}
        </head>
        <body>
          <div class="container">
            ${this.getEmailHeader(templateData, `${typeText} Request ${statusText}`)}

            <div class="content">
              <h2 style="color: ${statusColor};">${typeText} Request ${statusText}</h2>
              <p>Hello ${data.customerName},</p>
              <p>Your ${data.type} request has been ${data.status}. Here are the details:</p>

              <div class="invoice-details">
                <h3 style="margin-top: 0;">Request Details</h3>
                <p><strong>Request ID:</strong> ${data.requestId}</p>
                <p><strong>Original Order ID:</strong> ${data.orderId}</p>
                <p><strong>Request Type:</strong> ${typeText}</p>
                <p><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span></p>
                <p><strong>Updated Date:</strong> ${new Date().toLocaleDateString()}</p>
              </div>

              ${
                data.adminNotes
                  ? `
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${templateData.primaryColor};">
                  <h4 style="margin-top: 0;">Admin Notes:</h4>
                  <p style="white-space: pre-wrap; margin-bottom: 0;">${data.adminNotes}</p>
                </div>
              `
                  : ""
              }

              ${
                data.resolutionNotes
                  ? `
                <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
                  <h4 style="margin-top: 0;">Resolution Notes:</h4>
                  <p style="white-space: pre-wrap; margin-bottom: 0;">${data.resolutionNotes}</p>
                </div>
              `
                  : ""
              }

              <p>If you have any questions about this update, please contact our customer support.</p>
            </div>

            ${this.getEmailFooter(templateData)}
          </div>
        </body>
        </html>
      `;

      const result = await this.resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [to],
        subject: `${typeText} Request ${statusText} - ${data.requestId} - ${emailSettings.siteName}`,
        html,
      });

      logger.info(`${typeText} status update email sent successfully`, {
        to,
        requestId: data.requestId,
        status: data.status,
        messageId: result.data?.id,
      });

      return true;
    } catch (error) {
      logger.error(
        `Error sending ${data.type} status update email to ${to}:`,
        error,
      );
      return false;
    }
  }
}

// Create singleton instance
const resendService = new ResendService();

export default resendService;
