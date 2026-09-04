import axios from 'axios';

// Normalize Bangladesh phone numbers into vendor-required format (8801XXXXXXXXX)
function normalizeBangladeshPhoneNumber(rawPhoneNumber: string): string {
  if (!rawPhoneNumber) throw new Error("Phone number is required");

  let digits = String(rawPhoneNumber).replace(/\D/g, "");

  if (digits.startsWith("00")) digits = digits.slice(2);

  if (digits.startsWith("8801") && digits.length === 13) return digits;
  if (digits.startsWith("01") && digits.length === 11) return "88" + digits;
  if (digits.startsWith("1") && digits.length === 10) return "880" + digits;

  throw new Error("Invalid Bangladesh phone number format");
}

export class ZamanITProvider {
  private baseUrl: string;
  private apiKey: string;
  private senderId: string;

  constructor(apiKey: string, senderId: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.senderId = senderId;
    this.baseUrl = baseUrl || "http://45.120.38.242/api/sendsms";
    
    // Validate credentials on initialization
    if (!this.apiKey || !this.senderId) {
      console.warn('ZamanIT Provider: Missing API credentials');
    }
    
    // console.log('ZamanIT Provider initialized with:', {
    //   baseUrl: this.baseUrl,
    //   senderId: this.senderId,
    //   hasApiKey: !!this.apiKey
    // });
  }

  async sendSMS(to: string, message: string, retryCount = 0): Promise<{ 
    success: boolean; 
    messageId?: string; 
    error?: string; 
    cost?: number 
  }> {
    const maxRetries = 2;
    
    try {
      const phone = normalizeBangladeshPhoneNumber(to);

      const params = {
        api_key: this.apiKey,
        type: "text",
        phone,
        senderid: this.senderId,
        message,
      };

    //   console.log(`Sending SMS via ZamanIT to ${phone} (attempt ${retryCount + 1}):`, message);
    //   console.log('API Request params:', { ...params, api_key: '[HIDDEN]' });
    //   console.log('API URL:', this.baseUrl);
      
      const response = await axios.get(this.baseUrl, { 
        params, 
        timeout: 30000, // Increased timeout to 30 seconds
        headers: {
          'User-Agent': 'NextEcom-SMS-Service/1.0'
        }
      });

    //   console.log('ZamanIT API Response Status:', response.status);
    //   console.log('ZamanIT API Response Data:', response.data);

      if (response.status === 200) {
        // console.log(`SMS sent successfully via ZamanIT to ${phone}:`, response.data);
        
        // Try to extract message ID from response if available
        let messageId;
        if (response.data && typeof response.data === 'object') {
          messageId = response.data.messageId || response.data.id || response.data.message_id;
        }

        return {
          success: true,
          messageId: messageId ? String(messageId) : undefined,
          cost: 0.5 // Approximate cost for Bangladesh SMS
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      console.error(`Failed to send SMS via ZamanIT to ${to} (attempt ${retryCount + 1}):`, error.message);
      
      // Check if it's a timeout or network error and retry
      if (retryCount < maxRetries && (
        error.code === 'ECONNRESET' || 
        error.code === 'ENOTFOUND' || 
        error.code === 'ECONNREFUSED' ||
        error.message.includes('timeout') ||
        error.message.includes('Network Error')
      )) {
        // console.log(`Retrying SMS send to ${to} in ${(retryCount + 1) * 2} seconds...`);
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 2000));
        return this.sendSMS(to, message, retryCount + 1);
      }

      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  async sendBulkSMS(recipients: Array<{ phone: string; customerId: string }>, message: string): Promise<Array<{
    customerId: string;
    phone: string;
    success: boolean;
    messageId?: string;
    error?: string;
    cost?: number;
  }>> {
    const results = [];
    
    // Send SMS in batches to avoid rate limiting
    const batchSize = 10;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (recipient) => {
        const result = await this.sendSMS(recipient.phone, message);
        return {
          customerId: recipient.customerId,
          phone: recipient.phone,
          ...result
        };
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add delay between batches to respect rate limits
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  async validateCredentials(): Promise<boolean> {
    try {
    //   console.log('Validating ZamanIT credentials...');
      
      // First check if we have required credentials
      if (!this.apiKey || !this.senderId) {
        console.error('ZamanIT: Missing required credentials');
        return false;
      }

      // Test with a dummy number to validate credentials
      const testPhone = "8801700000000";
      const testMessage = "Test message for credential validation";
      
      const params = {
        api_key: this.apiKey,
        type: "text",
        phone: testPhone,
        senderid: this.senderId,
        message: testMessage,
      };

    //   console.log('Testing ZamanIT API connectivity...');
      const response = await axios.get(this.baseUrl, { 
        params, 
        timeout: 15000, // Increased timeout for validation
        headers: {
          'User-Agent': 'NextEcom-SMS-Service/1.0'
        }
      });

    //   console.log('ZamanIT validation response:', response.status, response.data);

      // Even if the test number fails, if we get a proper API response structure,
      // it means credentials are valid
      return response.status === 200;
    } catch (error: any) {
      console.error('ZamanIT credential validation failed:', error.message);
      
      // Check if it's an authentication error vs network error
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.error('ZamanIT: Invalid API credentials');
        return false;
      }
      
      if (error.message.includes('timeout')) {
        console.error('ZamanIT: API timeout during validation');
        return false;
      }
      
      // For network errors, we'll assume credentials might be valid
      // but there's a connectivity issue
      console.warn('ZamanIT: Network connectivity issue during validation');
      return false;
    }
  }
}
