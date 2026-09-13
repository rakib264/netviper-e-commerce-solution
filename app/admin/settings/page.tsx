"use client";

import AdminLayout from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ColorThemeEditor } from "@/components/admin/settings/ColorThemeEditor";
import { CurrencySettingsCard } from "@/components/admin/settings/CurrencySettingsCard";
import { LanguageSettingsCard } from "@/components/admin/settings/LanguageSettingsCard";
import { useTheme } from "@/components/providers/ThemeProvider";
import { useErrorDialog } from "@/components/ui/error-dialog";
import { ImageUploader } from "@/components/ui/image-uploader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapLocationPicker } from "@/components/ui/map-location-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useSuccessDialog } from "@/components/ui/success-dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_CURRENCY, type CurrencyCode } from "@/lib/currency/config";
import {
  DEFAULT_ALLOWED_LOCALES,
  DEFAULT_LOCALE,
  normalizeAllowedLocales,
  type Locale,
} from "@/lib/i18n/config";
import {
  createDefaultColorSettings,
  normalizeColorSettings,
  type ColorSettings,
} from "@/lib/theme/colors";
import {
  buildFontStack,
  createDefaultTypographySettings,
  FONT_REGISTRY_LIST,
  resolveTypography,
  TYPOGRAPHY_PRESETS,
  TYPOGRAPHY_ROLES,
  TYPOGRAPHY_ROLE_LABELS,
  type TypographyRole,
  type TypographySettings,
} from "@/lib/theme/typography";
import { useFormik } from "formik";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import {
  Bell,
  Coins,
  CreditCard,
  Database,
  Facebook,
  Globe,
  Image,
  ImageIcon,
  Instagram,
  Languages,
  Mail,
  MapPin,
  Palette,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Share2,
  Shield,
  Sparkles,
  Trash2,
  Type,
  X,
  Youtube,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as Yup from "yup";
import MuscariMartLogo from "@/lib/assets/images/muscarimart.jpg";
import FavIconIco from "@/lib/assets/images/favicon.ico";
import { AdminPageLoader } from '@/components/admin/ui/loading';
import { formatCurrency } from '@/lib/currency/format';
import ReturnPolicyEditor from "@/components/admin/returns/ReturnPolicyEditor";
import { useTranslation } from "@/components/providers/LocalizationProvider";

interface AuthSettings {
  googleAuthEnabled: boolean;
  facebookAuthEnabled: boolean;
  emailAuthEnabled: boolean;
  otpAuthEnabled: boolean;
  passwordMinLength: number;
  requireEmailVerification: boolean;
  allowSelfRegistration: boolean;
}

interface GeneralSettings {
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  contactEmail: string;
  contactPhone: string;
  contactPerson: string;
  address: string;
  logo1: string;
  logo2: string;
  favicon: string;
  primaryColor: string;
  secondaryColor: string;
  colorPresetId: string | null;
  location: {
    address: string;
    latitude: number;
    longitude: number;
    placeId?: string;
    formattedAddress?: string;
  };
  socialLinks?: {
    facebook?: string;
    youtube?: string;
    instagram?: string;
    tiktok?: string;
  };
  currency: CurrencyCode;
  timezone: string;
  language: Locale;
  allowedLanguages: Locale[];
  typography: TypographySettings;
  themeVersion?: number;
}

interface IntegrationSettings {
  bunnyEnabled: boolean;
  bunnyStorageZoneName: string;
  bunnyCdnUrl: string;
  bunnyAccessKeySet?: boolean;
  bunnyStorageHostname?: string;
  twilioEnabled: boolean;
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioPhoneNumber: string;
  zamanitEnabled: boolean;
  zamanitApiKey: string;
  zamanitSenderId: string;
  zamanitBaseUrl: string;
  emailEnabled: boolean;
  emailProvider: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
}


interface PaymentSettings {
  isPaymentGatewayEnabled: boolean;
  sslcommerzStoreId: string;
  sslcommerzStorePassword: string;
  sslcommerzSandbox: boolean;
  codEnabled: boolean;
}

const TikTokIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M13 3v9.5a3.5 3.5 0 1 1-3.5-3.5" />
    <path d="M13 6c1.2 1.8 3.2 3 5.5 3" />
  </svg>
);

const THEME_VERSION_STORAGE_KEY = "theme-settings-version";

/**
 * General settings are one saved document but several unrelated concerns, so the
 * tab is split into subtabs. Order runs identity → reach → look.
 */
const GENERAL_SUBTABS = [
  { value: "site", label: "Site", icon: Globe },
  { value: "contact", label: "Contact", icon: Phone },
  { value: "branding", label: "Branding", icon: ImageIcon },
  { value: "social", label: "Social", icon: Share2 },
  { value: "language", label: "Language", icon: Languages },
  { value: "currency", label: "Currency", icon: Coins },
  { value: "appearance", label: "Theme & Type", icon: Type },
] as const;
const defaultTypographySettings = createDefaultTypographySettings();
const defaultColorSettings = createDefaultColorSettings();
const typographyPresetOptions = Object.values(TYPOGRAPHY_PRESETS);

export default function AdminSettings() {
  const { t } = useTranslation();
  const { showError, ErrorDialogComponent } = useErrorDialog();
  const { updateColors, updateColorPresetId } = useTheme();
  const { showSuccess, SuccessDialogComponent } = useSuccessDialog();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generalSubTab, setGeneralSubTab] = useState<string>(
    GENERAL_SUBTABS[0].value,
  );

  // Animation refs
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  const [authSettings, setAuthSettings] = useState<AuthSettings>({
    googleAuthEnabled: false,
    facebookAuthEnabled: false,
    emailAuthEnabled: true,
    otpAuthEnabled: true,
    passwordMinLength: 8,
    requireEmailVerification: false,
    allowSelfRegistration: true,
  });

  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
    siteName: process.env.NEXT_PUBLIC_SITE_NAME || "",
    siteDescription: process.env.NEXT_PUBLIC_SITE_DESCRIPTION || "",
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "",
    contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "",
    contactPhone: process.env.NEXT_PUBLIC_CONTACT_PHONE || "",
    contactPerson: process.env.NEXT_PUBLIC_CONTACT_PERSON || "",
    address: process.env.NEXT_PUBLIC_CONTACT_ADDRESS || "",
    logo1: MuscariMartLogo.src,
    logo2: "/logo.png",
    favicon: FavIconIco.src,
    primaryColor: defaultColorSettings.primaryColor,
    secondaryColor: defaultColorSettings.secondaryColor,
    colorPresetId: defaultColorSettings.presetId,
    location: {
      address: "",
      latitude: 23.8103,
      longitude: 90.4125,
      placeId: "",
      formattedAddress: "",
    },
    socialLinks: {
      facebook: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK || "",
      youtube: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE || "",
      instagram: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM || "",
      tiktok: process.env.NEXT_PUBLIC_SOCIAL_TIKTOK || "",
    },
    currency: DEFAULT_CURRENCY,
    timezone: "Europe/Berlin",
    language: DEFAULT_LOCALE,
    allowedLanguages: [...DEFAULT_ALLOWED_LOCALES],
    typography: defaultTypographySettings,
    themeVersion: 1,
  });

  const [integrationSettings, setIntegrationSettings] =
    useState<IntegrationSettings>({
      bunnyEnabled: true,
      bunnyStorageZoneName: "",
      bunnyCdnUrl: "",
      bunnyAccessKeySet: false,
      bunnyStorageHostname: "storage.bunnycdn.com",
      twilioEnabled: false,
      twilioAccountSid: "",
      twilioAuthToken: "",
      twilioPhoneNumber: "",
      zamanitEnabled: true,
      zamanitApiKey: "",
      zamanitSenderId: "",
      zamanitBaseUrl:
        process.env.NEXT_PUBLIC_SMS_API_BASE_URL ||
        "http://45.120.38.242/api/sendsms",
      emailEnabled: true,
      emailProvider: "smtp",
      smtpHost: "",
      smtpPort: 587,
      smtpUser: "",
      smtpPassword: "",
    });

  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    isPaymentGatewayEnabled: false,
    sslcommerzStoreId: "",
    sslcommerzStorePassword: "",
    sslcommerzSandbox: true,
    codEnabled: true,
  });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      // Fetch all settings from different endpoints
      const [authRes, generalRes, integrationRes, paymentRes] =
        await Promise.all([
          fetch("/api/admin/settings/auth"),
          fetch("/api/admin/settings/general"),
          fetch("/api/admin/settings/integrations"),
          fetch("/api/admin/settings/payment"),
        ]);

      if (authRes.ok) {
        const authData = await authRes.json();
        setAuthSettings(authData);
      } else {
        console.error(
          "Failed to fetch auth settings:",
          authRes.status,
          await authRes.text(),
        );
      }

      if (generalRes.ok) {
        const generalData = await generalRes.json();
        const resolvedTypography = resolveTypography(
          (generalData as any).typography || defaultTypographySettings,
        ).settings;
        setGeneralSettings((prev) => ({
          ...prev,
          ...generalData,
          // Provide fallback values for logos if not set
          logo1: generalData.logo1 || MuscariMartLogo.src,
          logo2: generalData.logo2 || "/logo.png",
          favicon: generalData.favicon || FavIconIco.src,
          socialLinks: {
            ...(prev.socialLinks || {}),
            ...((generalData as any).socialLinks || {}),
          },
          allowedLanguages: normalizeAllowedLocales(
            (generalData as any).allowedLanguages,
            (generalData as any).language,
          ),
          typography: resolvedTypography,
          themeVersion: (generalData as any).themeVersion || prev.themeVersion || 1,
        }));
      }

      if (integrationRes.ok) {
        const integrationData = await integrationRes.json();
        setIntegrationSettings(integrationData);
      }

      if (paymentRes.ok) {
        const paymentData = await paymentRes.json();
        setPaymentSettings(paymentData);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (type: string, data: any) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/settings/${type}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const responseData = await response.json().catch(() => null);

      if (response.ok) {
        if (type === "general" && responseData) {
          const resolvedTypography = resolveTypography(
            (responseData as any).typography || generalSettings.typography,
          ).settings;
          const nextThemeVersion =
            (responseData as any).themeVersion || generalSettings.themeVersion || 1;

          setGeneralSettings((prev) => ({
            ...prev,
            ...responseData,
            socialLinks: {
              ...(prev.socialLinks || {}),
              ...((responseData as any).socialLinks || {}),
            },
            typography: resolvedTypography,
            themeVersion: nextThemeVersion,
          }));

          if (typeof window !== "undefined") {
            window.localStorage.setItem(
              THEME_VERSION_STORAGE_KEY,
              String(nextThemeVersion),
            );
            window.dispatchEvent(new Event("theme-settings-updated"));
          }
        }
        showSuccess(`${type} settings saved successfully!`, "Success");
      } else {
        showError(
          responseData?.error || `Failed to save ${type} settings`,
          "Save Failed",
        );
        console.error(`Error saving ${type} settings:`, responseData?.error);
      }
    } catch (error) {
      console.error(`Error saving ${type} settings:`, error);
      showError(`Failed to save ${type} settings`, "Save Failed");
    } finally {
      setSaving(false);
    }
  };

  const testIntegration = async (type: string) => {
    try {
      if (type === "sms") {
        const phoneNumber = prompt(
          "Enter a phone number to test SMS (e.g., +8801234567890):",
        );
        if (!phoneNumber) return;

        const response = await fetch("/api/admin/settings/test/sms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phoneNumber }),
        });

        const result = await response.json();
        if (result.success) {
          showSuccess(
            `SMS test successful! Message ID: ${result.messageId}`,
            "Success",
          );
        } else {
          showError(`SMS test failed: ${result.error}`, "SMS Test Failed");
        }
        return;
      }

      const response = await fetch(`/api/admin/settings/test/${type}`, {
        method: "POST",
      });

      const result = await response.json();
      if (result.success) {
        showSuccess(`${type} test successful!`, "Success");
      } else {
        showError(
          `${type} test failed: ${result.error}`,
          `${type} Test Failed`,
        );
      }
    } catch (error) {
      showError(
        `${type} test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        "Test Failed",
      );
    }
  };

  useEffect(() => {
    // Enhanced GSAP animations with staggered entrance
    const tl = gsap.timeline({ delay: 0.2 });

    if (headerRef.current) {
      tl.fromTo(
        headerRef.current,
        { opacity: 0, y: -30, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: "power2.out" },
      );
    }

    if (statsRef.current) {
      tl.fromTo(
        statsRef.current.children,
        { opacity: 0, y: 20, scale: 0.9 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.6,
          stagger: 0.1,
          ease: "back.out(1.7)",
        },
        "-=0.4",
      );
    }

    if (containerRef.current) {
      tl.fromTo(
        containerRef.current.children,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: "power2.out" },
        "-=0.2",
      );
    }
  }, []);

  const availableFonts = useMemo(
    () =>
      [...FONT_REGISTRY_LIST].sort((a, b) =>
        a.displayName.localeCompare(b.displayName),
      ),
    [],
  );

  const typographySettings = useMemo(
    () =>
      resolveTypography(
        generalSettings.typography || defaultTypographySettings,
      ).settings,
    [generalSettings.typography],
  );

  const colorSettings = useMemo(
    () =>
      normalizeColorSettings({
        presetId: generalSettings.colorPresetId,
        primaryColor: generalSettings.primaryColor,
        secondaryColor: generalSettings.secondaryColor,
      }).settings,
    [
      generalSettings.colorPresetId,
      generalSettings.primaryColor,
      generalSettings.secondaryColor,
    ],
  );

  // Push the selection into the theme context as well as local form state, so the
  // admin re-themes live while editing rather than only after a save.
  const applyColorSettings = (next: ColorSettings) => {
    const { settings } = normalizeColorSettings(next);
    setGeneralSettings((prev) => ({
      ...prev,
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor,
      colorPresetId: settings.presetId,
    }));
    updateColors({
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor,
    });
    updateColorPresetId(settings.presetId);
  };

  const updateTypographySettings = (nextTypography: TypographySettings) => {
    setGeneralSettings((prev) => ({
      ...prev,
      typography: resolveTypography(nextTypography).settings,
    }));
  };

  const applyTypographyPreset = (presetId: string) => {
    const preset = TYPOGRAPHY_PRESETS[presetId];
    if (!preset) return;

    updateTypographySettings({
      ...typographySettings,
      mode: preset.mode,
      presetId: preset.id,
      globalFontId: preset.globalFontId || preset.roles.body.fontId,
      roles: structuredClone(preset.roles),
    });
  };

  const setTypographyMode = (mode: "single" | "multi") => {
    updateTypographySettings({
      ...typographySettings,
      mode,
      globalFontId: typographySettings.globalFontId || typographySettings.roles.body.fontId,
    });
  };

  const setSingleFont = (fontId: string) => {
    updateTypographySettings({
      ...typographySettings,
      mode: "single",
      globalFontId: fontId,
    });
  };

  const setRoleFont = (role: TypographyRole, fontId: string) => {
    updateTypographySettings({
      ...typographySettings,
      mode: "multi",
      roles: {
        ...typographySettings.roles,
        [role]: {
          ...typographySettings.roles[role],
          fontId,
        },
      },
    });
  };

  const setRoleWeight = (role: TypographyRole, weight: number) => {
    updateTypographySettings({
      ...typographySettings,
      roles: {
        ...typographySettings.roles,
        [role]: {
          ...typographySettings.roles[role],
          weight,
        },
      },
    });
  };

  const resetTypography = () => {
    updateTypographySettings(createDefaultTypographySettings());
  };

  if (loading) {
    return (
      <AdminLayout>
        <AdminPageLoader />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-primary-50/30 via-white to-secondary-50/30">
        <div ref={containerRef} className="space-y-8 p-4 sm:p-6 lg:p-8">
          {/* Stunning Header Section */}
          <motion.div
            ref={headerRef}
            className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-700 rounded-3xl shadow-2xl border border-primary-200/20"
            initial={{ opacity: 0, y: -30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* Animated background elements */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/10"></div>
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-white/10 to-transparent rounded-full -translate-y-48 translate-x-48 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-white/5 to-transparent rounded-full translate-y-32 -translate-x-32 animate-pulse"></div>

            {/* Header Content */}
            <div className="relative p-6 sm:p-8 lg:p-12">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-card/10 backdrop-blur-sm rounded-2xl border border-white/20">
                      <Shield className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h1 className="text-3xl lg:text-4xl font-bold text-white">
                        Settings
                      </h1>
                      <p className="text-white/80 text-lg">
                        Configure your application settings and integrations
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      onClick={fetchSettings}
                      className="bg-card/10 backdrop-blur-sm border border-white/20 text-white hover:bg-card/20 transition-all duration-300 px-6 py-3 rounded-xl font-semibold"
                    >
                      <RefreshCw className="w-5 h-5 mr-2" />
                      Refresh
                    </Button>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>

          <Tabs defaultValue="general" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-7">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="auth">Authentication</TabsTrigger>
              <TabsTrigger value="payment">Payment</TabsTrigger>
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
              <TabsTrigger value="returns">
                {t('admin.returns.policyEditor.title')}
              </TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
            </TabsList>

            {/* General Settings — split into focused subtabs so a single very
                long page does not have to be scrolled end to end. */}
            <TabsContent value="general">
              <div className="space-y-6">
                <Tabs
                  value={generalSubTab}
                  onValueChange={setGeneralSubTab}
                  className="space-y-6"
                >
                  <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 p-1">
                    {GENERAL_SUBTABS.map((subTab) => (
                      <TabsTrigger
                        key={subTab.value}
                        value={subTab.value}
                        className="flex items-center gap-2 px-3 py-2"
                      >
                        <subTab.icon size={15} className="shrink-0" />
                        <span>{subTab.label}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  <TabsContent value="site" className="space-y-6">
                  {/* Basic Site Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Globe size={20} />
                        <span>Basic Site Information</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="siteName">Site Name</Label>
                          <Input
                            id="siteName"
                            value={generalSettings.siteName}
                            onChange={(e) =>
                              setGeneralSettings((prev) => ({
                                ...prev,
                                siteName: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="siteUrl">Site URL</Label>
                          <Input
                            id="siteUrl"
                            value={generalSettings.siteUrl}
                            onChange={(e) =>
                              setGeneralSettings((prev) => ({
                                ...prev,
                                siteUrl: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="siteDescription">Site Description</Label>
                        <Textarea
                          id="siteDescription"
                          value={generalSettings.siteDescription}
                          onChange={(e) =>
                            setGeneralSettings((prev) => ({
                              ...prev,
                              siteDescription: e.target.value,
                            }))
                          }
                          rows={3}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="timezone">Timezone</Label>
                          <Select
                            value={generalSettings.timezone}
                            onValueChange={(value) =>
                              setGeneralSettings((prev) => ({
                                ...prev,
                                timezone: value,
                              }))
                            }
                          >
                            <SelectTrigger id="timezone" className="mt-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Europe/Berlin">
                                Europe/Berlin
                              </SelectItem>
                              <SelectItem value="Asia/Dhaka">Asia/Dhaka</SelectItem>
                              <SelectItem value="UTC">UTC</SelectItem>
                              <SelectItem value="America/New_York">
                                America/New_York
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end">
                          <p className="font-caption text-xs text-subtle-foreground">
                            Language and currency have their own sections — see the
                            Language and Currency tabs above.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  </TabsContent>

                  <TabsContent value="contact" className="space-y-6">
                  {/* Contact Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Phone size={20} />
                        <span>Contact Information</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <Label htmlFor="contactEmail">Contact Email</Label>
                          <Input
                            id="contactEmail"
                            type="email"
                            value={generalSettings.contactEmail}
                            onChange={(e) =>
                              setGeneralSettings((prev) => ({
                                ...prev,
                                contactEmail: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="contactPhone">Contact Phone</Label>
                          <Input
                            id="contactPhone"
                            value={generalSettings.contactPhone}
                            onChange={(e) =>
                              setGeneralSettings((prev) => ({
                                ...prev,
                                contactPhone: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="contactPerson">Contact Person</Label>
                          <Input
                            id="contactPerson"
                            value={generalSettings.contactPerson}
                            onChange={(e) =>
                              setGeneralSettings((prev) => ({
                                ...prev,
                                contactPerson: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="address">Address</Label>
                        <Textarea
                          id="address"
                          value={generalSettings.address}
                          onChange={(e) =>
                            setGeneralSettings((prev) => ({
                              ...prev,
                              address: e.target.value,
                            }))
                          }
                          rows={2}
                        />
                      </div>
                    </CardContent>
                  </Card>
                  {/* Location & Map */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <MapPin size={20} />
                        <span>Business Location</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <MapLocationPicker
                        value={generalSettings.location}
                        onChange={(location) =>
                          setGeneralSettings((prev) => ({ ...prev, location }))
                        }
                        label="Business Location"
                      />
                    </CardContent>
                  </Card>
                  </TabsContent>

                  <TabsContent value="branding" className="space-y-6">
                  {/* Logo & Branding */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <ImageIcon size={20} />
                        <span>Logo & Branding</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <ImageUploader
                          value={generalSettings.logo1}
                          onChange={(url) =>
                            setGeneralSettings((prev) => ({
                              ...prev,
                              logo1: url,
                            }))
                          }
                          label="Primary Logo"
                          description="Main logo for your website"
                          dimensions="200x80px"
                        />
                        <ImageUploader
                          value={generalSettings.logo2}
                          onChange={(url) =>
                            setGeneralSettings((prev) => ({
                              ...prev,
                              logo2: url,
                            }))
                          }
                          label="Secondary Logo"
                          description="Alternative logo (e.g., light version)"
                          dimensions="200x80px"
                        />
                        <ImageUploader
                          value={generalSettings.favicon}
                          onChange={(url) =>
                            setGeneralSettings((prev) => ({
                              ...prev,
                              favicon: url,
                            }))
                          }
                          label="Favicon"
                          description="Website icon shown in browser tabs"
                          dimensions="32x32px"
                        />
                      </div>
                    </CardContent>
                  </Card>
                  </TabsContent>

                  <TabsContent value="social" className="space-y-6">
                  {/* Social Media Links */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Globe size={20} />
                        <span>Social Media Links</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="facebookUrl">Facebook</Label>
                          <div className="mt-2 flex items-center space-x-2">
                            <div className="p-2 rounded-md bg-accent text-muted-foreground">
                              <Facebook size={16} />
                            </div>
                            <Input
                              id="facebookUrl"
                              placeholder="https://facebook.com/yourpage"
                              value={generalSettings.socialLinks?.facebook || ""}
                              onChange={(e) =>
                                setGeneralSettings((prev) => ({
                                  ...prev,
                                  socialLinks: {
                                    ...(prev.socialLinks || {}),
                                    facebook: e.target.value,
                                  },
                                }))
                              }
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="instagramUrl">Instagram</Label>
                          <div className="mt-2 flex items-center space-x-2">
                            <div className="p-2 rounded-md bg-accent text-muted-foreground">
                              <Instagram size={16} />
                            </div>
                            <Input
                              id="instagramUrl"
                              placeholder="https://instagram.com/yourhandle"
                              value={generalSettings.socialLinks?.instagram || ""}
                              onChange={(e) =>
                                setGeneralSettings((prev) => ({
                                  ...prev,
                                  socialLinks: {
                                    ...(prev.socialLinks || {}),
                                    instagram: e.target.value,
                                  },
                                }))
                              }
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="youtubeUrl">YouTube</Label>
                          <div className="mt-2 flex items-center space-x-2">
                            <div className="p-2 rounded-md bg-accent text-muted-foreground">
                              <Youtube size={16} />
                            </div>
                            <Input
                              id="youtubeUrl"
                              placeholder="https://youtube.com/@yourchannel"
                              value={generalSettings.socialLinks?.youtube || ""}
                              onChange={(e) =>
                                setGeneralSettings((prev) => ({
                                  ...prev,
                                  socialLinks: {
                                    ...(prev.socialLinks || {}),
                                    youtube: e.target.value,
                                  },
                                }))
                              }
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="tiktokUrl">TikTok</Label>
                          <div className="mt-2 flex items-center space-x-2">
                            <div className="p-2 rounded-md bg-accent text-muted-foreground">
                              <TikTokIcon />
                            </div>
                            <Input
                              id="tiktokUrl"
                              placeholder="https://www.tiktok.com/@yourhandle"
                              value={generalSettings.socialLinks?.tiktok || ""}
                              onChange={(e) =>
                                setGeneralSettings((prev) => ({
                                  ...prev,
                                  socialLinks: {
                                    ...(prev.socialLinks || {}),
                                    tiktok: e.target.value,
                                  },
                                }))
                              }
                            />
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-subtle-foreground">
                        Leave a field empty to hide that social icon on the site.
                      </p>
                    </CardContent>
                  </Card>
                  </TabsContent>

                  <TabsContent value="language" className="space-y-6">
                    <LanguageSettingsCard
                      value={generalSettings.language}
                      onChange={(language) =>
                        setGeneralSettings((prev) => ({ ...prev, language }))
                      }
                      allowed={generalSettings.allowedLanguages}
                      onAllowedChange={(allowedLanguages) =>
                        setGeneralSettings((prev) => ({ ...prev, allowedLanguages }))
                      }
                    />
                  </TabsContent>

                  <TabsContent value="currency" className="space-y-6">
                    <CurrencySettingsCard
                      value={generalSettings.currency}
                      onChange={(currency) =>
                        setGeneralSettings((prev) => ({ ...prev, currency }))
                      }
                    />
                  </TabsContent>

                  <TabsContent value="appearance" className="space-y-6">
                  {/* Colour theme — presets, brand colours, derived palette */}
                  <ColorThemeEditor
                    value={colorSettings}
                    onChange={applyColorSettings}
                  />
                  {/* Typography */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Sparkles size={20} />
                        <span>Typography</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-3">
                        <Label>Global Font Strategy</Label>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant={
                              typographySettings.mode === "single"
                                ? "default"
                                : "outline"
                            }
                            onClick={() => setTypographyMode("single")}
                          >
                            Single Font
                          </Button>
                          <Button
                            type="button"
                            variant={
                              typographySettings.mode === "multi"
                                ? "default"
                                : "outline"
                            }
                            onClick={() => setTypographyMode("multi")}
                          >
                            Multiple Fonts
                          </Button>
                        </div>
                        <p className="text-xs text-subtle-foreground">
                          Single mode maps every role to one font. Multi mode lets
                          you assign fonts per semantic role.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <Label htmlFor="typographyPreset">Preset</Label>
                          <Select
                            value={typographySettings.presetId || undefined}
                            onValueChange={applyTypographyPreset}
                          >
                            <SelectTrigger id="typographyPreset" className="mt-2">
                              <SelectValue placeholder="Choose preset" />
                            </SelectTrigger>
                            <SelectContent>
                              {typographyPresetOptions.map((preset) => (
                                <SelectItem key={preset.id} value={preset.id}>
                                  {preset.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {typographySettings.mode === "single" ? (
                          <div>
                            <Label htmlFor="singleFontSelection">
                              Global Font
                            </Label>
                            <Select
                              value={typographySettings.globalFontId}
                              onValueChange={setSingleFont}
                            >
                              <SelectTrigger
                                id="singleFontSelection"
                                className="mt-2"
                              >
                                <SelectValue placeholder="Select a font" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableFonts.map((font) => (
                                  <SelectItem key={font.id} value={font.id}>
                                    {font.displayName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : null}
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="font-medium text-foreground">
                            Font Assignments by Role
                          </h5>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={resetTypography}
                          >
                            Reset Typography
                          </Button>
                        </div>

                        <div className="space-y-3">
                          {TYPOGRAPHY_ROLES.map((role) => {
                            const roleConfig = typographySettings.roles[role];
                            const roleFontId =
                              typographySettings.mode === "single"
                                ? typographySettings.globalFontId
                                : roleConfig.fontId;
                            const fallbackFont =
                              availableFonts[0] || FONT_REGISTRY_LIST[0];
                            const selectedFont =
                              availableFonts.find((font) => font.id === roleFontId) ||
                              fallbackFont;
                            const availableWeights = selectedFont
                              ? selectedFont.availableWeights
                              : [roleConfig.weight];
                            const recommendedFontNames = availableFonts
                              .filter((font) => font.recommendedRoles.includes(role))
                              .slice(0, 4)
                              .map((font) => font.displayName)
                              .join(", ");

                            if (!selectedFont) {
                              return null;
                            }

                            return (
                              <div
                                key={role}
                                className="rounded-md border border-border p-3"
                              >
                                <div className="mb-2 flex items-center justify-between">
                                  <Label className="text-sm">
                                    {TYPOGRAPHY_ROLE_LABELS[role]}
                                  </Label>
                                  <span className="text-[11px] font-label uppercase tracking-wide text-subtle-foreground">
                                    {selectedFont.category}
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                  <Select
                                    value={roleFontId}
                                    onValueChange={(value) =>
                                      typographySettings.mode === "single"
                                        ? setSingleFont(value)
                                        : setRoleFont(role, value)
                                    }
                                    disabled={typographySettings.mode === "single"}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {availableFonts.map((font) => (
                                        <SelectItem key={font.id} value={font.id}>
                                          {font.displayName}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>

                                  <Select
                                    value={String(roleConfig.weight)}
                                    onValueChange={(value) =>
                                      setRoleWeight(role, Number(value))
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {availableWeights.map((weight) => (
                                        <SelectItem
                                          key={`${role}-${weight}`}
                                          value={String(weight)}
                                        >
                                          {weight}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <p className="mt-2 text-xs text-subtle-foreground">
                                  Suggested: {recommendedFontNames || selectedFont.displayName}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="rounded-lg border border-border bg-muted p-4">
                        <h5 className="mb-3 font-medium text-foreground">
                          Live Typography Preview
                        </h5>
                        <div className="space-y-2">
                          <p
                            style={{
                              fontFamily: buildFontStack(
                                typographySettings.roles.display.fontId,
                              ),
                              fontWeight: typographySettings.roles.display.weight,
                            }}
                            className="text-3xl leading-tight text-foreground"
                          >
                            The quick brown fox jumps over the lazy dog.
                          </p>
                          <p
                            style={{
                              fontFamily: buildFontStack(
                                typographySettings.roles.heading.fontId,
                              ),
                              fontWeight: typographySettings.roles.heading.weight,
                            }}
                            className="text-2xl text-foreground"
                          >
                            Heading Example
                          </p>
                          <p
                            style={{
                              fontFamily: buildFontStack(
                                typographySettings.roles.paragraph.fontId,
                              ),
                              fontWeight: typographySettings.roles.paragraph.weight,
                            }}
                            className="text-sm text-muted-foreground"
                          >
                            Discover our collection of carefully selected products
                            crafted for modern, timeless style.
                          </p>
                          <p
                            style={{
                              fontFamily: buildFontStack(
                                typographySettings.roles.price.fontId,
                              ),
                              fontWeight: typographySettings.roles.price.weight,
                            }}
                            className="text-xl text-foreground"
                          >
                            {formatCurrency(249)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  </TabsContent>
                </Tabs>

                {/* One save for every subtab — the whole general document is
                    written together, so a sticky bar keeps it in reach. */}
                <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background/95 px-1 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                  <p className="font-caption text-xs text-subtle-foreground">
                    Saves every General subtab at once.
                  </p>
                  <Button
                    onClick={() => saveSettings("general", generalSettings)}
                    disabled={saving}
                  >
                    <Save size={16} className="mr-2" />
                    {saving ? "Saving..." : "Save General Settings"}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Authentication Settings */}
            <TabsContent value="auth">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield size={20} />
                    <span>Authentication Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="googleAuth">
                          Google Authentication
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Allow users to sign in with Google
                        </p>
                      </div>
                      <Switch
                        id="googleAuth"
                        checked={authSettings.googleAuthEnabled}
                        onCheckedChange={(checked) =>
                          setAuthSettings((prev) => ({
                            ...prev,
                            googleAuthEnabled: checked,
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="facebookAuth">
                          Facebook Authentication
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Allow users to sign in with Facebook
                        </p>
                      </div>
                      <Switch
                        id="facebookAuth"
                        checked={authSettings.facebookAuthEnabled}
                        onCheckedChange={(checked) =>
                          setAuthSettings((prev) => ({
                            ...prev,
                            facebookAuthEnabled: checked,
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="emailAuth">Email Authentication</Label>
                        <p className="text-sm text-muted-foreground">
                          Allow users to sign in with email and password
                        </p>
                      </div>
                      <Switch
                        id="emailAuth"
                        checked={authSettings.emailAuthEnabled}
                        onCheckedChange={(checked) =>
                          setAuthSettings((prev) => ({
                            ...prev,
                            emailAuthEnabled: checked,
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="otpAuth">Phone Verification</Label>
                        <p className="text-sm text-muted-foreground">
                          Enable phone number verification with OTP
                        </p>
                      </div>
                      <Switch
                        id="otpAuth"
                        checked={authSettings.otpAuthEnabled}
                        onCheckedChange={(checked) =>
                          setAuthSettings((prev) => ({
                            ...prev,
                            otpAuthEnabled: checked,
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="emailVerification">
                          Email Verification
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Enable email verification with OTP
                        </p>
                      </div>
                      <Switch
                        id="emailVerification"
                        checked={authSettings.requireEmailVerification}
                        onCheckedChange={(checked) =>
                          setAuthSettings((prev) => ({
                            ...prev,
                            requireEmailVerification: checked,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="passwordMinLength">
                        Minimum Password Length
                      </Label>
                      <Input
                        id="passwordMinLength"
                        type="number"
                        value={authSettings.passwordMinLength}
                        onChange={(e) =>
                          setAuthSettings((prev) => ({
                            ...prev,
                            passwordMinLength: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="allowSelfRegistration"
                          checked={authSettings.allowSelfRegistration}
                          onCheckedChange={(checked) =>
                            setAuthSettings((prev) => ({
                              ...prev,
                              allowSelfRegistration: checked,
                            }))
                          }
                        />
                        <Label htmlFor="allowSelfRegistration">
                          Allow Self Registration
                        </Label>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={() => saveSettings("auth", authSettings)}
                      disabled={saving}
                    >
                      <Save size={16} className="mr-2" />
                      {saving ? "Saving..." : "Save Auth Settings"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payment Settings */}
            <TabsContent value="payment">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CreditCard size={20} />
                    <span>Payment Gateway Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="paymentGatewayEnabled">
                          Enable Payment Gateway
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Allow customers to pay online via SSLCommerz
                        </p>
                      </div>
                      <Switch
                        id="paymentGatewayEnabled"
                        checked={paymentSettings.isPaymentGatewayEnabled}
                        onCheckedChange={(checked) =>
                          setPaymentSettings((prev) => ({
                            ...prev,
                            isPaymentGatewayEnabled: checked,
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="codEnabled">Cash on Delivery</Label>
                        <p className="text-sm text-muted-foreground">
                          Allow customers to pay on delivery
                        </p>
                      </div>
                      <Switch
                        id="codEnabled"
                        checked={paymentSettings.codEnabled}
                        onCheckedChange={(checked) =>
                          setPaymentSettings((prev) => ({
                            ...prev,
                            codEnabled: checked,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium">SSLCommerz Configuration</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="sslcommerzStoreId">Store ID</Label>
                        <Input
                          id="sslcommerzStoreId"
                          value={paymentSettings.sslcommerzStoreId}
                          onChange={(e) =>
                            setPaymentSettings((prev) => ({
                              ...prev,
                              sslcommerzStoreId: e.target.value,
                            }))
                          }
                          placeholder="Your SSLCommerz Store ID"
                          disabled={!paymentSettings.isPaymentGatewayEnabled}
                        />
                      </div>
                      <div>
                        <Label htmlFor="sslcommerzStorePassword">
                          Store Password
                        </Label>
                        <Input
                          id="sslcommerzStorePassword"
                          type="password"
                          value={paymentSettings.sslcommerzStorePassword}
                          onChange={(e) =>
                            setPaymentSettings((prev) => ({
                              ...prev,
                              sslcommerzStorePassword: e.target.value,
                            }))
                          }
                          placeholder="Your SSLCommerz Store Password"
                          disabled={!paymentSettings.isPaymentGatewayEnabled}
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="sslcommerzSandbox"
                        checked={paymentSettings.sslcommerzSandbox}
                        onCheckedChange={(checked) =>
                          setPaymentSettings((prev) => ({
                            ...prev,
                            sslcommerzSandbox: checked,
                          }))
                        }
                        disabled={!paymentSettings.isPaymentGatewayEnabled}
                      />
                      <Label htmlFor="sslcommerzSandbox">
                        Sandbox Mode (for testing)
                      </Label>
                    </div>

                    <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg">
                      <h5 className="font-medium text-warning-800 mb-2">
                        Important Notes:
                      </h5>
                      <ul className="text-sm text-warning-700 space-y-1">
                        <li>
                          • Use sandbox mode for testing with test credentials
                        </li>
                        <li>
                          • Switch to live mode only after thorough testing
                        </li>
                        <li>
                          • Ensure your domain is whitelisted in SSLCommerz
                          dashboard
                        </li>
                        <li>• Test all payment methods before going live</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => testIntegration("sslcommerz")}
                      disabled={!paymentSettings.isPaymentGatewayEnabled}
                    >
                      Test Connection
                    </Button>
                    <Button
                      onClick={() => saveSettings("payment", paymentSettings)}
                      disabled={saving}
                    >
                      <Save size={16} className="mr-2" />
                      {saving ? "Saving..." : "Save Payment Settings"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Integration Settings */}
            <TabsContent value="returns">
              <ReturnPolicyEditor />
            </TabsContent>

            <TabsContent value="integrations">
              <div className="space-y-6">
                {/* Bunny Storage + CDN */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Image size={20} />
                        <span>Bunny (Object Storage + CDN)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant={
                            integrationSettings.bunnyAccessKeySet
                              ? "default"
                              : "secondary"
                          }
                        >
                          {integrationSettings.bunnyAccessKeySet
                            ? "Configured via .env"
                            : "Missing credentials"}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testIntegration("bunny")}
                        >
                          Test
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Uploads go to Bunny Storage and are served through your Pull Zone CDN
                      for fast global delivery. Credentials are read from environment
                      variables (not stored in the database).
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Storage Zone</Label>
                        <Input
                          value={integrationSettings.bunnyStorageZoneName || ""}
                          readOnly
                          className="bg-muted"
                        />
                      </div>
                      <div>
                        <Label>Storage Hostname</Label>
                        <Input
                          value={
                            integrationSettings.bunnyStorageHostname ||
                            "storage.bunnycdn.com"
                          }
                          readOnly
                          className="bg-muted"
                        />
                      </div>
                      <div>
                        <Label>CDN URL</Label>
                        <Input
                          value={integrationSettings.bunnyCdnUrl || ""}
                          readOnly
                          className="bg-muted"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Access Key</Label>
                      <Input
                        type="password"
                        value={
                          integrationSettings.bunnyAccessKeySet
                            ? "••••••••••••••••"
                            : ""
                        }
                        readOnly
                        className="bg-muted"
                        placeholder="Set BUNNY_STORAGE_ACCESS_KEY in .env"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Twilio */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Phone size={20} />
                        <span>Twilio (SMS)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={integrationSettings.twilioEnabled}
                          onCheckedChange={(checked) =>
                            setIntegrationSettings((prev) => ({
                              ...prev,
                              twilioEnabled: checked,
                            }))
                          }
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testIntegration("twilio")}
                        >
                          Test
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="twilioAccountSid">Account SID</Label>
                        <Input
                          id="twilioAccountSid"
                          value={integrationSettings.twilioAccountSid}
                          onChange={(e) =>
                            setIntegrationSettings((prev) => ({
                              ...prev,
                              twilioAccountSid: e.target.value,
                            }))
                          }
                          disabled={!integrationSettings.twilioEnabled}
                        />
                      </div>
                      <div>
                        <Label htmlFor="twilioAuthToken">Auth Token</Label>
                        <Input
                          id="twilioAuthToken"
                          type="password"
                          value={integrationSettings.twilioAuthToken}
                          onChange={(e) =>
                            setIntegrationSettings((prev) => ({
                              ...prev,
                              twilioAuthToken: e.target.value,
                            }))
                          }
                          disabled={!integrationSettings.twilioEnabled}
                        />
                      </div>
                      <div>
                        <Label htmlFor="twilioPhoneNumber">Phone Number</Label>
                        <Input
                          id="twilioPhoneNumber"
                          value={integrationSettings.twilioPhoneNumber}
                          onChange={(e) =>
                            setIntegrationSettings((prev) => ({
                              ...prev,
                              twilioPhoneNumber: e.target.value,
                            }))
                          }
                          disabled={!integrationSettings.twilioEnabled}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* ZamanIT SMS */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Phone size={20} />
                        <span>ZamanIT (Bangladesh SMS)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={integrationSettings.zamanitEnabled}
                          onCheckedChange={(checked) =>
                            setIntegrationSettings((prev) => ({
                              ...prev,
                              zamanitEnabled: checked,
                            }))
                          }
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testIntegration("zamanit")}
                        >
                          Test
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="zamanitApiKey">API Key</Label>
                        <Input
                          id="zamanitApiKey"
                          type="password"
                          value={integrationSettings.zamanitApiKey}
                          onChange={(e) =>
                            setIntegrationSettings((prev) => ({
                              ...prev,
                              zamanitApiKey: e.target.value,
                            }))
                          }
                          disabled={!integrationSettings.zamanitEnabled}
                          placeholder="Your ZamanIT API Key"
                        />
                      </div>
                      <div>
                        <Label htmlFor="zamanitSenderId">Sender ID</Label>
                        <Input
                          id="zamanitSenderId"
                          value={integrationSettings.zamanitSenderId}
                          onChange={(e) =>
                            setIntegrationSettings((prev) => ({
                              ...prev,
                              zamanitSenderId: e.target.value,
                            }))
                          }
                          disabled={!integrationSettings.zamanitEnabled}
                          placeholder="e.g., 8809604903051"
                        />
                      </div>
                      <div>
                        <Label htmlFor="zamanitBaseUrl">Base URL</Label>
                        <Input
                          id="zamanitBaseUrl"
                          value={integrationSettings.zamanitBaseUrl}
                          onChange={(e) =>
                            setIntegrationSettings((prev) => ({
                              ...prev,
                              zamanitBaseUrl: e.target.value,
                            }))
                          }
                          disabled={!integrationSettings.zamanitEnabled}
                          placeholder="http://45.120.38.242/api/sendsms"
                        />
                      </div>
                    </div>
                    <div className="p-4 bg-info-50 border border-info-200 rounded-lg">
                      <h5 className="font-medium text-info-800 mb-2">
                        ZamanIT SMS Configuration:
                      </h5>
                      <ul className="text-sm text-info-700 space-y-1">
                        <li>• Optimized for Bangladesh mobile networks</li>
                        <li>• Supports bulk SMS with rate limiting</li>
                        <li>• Cost-effective solution for local businesses</li>
                        <li>
                          • Automatic phone number normalization for BD numbers
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                {/* Email */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Mail size={20} />
                        <span>Email (SMTP)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={integrationSettings.emailEnabled}
                          onCheckedChange={(checked) =>
                            setIntegrationSettings((prev) => ({
                              ...prev,
                              emailEnabled: checked,
                            }))
                          }
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testIntegration("email")}
                        >
                          Test
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="smtpHost">SMTP Host</Label>
                        <Input
                          id="smtpHost"
                          value={integrationSettings.smtpHost}
                          onChange={(e) =>
                            setIntegrationSettings((prev) => ({
                              ...prev,
                              smtpHost: e.target.value,
                            }))
                          }
                          disabled={!integrationSettings.emailEnabled}
                        />
                      </div>
                      <div>
                        <Label htmlFor="smtpPort">SMTP Port</Label>
                        <Input
                          id="smtpPort"
                          type="number"
                          value={integrationSettings.smtpPort}
                          onChange={(e) =>
                            setIntegrationSettings((prev) => ({
                              ...prev,
                              smtpPort: Number(e.target.value),
                            }))
                          }
                          disabled={!integrationSettings.emailEnabled}
                        />
                      </div>
                      <div>
                        <Label htmlFor="smtpUser">SMTP Username</Label>
                        <Input
                          id="smtpUser"
                          value={integrationSettings.smtpUser}
                          onChange={(e) =>
                            setIntegrationSettings((prev) => ({
                              ...prev,
                              smtpUser: e.target.value,
                            }))
                          }
                          disabled={!integrationSettings.emailEnabled}
                        />
                      </div>
                      <div>
                        <Label htmlFor="smtpPassword">SMTP Password</Label>
                        <Input
                          id="smtpPassword"
                          type="password"
                          value={integrationSettings.smtpPassword}
                          onChange={(e) =>
                            setIntegrationSettings((prev) => ({
                              ...prev,
                              smtpPassword: e.target.value,
                            }))
                          }
                          disabled={!integrationSettings.emailEnabled}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button
                    onClick={() =>
                      saveSettings("integrations", integrationSettings)
                    }
                    disabled={saving}
                  >
                    <Save size={16} className="mr-2" />
                    {saving ? "Saving..." : "Save Integration Settings"}
                  </Button>
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => testIntegration("sms")}
                    disabled={
                      !integrationSettings.twilioEnabled &&
                      !integrationSettings.zamanitEnabled
                    }
                  >
                    Test SMS
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Bell size={20} />
                    <span>Notification Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Order Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Send notifications for new orders
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Low Stock Alerts</Label>
                        <p className="text-sm text-muted-foreground">
                          Alert when products are running low
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Payment Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Notify about payment status changes
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Customer Registration</Label>
                        <p className="text-sm text-muted-foreground">
                          Alert when new customers register
                        </p>
                      </div>
                      <Switch />
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label>Notification Recipients</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Email addresses to receive admin notifications
                      (comma-separated)
                    </p>
                    <Textarea
                      placeholder="admin@example.com, manager@example.com"
                      rows={2}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button disabled={saving}>
                      <Save size={16} className="mr-2" />
                      {saving ? "Saving..." : "Save Notification Settings"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </div>

        <ErrorDialogComponent />
        <SuccessDialogComponent />
      </div>
    </AdminLayout>
  );
}
