import twilio from 'twilio';

interface SMSProvider {
  sendSMS(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string; cost?: number }>;
  validateCredentials(): Promise<boolean>;
}

export class TwilioProvider implements SMSProvider {
  private client: any;
  private phoneNumber: string;

  constructor(accountSid: string, authToken: string, phoneNumber: string) {
    this.client = twilio(accountSid, authToken);
    this.phoneNumber = phoneNumber;
  }

  async sendSMS(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string; cost?: number }> {
    try {
      // Format phone number for Bangladesh
      const formattedPhone = this.formatBangladeshPhone(to);
      
      const result = await this.client.messages.create({
        body: message,
        from: this.phoneNumber,
        to: formattedPhone,
      });

      return {
        success: true,
        messageId: result.sid,
        cost: parseFloat(result.price) || 0.5
      };
    } catch (error: any) {
      console.error('Twilio SMS Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send SMS'
      };
    }
  }

  async validateCredentials(): Promise<boolean> {
    try {
      await this.client.api.accounts(this.client.accountSid).fetch();
      return true;
    } catch (error) {
      console.error('Twilio validation error:', error);
      return false;
    }
  }

  private formatBangladeshPhone(phone: string): string {
    // Remove any non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Handle Bangladesh phone numbers
    if (cleaned.startsWith('88')) {
      return `+${cleaned}`;
    } else if (cleaned.startsWith('01')) {
      return `+88${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+88${cleaned}`;
    }
    
    return `+${cleaned}`;
  }
}