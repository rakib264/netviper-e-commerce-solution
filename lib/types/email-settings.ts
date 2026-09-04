export interface EmailSettings {
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  logo?: string;
  primaryColor: string;
  secondaryColor?: string;
  /**
   * Literal font stacks resolved from the typography settings. Emails and PDFs
   * cannot read CSS custom properties, so the selected families are baked in at
   * render time rather than hardcoded to a default.
   */
  bodyFontStack: string;
  headingFontStack: string;
  monoFontStack: string;
}

export interface EmailTemplateData extends EmailSettings {
  customerName?: string;
  orderNumber?: string;
  orderDate?: string;
  total?: string;
  paymentMethod?: string;
  deliveryType?: string;
  items?: Array<{
    name: string;
    quantity: number;
    price: number;
    variant?: string;
  }>;
  invoicePath?: string;
  content?: string;
  subject?: string;
}
