import { Redis } from "@upstash/redis";
import createLogger from "./logger";
import type { LocalizedText } from "./onesignal";
import { sendOneSignalPush } from "./onesignal";
import { getServerCurrencyFormatter } from "@/lib/currency/server";

// Configure Winston logger
const logger = createLogger("queue-service");

// Queue configuration
/**
 * Redis list key. Deliberately NOT derived from the brand: renaming it would
 * strand every job already queued under the old key, and the jobs that strand
 * are invoices and order confirmations. It is an internal identifier that no
 * customer ever sees, so it has no reason to follow a rebrand.
 */
export const QUEUE_NAME = "nextecom_tasks";
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

// Job types
export enum JobType {
  SEND_EMAIL = "send_email",
  SEND_PUSH = "send_push",
  GENERATE_INVOICE = "generate_invoice",
  LOW_STOCK_ALERT = "low_stock_alert",
  NEW_ORDER_NOTIFICATION = "new_order_notification",
  NEW_CUSTOMER_NOTIFICATION = "new_customer_notification",
  NEW_PRODUCT_NOTIFICATION = "new_product_notification",
  CONTACT_FORM_NOTIFICATION = "contact_form_notification",
}

// Base job interface
export interface BaseJob {
  id: string;
  type: JobType;
  timestamp: Date;
  retries: number;
  maxRetries: number;
}

// Email job interfaces
export interface SendEmailJob extends BaseJob {
  type: JobType.SEND_EMAIL;
  emailType:
    | "order_confirmation"
    | "invoice"
    | "otp"
    | "return_exchange_confirmation"
    | "return_exchange_status";
  to: string;
  subject: string;
  data: any;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType: string;
  }>;
}

export interface GenerateInvoiceJob extends BaseJob {
  type: JobType.GENERATE_INVOICE;
  orderId: string;
  orderNumber: string;
  customerEmail?: string;
  customerId?: string;
  orderData: any;
}

export interface SendPushJob extends BaseJob {
  type: JobType.SEND_PUSH;
  headings: LocalizedText;
  contents: LocalizedText;
  externalUserIds?: string[];
  includedSegments?: string[];
  data?: Record<string, unknown>;
  url?: string;
  webUrl?: string;
}

export interface LowStockAlertJob extends BaseJob {
  type: JobType.LOW_STOCK_ALERT;
  productId: string;
  productName: string;
  currentStock: number;
  threshold: number;
}

export interface NewOrderNotificationJob extends BaseJob {
  type: JobType.NEW_ORDER_NOTIFICATION;
  orderId: string;
  orderNumber: string;
  customerEmail?: string;
  customerId?: string;
  total: number;
}

export interface NewCustomerNotificationJob extends BaseJob {
  type: JobType.NEW_CUSTOMER_NOTIFICATION;
  customerId: string;
  customerName: string;
  customerEmail: string;
}

export interface NewProductNotificationJob extends BaseJob {
  type: JobType.NEW_PRODUCT_NOTIFICATION;
  productId: string;
  productName: string;
  adminId: string;
}

export interface ContactFormNotificationJob extends BaseJob {
  type: JobType.CONTACT_FORM_NOTIFICATION;
  name: string;
  email: string;
  subject: string;
  message: string;
  adminEmail: string;
}

export type Job =
  | SendEmailJob
  | SendPushJob
  | GenerateInvoiceJob
  | LowStockAlertJob
  | NewOrderNotificationJob
  | NewCustomerNotificationJob
  | NewProductNotificationJob
  | ContactFormNotificationJob;

class QueueService {
  private redis: Redis;

  constructor() {
    if (
      !process.env.UPSTASH_REDIS_REST_URL ||
      !process.env.UPSTASH_REDIS_REST_TOKEN
    ) {
      throw new Error(
        "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set",
      );
    }

    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }

  /**
   * Add a job to the queue
   */
  async enqueue(
    job: Omit<Job, "id" | "timestamp" | "retries" | "maxRetries">,
  ): Promise<string> {
    try {
      const jobId = `${job.type}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      const fullJob: Job = {
        ...job,
        id: jobId,
        timestamp: new Date(),
        retries: 0,
        maxRetries: MAX_RETRIES,
      } as Job;

      // Add job to the queue (Redis list)
      const jobString = JSON.stringify(fullJob);
      await this.redis.lpush(QUEUE_NAME, jobString);

      logger.info(`Job enqueued successfully`, {
        jobId,
        type: job.type,
        queueName: QUEUE_NAME,
      });

      return jobId;
    } catch (error) {
      logger.error("Error enqueuing job:", error);
      throw error;
    }
  }

  /**
   * Process jobs from the queue
   */
  async processJobs(
    batchSize: number = 10,
  ): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;

    try {
      // Process jobs in batches
      for (let i = 0; i < batchSize; i++) {
        const jobData = await this.redis.rpop(QUEUE_NAME);

        if (!jobData) {
          break; // No more jobs in queue
        }

        try {
          // Handle different data types from Redis
          let jobString: string;
          if (typeof jobData === "string") {
            jobString = jobData;
          } else if (typeof jobData === "object") {
            jobString = JSON.stringify(jobData);
          } else {
            throw new Error(`Invalid job data type: ${typeof jobData}`);
          }

          const job: Job = JSON.parse(jobString);

          logger.info(`Processing job`, {
            jobId: job.id,
            type: job.type,
            retries: job.retries,
          });

          await this.processJob(job);
          processed++;

          logger.info(`Job processed successfully`, {
            jobId: job.id,
            type: job.type,
          });
        } catch (error) {
          logger.error("Error processing job:", error);

          try {
            // Handle different data types for failed job parsing
            let jobString: string;
            if (typeof jobData === "string") {
              jobString = jobData;
            } else if (typeof jobData === "object") {
              jobString = JSON.stringify(jobData);
            } else {
              throw new Error(`Invalid job data type: ${typeof jobData}`);
            }

            const job: Job = JSON.parse(jobString);
            await this.handleJobFailure(job, error);
          } catch (parseError) {
            logger.error("Error parsing failed job:", parseError);
          }

          failed++;
        }
      }

      if (processed > 0 || failed > 0) {
        logger.info(`Batch processing completed`, { processed, failed });
      }

      return { processed, failed };
    } catch (error) {
      logger.error("Error processing job batch:", error);
      return { processed, failed };
    }
  }

  /**
   * Process a single job
   */
  private async processJob(job: Job): Promise<void> {
    switch (job.type) {
      case JobType.SEND_EMAIL:
        await this.processSendEmailJob(job as SendEmailJob);
        break;
      case JobType.SEND_PUSH:
        await this.processSendPushJob(job as SendPushJob);
        break;
      case JobType.GENERATE_INVOICE:
        await this.processGenerateInvoiceJob(job as GenerateInvoiceJob);
        break;
      case JobType.LOW_STOCK_ALERT:
        await this.processLowStockAlertJob(job as LowStockAlertJob);
        break;
      case JobType.NEW_ORDER_NOTIFICATION:
        await this.processNewOrderNotificationJob(
          job as NewOrderNotificationJob,
        );
        break;
      case JobType.NEW_CUSTOMER_NOTIFICATION:
        await this.processNewCustomerNotificationJob(
          job as NewCustomerNotificationJob,
        );
        break;
      case JobType.NEW_PRODUCT_NOTIFICATION:
        await this.processNewProductNotificationJob(
          job as NewProductNotificationJob,
        );
        break;
      case JobType.CONTACT_FORM_NOTIFICATION:
        await this.processContactFormNotificationJob(
          job as ContactFormNotificationJob,
        );
        break;
      default:
        throw new Error(`Unknown job type: ${(job as any).type}`);
    }
  }

  /**
   * Handle job failure with retry logic
   */
  private async handleJobFailure(job: Job, error: any): Promise<void> {
    job.retries++;

    if (job.retries <= job.maxRetries) {
      logger.warn(`Job failed, retrying (${job.retries}/${job.maxRetries})`, {
        jobId: job.id,
        type: job.type,
        error: error.message,
      });

      // Add delay before retry
      setTimeout(async () => {
        try {
          await this.redis.lpush(QUEUE_NAME, JSON.stringify(job));
        } catch (retryError) {
          logger.error("Error re-queuing failed job:", retryError);
        }
      }, RETRY_DELAY);
    } else {
      logger.error(`Job failed permanently after ${job.maxRetries} retries`, {
        jobId: job.id,
        type: job.type,
        error: error.message,
      });

      // Store failed job for manual inspection
      await this.redis.lpush(
        `${QUEUE_NAME}_failed`,
        JSON.stringify({
          ...job,
          failedAt: new Date(),
          error: error.message,
        }),
      );
    }
  }

  /**
   * Job processors
   */
  private async processSendEmailJob(job: SendEmailJob): Promise<void> {
    const resendService = (await import("./resend")).default;

    switch (job.emailType) {
      case "order_confirmation":
        await resendService.sendOrderConfirmation(job.to, job.data);
        break;
      case "invoice":
        await resendService.sendInvoiceEmail(
          job.to,
          job.data,
          job.attachments?.[0],
        );
        break;
      case "otp":
        await resendService.sendOTPEmail(job.to, job.data);
        break;
      case "return_exchange_confirmation":
        await resendService.sendReturnExchangeConfirmation(job.to, job.data);
        break;
      case "return_exchange_status":
        await resendService.sendReturnExchangeStatusUpdate(job.to, job.data);
        break;
      default:
        throw new Error(`Unknown email type: ${job.emailType}`);
    }
  }

  private async processSendPushJob(job: SendPushJob): Promise<void> {
    await sendOneSignalPush({
      headings: job.headings,
      contents: job.contents,
      externalUserIds: job.externalUserIds,
      includedSegments: job.includedSegments,
      data: {
        ...(job.data || {}),
        jobType: job.type,
        jobId: job.id,
      },
      url: job.url,
      webUrl: job.webUrl,
      idempotencyKey: job.id,
    });
  }

  private async processGenerateInvoiceJob(
    job: GenerateInvoiceJob,
  ): Promise<void> {
    try {
      logger.info(
        `Processing invoice generation for order: ${job.orderNumber}`,
      );

      const pdfService = (await import("./pdf-simple" as any)).default;
      const resendService = (await import("./resend")).default;
      const { uploadToBunny } = await import("./bunny");

      // Generate invoice PDF in memory
      logger.info(`Generating PDF for order: ${job.orderNumber}`);

      // Transform order data to match InvoiceData interface
      const invoiceData = {
        orderId: job.orderId,
        orderNumber: job.orderNumber,
        customer: {
          firstName: job.orderData.customer?.firstName || "",
          lastName: job.orderData.customer?.lastName || "",
          email:
            job.orderData.customer?.email ||
            job.orderData.shippingAddress?.email ||
            "",
          phone:
            job.orderData.customer?.phone ||
            job.orderData.shippingAddress?.phone ||
            "",
        },
        shippingAddress: {
          name: job.orderData.shippingAddress?.name || "",
          phone: job.orderData.shippingAddress?.phone || "",
          email: job.orderData.shippingAddress?.email || "",
          street: job.orderData.shippingAddress?.street || "",
          city: job.orderData.shippingAddress?.city || "",
          district: job.orderData.shippingAddress?.district || "",
          division: job.orderData.shippingAddress?.division || "",
          postalCode: job.orderData.shippingAddress?.postalCode || "",
          coordinates: job.orderData.shippingAddress?.coordinates || {},
        },
        items:
          job.orderData.items?.map((item: any) => ({
            name: item.name || item.product?.name || "Unknown Item",
            price: item.price || 0,
            quantity: item.quantity || 1,
            variant: item.variant || "",
            image: item.image || item.product?.thumbnailImage || "",
            // A combo/bundle stays one invoice line; its composition rides
            // along so the line can say what is in the box.
            itemType: item.itemType || "product",
            components: (item.components || []).map((component: any) => ({
              name: component.name,
              qty: component.qty,
            })),
          })) || [],
        subtotal: job.orderData.subtotal || 0,
        shippingCost: job.orderData.shippingCost || 0,
        tax: job.orderData.tax || 0,
        taxRate: job.orderData.taxRate || 0,
        discountAmount: job.orderData.discountAmount || 0,
        total: job.orderData.total || 0,
        paymentMethod: job.orderData.paymentMethod || "Unknown",
        deliveryType: job.orderData.deliveryType || "Unknown",
        createdAt:
          job.orderData.createdAt?.toString() || new Date().toISOString(),
        invoiceGeneratedAt: new Date().toISOString(),
        expectedDelivery: job.orderData.expectedDelivery?.toString() || "",
        notes: job.orderData.notes || "",
      };

      const invoiceBuffer: Buffer =
        await pdfService.generateInvoice(invoiceData);

      // Upload PDF to Bunny Storage (served via CDN)
      logger.info(
        `Uploading invoice to Bunny for order: ${job.orderNumber}`,
      );
      const uploadResult = await uploadToBunny({
        data: invoiceBuffer,
        filename: `invoice-${job.orderNumber}.pdf`,
        contentType: 'application/pdf',
        // No objectKey override: uploadToBunny derives one from folder +
        // filename, and that derivation is where the brand prefix lives.
        folder: 'invoices',
      });

      const invoiceUrl = uploadResult.url;
      logger.info(`Invoice uploaded to Bunny CDN: ${invoiceUrl}`);

      // Update order with invoice URL
      const connectDB = (await import("./mongodb")).default;
      await connectDB(); // Ensure MongoDB connection is established

      const Order = (await import("./models/Order")).default;
      await Order.findByIdAndUpdate(job.orderId, {
        invoiceUrl,
        invoiceGenerated: true,
        invoiceGeneratedAt: new Date(),
      });

      logger.info(`Order updated with invoice URL: ${job.orderId}`);

      // Send customer order confirmation email with invoice attachment
      if (job.customerEmail) {
        logger.info(
          `Sending customer order confirmation email to: ${job.customerEmail}`,
        );

        // Resolved once per job: both emails below quote the same total, and it
        // has to be in the store's configured currency rather than a hardcoded
        // BDT/en-BD pair.
        const formatMoney = await getServerCurrencyFormatter();

        await resendService.sendOrderConfirmation(job.customerEmail, {
          customerName: job.orderData.shippingAddress?.name || "Customer",
          orderNumber: job.orderNumber,
          orderDate: new Date(job.orderData.createdAt).toLocaleDateString(),
          total: formatMoney(job.orderData.total),
          paymentMethod: job.orderData.paymentMethod,
          deliveryType: job.orderData.deliveryType,
          items:
            job.orderData.items?.map((item: any) => ({
              name: item.product?.name || item.name,
              quantity: item.quantity,
              price: item.price,
              total: item.quantity * item.price,
            })) || [],
          shippingAddress: job.orderData.shippingAddress,
        });

        // Also send invoice email with PDF attachment
        await resendService.sendInvoiceEmail(
          job.customerEmail,
          {
            customerName: job.orderData.shippingAddress?.name || "Customer",
            orderNumber: job.orderNumber,
            orderDate: new Date(job.orderData.createdAt).toLocaleDateString(),
            total: formatMoney(job.orderData.total),
            paymentMethod: job.orderData.paymentMethod,
            deliveryType: job.orderData.deliveryType,
          },
          {
            filename: `invoice-${job.orderNumber}.pdf`,
            content: invoiceBuffer,
            contentType: "application/pdf",
          },
        );

        logger.info(
          `Customer emails sent successfully for order: ${job.orderNumber}`,
        );
      }

      // Send admin notification email
      const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "mmuddin134@gmail.com";
      logger.info(`Sending admin notification email to: ${ADMIN_EMAIL}`);

      // The store's configured currency, not a hardcoded taka sign.
      const invoiceMoney = await getServerCurrencyFormatter();

      await resendService.sendAdminNotification(
        ADMIN_EMAIL,
        `New Order Received - #${job.orderNumber}`,
        {
          title: "🛒 New Order Received",
          content: `
            <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; border-left: 4px solid #8b5cf6;">
              <h4>Order Details:</h4>
              <p><strong>Order Number:</strong> ${job.orderNumber}</p>
              <p><strong>Order ID:</strong> ${job.orderId}</p>
              <p><strong>Customer:</strong> ${job.customerEmail || "Guest User"}</p>
              <p><strong>Email:</strong> ${job.customerEmail || "N/A"}</p>
              <p><strong>Total Amount:</strong> ${invoiceMoney(job.orderData.total)}</p>
              <p><strong>Order Date:</strong> ${new Date().toLocaleDateString()}</p>
              <p><strong>Invoice:</strong> <a href="${invoiceUrl}" target="_blank">View Invoice</a></p>
            </div>
            <p>A new order has been placed and requires processing.</p>
            <p><strong>Invoice has been generated and uploaded to Bunny CDN.</strong></p>
          `,
        },
      );

      logger.info(
        `Admin notification sent successfully for order: ${job.orderNumber}`,
      );

      logger.info(
        `Invoice generation completed successfully for order: ${job.orderNumber}`,
      );
    } catch (error) {
      logger.error(
        `Error processing invoice generation for order ${job.orderNumber}:`,
        error,
      );

      // Log detailed error information for debugging
      if (error instanceof Error) {
        logger.error(`Error name: ${error.name}`);
        logger.error(`Error message: ${error.message}`);
        logger.error(`Error stack: ${error.stack}`);
      }

      // Log the job data that caused the error (without sensitive info)
      logger.error(`Job data summary:`, {
        orderId: job.orderId,
        orderNumber: job.orderNumber,
        customerEmail: job.customerEmail,
        hasOrderData: !!job.orderData,
        orderDataKeys: job.orderData ? Object.keys(job.orderData) : [],
      });

      throw error;
    }
  }

  private async processLowStockAlertJob(job: LowStockAlertJob): Promise<void> {
    const resendService = (await import("./resend")).default;
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "mmuddin134@gmail.com";

    await resendService.sendAdminNotification(
      ADMIN_EMAIL,
      `Low Stock Alert - ${job.productName}`,
      {
        title: "⚠️ Low Stock Alert",
        content: `
          <p>The following product is running low on stock:</p>
          <div style="background: #fef3c7; padding: 15px; border-radius: 5px; border-left: 4px solid #f59e0b;">
            <h4>${job.productName}</h4>
            <p><strong>Product ID:</strong> ${job.productId}</p>
            <p><strong>Current Stock:</strong> ${job.currentStock}</p>
            <p><strong>Threshold:</strong> ${job.threshold}</p>
          </div>
          <p>Please consider restocking this product to avoid stockouts.</p>
        `,
      },
    );
  }

  private async processNewOrderNotificationJob(
    job: NewOrderNotificationJob,
  ): Promise<void> {
    const resendService = (await import("./resend")).default;
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "mmuddin134@gmail.com";
    // The store's configured currency, not a hardcoded taka sign.
    const orderMoney = await getServerCurrencyFormatter();

    await resendService.sendAdminNotification(
      ADMIN_EMAIL,
      `New Order Received - #${job.orderNumber}`,
      {
        title: "🛒 New Order Received",
        content: `
          <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; border-left: 4px solid #8b5cf6;">
            <h4>Order Details:</h4>
            <p><strong>Order Number:</strong> ${job.orderNumber}</p>
            <p><strong>Order ID:</strong> ${job.orderId}</p>
            <p><strong>Customer:</strong> ${job.customerEmail || "Guest User"}</p>
            <p><strong>Email:</strong> ${job.customerEmail || "N/A"}</p>
            <p><strong>Total Amount:</strong> ${orderMoney(job.total)}</p>
            <p><strong>Order Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          <p>A new order has been placed and requires processing.</p>
        `,
      },
    );
  }

  private async processNewCustomerNotificationJob(
    job: NewCustomerNotificationJob,
  ): Promise<void> {
    const resendService = (await import("./resend")).default;
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "mmuddin134@gmail.com";

    await resendService.sendAdminNotification(
      ADMIN_EMAIL,
      `New Customer Registration - ${job.customerName}`,
      {
        title: "👤 New Customer Registration",
        content: `
          <div style="background: #eff6ff; padding: 15px; border-radius: 5px; border-left: 4px solid #3b82f6;">
            <h4>New Customer Details:</h4>
            <p><strong>Name:</strong> ${job.customerName}</p>
            <p><strong>Email:</strong> ${job.customerEmail}</p>
            <p><strong>Customer ID:</strong> ${job.customerId}</p>
            <p><strong>Registration Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          <p>A new customer has registered on your platform.</p>
        `,
      },
    );
  }

  private async processNewProductNotificationJob(
    job: NewProductNotificationJob,
  ): Promise<void> {
    const resendService = (await import("./resend")).default;
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "mmuddin134@gmail.com";

    await resendService.sendAdminNotification(
      ADMIN_EMAIL,
      `New Product Created - ${job.productName}`,
      {
        title: "🆕 New Product Created",
        content: `
          <div style="background: #ecfdf5; padding: 15px; border-radius: 5px; border-left: 4px solid #10b981;">
            <h4>Product Details:</h4>
            <p><strong>Name:</strong> ${job.productName}</p>
            <p><strong>Product ID:</strong> ${job.productId}</p>
            <p><strong>Created By:</strong> ${job.adminId}</p>
            <p><strong>Creation Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          <p>A new product has been added to your inventory.</p>
        `,
      },
    );
  }

  private async processContactFormNotificationJob(
    job: ContactFormNotificationJob,
  ): Promise<void> {
    const resendService = (await import("./resend")).default;

    await resendService.sendContactFormNotification(job.adminEmail, {
      name: job.name,
      email: job.email,
      subject: job.subject,
      message: job.message,
    });
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    pending: number;
    failed: number;
  }> {
    try {
      const pending = await this.redis.llen(QUEUE_NAME);
      const failed = await this.redis.llen(`${QUEUE_NAME}_failed`);

      return {
        pending: pending || 0,
        failed: failed || 0,
      };
    } catch (error) {
      logger.error("Error getting queue stats:", error);
      return { pending: 0, failed: 0 };
    }
  }

  /**
   * Clear failed jobs (for manual cleanup)
   */
  async clearFailedJobs(): Promise<number> {
    try {
      const count = await this.redis.llen(`${QUEUE_NAME}_failed`);
      await this.redis.del(`${QUEUE_NAME}_failed`);

      logger.info(`Cleared ${count} failed jobs`);
      return count || 0;
    } catch (error) {
      logger.error("Error clearing failed jobs:", error);
      return 0;
    }
  }
}

// Create singleton instance
const queueService = new QueueService();

export default queueService;
