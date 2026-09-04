interface SMSProvider {
  sendSMS(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string; cost?: number }>;
  validateCredentials(): Promise<boolean>;
}

export class TeletalkProvider implements SMSProvider {
  private apiKey: string;
  private senderId: string;
  private baseUrl: string;

  constructor(apiKey: string, senderId: string, baseUrl: string = 'https://api.teletalk.com.bd') {
    this.apiKey = apiKey;
    this.senderId = senderId;
    this.baseUrl = baseUrl;
  }

  async sendSMS(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string; cost?: number }> {
    try {
      const formattedPhone = this.formatBangladeshPhone(to);
      
      const response = await fetch(`${this.baseUrl}/sms/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          to: formattedPhone,
          message: message,
          sender_id: this.senderId
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return {
          success: true,
          messageId: data.message_id,
          cost: data.cost || 0.3 // Default cost per SMS
        };
      } else {
        return {
          success: false,
          error: data.error || 'Failed to send SMS'
        };
      }
    } catch (error: any) {
      console.error('Teletalk SMS Error:', error);
      return {
        success: false,
        error: error.message || 'Network error'
      };
    }
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/account/balance`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Teletalk validation error:', error);
      return false;
    }
  }

  private formatBangladeshPhone(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.startsWith('88')) {
      return cleaned;
    } else if (cleaned.startsWith('01')) {
      return `88${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `88${cleaned}`;
    }
    
    return cleaned;
  }
}