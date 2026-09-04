/**
 * ZamanIT SMS Provider Usage Examples
 *
 * This file demonstrates how to use the ZamanIT SMS provider
 * for sending single and bulk SMS messages.
 */

import { sendBulkSMS, sendBulkSMSWithCustomers } from "../bulkSmsService";
import { SMSService } from "../smsService";

// Example 1: Using SMSService directly with ZamanIT
export async function sendSingleSMSExample() {
  // Create SMS service instance from environment variables
  const smsService = SMSService.createFromEnv();

  const phoneNumber = "+8801712345678"; // or '01712345678'
  const message = `Hello from ${process.env.NEXT_PUBLIC_SITE_NAME || "Muscari Mart"}! Your order has been confirmed.`;

  try {
    const result = await smsService.sendSMS(phoneNumber, message);

    if (result.success) {
      // console.log('SMS sent successfully!');
      // console.log('Message ID:', result.messageId);
      // console.log('Cost:', result.cost);
    } else {
      console.error("Failed to send SMS:", result.error);
    }

    return result;
  } catch (error) {
    console.error("SMS sending error:", error);
    throw error;
  }
}

// Example 2: Sending bulk SMS with customer tracking
export async function sendBulkSMSExample() {
  const smsService = SMSService.createFromEnv();

  const recipients = [
    { phone: "+8801712345678", customerId: "cust_001" },
    { phone: "+8801887654321", customerId: "cust_002" },
    { phone: "+8801556789012", customerId: "cust_003" },
  ];

  const message = `Special offer: 20% discount on all products! Valid till tomorrow. Shop now at ${process.env.NEXT_PUBLIC_SITE_URL || "https://muscarimart.com"}`;

  try {
    const results = await smsService.sendBulkSMS(recipients, message);

    // Process results
    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    // console.log(`Successfully sent ${successful.length} SMS messages`);
    // console.log(`Failed to send ${failed.length} SMS messages`);

    // Log failed messages for retry
    failed.forEach((result) => {
      console.error(
        `Failed to send SMS to ${result.phone} (Customer: ${result.customerId}):`,
        result.error,
      );
    });

    return results;
  } catch (error) {
    console.error("Bulk SMS error:", error);
    throw error;
  }
}

// Example 3: Using legacy bulk SMS function (backward compatibility)
export async function sendLegacyBulkSMSExample() {
  const phoneNumbers = ["+8801712345678", "+8801887654321", "+8801556789012"];

  const message =
    "Your order is ready for pickup! Visit our store with your order ID.";

  try {
    const results = await sendBulkSMS({ phoneNumbers, message });

    results.forEach((result) => {
      if (result.success) {
        // console.log(`SMS sent to ${result.phone}:`, result.response);
      } else {
        console.error(`Failed to send SMS to ${result.phone}:`, result.error);
      }
    });

    return results;
  } catch (error) {
    console.error("Legacy bulk SMS error:", error);
    throw error;
  }
}

// Example 4: Using new bulk SMS function with customer tracking
export async function sendNewBulkSMSExample() {
  const recipients = [
    { phone: "+8801712345678", customerId: "customer_123" },
    { phone: "+8801887654321", customerId: "customer_456" },
    { phone: "+8801556789012", customerId: "customer_789" },
  ];

  const message =
    "Thank you for your purchase! Your order will be delivered within 2-3 business days.";

  try {
    const results = await sendBulkSMSWithCustomers(recipients, message);

    // Calculate success rate
    const successCount = results.filter((r) => r.success).length;
    const totalCost = results.reduce((sum, r) => sum + (r.cost || 0), 0);

    // console.log(`Success rate: ${successCount}/${results.length} (${(successCount/results.length*100).toFixed(1)}%)`);
    // console.log(`Total cost: ${totalCost} BDT`);

    return results;
  } catch (error) {
    console.error("New bulk SMS error:", error);
    throw error;
  }
}

// Example 5: Validating SMS credentials
export async function validateSMSCredentialsExample() {
  try {
    const smsService = SMSService.createFromEnv();
    const isValid = await smsService.validateCredentials();

    if (isValid) {
      // console.log('SMS credentials are valid and working!');
    } else {
      console.error(
        "SMS credentials validation failed. Please check your configuration.",
      );
    }

    return isValid;
  } catch (error) {
    console.error("Credential validation error:", error);
    return false;
  }
}

// Example 6: Order confirmation SMS
export async function sendOrderConfirmationSMS(orderData: {
  customerPhone: string;
  customerName: string;
  orderId: string;
  amount: number;
}) {
  const smsService = SMSService.createFromEnv();

  const message = `Dear ${orderData.customerName}, your order #${orderData.orderId} for BDT ${orderData.amount} has been confirmed. Thank you for shopping with ${process.env.NEXT_PUBLIC_SITE_NAME || "Muscari Mart"}!`;

  try {
    const result = await smsService.sendSMS(orderData.customerPhone, message);

    if (result.success) {
      // console.log(`Order confirmation SMS sent to ${orderData.customerPhone}`);
      return { success: true, messageId: result.messageId };
    } else {
      console.error(`Failed to send order confirmation SMS:`, result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error("Order confirmation SMS error:", error);
    throw error;
  }
}

// Example 7: OTP SMS
export async function sendOTPSMS(phoneNumber: string, otp: string) {
  const smsService = SMSService.createFromEnv();

  const message = `Your ${process.env.NEXT_PUBLIC_SITE_NAME || "Muscari Mart"} verification code is: ${otp}. This code will expire in 5 minutes. Do not share this code with anyone.`;

  try {
    const result = await smsService.sendSMS(phoneNumber, message);

    if (result.success) {
      // console.log(`OTP SMS sent to ${phoneNumber}`);
      return { success: true, messageId: result.messageId };
    } else {
      console.error(`Failed to send OTP SMS:`, result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error("OTP SMS error:", error);
    throw error;
  }
}
