import { TeletalkProvider } from './providers/teletalk';
import { TwilioProvider } from './providers/twilio';
import { ZamanITProvider } from './providers/zamanit';

interface SMSProvider {
  sendSMS(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string; cost?: number }>;
  sendBulkSMS?(recipients: Array<{ phone: string; customerId: string }>, message: string): Promise<Array<{
    customerId: string;
    phone: string;
    success: boolean;
    messageId?: string;
    error?: string;
    cost?: number;
  }>>;
  validateCredentials(): Promise<boolean>;
}

interface SMSConfig {
  provider: 'twilio' | 'teletalk' | 'zamanit';
  credentials: {
    twilio?: {
      accountSid: string;
      authToken: string;
      phoneNumber: string;
    };
    teletalk?: {
      apiKey: string;
      senderId: string;
      baseUrl?: string;
    };
    zamanit?: {
      apiKey: string;
      senderId: string;
      baseUrl?: string;
    };
  };
}

export class SMSService {
  private provider: SMSProvider;
  private config: SMSConfig;

  constructor(config: SMSConfig) {
    this.config = config;
    this.provider = this.createProvider();
  }

  private createProvider(): SMSProvider {
    switch (this.config.provider) {
      case 'twilio':
        const twilioConfig = this.config.credentials.twilio;
        if (!twilioConfig) {
          throw new Error('Twilio credentials not provided');
        }
        return new TwilioProvider(
          twilioConfig.accountSid,
          twilioConfig.authToken,
          twilioConfig.phoneNumber
        );

      case 'teletalk':
        const teletalkConfig = this.config.credentials.teletalk;
        if (!teletalkConfig) {
          throw new Error('Teletalk credentials not provided');
        }
        return new TeletalkProvider(
          teletalkConfig.apiKey,
          teletalkConfig.senderId,
          teletalkConfig.baseUrl
        );

      case 'zamanit':
        const zamanitConfig = this.config.credentials.zamanit;
        if (!zamanitConfig) {
          throw new Error('ZamanIT credentials not provided');
        }
        return new ZamanITProvider(
          zamanitConfig.apiKey,
          zamanitConfig.senderId,
          zamanitConfig.baseUrl
        );

      default:
        throw new Error(`Unsupported SMS provider: ${this.config.provider}`);
    }
  }

  async sendSMS(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string; cost?: number }> {
    return this.provider.sendSMS(to, message);
  }

  async sendBulkSMS(recipients: Array<{ phone: string; customerId: string }>, message: string): Promise<Array<{
    customerId: string;
    phone: string;
    success: boolean;
    messageId?: string;
    error?: string;
    cost?: number;
  }>> {
    // If provider has native bulk SMS support, use it
    if (this.provider.sendBulkSMS) {
      return this.provider.sendBulkSMS(recipients, message);
    }

    // Fallback to individual SMS sending
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
    return this.provider.validateCredentials();
  }

  static createFromEnv(): SMSService {
    const provider = (process.env.SMS_PROVIDER || 'zamanit') as 'twilio' | 'teletalk' | 'zamanit';
    
    const config: SMSConfig = {
      provider,
      credentials: {}
    };

    switch (provider) {
      case 'twilio':
        config.credentials.twilio = {
          accountSid: process.env.TWILIO_ACCOUNT_SID || '',
          authToken: process.env.TWILIO_AUTH_TOKEN || '',
          phoneNumber: process.env.TWILIO_PHONE_NUMBER || ''
        };
        break;

      case 'teletalk':
        config.credentials.teletalk = {
          apiKey: process.env.TELETALK_API_KEY || '',
          senderId: process.env.TELETALK_SENDER_ID || '',
          baseUrl: process.env.TELETALK_BASE_URL
        };
        break;

      case 'zamanit':
        config.credentials.zamanit = {
          apiKey: process.env.NEXT_PUBLIC_SMS_API_KEY || '',
          senderId: process.env.NEXT_PUBLIC_SMS_SENDER_ID || '',
          baseUrl: process.env.NEXT_PUBLIC_SMS_API_BASE_URL
        };
        break;
    }

    return new SMSService(config);
  }
}