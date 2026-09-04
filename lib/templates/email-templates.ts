import { EmailTemplateData } from '../types/email-settings';
import { getDefaultBodyFontStack, MONOSPACE_FONT_STACK } from '../theme/typography';
import { formatCurrency } from '@/lib/currency/format';

const EMAIL_BODY_FONT_STACK = getDefaultBodyFontStack();

export class EmailTemplates {
  
  /**
   * Generate base email header with logo and branding
   */
  private static getEmailHeader(settings: EmailTemplateData): string {
    const logoHtml = settings.logo ? 
      `<img src="${settings.logo}" alt="${settings.siteName}" style="max-height: 60px; margin-bottom: 10px;">` : '';
    
    const siteNameHtml = !settings.logo ? 
      `<div class="company-name" style="font-size: 28px; font-weight: bold; color: ${settings.primaryColor}; margin-bottom: 10px;">
        ${settings.siteName}
      </div>` : '';
    
    return `
      <div class="header" style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid ${settings.primaryColor}; padding-bottom: 20px;">
        ${logoHtml}
        ${siteNameHtml}
        <div class="company-tagline" style="font-size: 14px; color: #666; margin-bottom: 5px;">
          ${settings.siteDescription}
        </div>
        <div class="company-contact" style="font-size: 12px; color: #666;">
          Email: ${settings.contactEmail} | Phone: ${settings.contactPhone}
        </div>
      </div>
    `;
  }

  /**
   * Generate base email footer
   */
  private static getEmailFooter(settings: EmailTemplateData): string {
    return `
      <div class="footer" style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
        <p style="margin: 5px 0;">Thank you for choosing ${settings.siteName}!</p>
        <p style="margin: 5px 0;">Visit our website: <a href="${settings.siteUrl}" style="color: ${settings.primaryColor};">${settings.siteUrl}</a></p>
        <p style="margin: 5px 0;">${settings.contactAddress}</p>
        <p style="margin: 5px 0;">© ${new Date().getFullYear()} ${settings.siteName}. All rights reserved.</p>
      </div>
    `;
  }

  /**
   * Generate base email styles
   */
  private static getEmailStyles(settings: EmailTemplateData): string {
    return `
      <style>
        body { 
          font-family: ${settings.bodyFontStack || EMAIL_BODY_FONT_STACK}; 
          line-height: 1.6; 
          color: #333; 
          margin: 0; 
          padding: 20px; 
          background: #f4f4f4; 
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background: white; 
          border-radius: 8px; 
          overflow: hidden; 
          box-shadow: 0 4px 6px rgba(0,0,0,0.1); 
        }
        .content { 
          padding: 30px; 
        }
        .order-info { 
          background: #f8f9fa; 
          padding: 20px; 
          border-radius: 8px; 
          margin: 20px 0; 
          border-left: 4px solid ${settings.primaryColor}; 
        }
        .items-table { 
          width: 100%; 
          border-collapse: collapse; 
          margin: 20px 0; 
        }
        .items-table th { 
          background: ${settings.primaryColor}; 
          color: white; 
          padding: 12px; 
          text-align: left; 
        }
        .items-table td { 
          padding: 8px 12px; 
          border-bottom: 1px solid #eee; 
        }
        .btn-primary { 
          background: ${settings.primaryColor}; 
          color: white !important; 
          padding: 12px 24px; 
          text-decoration: none; 
          border-radius: 5px; 
          display: inline-block; 
          margin: 10px 0; 
        }
        .highlight { 
          color: ${settings.primaryColor}; 
          font-weight: bold; 
        }
      </style>
    `;
  }

  /**
   * Invoice Email Template
   */
  static generateInvoiceEmail(data: EmailTemplateData): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice - ${data.orderNumber}</title>
        ${this.getEmailStyles(data)}
      </head>
      <body>
        <div class="container">
          ${this.getEmailHeader(data)}
          
          <div class="content">
            <h2 style="color: ${data.primaryColor};">Invoice for Order ${data.orderNumber}</h2>
            <p>Dear ${data.customerName},</p>
            <p>Thank you for your order! Please find your invoice attached to this email.</p>
            
            <div class="order-info">
              <h3 style="margin-top: 0; color: ${data.primaryColor};">Order Details</h3>
              <p><strong>Order Number:</strong> ${data.orderNumber}</p>
              <p><strong>Order Date:</strong> ${data.orderDate}</p>
              <p><strong>Payment Method:</strong> ${data.paymentMethod?.toUpperCase()}</p>
              <p><strong>Delivery Type:</strong> ${data.deliveryType}</p>
              <p><strong>Total Amount:</strong> <span class="highlight">${data.total}</span></p>
            </div>
            
            <p>Your order is being processed and you'll receive a shipping notification once it's dispatched.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.siteUrl}/orders" class="btn-primary" style="background: ${data.primaryColor}; color: white !important; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">Track Your Order</a>
            </div>
            
            <p>If you have any questions about your order, please don't hesitate to contact our customer support team.</p>
          </div>
          
          ${this.getEmailFooter(data)}
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Order Confirmation Email Template
   */
  static generateOrderConfirmationEmail(data: EmailTemplateData): string {
    const itemsHtml = data.items?.map(item => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">
          ${item.name}${item.variant ? ` (${item.variant})` : ''}
        </td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align: center;">
          ${item.quantity}
        </td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align: right;">
          ${formatCurrency(item.price)}
        </td>
      </tr>
    `).join('') || '';

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation - ${data.orderNumber}</title>
        ${this.getEmailStyles(data)}
      </head>
      <body>
        <div class="container">
          ${this.getEmailHeader(data)}
          
          <div class="content">
            <h2 style="color: ${data.primaryColor};">Thank you for your order!</h2>
            <p>Hello ${data.customerName},</p>
            <p>We've received your order and it's being processed. Here are the details:</p>
            
            <div class="order-info">
              <h3 style="margin-top: 0; color: ${data.primaryColor};">Order Information</h3>
              <p><strong>Order Number:</strong> ${data.orderNumber}</p>
              <p><strong>Order Date:</strong> ${data.orderDate}</p>
              <p><strong>Payment Method:</strong> ${data.paymentMethod?.toUpperCase()}</p>
              <p><strong>Delivery Type:</strong> ${data.deliveryType}</p>
              <p><strong>Total Amount:</strong> <span class="highlight">${data.total}</span></p>
            </div>
            
            <h3 style="color: ${data.primaryColor};">Order Items</h3>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th style="text-align: center;">Quantity</th>
                  <th style="text-align: right;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.siteUrl}/orders" class="btn-primary" style="background: ${data.primaryColor}; color: white !important; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">Track Your Order</a>
            </div>
            
            <p>We'll notify you when your order ships. If you have any questions, please contact our support team.</p>
          </div>
          
          ${this.getEmailFooter(data)}
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Admin Notification Email Template
   */
  static generateAdminNotificationEmail(data: EmailTemplateData): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>[${data.siteName}] ${data.subject}</title>
        ${this.getEmailStyles(data)}
      </head>
      <body>
        <div class="container">
          ${this.getEmailHeader(data)}
          
          <div class="content">
            <h2 style="color: ${data.primaryColor}; background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 0 0 20px 0;">
              🔔 Admin Notification
            </h2>
            
            <h3 style="color: ${data.primaryColor};">${data.subject}</h3>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid ${data.primaryColor};">
              ${data.content}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.siteUrl}/admin" class="btn-primary" style="background: ${data.primaryColor}; color: white !important; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">Go to Admin Panel</a>
            </div>
            
            <p style="font-size: 12px; color: #666; text-align: center;">
              This is an automated notification from ${data.siteName} Admin System
            </p>
          </div>
          
          ${this.getEmailFooter(data)}
        </div>
      </body>
      </html>
    `;
  }

  /**
   * OTP Email Template
   */
  static generateOTPEmail(data: EmailTemplateData & {
    userName: string;
    otp: string;
    type: 'password_reset' | 'email_verification';
  }): string {
    const isPasswordReset = data.type === 'password_reset';
    const title = isPasswordReset ? 'Password Reset Request' : 'Email Verification';
    const message = isPasswordReset 
      ? 'We received a request to reset your password. Use the verification code below to proceed:'
      : 'Please verify your email address using the code below:';

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} - ${data.siteName}</title>
        ${this.getEmailStyles(data)}
        <style>
          .otp-box { 
            background: #f8f9fa; 
            padding: 30px; 
            border-radius: 12px; 
            margin: 30px 0; 
            text-align: center; 
            border: 2px dashed ${data.primaryColor}; 
          }
          .otp-code { 
            font-size: 36px; 
            font-weight: bold; 
            color: ${data.primaryColor}; 
            letter-spacing: 8px; 
            font-family: ${MONOSPACE_FONT_STACK}; 
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
          .warning ul {
            margin: 10px 0;
            padding-left: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          ${this.getEmailHeader(data)}
          
          <div class="content">
            <h2 style="color: ${data.primaryColor};">${title}</h2>
            <p>Hello ${data.userName},</p>
            <p>${message}</p>
            
            <div class="otp-box">
              <h3 style="margin-top: 0; color: ${data.primaryColor};">Your Verification Code</h3>
              <div class="otp-code">${data.otp}</div>
              <p style="margin-bottom: 0; color: #666; font-size: 14px;">This code will expire in 10 minutes</p>
            </div>
            
            <div class="warning">
              <strong>🔒 Security Notice:</strong>
              <ul>
                <li>Never share this code with anyone</li>
                <li>Our team will never ask for this code</li>
                <li>If you didn't request this, please ignore this email</li>
              </ul>
            </div>
            
            <p>If you have any questions, please contact our support team at ${data.contactEmail}.</p>
          </div>
          
          ${this.getEmailFooter(data)}
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Contact Form Email Template
   */
  static generateContactFormEmail(data: EmailTemplateData & { 
    senderName: string; 
    senderEmail: string; 
    message: string; 
  }): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Contact Form - ${data.siteName}</title>
        ${this.getEmailStyles(data)}
      </head>
      <body>
        <div class="container">
          ${this.getEmailHeader(data)}
          
          <div class="content">
            <h2 style="color: ${data.primaryColor};">New Contact Form Message</h2>
            
            <div class="order-info">
              <h3 style="margin-top: 0; color: ${data.primaryColor};">Contact Details</h3>
              <p><strong>Name:</strong> ${data.senderName}</p>
              <p><strong>Email:</strong> ${data.senderEmail}</p>
              <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            <h3 style="color: ${data.primaryColor};">Message</h3>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid ${data.primaryColor};">
              ${data.message}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="mailto:${data.senderEmail}" class="btn-primary" style="background: ${data.primaryColor}; color: white !important; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">Reply to ${data.senderName}</a>
            </div>
          </div>
          
          ${this.getEmailFooter(data)}
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Return/Exchange Request Confirmation Email Template
   */
  static generateReturnExchangeConfirmationEmail(data: EmailTemplateData & {
    requestId: string;
    orderId: string;
    type: 'return' | 'exchange';
    products: Array<{
      productName: string;
      quantity: number;
      variant?: string;
      reason: string;
    }>;
  }): string {
    const itemsHtml = data.products.map(product => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">
          ${product.productName}${product.variant ? ` (${product.variant})` : ''}
        </td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align: center;">
          ${product.quantity}
        </td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">
          ${product.reason}
        </td>
      </tr>
    `).join('');

    const typeText = data.type === 'return' ? 'Return' : 'Exchange';
    const typeIcon = data.type === 'return' ? '↩️' : '🔄';

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${typeText} Request Confirmation - ${data.requestId}</title>
        ${this.getEmailStyles(data)}
      </head>
      <body>
        <div class="container">
          ${this.getEmailHeader(data)}
          
          <div class="content">
            <h2 style="color: ${data.primaryColor};">${typeIcon} ${typeText} Request Received</h2>
            <p>Hello ${data.customerName},</p>
            <p>We've received your ${typeText.toLowerCase()} request and it's being processed. Here are the details:</p>
            
            <div class="order-info">
              <h3 style="margin-top: 0; color: ${data.primaryColor};">Request Information</h3>
              <p><strong>Request ID:</strong> ${data.requestId}</p>
              <p><strong>Order ID:</strong> ${data.orderId}</p>
              <p><strong>Type:</strong> ${typeText}</p>
              <p><strong>Submitted:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            <h3 style="color: ${data.primaryColor};">Items to ${typeText}</h3>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th style="text-align: center;">Quantity</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            
            <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; margin: 20px 0;">
              <h4 style="margin-top: 0; color: #28a745;">What happens next?</h4>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>We'll review your request within 24 hours</li>
                <li>You'll receive an email with our decision</li>
                <li>If approved, we'll send ${typeText.toLowerCase()} instructions</li>
                <li>Process your ${typeText.toLowerCase()} within 3-5 business days</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.siteUrl}/returns" class="btn-primary" style="background: ${data.primaryColor}; color: white !important; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">Track Your Request</a>
            </div>
            
            <p>If you have any questions about your ${typeText.toLowerCase()} request, please contact our support team.</p>
          </div>
          
          ${this.getEmailFooter(data)}
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Return/Exchange Status Update Email Template
   */
  static generateReturnExchangeStatusUpdateEmail(data: EmailTemplateData & {
    requestId: string;
    orderId: string;
    type: 'return' | 'exchange';
    status: 'approved' | 'rejected' | 'resolved';
    adminNotes?: string;
    resolutionNotes?: string;
  }): string {
    const statusConfig = {
      approved: { 
        color: '#28a745', 
        icon: '✅', 
        title: 'Request Approved', 
        bgColor: '#e8f5e8' 
      },
      rejected: { 
        color: '#dc3545', 
        icon: '❌', 
        title: 'Request Rejected', 
        bgColor: '#f8e8e8' 
      },
      resolved: { 
        color: '#007bff', 
        icon: '🎉', 
        title: 'Request Resolved', 
        bgColor: '#e8f4fd' 
      }
    };

    const config = statusConfig[data.status];
    const typeText = data.type === 'return' ? 'Return' : 'Exchange';

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${config.title} - ${data.requestId}</title>
        ${this.getEmailStyles(data)}
      </head>
      <body>
        <div class="container">
          ${this.getEmailHeader(data)}
          
          <div class="content">
            <h2 style="color: ${config.color};">${config.icon} ${config.title}</h2>
            <p>Hello ${data.customerName},</p>
            <p>Your ${typeText.toLowerCase()} request has been <strong>${data.status}</strong>.</p>
            
            <div class="order-info">
              <h3 style="margin-top: 0; color: ${data.primaryColor};">Request Details</h3>
              <p><strong>Request ID:</strong> ${data.requestId}</p>
              <p><strong>Order ID:</strong> ${data.orderId}</p>
              <p><strong>Type:</strong> ${typeText}</p>
              <p><strong>Status:</strong> <span style="color: ${config.color}; font-weight: bold;">${data.status.toUpperCase()}</span></p>
            </div>
            
            ${data.adminNotes ? `
              <div style="background: ${config.bgColor}; padding: 20px; border-radius: 8px; border-left: 4px solid ${config.color}; margin: 20px 0;">
                <h4 style="margin-top: 0; color: ${config.color};">Admin Notes</h4>
                <p style="margin: 0;">${data.adminNotes}</p>
              </div>
            ` : ''}
            
            ${data.resolutionNotes ? `
              <div style="background: ${config.bgColor}; padding: 20px; border-radius: 8px; border-left: 4px solid ${config.color}; margin: 20px 0;">
                <h4 style="margin-top: 0; color: ${config.color};">Resolution Notes</h4>
                <p style="margin: 0;">${data.resolutionNotes}</p>
              </div>
            ` : ''}
            
            ${data.status === 'approved' ? `
              <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; margin: 20px 0;">
                <h4 style="margin-top: 0; color: #28a745;">Next Steps</h4>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>You'll receive ${typeText.toLowerCase()} instructions via email</li>
                  <li>Follow the instructions to send your items back</li>
                  <li>We'll process your ${typeText.toLowerCase()} within 3-5 business days</li>
                </ul>
              </div>
            ` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.siteUrl}/returns" class="btn-primary" style="background: ${data.primaryColor}; color: white !important; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">View Request Details</a>
            </div>
            
            <p>If you have any questions, please contact our support team.</p>
          </div>
          
          ${this.getEmailFooter(data)}
        </div>
      </body>
      </html>
    `;
  }
}
