import * as fs from "fs";
import { jsPDF } from "jspdf";
import * as path from "path";
import createLogger from "./logger";
import GeneralSettings from "./models/GeneralSettings";
import connectDB from "./mongodb";
import { getPdfBaseFontForRole, type PdfBaseFont } from "./theme/typography";
import { formatCurrency } from "@/lib/currency/format";
import { getServerCurrency } from "@/lib/currency/server";

// Configure Winston logger
const logger = createLogger("pdf-simple-service");

// Invoice data interface - Updated to match actual order structure
export interface InvoiceData {
  orderId: string;
  orderNumber: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  shippingAddress: {
    name: string;
    phone: string;
    email: string;
    street: string;
    city: string;
    district: string;
    division: string;
    postalCode?: string;
    coordinates?: {
      placeName: string;
      district: string;
      divisionName: string;
      thanaOrUpazilaName?: string;
    };
  };
  items: Array<{
    name: string;
    price: number;
    quantity: number;
    variant?: string;
    image?: string;
    /** `combo_bundle` lines print their composition under the name. */
    itemType?: string;
    components?: Array<{ name: string; qty: number }>;
  }>;
  subtotal: number;
  shippingCost: number;
  tax: number;
  taxRate?: number;
  discountAmount: number;
  total: number;
  paymentMethod: string;
  deliveryType: string;
  createdAt: string;
  invoiceGeneratedAt?: string;
  expectedDelivery?: string;
  notes?: string;
}

export interface CompanySettings {
  siteName?: string;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
  logo1?: string;
}

class SimplePDFService {
  async generateInvoice(data: InvoiceData): Promise<Buffer> {
    try {
      logger.info(`Generating invoice PDF for order: ${data.orderNumber}`);

      // Get company settings
      // Mapped from the selected typography roles; jsPDF can only use its
      // built-in fonts, so this follows the serif/sans character of the theme.
      let bodyFont: PdfBaseFont = "helvetica";
      let headingFont: PdfBaseFont = "helvetica";

      let companySettings: CompanySettings = {
        siteName: "Muscari Mart",
        address: "Dhaka, Bangladesh",
        contactEmail: "mmuddin134@gmail.com",
        contactPhone: "+8801339561702",
        logo1: "",
      };

      try {
        await connectDB();
        const settings = await GeneralSettings.findOne();
        if (settings) {
          companySettings = {
            siteName: settings.siteName || companySettings.siteName,
            address: settings.address || companySettings.address,
            contactEmail: settings.contactEmail || companySettings.contactEmail,
            contactPhone: settings.contactPhone || companySettings.contactPhone,
            logo1: settings.logo1 || companySettings.logo1,
          };
          bodyFont = getPdfBaseFontForRole(settings.typography, "paragraph");
          headingFont = getPdfBaseFontForRole(settings.typography, "heading");
        }
      } catch (dbError) {
        logger.warn(
          "Could not fetch company settings, using defaults:",
          dbError,
        );
      }

      // Create new PDF document
      const doc = new jsPDF();

      // Set up colors (Muscari Mart brand colors)
      const primaryColor = "#3949AB"; // Indigo
      const secondaryColor = "#8b5cf6"; // Purple
      const textColor = "#374151"; // Gray-700
      const lightGray = "#f3f4f6"; // Gray-100
      const whiteColor = "#FFFFFF"; // White for text visibility

      // The store's configured currency, not a hardcoded BDT/en-BD pair.
      const invoiceCurrency = await getServerCurrency();
      const formatPrice = (price: number) =>
        formatCurrency(price, {
          currency: invoiceCurrency,
          minimumFractionDigits: 0,
        });

      // Helper function to format date
      const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-BD", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      };

      // Header with improved design and branding
      doc.setFillColor(primaryColor);
      doc.rect(0, 0, 210, 55, "F"); // Slightly reduced height

      // Add company logo with perfect proportional sizing
      try {
        // First try to use logo from settings (cloud URL)
        if (companySettings.logo1) {
          // For cloud URLs, we'll use a fallback approach
          doc.setFillColor(whiteColor);
          doc.roundedRect(20, 15, 45, 20, 3, 3, "F");
          doc.setTextColor(primaryColor);
          doc.setFontSize(16);
          doc.setFont(headingFont, "bold");
          doc.text(companySettings.siteName || "MUSCARI MART", 22, 27);
        } else {
          // Try local logo file as fallback
          const logoPath = path.join(
            process.cwd(),
            "lib",
            "assets",
            "images",
            "muscarimart.png",
          );
          if (fs.existsSync(logoPath)) {
            const logoData = fs.readFileSync(logoPath, "base64");
            const logoFormat = "PNG";
            // Perfect logo size - not too big, not too small
            doc.addImage(
              `data:image/png;base64,${logoData}`,
              logoFormat,
              20,
              12,
              45,
              22,
              "",
              "FAST",
            );
          } else {
            // Fallback to stylized text logo
            doc.setFillColor(whiteColor);
            doc.roundedRect(20, 15, 45, 20, 3, 3, "F");
            doc.setTextColor(primaryColor);
            doc.setFontSize(16);
            doc.setFont(headingFont, "bold");
            doc.text(companySettings.siteName || "MUSCARI MART", 22, 27);
          }
        }
      } catch (error) {
        logger.warn("Could not load logo, using fallback:", error);
        // Fallback design
        doc.setFillColor(whiteColor);
        doc.roundedRect(20, 15, 45, 20, 3, 3, "F");
        doc.setTextColor(primaryColor);
        doc.setFontSize(16);
        doc.setFont(headingFont, "bold");
        doc.text(companySettings.siteName || "MUSCARI MART", 22, 27);
      }

      // Company tagline with elegant typography
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont(bodyFont, "normal");
      doc.text("Premium Fashion E-commerce Platform", 20, 40);

      // Contact information with smaller, elegant styling
      doc.setFontSize(8);
      doc.text(
        `Email: ${companySettings.contactEmail}  |  Phone: ${companySettings.contactPhone}`,
        20,
        46,
      );

      // Invoice title with refined, smaller styling
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont(headingFont, "bold");
      doc.text("INVOICE", 145, 22);

      // Invoice details with improved typography
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont(bodyFont, "normal");
      doc.text(`Invoice #: ${data.orderNumber}`, 145, 30);
      doc.text(
        `Date: ${formatDate(data.invoiceGeneratedAt || data.createdAt)}`,
        145,
        37,
      );

      // Add subtle decorative line
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.3);
      doc.line(145, 40, 185, 40);

      // Customer information section with enhanced design
      let yPos = 70; // Adjusted for new header height

      // Bill To section with rounded corners effect
      doc.setFillColor(lightGray);
      doc.roundedRect(20, yPos, 80, 40, 2, 2, "F");

      // Add subtle border
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.roundedRect(20, yPos, 80, 40, 2, 2, "S");

      doc.setTextColor(textColor);
      doc.setFontSize(12);
      doc.setFont(headingFont, "bold");
      doc.text("BILL TO", 25, yPos + 10);

      doc.setFont(bodyFont, "normal");
      doc.setFontSize(10);
      doc.text(data.shippingAddress?.name || "Customer", 25, yPos + 20);
      doc.text(data.shippingAddress?.email || "N/A", 25, yPos + 27);
      doc.text(data.shippingAddress?.phone || "N/A", 25, yPos + 34);

      // Ship To section with matching design
      doc.setFillColor(lightGray);
      doc.roundedRect(110, yPos, 80, 40, 2, 2, "F");

      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.roundedRect(110, yPos, 80, 40, 2, 2, "S");

      doc.setTextColor(textColor);
      doc.setFontSize(12);
      doc.setFont(headingFont, "bold");
      doc.text("SHIP TO", 115, yPos + 10);

      doc.setFont(bodyFont, "normal");
      doc.setFontSize(10);
      // Format address with coordinates data
      const street = data.shippingAddress?.street || "";
      const placeName = data.shippingAddress?.coordinates?.placeName || "";
      const district =
        data.shippingAddress?.coordinates?.district ||
        data.shippingAddress?.district ||
        "";
      const divisionName =
        data.shippingAddress?.coordinates?.divisionName ||
        data.shippingAddress?.division ||
        "";
      const postalCode = data.shippingAddress?.postalCode || "";

      const fullAddress = `${street}${placeName ? ", " + placeName : ""}${district ? ", " + district : ""}${divisionName ? ", " + divisionName : ""}${postalCode ? ", " + postalCode : ""}`;

      // Split address into multiple lines with proper spacing
      const addressLines = doc.splitTextToSize(fullAddress, 70);
      let addressYPos = yPos + 20;
      addressLines.forEach((line: string, index: number) => {
        if (addressYPos < yPos + 37 && index < 3) {
          // Limit to 3 lines
          doc.text(line, 115, addressYPos);
          addressYPos += 6;
        }
      });

      // Items table header with clean design and proper column positioning
      yPos += 50;
      doc.setFillColor(secondaryColor); // Only secondaryColor background
      doc.roundedRect(20, yPos, 170, 16, 1, 1, "F");

      doc.setTextColor(255, 255, 255); // White text
      doc.setFontSize(10);
      doc.setFont(headingFont, "bold");

      // Properly aligned column headers with exact positioning
      doc.text("ITEM", 25, yPos + 11);
      doc.text("QTY", 130, yPos + 11, { align: "center" }); // Centered
      doc.text("PRICE", 155, yPos + 11, { align: "center" }); // Centered
      doc.text("TOTAL", 175, yPos + 11, { align: "center" }); // Centered

      // Items with perfectly aligned columns and enhanced design
      yPos += 20;
      doc.setTextColor(textColor);
      doc.setFont(bodyFont, "normal");
      doc.setFontSize(10);

      (data.items || []).forEach((item, index) => {
        if (yPos > 240) {
          doc.addPage();
          yPos = 30;
        }

        // Add alternating row background with rounded corners
        if (index % 2 === 0) {
          doc.setFillColor(249, 249, 249);
          doc.roundedRect(20, yPos - 4, 170, 14, 1, 1, "F");
        }

        // Add subtle row border
        doc.setDrawColor(240, 240, 240);
        doc.setLineWidth(0.2);
        doc.line(20, yPos + 10, 190, yPos + 10);

        // Item name with proper text wrapping
        const itemName = item.name || "Unknown Item";
        const wrappedText = doc.splitTextToSize(itemName, 95);
        doc.text(wrappedText[0], 25, yPos + 4);

        // Perfectly aligned columns to match headers
        doc.text((item.quantity || 0).toString(), 130, yPos + 4, {
          align: "center",
        }); // Matches QTY header
        doc.text(formatPrice(item.price || 0), 155, yPos + 4, {
          align: "center",
        }); // Matches PRICE header
        doc.text(
          formatPrice((item.price || 0) * (item.quantity || 0)),
          175,
          yPos + 4,
          { align: "center" },
        ); // Matches TOTAL header

        yPos += 16;

        // A combo/bundle is one paid line, so its composition prints as a
        // smaller note under the name rather than as separate priced rows.
        if (item.itemType === "combo_bundle" && item.components?.length) {
          const includes = item.components
            .map((component) => `${component.name} x${component.qty}`)
            .join(", ");
          const noteLines = doc.splitTextToSize(`Includes: ${includes}`, 95);

          doc.setFontSize(8);
          doc.setTextColor(120, 120, 120);
          noteLines.slice(0, 3).forEach((line: string) => {
            if (yPos > 250) {
              doc.addPage();
              yPos = 30;
            }
            doc.text(line, 28, yPos - 4);
            yPos += 6;
          });
          doc.setFontSize(10);
          doc.setTextColor(textColor);
          yPos += 2;
        }
      });

      // Totals section with clean, elegant design
      yPos += 20;
      const totalsHeight = data.discountAmount > 0 ? 50 : 45;

      // Clean totals background without heavy shadows
      doc.setFillColor(lightGray);
      doc.roundedRect(110, yPos, 80, totalsHeight, 2, 2, "F");

      // Add subtle border
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.3);
      doc.roundedRect(110, yPos, 80, totalsHeight, 2, 2, "S");

      doc.setTextColor(textColor);
      doc.setFontSize(11);
      doc.setFont(bodyFont, "normal");

      let totalsYPos = yPos + 15;
      doc.text("Subtotal:", 115, totalsYPos);
      doc.text(formatPrice(data.subtotal || 0), 185, totalsYPos, {
        align: "right",
      });

      totalsYPos += 9;
      doc.text("Shipping:", 115, totalsYPos);
      doc.text(formatPrice(data.shippingCost || 0), 185, totalsYPos, {
        align: "right",
      });

      // Tax display temporarily disabled
      // if ((data.tax || 0) > 0) {
      //   totalsYPos += 8;
      //   const taxLabel = data.taxRate ? `Tax (${data.taxRate}%):` : 'Tax:';
      //   doc.text(taxLabel, 115, totalsYPos);
      //   doc.text(formatPrice(data.tax || 0), 185, totalsYPos, { align: 'right' });
      // }

      if ((data.discountAmount || 0) > 0) {
        totalsYPos += 9;
        doc.setTextColor(76, 175, 80); // Material Green for discount
        doc.text("Discount:", 115, totalsYPos);
        doc.text(`-${formatPrice(data.discountAmount || 0)}`, 185, totalsYPos, {
          align: "right",
        });
        doc.setTextColor(textColor);
      }

      // Total with clean, professional highlighting
      totalsYPos += 12;

      // Subtle shadow for total
      doc.setFillColor(210, 210, 210);
      doc.roundedRect(111, totalsYPos - 2, 80, 15, 2, 2, "F");

      // Main total background
      doc.setFillColor(primaryColor);
      doc.roundedRect(110, totalsYPos - 3, 80, 15, 2, 2, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont(headingFont, "bold");
      doc.setFontSize(12);
      doc.text("TOTAL:", 115, totalsYPos + 3);
      doc.text(formatPrice(data.total || 0), 185, totalsYPos + 3, {
        align: "right",
      });

      yPos = totalsYPos + 15;

      // Payment and delivery info with enhanced styling
      yPos += 25;

      // Create info section background
      doc.setFillColor(248, 249, 250);
      doc.roundedRect(20, yPos - 5, 170, 35, 2, 2, "F");
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.3);
      doc.roundedRect(20, yPos - 5, 170, 35, 2, 2, "S");

      doc.setTextColor(textColor);
      doc.setFontSize(11);
      doc.setFont(bodyFont, "normal");

      // Payment method with icon-like formatting
      const paymentMethodText =
        data.paymentMethod === "cod"
          ? "Cash on Delivery (COD)"
          : data.paymentMethod === "online"
            ? "Online Payment"
            : (data.paymentMethod || "N/A").replace("_", " ").toUpperCase();
      doc.setFont(headingFont, "bold");
      doc.text("Payment Method:", 25, yPos + 5);
      doc.setFont(bodyFont, "normal");
      doc.text(paymentMethodText, 70, yPos + 5);

      // Delivery type formatting
      const deliveryTypeText = (data.deliveryType || "N/A")
        .replace("_", " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
      doc.setFont(headingFont, "bold");
      doc.text("Delivery Type:", 25, yPos + 15);
      doc.setFont(bodyFont, "normal");
      doc.text(deliveryTypeText, 70, yPos + 15);

      if (data.expectedDelivery) {
        doc.setFont(headingFont, "bold");
        doc.text("Expected Delivery:", 25, yPos + 25);
        doc.setFont(bodyFont, "normal");
        doc.text(formatDate(data.expectedDelivery), 80, yPos + 25);
        yPos += 10;
      }

      if (data.notes) {
        yPos += 45;

        // Notes section with background
        doc.setFillColor(252, 252, 252);
        doc.roundedRect(20, yPos - 5, 170, 25, 2, 2, "F");
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.3);
        doc.roundedRect(20, yPos - 5, 170, 25, 2, 2, "S");

        doc.setFont(headingFont, "bold");
        doc.text("ORDER NOTES:", 25, yPos + 5);
        doc.setFont(bodyFont, "normal");
        doc.setFontSize(10);
        const noteLines = doc.splitTextToSize(data.notes, 160);
        let noteYPos = yPos + 12;
        noteLines.forEach((line: string) => {
          if (noteYPos < yPos + 18) {
            doc.text(line, 25, noteYPos);
            noteYPos += 5;
          }
        });
        yPos += 25;
      }

      // Standard footer positioning - keep with content unless truly necessary to split
      const footerHeight = 20;
      let footerY = yPos + 15;

      // Standard practice: Only create new page if footer would extend beyond page (297-10 margin = 287)
      if (footerY + footerHeight > 287) {
        doc.addPage();
        footerY = 20; // Start at top margin of new page, not bottom
      }

      // Simple, professional footer with standard height
      doc.setFillColor(primaryColor);
      doc.rect(0, footerY, 210, footerHeight, "F");

      // Standard footer content - professional and minimal
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont(headingFont, "bold");
      doc.text(
        `Thank you for choosing ${companySettings.siteName}!`,
        20,
        footerY + 8,
      );

      doc.setFontSize(8);
      doc.setFont(bodyFont, "normal");
      doc.text(
        `© ${new Date().getFullYear()} ${companySettings.siteName}. All rights reserved.`,
        20,
        footerY + 15,
      );

      // Generate PDF in memory (Vercel-compatible)
      const pdfOutput = doc.output("arraybuffer");
      const pdfBuffer = Buffer.from(pdfOutput);

      // For Vercel, we'll return the buffer directly
      // The queue service will handle Bunny Storage upload
      logger.info(
        `Invoice PDF generated successfully in memory for order: ${data.orderNumber}`,
      );
      return pdfBuffer;
    } catch (error) {
      logger.error("Error generating invoice PDF:", error);
      throw error;
    }
  }
}

export default new SimplePDFService();
