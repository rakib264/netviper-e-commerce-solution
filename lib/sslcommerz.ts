interface SSLCommerzConfig {
  store_id: string;
  store_passwd: string;
  total_amount: number;
  currency: string;
  tran_id: string;
  success_url: string;
  fail_url: string;
  cancel_url: string;
  ipn_url: string;
  shipping_method: string;
  product_name: string;
  product_category: string;
  product_profile: string;
  cus_name: string;
  cus_email: string;
  cus_add1: string;
  cus_add2?: string;
  cus_city: string;
  cus_state: string;
  cus_postcode: string;
  cus_country: string;
  cus_phone: string;
  cus_fax?: string;
  ship_name: string;
  ship_add1: string;
  ship_add2?: string;
  ship_city: string;
  ship_state: string;
  ship_postcode: string;
  ship_country: string;
  ship_phone: string;
}

export class SSLCommerzService {
  private baseUrl: string;
  private storeId: string;
  private storePassword: string;

  constructor(storeId: string, storePassword: string, sandbox: boolean = true) {
    this.storeId = storeId;
    this.storePassword = storePassword;
    this.baseUrl = sandbox 
      ? 'https://sandbox.sslcommerz.com'
      : 'https://securepay.sslcommerz.com';
  }

  async initiatePayment(config: SSLCommerzConfig): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/gwprocess/v4/api.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          ...config,
          total_amount: config.total_amount.toString(),
        }),
      });

      const data = await response.json();

      if (data.status === 'SUCCESS') {
        return { success: true, data };
      } else {
        return { success: false, error: data.failedreason || 'Payment initiation failed' };
      }
    } catch (error) {
      console.error('SSLCommerz initiation error:', error);
      return { success: false, error: 'Network error occurred' };
    }
  }

  async validatePayment(transactionId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/validator/api/validationserverAPI.php?val_id=${transactionId}&store_id=${this.storeId}&store_passwd=${this.storePassword}&format=json`
      );

      const data = await response.json();

      if (data.status === 'VALID' || data.status === 'VALIDATED') {
        return { success: true, data };
      } else {
        return { success: false, error: 'Payment validation failed' };
      }
    } catch (error) {
      console.error('SSLCommerz validation error:', error);
      return { success: false, error: 'Validation network error' };
    }
  }

  generateTransactionId(): string {
    return `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default SSLCommerzService;