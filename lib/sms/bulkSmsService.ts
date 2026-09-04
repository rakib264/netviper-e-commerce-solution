import { SMSService } from './smsService';

interface SMSResult {
  phone: string;
  success: boolean;
  response?: any;
  error?: string;
}

interface SendBulkSMSParams {
  phoneNumbers: string[];
  message: string;
}

/**
 * Legacy function for backward compatibility
 * Use SMSService.sendBulkSMS for new implementations
 */
export async function sendBulkSMS({ phoneNumbers, message }: SendBulkSMSParams): Promise<SMSResult[]> {
  const smsService = SMSService.createFromEnv();
  
  // Convert phone numbers to the format expected by SMSService
  const recipients = phoneNumbers.map((phone, index) => ({
    phone,
    customerId: `bulk_${index}`
  }));

  const results = await smsService.sendBulkSMS(recipients, message);

  // Convert results back to legacy format
  return results.map(result => ({
    phone: result.phone,
    success: result.success,
    response: result.messageId ? { messageId: result.messageId } : undefined,
    error: result.error
  }));
}

/**
 * New bulk SMS function with customer tracking
 */
export async function sendBulkSMSWithCustomers(
  recipients: Array<{ phone: string; customerId: string }>, 
  message: string
): Promise<Array<{
  customerId: string;
  phone: string;
  success: boolean;
  messageId?: string;
  error?: string;
  cost?: number;
}>> {
  const smsService = SMSService.createFromEnv();
  return smsService.sendBulkSMS(recipients, message);
}
