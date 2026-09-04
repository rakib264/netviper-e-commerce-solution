import GeneralSettings from "../models/GeneralSettings";
import connectDB from "../mongodb";
import {
  MONOSPACE_FONT_STACK,
  resolveTypography,
} from "../theme/typography";
import { EmailSettings } from "../types/email-settings";

/**
 * Get email settings with priority: Database > Environment > Defaults
 */
export async function getEmailSettings(): Promise<EmailSettings> {
  let dbSettings: any = null;

  try {
    await connectDB();
    dbSettings = await GeneralSettings.findOne()
      .select({
        siteName: 1,
        siteDescription: 1,
        siteUrl: 1,
        contactEmail: 1,
        contactPhone: 1,
        address: 1,
        logo1: 1,
        primaryColor: 1,
        secondaryColor: 1,
        typography: 1,
      })
      .lean();
  } catch (error) {
    console.warn("Could not fetch settings from database:", error);
  }

  // resolveTypography falls back to the default preset for null/invalid input,
  // so this stays correct even when the settings lookup above failed.
  const typography = resolveTypography(dbSettings?.typography ?? null);

  return {
    siteName:
      dbSettings?.siteName ||
      process.env.NEXT_PUBLIC_SITE_NAME ||
      "Muscari Mart",
    siteDescription:
      dbSettings?.siteDescription ||
      process.env.NEXT_PUBLIC_SITE_DESCRIPTION ||
      "Your Trusted Online Shopping Destination",
    siteUrl:
      dbSettings?.siteUrl ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      "http://localhost:3000",
    contactEmail:
      dbSettings?.contactEmail ||
      process.env.NEXT_PUBLIC_CONTACT_EMAIL ||
      "mmuddin134@gmail.com",
    contactPhone:
      dbSettings?.contactPhone ||
      process.env.NEXT_PUBLIC_CONTACT_PHONE ||
      "8801339561702",
    contactAddress:
      dbSettings?.address ||
      process.env.NEXT_PUBLIC_CONTACT_ADDRESS ||
      "Kazipara Metro Station, Begum Rokeya Sharani, Kazipara, Dhaka, 1216, Bangladesh",
    logo: dbSettings?.logo1 || undefined,
    primaryColor: dbSettings?.primaryColor || "#3949AB",
    secondaryColor: dbSettings?.secondaryColor || "#10b981",
    bodyFontStack: typography.cssVariables["--font-paragraph"],
    headingFontStack: typography.cssVariables["--font-heading"],
    monoFontStack: MONOSPACE_FONT_STACK,
  };
}

/**
 * Body font stack for routes that assemble email HTML inline. Resolved per send
 * so a typography change in /admin/settings applies without a redeploy.
 */
export async function getEmailBodyFontStack(): Promise<string> {
  try {
    return (await getEmailSettings()).bodyFontStack;
  } catch {
    return resolveTypography(null).cssVariables["--font-paragraph"];
  }
}
